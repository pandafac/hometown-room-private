import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(dirname, "data");
const catalog = JSON.parse(fs.readFileSync(path.join(dataDir, "catalog.json"), "utf8"));
const ownerKnowledge = JSON.parse(
  fs.readFileSync(path.join(dataDir, "owner-knowledge.json"), "utf8"),
);
const ownerKnowledgeExtra = JSON.parse(
  fs.readFileSync(path.join(dataDir, "owner-knowledge-extra.json"), "utf8"),
);
const gapFactResolutions = {
  "gap-tea-wifi": "tea-extra-05",
  "gap-tea-luggage": "tea-extra-08",
  "gap-bamboo-restroom": "bamboo-extra-13",
  "gap-tofu-takeaway": "tofu-extra-08",
  "gap-songfeng-wifi": "songfeng-extra-01",
  "gap-songfeng-luggage": "songfeng-extra-10",
};

function mergedKnowledge(shopId) {
  const combined = [
    ...(ownerKnowledge[shopId] || []),
    ...(ownerKnowledgeExtra[shopId] || []),
  ];
  const seen = new Set();
  return combined.filter((fact) => {
    if (!fact?.id || seen.has(fact.id)) return false;
    seen.add(fact.id);
    return true;
  });
}

const townEntries = [];
for (const region of catalog.regions) {
  for (const town of region.towns) {
    if (!town.dataFile) continue;
    const source = JSON.parse(fs.readFileSync(path.join(dataDir, town.dataFile), "utf8"));
    const shops = source.shops.map((shop) => ({
      ...shop,
      regionId: region.id,
      regionName: region.name,
      townId: town.id,
      townName: town.name,
      knowledgeBase: structuredClone(mergedKnowledge(shop.id)),
    }));
    const scenarios = source.visitorScenarios.map((scenario) => ({
      ...scenario,
      regionId: region.id,
      townId: town.id,
    }));
    townEntries.push({
      id: town.id,
      name: town.name,
      subtitle: town.subtitle,
      description: town.description,
      status: town.status,
      tags: town.tags,
      heroNote: town.heroNote,
      coverQuote: town.coverQuote,
      regionId: region.id,
      regionName: region.name,
      place: source.place,
      shops,
      scenarios,
      merchantSeeds: source.merchantSeeds,
    });
  }
}

const state = {
  towns: structuredClone(townEntries),
  sessions: new Map(),
  questions: [],
  feedback: [],
  arrivalCards: [],
};

const stateShopMap = new Map();
for (const town of state.towns) {
  for (const shop of town.shops) {
    stateShopMap.set(shop.id, shop);
  }
}

function publicRegion(region) {
  const towns = region.towns.map((town) => {
    const loaded = state.towns.find((item) => item.id === town.id);
    return {
      ...structuredClone(town),
      shopCount: loaded?.shops.length || 0,
      shops:
        loaded?.shops.map((shop) => ({
          id: shop.id,
          name: shop.name,
          stamp: shop.stamp,
          category: shop.category,
        })) || [],
    };
  });

  return {
    ...structuredClone(region),
    towns,
    townCount: towns.length,
    shopCount: towns.reduce((sum, town) => sum + town.shopCount, 0),
  };
}

export function getDataset() {
  const yunxi = state.towns.find((town) => town.id === "yunxi");
  return {
    meta: {
      ...structuredClone(catalog.meta),
      regionCount: catalog.regions.length,
      shopCount: stateShopMap.size,
      townCount: state.towns.length,
    },
    regions: catalog.regions.map(publicRegion),
    towns: state.towns.map((town) => ({
      id: town.id,
      name: town.name,
      regionId: town.regionId,
      regionName: town.regionName,
      subtitle: town.subtitle,
      description: town.description,
      tags: town.tags,
      heroNote: town.heroNote,
      coverQuote: town.coverQuote,
      place: structuredClone(town.place),
      shopCount: town.shops.length,
    })),
    shops: getPublicShops(),
    scenarios: state.towns.flatMap((town) => structuredClone(town.scenarios)),
    place: yunxi ? structuredClone(yunxi.place) : null,
  };
}

export function getPublicShops() {
  return [...stateShopMap.values()].map((shop) => ({
    ...structuredClone(shop),
    knowledgeSummary: {
      total: shop.knowledgeBase.length,
      categories: summarizeCategories(shop.knowledgeBase),
    },
    testimonials: shop.testimonials.map((item) => ({
      ...item,
      sourceLabel: "体验回声 · 演示预置",
    })),
  }));
}

export function getShop(shopId) {
  return stateShopMap.get(shopId) || null;
}

export function getShopWithDynamicFacts(shopId) {
  const shop = getShop(shopId);
  return shop ? structuredClone(shop) : null;
}

export function getTown(townId) {
  const town = state.towns.find((item) => item.id === townId);
  return town ? structuredClone(town) : null;
}

export function getRegion(regionId) {
  const region = catalog.regions.find((item) => item.id === regionId);
  return region ? publicRegion(region) : null;
}

export function getMerchant(shopId) {
  const shop = getShop(shopId);
  const town = state.towns.find((item) => item.id === shop?.townId);
  const seed = town?.merchantSeeds?.[shopId];
  if (!shop || !seed) return null;

  const liveQuestions = state.questions.filter((item) => item.shopId === shopId);
  const liveFeedback = state.feedback.filter((item) => item.shopId === shopId);
  const liveSessions = [...state.sessions.values()].filter((item) => item.shopId === shopId);
  const cardCount = state.arrivalCards.filter((item) => item.shopId === shopId).length;
  const feedbackHelpful = liveFeedback.filter((item) => item.helpful).length;
  const liveAnswered = liveSessions.filter((item) => item.lastCoverage !== "missing").length;

  const clusterMap = new Map(seed.questionClusters.map((item) => [item.label, { ...item }]));
  for (const question of liveQuestions) {
    const label = question.intent || "其他问题";
    const existing = clusterMap.get(label);
    if (existing) {
      existing.count += 1;
      existing.trend += 1;
    } else {
      clusterMap.set(label, {
        label,
        count: 1,
        trend: 1,
        example: question.text,
      });
    }
  }

  const helpfulBaseSessions = Math.round(
    (seed.summary.conversations * seed.summary.helpfulRate) / 100,
  );
  const helpfulRate = Math.round(
    ((helpfulBaseSessions + feedbackHelpful) /
      Math.max(
        1,
        seed.summary.conversations +
          liveFeedback.length +
          Math.max(0, liveSessions.length - liveAnswered),
      )) *
      100,
  );
  const gaps = seed.gaps.map((gap) => {
    const factId = gapFactResolutions[gap.id];
    const fact = factId && shop.knowledgeBase.find((item) => item.id === factId);
    return gap.status === "open" && fact
      ? { ...gap, status: "resolved", ownerAnswer: fact.answer }
      : gap;
  });

  return {
    shop: {
      id: shop.id,
      name: shop.name,
      stamp: shop.stamp,
      owner: shop.owner,
      lastUpdated: shop.lastUpdated,
      regionId: shop.regionId,
      regionName: shop.regionName,
      townId: shop.townId,
      townName: shop.townName,
    },
    period: seed.period,
    summary: {
      conversations: seed.summary.conversations + liveSessions.length,
      arrivalCards: seed.summary.arrivalCards + cardCount,
      helpfulRate: Math.min(99, helpfulRate),
      unresolved: gaps.filter((gap) => gap.status === "open").length,
    },
    questionClusters: [...clusterMap.values()].sort((a, b) => b.count - a.count),
    gaps,
    feedback: [
      ...liveFeedback.map((item) => ({
        author: item.author || "匿名旅人",
        quote: item.quote,
        tag: "刚刚提交",
        live: true,
      })),
      ...seed.feedback,
    ],
    contentSeeds: seed.contentSeeds,
    recentQuestions: liveQuestions.slice(-8).reverse(),
    knowledge: buildKnowledgeDashboard(shop),
  };
}

function summarizeCategories(knowledgeBase) {
  const counts = new Map();
  for (const item of knowledgeBase) {
    counts.set(item.category, (counts.get(item.category) || 0) + 1);
  }
  return [...counts.entries()].map(([category, count]) => ({ category, count }));
}

function buildKnowledgeDashboard(shop) {
  const profileChecks = [
    shop.story,
    shop.products?.length,
    shop.hours?.display,
    shop.signatureChoice?.soloOrder,
    shop.solo?.seating,
    shop.ordering,
    shop.etiquette?.length,
    shop.commonMisunderstandings?.length,
    shop.ownerQuestions?.length,
    shop.ownerWillNotAnswer?.length,
    shop.petPolicy,
    shop.accessibility,
    shop.payment,
    shop.knowledgeBase?.length,
  ];
  const completed = profileChecks.filter(Boolean).length;
  return {
    total: shop.knowledgeBase.length,
    categories: summarizeCategories(shop.knowledgeBase),
    completeness: Math.round((completed / profileChecks.length) * 100),
    recent: shop.knowledgeBase.slice(-10).reverse(),
  };
}

export function recordQuestion({
  sessionId,
  shopId,
  text,
  intent,
  coverage,
  gapQuestion,
  followups,
}) {
  const now = new Date().toISOString();
  state.questions.push({
    id: `question-${state.questions.length + 1}`,
    sessionId,
    shopId,
    text,
    intent: intent || "其他问题",
    coverage,
    gapQuestion: gapQuestion || null,
    followups: followups || [],
    createdAt: now,
  });

  const session = state.sessions.get(sessionId) || {
    sessionId,
    shopId,
    startedAt: now,
    turns: 0,
    lastCoverage: coverage,
  };
  session.turns += 1;
  session.lastActiveAt = now;
  session.lastCoverage = coverage;
  state.sessions.set(sessionId, session);
}

export function recordFeedback({ shopId, sessionId, helpful, quote, author, consent }) {
  if (!shopId || !consent) {
    throw new Error("Feedback requires shopId and consent");
  }
  const cleanQuote = typeof quote === "string" ? quote.trim().slice(0, 180) : "";
  const item = {
    id: `feedback-${state.feedback.length + 1}`,
    shopId,
    sessionId: sessionId || null,
    helpful: Boolean(helpful),
    quote:
      cleanQuote ||
      (helpful
        ? "到店卡让我更清楚接下来该怎么做。"
        : "我还是有些地方不太确定。"),
    author:
      typeof author === "string" && author.trim()
        ? author.trim().slice(0, 20)
        : "匿名旅人",
    consent: true,
    simulated: false,
    createdAt: new Date().toISOString(),
  };
  state.feedback.push(item);
  return item;
}

export function recordArrivalCard(shopId, sessionId) {
  state.arrivalCards.push({
    shopId,
    sessionId,
    createdAt: new Date().toISOString(),
  });
}

export function resolveGap({ shopId, gapId, answer, published = true }) {
  const shop = getShop(shopId);
  const town = state.towns.find((item) => item.id === shop?.townId);
  const merchant = town?.merchantSeeds?.[shopId];
  if (!shop || !merchant) return null;
  const gap = merchant.gaps.find((item) => item.id === gapId);
  if (!gap) return null;

  gap.status = "resolved";
  gap.resolvedAt = new Date().toISOString();
  gap.ownerAnswer = answer;
  gap.published = Boolean(published);
  shop.lastUpdated = new Date().toISOString().slice(0, 10);

  const fact = {
    id: `fact-${shop.knowledgeBase.length + 1}`,
    question: gap.question,
    answer,
    category: gap.category || "新增资料",
    source: "店主补充",
    addedAt: gap.resolvedAt,
  };
  shop.knowledgeBase.push(fact);
  shop.faqs.push(fact);

  return {
    gap,
    fact,
    dashboard: getMerchant(shopId),
  };
}

export function addOwnerFact({
  shopId,
  category,
  question,
  answer,
  confirmedByOwner = true,
}) {
  const shop = getShop(shopId);
  if (!shop) return null;
  if (!confirmedByOwner) {
    throw new Error("新增资料需要店主确认");
  }
  const now = new Date().toISOString();
  const fact = {
    id: `fact-${shop.knowledgeBase.length + 1}`,
    category: String(category || "新增资料").slice(0, 24),
    question: String(question).trim().slice(0, 180),
    answer: String(answer).trim().slice(0, 500),
    source: "店主补充",
    addedAt: now,
  };
  shop.knowledgeBase.push(fact);
  shop.faqs.push(fact);
  shop.lastUpdated = now.slice(0, 10);
  return {
    fact,
    dashboard: getMerchant(shopId),
  };
}

export function getRuntimeStats() {
  return {
    regions: catalog.regions.length,
    towns: state.towns.length,
    shops: stateShopMap.size,
    sessions: state.sessions.size,
    questions: state.questions.length,
    feedback: state.feedback.length,
    arrivalCards: state.arrivalCards.length,
  };
}
