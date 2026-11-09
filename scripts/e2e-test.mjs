const base = process.env.SMOKE_BASE_URL || "http://localhost:8787";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function request(path, options = {}) {
  const response = await fetch(`${base}${path}`, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  const body = await response.json();
  if (!response.ok) throw new Error(`${path}: ${response.status} ${JSON.stringify(body)}`);
  return body;
}

const bootstrap = await request("/api/bootstrap");
assert(bootstrap.regions.length === 3, "Expected 3 regions");
assert(bootstrap.shops.length === 5, "Expected 5 shops");
assert(bootstrap.scenarios.length >= 18, "Expected at least 18 visitor scenarios");
assert(
  bootstrap.shops.every(
    (shop) =>
      shop.liveStatus?.business?.label &&
      shop.liveStatus?.stock?.label &&
      shop.liveStatus?.updatedAt,
  ),
  "Every shop should expose business, stock, and update status",
);

const teaShop = bootstrap.shops.find((shop) => shop.id === "qiaoxi-tea");
assert(teaShop?.knowledgeSummary.total >= 30, "Tea shop should expose a substantial owner knowledge base");

const queueSession = `e2e-queue-${Date.now()}`;
const firstQueueAnswer = await request("/api/chat", {
  method: "POST",
  body: JSON.stringify({
    shopId: "ayuan-noodles",
    sessionId: queueSession,
    messages: [{ role: "user", content: "下午四点需要排队吗？" }],
  }),
});
assert(
  /收门|13:30|营业/.test(firstQueueAnswer.reply),
  "Four o'clock question should mention the shop is closed",
);

const followUpQueueAnswer = await request("/api/chat", {
  method: "POST",
  body: JSON.stringify({
    shopId: "ayuan-noodles",
    sessionId: queueSession,
    messages: [
      { role: "user", content: "下午四点需要排队吗？" },
      { role: "assistant", content: firstQueueAnswer.reply },
      {
        role: "user",
        content: "哦，那什么时候排队的人多？我是不是得早一点来？",
      },
    ],
  }),
});
assert(
  /11:20|12:30|10:30|12:50|高峰|排队/.test(followUpQueueAnswer.reply),
  "Queue follow-up should answer queue timing",
);
assert(
  !/第一次来.*建议这样点/.test(followUpQueueAnswer.reply),
  "Queue follow-up must not fall back to a menu recommendation",
);

const dietaryAnswer = await request("/api/chat", {
  method: "POST",
  body: JSON.stringify({
    shopId: teaShop.id,
    sessionId: `e2e-dietary-${Date.now()}`,
    messages: [{ role: "user", content: "我不吃香菜" }],
  }),
});
assert(dietaryAnswer.reply.includes("香菜"), "Dietary question should answer the ingredient concern");
assert(dietaryAnswer.covered === "full", "Dietary question should use the expanded owner knowledge");

const sessionId = `e2e-${Date.now()}`;
const firstChat = await request("/api/chat", {
  method: "POST",
  body: JSON.stringify({
    shopId: teaShop.id,
    sessionId,
    messages: [
      { role: "user", content: "店里有公用手机支架吗？我想一边看手机一边喝茶。" },
    ],
  }),
});
assert(firstChat.reply.includes("手机支架"), "Known device question should be answered");
assert(firstChat.covered !== "missing", "Known device question should not be a gap");

const gapChat = await request("/api/chat", {
  method: "POST",
  body: JSON.stringify({
    shopId: teaShop.id,
    sessionId,
    messages: [
      { role: "user", content: "店里有公用手机支架吗？我想一边看手机一边喝茶。" },
      { role: "assistant", content: firstChat.reply },
      { role: "user", content: "可以开发票吗？" },
    ],
  }),
});
assert(gapChat.gapQuestion, "Missing invoice policy should surface a gap question");

const arrivalCard = await request("/api/arrival-card", {
  method: "POST",
  body: JSON.stringify({
    shopId: teaShop.id,
    sessionId,
    messages: [{ role: "user", content: "我一个人来，下午想安静坐一会儿。" }],
  }),
});
assert(arrivalCard.card?.order?.detail, "Arrival card should contain an order recommendation");
assert(arrivalCard.card?.nextStop?.shopId, "Arrival card should contain an owner recommendation");

const feedback = await request("/api/feedback", {
  method: "POST",
  body: JSON.stringify({
    shopId: teaShop.id,
    sessionId,
    helpful: true,
    author: "端到端测试",
    quote: "知道吧台可以一个人坐，我更知道怎么进门了。",
    consent: true,
  }),
});
assert(feedback.ok, "Feedback should be saved");

const merchantBefore = await request(`/api/merchant/${teaShop.id}`);
assert(merchantBefore.knowledge.total >= 30, "Merchant should show the expanded owner knowledge total");
assert(merchantBefore.recentQuestions.length >= 2, "Merchant should receive live question themes");
assert(merchantBefore.feedback.some((item) => item.live), "Merchant should show live feedback");

const gapId = merchantBefore.gaps.find((gap) => gap.id === "gap-tea-luggage")?.id;
assert(gapId, "Expected an open merchant gap");

const gapAnswer = await request(`/api/gaps/${gapId}/answer`, {
  method: "POST",
  body: JSON.stringify({
    shopId: teaShop.id,
    answer: "可以短时间放在入口右侧行李架，贵重物品请随身携带。",
  }),
});
assert(gapAnswer.ok, "Gap answer should be saved");
assert(
  gapAnswer.dashboard.knowledge.total === merchantBefore.knowledge.total + 1,
  "Knowledge total should increase after owner input",
);

const customFact = await request(`/api/shops/${teaShop.id}/facts`, {
  method: "POST",
  body: JSON.stringify({
    category: "环保习惯",
    question: "可以自带杯子吗？",
    answer: "可以自带杯，但店内不提供外带热茶；自带杯只用于在店内喝水。",
    confirmedByOwner: true,
  }),
});
assert(customFact.ok, "Free-form owner fact should be saved");
assert(
  customFact.dashboard.knowledge.total === merchantBefore.knowledge.total + 2,
  "Knowledge total should increase after free-form input",
);

const content = await request("/api/content", {
  method: "POST",
  body: JSON.stringify({
    shopId: teaShop.id,
    seedId: "tea-content-01",
  }),
});
assert(content.content?.body, "Content generation should return a body");

const mountainChat = await request("/api/chat", {
  method: "POST",
  body: JSON.stringify({
    shopId: "banshan-tofu",
    sessionId: `e2e-mountain-${Date.now()}`,
    messages: [
      { role: "user", content: "我不吃葱和虾皮，咸豆花可以调整吗？" },
    ],
  }),
});
assert(mountainChat.reply.includes("可以"), "Mountain shop should answer from its own knowledge");

console.log(
  JSON.stringify(
    {
      ok: true,
      regions: bootstrap.regions.length,
      towns: bootstrap.towns.length,
      shops: bootstrap.shops.length,
      scenarios: bootstrap.scenarios.length,
      ownerFactsBefore: merchantBefore.knowledge.total,
      ownerFactsAfterGap: gapAnswer.dashboard.knowledge.total,
      ownerFactsAfterFreeForm: customFact.dashboard.knowledge.total,
      queueRegression: "passed",
      arrivalCard: "generated",
      feedback: "saved",
      content: content.mode,
      mountainReplyMode: mountainChat.mode,
    },
    null,
    2,
  ),
);
