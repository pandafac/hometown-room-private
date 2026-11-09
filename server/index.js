import express from "express";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { callDeepSeek, getAIConfig } from "./ai.js";
import {
  addOwnerFact,
  getDataset,
  getMerchant,
  getRuntimeStats,
  getShop,
  getShopWithDynamicFacts,
  getTown,
  recordArrivalCard,
  recordFeedback,
  recordQuestion,
  resolveGap,
} from "./runtime.js";
import {
  buildArrivalCardMessages,
  buildChatMessages,
  buildContentMessages,
} from "./prompts.js";
import { fallbackArrivalCard, fallbackChat, fallbackContent } from "./fallback.js";
import {
  classifyUserIntents,
  intentLabel,
  validateAnswerForIntents,
} from "./quality.js";

dotenv.config({ path: ".env.local", quiet: true });
dotenv.config({ quiet: true });

const app = express();
const port = Number(process.env.PORT || 8787);
const dirname = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.resolve(dirname, "..", "dist");

app.disable("x-powered-by");
app.use(express.json({ limit: "120kb" }));

function safeMessages(messages) {
  if (!Array.isArray(messages)) return [];
  return messages
    .filter(
      (item) =>
        item &&
        ["user", "assistant"].includes(item.role) &&
        typeof item.content === "string" &&
        item.content.trim(),
    )
    .slice(-14)
    .map((item) => ({
      role: item.role,
      content: item.content.trim().slice(0, 1600),
    }));
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

function mergeAdditionalFacts(shop, facts) {
  if (!shop || !Array.isArray(facts)) return shop;
  const extras = facts
    .filter(
      (item) =>
        item &&
        typeof item.question === "string" &&
        typeof item.answer === "string" &&
        item.question.trim() &&
        item.answer.trim(),
    )
    .slice(-20)
    .map((item, index) => ({
      id: `local-fact-${index}-${String(item.id || "").slice(0, 30)}`,
      category: String(item.category || "新增资料").slice(0, 24),
      question: item.question.trim().slice(0, 180),
      answer: item.answer.trim().slice(0, 500),
      source: "店主补充",
    }));
  shop.knowledgeBase = [...shop.knowledgeBase, ...extras];
  return shop;
}

function enrichRecommendations(shop) {
  const clone = structuredClone(shop);
  clone.recommendations = clone.recommendations.map((item) => ({
    ...item,
    targetShopName: getShop(item.shopId)?.name || "",
  }));
  return clone;
}

app.get("/api/health", (_req, res) => {
  const ai = getAIConfig();
  res.json({
    ok: true,
    aiConfigured: ai.configured,
    model: ai.model,
    runtime: getRuntimeStats(),
  });
});

app.get("/api/bootstrap", (_req, res) => {
  const data = getDataset();
  res.json({
    ...data,
    ai: {
      configured: getAIConfig().configured,
      model: getAIConfig().model,
    },
  });
});

app.get("/api/merchant/:shopId", (req, res) => {
  const dashboard = getMerchant(req.params.shopId);
  if (!dashboard) return res.status(404).json({ error: "店铺不存在" });
  res.json(dashboard);
});

app.post("/api/chat", async (req, res) => {
  const { shopId, sessionId, messages, additionalFacts } = req.body || {};
  const shop = mergeAdditionalFacts(
    getShopWithDynamicFacts(shopId),
    additionalFacts,
  );
  if (!shop) return res.status(404).json({ error: "店铺不存在" });
  const town = getTown(shop.townId);
  if (!town) return res.status(404).json({ error: "小镇不存在" });
  const safe = safeMessages(messages);
  const lastUser = [...safe].reverse().find((item) => item.role === "user");
  if (!lastUser) return res.status(400).json({ error: "缺少游客问题" });
  const intentHints = classifyUserIntents(lastUser.content);

  let result;
  let mode = "ai";
  try {
    result = await callDeepSeek({
      messages: buildChatMessages({
        shop: enrichRecommendations(shop),
        place: town.place,
        messages: safe,
        intentHints,
      }),
    });
    if (!result?.reply) throw new Error("Invalid chat JSON");
  } catch (error) {
    mode = "fallback";
    result = fallbackChat({ shopId, messages: safe, shop });
    console.warn("[chat fallback]", error.message);
  }

  let normalized = {
    reply: sanitizeReplySources(result.reply).trim(),
    covered: ["full", "partial", "missing"].includes(result.covered)
      ? result.covered
      : "partial",
    intent:
      intentHints[0] === "general"
        ? String(result.intent || "其他问题").slice(0, 20)
        : intentHints.map(intentLabel).join(" · "),
    gapQuestion: result.gap_question || result.gapQuestion || null,
    factRefs: Array.isArray(result.fact_refs)
      ? result.fact_refs.slice(0, 6).map(cleanFactRef)
      : Array.isArray(result.factRefs)
        ? result.factRefs.slice(0, 6).map(cleanFactRef)
        : [],
    followups: Array.isArray(result.followups)
      ? result.followups.slice(0, 3).map(String)
      : [],
  };

  if (
    mode === "ai" &&
    !validateAnswerForIntents({ intents: intentHints, reply: normalized.reply })
  ) {
    normalized = fallbackChat({
      shopId,
      messages: safe,
      intents: intentHints,
      shop,
    });
    mode = "guarded";
    console.warn(
      `[chat guard] replaced off-topic reply for intents "${intentHints.join(",")}" at shop "${shopId}"`,
    );
  }

  recordQuestion({
    sessionId: sessionId || `session-${Date.now()}`,
    shopId,
    text: lastUser.content,
    intent: normalized.intent,
    coverage: normalized.covered,
    gapQuestion: normalized.gapQuestion,
    followups: normalized.followups,
  });

  res.json({ ...normalized, mode });
});

app.post("/api/arrival-card", async (req, res) => {
  const { shopId, sessionId, messages, additionalFacts } = req.body || {};
  const shop = mergeAdditionalFacts(
    getShopWithDynamicFacts(shopId),
    additionalFacts,
  );
  if (!shop) return res.status(404).json({ error: "店铺不存在" });
  const town = getTown(shop.townId);
  if (!town) return res.status(404).json({ error: "小镇不存在" });
  const safe = safeMessages(messages);
  let card;
  let mode = "ai";

  try {
    card = await callDeepSeek({
      messages: buildArrivalCardMessages({
        shop: enrichRecommendations(shop),
        place: town.place,
        messages: safe,
      }),
      temperature: 0.28,
      maxTokens: 2200,
    });
    if (!card?.headline) throw new Error("Invalid arrival card JSON");
  } catch (error) {
    mode = "fallback";
    card = fallbackArrivalCard({ shopId, messages: safe });
    console.warn("[arrival card fallback]", error.message);
  }

  recordArrivalCard(shopId, sessionId || null);
  const target = getShop(card.nextStop?.shopId);
  if (target && !card.nextStop?.title) {
    card.nextStop.title = `店主推荐：${target.name}`;
  }
  res.json({ card, mode });
});

app.post("/api/feedback", (req, res) => {
  try {
    const feedback = recordFeedback(req.body || {});
    res.status(201).json({ ok: true, feedback });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/gaps/:gapId/answer", (req, res) => {
  const { shopId, answer } = req.body || {};
  if (!shopId || typeof answer !== "string" || answer.trim().length < 2) {
    return res.status(400).json({ error: "请填写店主回答" });
  }
  const result = resolveGap({
    shopId,
    gapId: req.params.gapId,
    answer: answer.trim().slice(0, 500),
    published: true,
  });
  if (!result) return res.status(404).json({ error: "待补充问题不存在" });
  res.json({ ok: true, ...result });
});

app.post("/api/shops/:shopId/facts", (req, res) => {
  const { category, question, answer, confirmedByOwner } = req.body || {};
  if (
    typeof question !== "string" ||
    question.trim().length < 2 ||
    typeof answer !== "string" ||
    answer.trim().length < 2
  ) {
    return res.status(400).json({ error: "请填写问题和店主回答" });
  }
  if (!confirmedByOwner) {
    return res.status(400).json({ error: "请确认这条资料来自店主" });
  }
  try {
    const result = addOwnerFact({
      shopId: req.params.shopId,
      category,
      question,
      answer,
      confirmedByOwner,
    });
    if (!result) return res.status(404).json({ error: "店铺不存在" });
    res.status(201).json({ ok: true, ...result });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/content", async (req, res) => {
  const { shopId, seedId, additionalFacts } = req.body || {};
  const shop = mergeAdditionalFacts(
    getShopWithDynamicFacts(shopId),
    additionalFacts,
  );
  const dashboard = getMerchant(shopId);
  const seed = dashboard?.contentSeeds.find((item) => item.id === seedId);
  if (!shop || !dashboard || !seed) {
    return res.status(404).json({ error: "店铺或内容种子不存在" });
  }
  const town = getTown(shop.townId);
  if (!town) return res.status(404).json({ error: "小镇不存在" });

  let content;
  let mode = "ai";
  try {
    content = await callDeepSeek({
      messages: buildContentMessages({
        shop,
        place: town.place,
        seed,
        feedback: dashboard.feedback,
        recentQuestions: dashboard.recentQuestions,
      }),
      temperature: 0.55,
      maxTokens: 2200,
    });
    if (!content?.body) throw new Error("Invalid content JSON");
  } catch (error) {
    mode = "fallback";
    content = fallbackContent({ shopId, seed });
    console.warn("[content fallback]", error.message);
  }
  res.json({ content, mode });
});

if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.use((req, res, next) => {
    if (req.method === "GET" && !req.path.startsWith("/api/")) {
      const indexHtml = fs.readFileSync(path.join(distPath, "index.html"), "utf8");
      return res.status(200).type("html").send(indexHtml);
    }
    next();
  });
}

app.use((error, _req, res, _next) => {
  console.error("[server error]", error.message);
  res.status(500).json({ error: "服务暂时没有回应，请稍后重试。" });
});

if (!process.env.VERCEL) {
  app.listen(port, () => {
    const ai = getAIConfig();
    console.log(`Hometown Room API running at http://localhost:${port}`);
    console.log(
      `DeepSeek: ${ai.configured ? `${ai.model} configured` : "not configured; fallback mode"}`,
    );
  });
}

export default app;
