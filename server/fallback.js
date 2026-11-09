import { getShop, getTown } from "./runtime.js";
import { classifyUserIntent, intentLabel } from "./quality.js";

function containsAny(text, words) {
  return words.some((word) => text.includes(word));
}

function findKnowledge(shop, text, terms) {
  const candidates = [...shop.knowledgeBase, ...shop.faqs].filter(
    (item) => item?.question && item?.answer,
  );
  return (
    candidates.find((item) =>
      terms.some(
        (term) =>
          text.includes(term) &&
          (item.question.includes(term) || item.answer.includes(term)),
      ),
    ) || null
  );
}

function knowledgeReply(fact, category, followups) {
  const source = fact.source || "店主提供";
  return {
    reply: `${fact.answer}（${source}：${fact.category || category}）`,
    covered: "full",
    intent: fact.category || category,
    gap_question: null,
    fact_refs: [fact.category || category],
    followups,
  };
}

export function fallbackChat({
  shopId,
  messages,
  intent: suppliedIntent,
  intents,
  shop: providedShop,
}) {
  const shop = providedShop || getShop(shopId);
  if (!shop) throw new Error("Shop not found");
  const lastUser = [...messages].reverse().find((item) => item.role === "user")?.content || "";
  const text = lastUser.toLowerCase();
  const detectedIntents =
    intents?.length ? intents : suppliedIntent ? [suppliedIntent] : [classifyUserIntent(text)];
  const intent = detectedIntents[0];

  if (intent === "queue") {
    const queueFact = findKnowledge(shop, text, ["排队", "高峰", "人多", "错峰", "等位"]);
    const queueDetail = queueFact?.answer || `${shop.hours.busy}；${shop.hours.soloFriendly}。`;
    return {
      reply: `${shop.hours.display}，${shop.hours.closed}。${queueDetail}（店主提供：排队与高峰）`,
      covered: "full",
      intent: "排队与高峰",
      gap_question: null,
      fact_refs: ["营业时间", "排队与高峰"],
      followups: ["第一次来怎么点？", "吃完后下一站去哪？"],
    };
  }

  if (intent === "hours") {
    return {
      reply: `${shop.hours.display}；${shop.hours.closed}。${shop.hours.note}（店主提供：营业时间）`,
      covered: "full",
      intent: "营业时间",
      gap_question: null,
      fact_refs: ["营业时间"],
      followups: ["哪个时段人少一点？", "第一次来怎么点？"],
    };
  }

  if (intent === "recommendation") {
    const rec = shop.recommendations[0];
    const target = getShop(rec.shopId);
    return {
      reply: `${shop.owner.name}推荐下一站去${target?.name || "附近小店"}：${rec.reason}${rec.context}（店主提供：店主推荐）`,
      covered: "full",
      intent: "下一站推荐",
      gap_question: null,
      fact_refs: ["店主推荐"],
      followups: ["下一站一个人去也合适吗？", "先在本店怎么安排？"],
    };
  }

  if (intent === "reservation") {
    const fact = findKnowledge(shop, text, ["预约", "订位", "留位", "保留", "占座"]);
    if (fact) {
      return knowledgeReply(fact, "预约与留位", ["什么时候人少一点？", "一个人怎么坐？"]);
    }
    return {
      reply: "店主资料里没有预约留位服务，不能承诺固定座位；请到店后按现场安排。",
      covered: "partial",
      intent: "预约与留位",
      gap_question: "是否提供预约或留位服务？",
      fact_refs: ["到店规则"],
      followups: ["哪个时段人少一点？", "一个人怎么坐？"],
    };
  }

  if (intent === "pet") {
    const fact = findKnowledge(shop, text, ["宠物", "狗", "猫", "导盲犬"]);
    if (fact) return knowledgeReply(fact, "宠物政策", ["有行李寄存吗？", "一个人怎么坐？"]);
    return {
      reply: `${shop.petPolicy}（店主提供：宠物政策）`,
      covered: shop.petPolicy.includes("未写明") ? "partial" : "full",
      intent: "宠物政策",
      gap_question: shop.petPolicy.includes("未写明") ? "可以带宠物进店吗？" : null,
      fact_refs: ["宠物政策"],
      followups: ["我拖着行李方便进去吗？", "如果一个人来，应该坐哪里？"],
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
    if (fact) {
      return knowledgeReply(fact, "忌口与食材", [
        "第一次来怎么点？",
        "可以一个人坐哪里？",
      ]);
    }
    return {
      reply: "店主资料里还没有写这项忌口或食材信息，我不会替你猜；请把具体忌口留给店主确认。",
      covered: "missing",
      intent: "忌口与食材",
      gap_question: lastUser,
      fact_refs: [],
      followups: ["第一次来怎么点？", "可以一个人坐哪里？"],
    };
  }

  if (intent === "menu") {
    const choice = shop.signatureChoice;
    return {
      reply: `第一次来，店主建议这样点：${choice.soloOrder}，大约 ${choice.budget} 元。${choice.reason}${choice.alternative}（店主提供：菜单与点单建议）`,
      covered: "full",
      intent: "第一次怎么点",
      gap_question: null,
      fact_refs: ["菜单", "店主点单建议"],
      followups: ["我一个人应该坐哪里？", "吃完后下一站去哪？"],
    };
  }

  if (intent === "solo") {
    const menuAddition = detectedIntents.includes("menu")
      ? `第一次来可以点${shop.signatureChoice.soloOrder}，约 ${shop.signatureChoice.budget} 元。`
      : "";
    return {
      reply: `一个人来不用特意解释。${shop.solo.seating}${shop.solo.bestTime}最从容；${shop.solo.comfortNote}${menuAddition}（店主提供：单人座位${menuAddition ? "、菜单" : ""}）`,
      covered: "full",
      intent: "独行与座位",
      gap_question: null,
      fact_refs: ["单人座位", "安静时段"],
      followups: ["第一次来怎么点？", "可以问店主什么问题？"],
    };
  }

  if (intent === "story") {
    return {
      reply: `${shop.story} 店主原话是：“${shop.storyQuote.replaceAll("“", "").replaceAll("”", "")}”（店主提供：店铺故事）`,
      covered: "full",
      intent: "家乡故事",
      gap_question: null,
      fact_refs: ["店铺故事"],
      followups: ["可以问店主什么问题？", "第一次来怎么点？"],
    };
  }

  if (intent === "facilities") {
    const terms = [
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
    ];
    const fact = findKnowledge(shop, text, terms);
    if (fact) {
      return knowledgeReply(fact, "设施与便利", ["那一个人怎么坐？", "附近还有哪里可以去？"]);
    }
    if (containsAny(text, ["wifi", "wi-fi", "插座", "电脑", "办公"])) {
      return {
        reply:
          "店主资料里还没有写 Wi-Fi、插座和电脑使用规则，这个问题会留给店主补充。可以先按已确认的座位规则安排。",
        covered: "missing",
        intent: "办公设施",
        gap_question: "店里有 Wi-Fi 和插座吗？适合带电脑吗？",
        fact_refs: [],
        followups: ["那一个人怎么坐？", "第一次来怎么点？"],
      };
    }
    return {
      reply: "店主资料里还没有写这项设施信息，不能替你猜，我会把这个问题留给店主补充。",
      covered: "missing",
      intent: "设施与便利",
      gap_question: lastUser,
      fact_refs: [],
      followups: ["那一个人怎么坐？", "第一次来怎么点？"],
    };
  }

  if (intent === "etiquette") {
    const item = shop.commonMisunderstandings[0];
    return {
      reply: `${item.correction}（店主提供：常见误会）另外，${shop.etiquette[0]}。`,
      covered: "full",
      intent: "礼仪与误会",
      gap_question: null,
      fact_refs: ["常见误会", "店内礼仪"],
      followups: ["第一次来怎么点？", "我一个人应该坐哪里？"],
    };
  }

  return {
    reply: `${shop.shortDescription}你想先问怎么点、一个人坐哪里，还是进门后的顺序？（店主提供：店铺资料）`,
    covered: "partial",
    intent: intentLabel(intent),
    gap_question: null,
    fact_refs: ["店铺资料"],
    followups: ["第一次来怎么点？", "我一个人应该坐哪里？", "店主会推荐哪家下一站？"],
  };
}

export function fallbackArrivalCard({ shopId, messages }) {
  const shop = getShop(shopId);
  const town = getTown(shop.townId);
  const place = town.place;
  const target = getShop(shop.recommendations[0].shopId);
  const phrase = place.phrases[0];
  const lastUser = [...messages].reverse().find((item) => item.role === "user")?.content || "";

  return {
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
    phrase: {
      phrase: phrase.phrase,
      meaning: phrase.meaning,
    },
    avoid: {
      title: "避开一个误会",
      detail: shop.commonMisunderstandings[0].correction,
    },
    nextStop: {
      shopId: target?.id || "",
      title: `店主推荐：${target?.name || "下一站"}`,
      detail: shop.recommendations[0].reason,
    },
    sourceNote: "本卡根据店主提供的资料与本次对话由 AI 整理。现场营业、库存与安排以店铺当天说明为准。",
  };
}

export function fallbackContent({ shopId, seed }) {
  const shop = getShop(shopId);
  const choice = shop.signatureChoice;
  const firstQuestion = shop.ownerQuestions[0];
  return {
    title: seed.title,
    format: seed.type,
    body:
      seed.type === "30 秒短视频脚本"
        ? `镜头一：${shop.owner.name}把今天要用的器物放到台面上。\n旁白：第一次来${shop.name}，不用先懂门道。\n镜头二：顾客按“${shop.ordering}”做完第一步。\n旁白：一个人来，可以这样点——${choice.soloOrder}。\n镜头三：店主抬头，回答一句“${firstQuestion}”。\n收尾：${shop.tagline}`
        : `${shop.tagline}\n\n${seed.angle}\n\n第一次来，可以这样开始：${choice.soloOrder}，约 ${choice.budget} 元。${shop.solo.seating}${shop.hours.display}，${shop.hours.closed}。\n\n不赶时间，也不必装成常客。坐一歇，慢慢来。`,
    cta: `如果你是第一次来，先把这张卡看完：${choice.soloOrder}，然后按自己的节奏进门。`,
    sourceNote: "内容仅使用店主资料中的菜单、时间、座位与店主故事。",
  };
}
