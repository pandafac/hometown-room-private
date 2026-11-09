import {
  classifyUserIntents,
  intentLabel,
  validateAnswerForIntents,
} from "../../server/quality.js";

const nativeFetch = window.fetch.bind(window);
const world = window.__STANDALONE_WORLD__;
const apiKey = window.__DEEPSEEK_API_KEY__ || "";
const apiBase = window.__DEEPSEEK_BASE_URL__ || "https://api.deepseek.com";
const model = window.__DEEPSEEK_MODEL__ || "deepseek-flash";

function clone(value) {
  return structuredClone(value);
}

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

function getShop(shopId) {
  return world.data.shops.find((shop) => shop.id === shopId);
}

function getTown(townId) {
  return world.data.towns.find((town) => town.id === townId);
}

function getDashboard(shopId) {
  const dashboard = world.dashboards[shopId];
  return dashboard ? clone(dashboard) : null;
}

function mergeFacts(shop, facts) {
  if (!Array.isArray(facts)) return shop;
  return {
    ...shop,
    knowledgeBase: [
      ...shop.knowledgeBase,
      ...facts
        .filter((item) => item?.question && item?.answer)
        .slice(-20)
        .map((item, index) => ({
          id: `local-${index}-${item.id || Date.now()}`,
          category: item.category || "新增资料",
          question: String(item.question).slice(0, 180),
          answer: String(item.answer).slice(0, 500),
          source: "店主补充",
        })),
    ],
  };
}

function findKnowledge(shop, text, terms) {
  const items = [...shop.knowledgeBase, ...shop.faqs].filter(
    (item) => item?.question && item?.answer,
  );
  return (
    items.find((item) =>
      terms.some(
        (term) =>
          text.includes(term) &&
          (item.question.includes(term) || item.answer.includes(term)),
      ),
    ) || null
  );
}

function knowledgeReply(fact, fallbackCategory) {
  return {
    reply: `${fact.answer}（${fact.source || "店主提供"}：${fact.category || fallbackCategory}）`,
    covered: "full",
    intent: fact.category || fallbackCategory,
    gapQuestion: null,
    factRefs: [fact.category || fallbackCategory],
    followups: ["第一次来怎么点？", "一个人怎么坐？"],
  };
}

function cleanFactRef(value) {
  const ref = String(value || "");
  if (/commonMisunderstandings|commonMisunderstanding|误会/i.test(ref)) return "常见误会";
  if (/hours\.(busy|soloFriendly)/i.test(ref) || /排队|高峰/.test(ref)) {
    return "排队与高峰";
  }
  if (/hours|营业|开门|关门|休息/i.test(ref)) return "营业时间";
  if (/solo|座位|独行/i.test(ref)) return "独行与座位";
  if (/menu|signature|菜单|点单/i.test(ref)) return "菜单与点单";
  if (/recommend|下一站|推荐/i.test(ref)) return "店主推荐";
  if (/pet|宠物/i.test(ref)) return "宠物政策";
  if (/knowledge|faq|extra-\d+|kb-\d+|资料/i.test(ref)) return "店主资料";
  if (/etiquette|礼仪/i.test(ref)) return "礼仪与误会";
  if (/facilit|设施|设备/i.test(ref)) return "设施与便利";
  return ref
    .replace(/\[[^\]]+\]/g, "")
    .replace(/\.[a-zA-Z]+/g, " ")
    .replace(/\s+/g, " ")
    .trim() || "店主资料";
}

function sanitizeReplySources(reply) {
  return String(reply || "").replace(
    /[（(](店主提供|店主补充)[：:]\s*([^）)]+)[）)]/g,
    (match, label, refs) => {
      const labels = [...new Set(
        refs
          .split(/[、,，/|]+/)
          .map(cleanFactRef)
          .filter(Boolean),
      )];
      return labels.length ? `（${label}：${labels.join(" · ")}）` : match;
    },
  );
}

function offlineReply(shop, messages, intents) {
  const lastUser =
    [...messages].reverse().find((item) => item.role === "user")?.content || "";
  const text = lastUser.toLowerCase();
  const intent = intents[0] || "general";

  if (intent === "queue") {
    const queueFact = findKnowledge(shop, text, ["排队", "高峰", "人多", "错峰", "等位"]);
    return {
      reply: `${shop.hours.display}，${shop.hours.closed}。${queueFact?.answer || `${shop.hours.busy}；${shop.hours.soloFriendly}。`}（店主提供：排队与高峰）`,
      covered: "full",
      intent: "排队与高峰",
      gapQuestion: null,
      factRefs: ["营业时间", "排队与高峰"],
      followups: ["第一次来怎么点？", "吃完后下一站去哪？"],
    };
  }

  if (intent === "hours") {
    return {
      reply: `${shop.hours.display}；${shop.hours.closed}。${shop.hours.note}（店主提供：营业时间）`,
      covered: "full",
      intent: "营业时间",
      gapQuestion: null,
      factRefs: ["营业时间"],
      followups: ["哪个时段人少一点？", "第一次来怎么点？"],
    };
  }

  if (intent === "recommendation") {
    const recommendation = shop.recommendations[0];
    const target = getShop(recommendation.shopId);
    return {
      reply: `${shop.owner.name}推荐下一站去${target?.name || "附近小店"}：${recommendation.reason}${recommendation.context}（店主提供：店主推荐）`,
      covered: "full",
      intent: "下一站推荐",
      gapQuestion: null,
      factRefs: ["店主推荐"],
      followups: ["下一站一个人去也合适吗？", "先在本店怎么安排？"],
    };
  }

  if (intent === "reservation") {
    const fact = findKnowledge(shop, text, ["预约", "订位", "留位", "保留", "占座"]);
    if (fact) return knowledgeReply(fact, "预约与留位");
    return {
      reply: "店主资料里没有预约留位服务，不能承诺固定座位；请到店后按现场安排。",
      covered: "partial",
      intent: "预约与留位",
      gapQuestion: "是否提供预约或留位服务？",
      factRefs: ["到店规则"],
      followups: ["哪个时段人少一点？", "一个人怎么坐？"],
    };
  }

  if (intent === "pet") {
    const fact = findKnowledge(shop, text, ["宠物", "狗", "猫", "导盲犬"]);
    if (fact) return knowledgeReply(fact, "宠物政策");
    return {
      reply: `${shop.petPolicy}（店主提供：宠物政策）`,
      covered: shop.petPolicy.includes("未写明") ? "partial" : "full",
      intent: "宠物政策",
      gapQuestion: shop.petPolicy.includes("未写明") ? "可以带宠物进店吗？" : null,
      factRefs: ["宠物政策"],
      followups: ["我拖着行李方便进去吗？", "一个人怎么坐？"],
    };
  }

  if (intent === "dietary") {
    const fact = findKnowledge(shop, text, [
      "不吃",
      "忌口",
      "过敏",
      "素食",
      "纯素",
      "香菜",
      "葱",
      "蒜",
      "辣",
      "花生",
      "坚果",
      "乳糖",
      "豆类",
    ]);
    if (fact) return knowledgeReply(fact, "忌口与食材");
    return {
      reply: "店主资料里还没有写这项忌口或食材信息，我不会替你猜；请把具体忌口留给店主确认。",
      covered: "missing",
      intent: "忌口与食材",
      gapQuestion: lastUser,
      factRefs: [],
      followups: ["第一次来怎么点？", "一个人怎么坐？"],
    };
  }

  if (intent === "menu") {
    const choice = shop.signatureChoice;
    return {
      reply: `第一次来，店主建议这样点：${choice.soloOrder}，大约 ${choice.budget} 元。${choice.reason}${choice.alternative}（店主提供：菜单与点单建议）`,
      covered: "full",
      intent: "点单与菜单",
      gapQuestion: null,
      factRefs: ["菜单", "点单建议"],
      followups: ["我一个人应该坐哪里？", "吃完后下一站去哪？"],
    };
  }

  if (intent === "solo") {
    const menuAddition = intents.includes("menu")
      ? `第一次来可以点${shop.signatureChoice.soloOrder}，约 ${shop.signatureChoice.budget} 元。`
      : "";
    return {
      reply: `一个人来不用特意解释。${shop.solo.seating}${shop.solo.bestTime}最从容；${shop.solo.comfortNote}${menuAddition}（店主提供：单人座位${menuAddition ? "、菜单" : ""}）`,
      covered: "full",
      intent: "独行与座位",
      gapQuestion: null,
      factRefs: ["单人座位", "安静时段"],
      followups: ["第一次来怎么点？", "可以问店主什么？"],
    };
  }

  if (intent === "story") {
    return {
      reply: `${shop.story} 店主原话是：“${shop.storyQuote.replaceAll("“", "").replaceAll("”", "")}”（店主提供：店铺故事）`,
      covered: "full",
      intent: "店铺故事",
      gapQuestion: null,
      factRefs: ["店铺故事"],
      followups: ["可以问店主什么？", "第一次来怎么点？"],
    };
  }

  if (intent === "facilities") {
    const fact = findKnowledge(shop, text, [
      "wifi",
      "wi-fi",
      "插座",
      "电脑",
      "支架",
      "行李",
      "寄存",
      "洗手间",
      "厕所",
      "儿童椅",
      "婴儿车",
      "停车",
      "打包",
      "外带",
    ]);
    if (fact) return knowledgeReply(fact, "设施与便利");
    return {
      reply: "这项设施信息还没有店主确认的资料，我不能替你猜，会把它留给店主补充。",
      covered: "missing",
      intent: "设施与便利",
      gapQuestion: lastUser,
      factRefs: [],
      followups: ["一个人怎么坐？", "第一次来怎么点？"],
    };
  }

  if (intent === "etiquette") {
    const item = shop.commonMisunderstandings[0];
    return {
      reply: `${item.correction}（店主提供：常见误会）另外，${shop.etiquette[0]}。`,
      covered: "full",
      intent: "礼仪与误会",
      gapQuestion: null,
      factRefs: ["常见误会", "店内礼仪"],
      followups: ["第一次来怎么点？", "一个人怎么坐？"],
    };
  }

  return {
    reply: `${shop.shortDescription}你想先问怎么点、一个人坐哪里，还是进门后的顺序？（店主提供：店铺资料）`,
    covered: "partial",
    intent: intentLabel("general"),
    gapQuestion: null,
    factRefs: ["店铺资料"],
    followups: ["第一次来怎么点？", "一个人怎么坐？", "店主会推荐哪家下一站？"],
  };
}

function parseJSON(content) {
  const trimmed = String(content || "").trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
    if (fenced) return JSON.parse(fenced);
    const first = trimmed.indexOf("{");
    const last = trimmed.lastIndexOf("}");
    if (first >= 0 && last > first) return JSON.parse(trimmed.slice(first, last + 1));
    throw new Error("Invalid JSON");
  }
}

async function callDeepSeek(messages) {
  if (!apiKey) throw new Error("API key missing");
  let lastError;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 35000);
    try {
      const response = await nativeFetch(`${apiBase}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: attempt ? 0.18 : 0.35,
          max_tokens: 1600,
          response_format: { type: "json_object" },
        }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`API ${response.status}`);
      const payload = await response.json();
      const content = payload?.choices?.[0]?.message?.content;
      if (!content) throw new Error("Empty response");
      return parseJSON(content);
    } catch (error) {
      lastError = error;
      if (attempt) throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastError;
}

function compactShop(shop) {
  return {
    name: shop.name,
    category: shop.category,
    owner: shop.owner,
    hours: shop.hours,
    story: shop.story,
    storyQuote: shop.storyQuote,
    products: shop.products,
    signatureChoice: shop.signatureChoice,
    solo: shop.solo,
    ordering: shop.ordering,
    etiquette: shop.etiquette,
    commonMisunderstandings: shop.commonMisunderstandings,
    ownerQuestions: shop.ownerQuestions,
    ownerWillNotAnswer: shop.ownerWillNotAnswer,
    petPolicy: shop.petPolicy,
    accessibility: shop.accessibility,
    payment: shop.payment,
    recommendations: shop.recommendations,
    faqs: shop.faqs,
    knowledgeBase: shop.knowledgeBase,
  };
}

async function chatHandler(body) {
  const shop = mergeFacts(getShop(body.shopId), body.additionalFacts);
  if (!shop) return jsonResponse({ error: "店铺不存在" }, 404);
  const messages = Array.isArray(body.messages) ? body.messages.slice(-14) : [];
  const lastUser = [...messages].reverse().find((item) => item.role === "user");
  if (!lastUser) return jsonResponse({ error: "缺少问题" }, 400);
  const intents = classifyUserIntents(lastUser.content);
  const town = getTown(shop.townId);

  let result;
  let mode = "ai";
  try {
    result = await callDeepSeek([
      {
        role: "system",
        content: `你是会客厅的 AI 店铺接待员，不是店主本人。
只依据店主资料回答，不得编造价格、时间、库存、预订或承诺。事实后用“（店主提供：字段）”标记。
资料没有时直接说“店主资料里还没有写”，并给出一个等待店主确认的问题。
只回答最后一条游客消息。本轮意图：${intents.map(intentLabel).join("、")}。
若问题涉及排队/人多/早到，必须直接回答高峰时段，不得转成点单推荐。
若包含多个意图，要逐项回答。输出严格 JSON：
{"reply":"","covered":"full|partial|missing","intent":"","gap_question":null,"fact_refs":[],"followups":[]}

地点：${town?.place?.name || shop.townName}
店主资料：${JSON.stringify(compactShop(shop))}`,
      },
      ...messages,
    ]);
  } catch {
    mode = apiKey ? "offline" : "offline";
    result = offlineReply(shop, messages, intents);
  }

  let normalized = {
    reply: sanitizeReplySources(result.reply).trim(),
    covered: ["full", "partial", "missing"].includes(result.covered)
      ? result.covered
      : "partial",
    intent:
      intents[0] === "general"
        ? String(result.intent || "店铺咨询").slice(0, 20)
        : intents.map(intentLabel).join(" · "),
    gapQuestion: result.gap_question || result.gapQuestion || null,
    factRefs: Array.isArray(result.fact_refs)
      ? result.fact_refs.slice(0, 6).map(cleanFactRef)
      : Array.isArray(result.factRefs)
        ? result.factRefs.slice(0, 6).map(cleanFactRef)
        : [],
    followups: Array.isArray(result.followups) ? result.followups.slice(0, 3) : [],
  };

  if (
    mode === "ai" &&
    !normalized.reply ||
    (mode === "ai" && !validateAnswerForIntents({ intents, reply: normalized.reply }))
  ) {
    normalized = offlineReply(shop, messages, intents);
    mode = "guarded";
  }

  return jsonResponse({ ...normalized, mode });
}

function arrivalCardHandler(body) {
  const shop = mergeFacts(getShop(body.shopId), body.additionalFacts);
  if (!shop) return jsonResponse({ error: "店铺不存在" }, 404);
  const town = getTown(shop.townId);
  const target = getShop(shop.recommendations[0]?.shopId);
  const phrase = town?.place?.phrases?.[0] || { phrase: "慢慢走", meaning: "不着急。" };
  const lastUser =
    [...(body.messages || [])].reverse().find((item) => item.role === "user")?.content || "";
  return jsonResponse({
    card: {
      headline: lastUser.includes("一个人") ? "一个人来，也很好" : "第一次来，这样就好",
      summary: `给第一次走进${shop.name}的你。先做一件小事，再决定要不要多待一会儿。`,
      order: {
        title: "先这样点",
        detail: `${shop.signatureChoice.soloOrder}，约 ${shop.signatureChoice.budget} 元。${shop.signatureChoice.alternative}`,
      },
      seat: {
        title: "一个人的位置",
        detail: `${shop.solo.seating}${shop.solo.bestTime}最合适。`,
      },
      askOwner: {
        title: "可以这样问店主",
        detail: `“${shop.ownerQuestions[0]}”`,
      },
      phrase,
      avoid: {
        title: "避开一个误会",
        detail: shop.commonMisunderstandings[0].correction,
      },
      nextStop: {
        shopId: target?.id || "",
        title: `店主推荐：${target?.name || "下一站"}`,
        detail: shop.recommendations[0]?.reason || "",
      },
      sourceNote: "根据店主确认的资料整理；现场安排以店铺当天说明为准。",
    },
    mode: "standalone",
  });
}

function feedbackHandler(body) {
  return jsonResponse(
    {
      ok: true,
      feedback: {
        id: `feedback-${Date.now()}`,
        shopId: body.shopId,
        helpful: Boolean(body.helpful),
        quote: body.quote?.trim() || "到店卡让我更清楚接下来该怎么做。",
        author: body.author?.trim() || "匿名旅人",
        consent: true,
        createdAt: new Date().toISOString(),
      },
    },
    201,
  );
}

function factHandler(shopId, body, gapId = "") {
  const dashboard = getDashboard(shopId);
  const gap = gapId
    ? dashboard?.gaps.find((item) => item.id === gapId)
    : null;
  const fact = {
    id: `fact-${Date.now()}`,
    category: body.category || gap?.category || "新增资料",
    question: gap?.question || body.question,
    answer: body.answer,
    source: "店主补充",
    addedAt: new Date().toISOString(),
  };
  if (gap) {
    gap.status = "resolved";
    gap.ownerAnswer = body.answer;
  }
  return jsonResponse(
    {
      ok: true,
      fact,
      gap: gap || null,
      dashboard,
    },
    gapId ? 200 : 201,
  );
}

function contentHandler(body) {
  const shop = mergeFacts(getShop(body.shopId), body.additionalFacts);
  const seed = getDashboard(body.shopId)?.contentSeeds.find((item) => item.id === body.seedId);
  if (!shop || !seed) return jsonResponse({ error: "内容种子不存在" }, 404);
  const choice = shop.signatureChoice;
  return jsonResponse({
    mode: "standalone",
    content: {
      title: seed.title,
      format: seed.type,
      body:
        seed.type === "30 秒短视频脚本"
          ? `镜头一：${shop.owner.name}把今天要用的器物放到台面上。\n旁白：第一次来${shop.name}，不用先懂门道。\n镜头二：顾客按“${shop.ordering}”做完第一步。\n旁白：一个人来，可以这样点——${choice.soloOrder}。\n镜头三：店主抬头回答：“${shop.ownerQuestions[0]}”\n收尾：${shop.tagline}`
          : `${shop.tagline}\n\n${seed.angle}\n\n第一次来，可以这样开始：${choice.soloOrder}，约 ${choice.budget} 元。${shop.solo.seating}${shop.hours.display}，${shop.hours.closed}。\n\n不赶时间，也不必装成常客。坐一歇，慢慢来。`,
      cta: `一个人来，先看单人位；可以点${choice.soloOrder}，按自己的节奏进门。`,
      sourceNote: "内容仅使用店主资料中的菜单、时间、座位与店主故事。",
    },
  });
}

async function handleApi(path, options) {
  const body = options?.body ? JSON.parse(options.body) : {};
  if (path === "/api/health") {
    return jsonResponse({
      ok: true,
      aiConfigured: Boolean(apiKey),
      model,
      runtime: {
        regions: world.data.regions.length,
        towns: world.data.towns.length,
        shops: world.data.shops.length,
      },
    });
  }
  if (path === "/api/bootstrap") {
    return jsonResponse(world.data);
  }
  if (path === "/api/chat") return chatHandler(body);
  if (path === "/api/arrival-card") return arrivalCardHandler(body);
  if (path === "/api/feedback") return feedbackHandler(body);
  if (path === "/api/content") return contentHandler(body);

  const merchantMatch = path.match(/^\/api\/merchant\/([^/]+)$/);
  if (merchantMatch) {
    const dashboard = getDashboard(merchantMatch[1]);
    return dashboard
      ? jsonResponse(dashboard)
      : jsonResponse({ error: "店铺不存在" }, 404);
  }

  const gapMatch = path.match(/^\/api\/gaps\/([^/]+)\/answer$/);
  if (gapMatch) return factHandler(body.shopId, body, gapMatch[1]);

  const factMatch = path.match(/^\/api\/shops\/([^/]+)\/facts$/);
  if (factMatch) return factHandler(factMatch[1], body);

  return jsonResponse({ error: "Not found" }, 404);
}

window.fetch = async (input, options = {}) => {
  const raw = typeof input === "string" ? input : input.url;
  const path = raw.startsWith("/api/")
    ? raw.split("?")[0]
    : new URL(raw, window.location.href).pathname;
  if (!path.startsWith("/api/")) return nativeFetch(input, options);
  try {
    return await handleApi(path, options);
  } catch (error) {
    console.error("[standalone api]", error);
    return jsonResponse({ error: "离线处理失败，请重试。" }, 500);
  }
};
