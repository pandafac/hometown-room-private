const PREFIX = "hometown-room:demo:1:";

function read(key, fallback) {
  try {
    const value = localStorage.getItem(`${PREFIX}${key}`);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(`${PREFIX}${key}`, JSON.stringify(value));
  } catch {
    // The app still works when storage is unavailable or full.
  }
}

function uniqueBy(items, keyFn) {
  const seen = new Set();
  return items.filter((item) => {
    const key = keyFn(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function getLocalFacts(shopId) {
  return read(`facts:${shopId}`, []);
}

export function addLocalFact(shopId, fact) {
  const current = getLocalFacts(shopId);
  const next = uniqueBy([fact, ...current], (item) => item.id || `${item.question}|${item.answer}`).slice(
    0,
    40,
  );
  write(`facts:${shopId}`, next);
}

export function getLocalQuestions(shopId) {
  return read(`questions:${shopId}`, []);
}

export function addLocalQuestion(shopId, question) {
  const current = getLocalQuestions(shopId);
  const next = uniqueBy([question, ...current], (item) => item.id).slice(0, 40);
  write(`questions:${shopId}`, next);
}

export function getLocalFeedback(shopId) {
  return read(`feedback:${shopId}`, []);
}

export function addLocalFeedback(shopId, feedback) {
  const current = getLocalFeedback(shopId);
  const next = uniqueBy(
    [feedback, ...current],
    (item) => `${item.author}|${item.quote}|${item.createdAt || ""}`,
  ).slice(0, 40);
  write(`feedback:${shopId}`, next);
}

export function mergeDashboardWithLocal(dashboard) {
  const shopId = dashboard.shop.id;
  const facts = getLocalFacts(shopId);
  const questions = getLocalQuestions(shopId);
  const feedback = getLocalFeedback(shopId);

  const knowledgeRecent = uniqueBy(
    [...facts, ...(dashboard.knowledge?.recent || [])],
    (item) => item.id || `${item.question}|${item.answer}`,
  ).slice(0, 10);
  const categoryMap = new Map(
    (dashboard.knowledge?.categories || []).map((item) => [item.category, item.count]),
  );
  for (const fact of facts) {
    categoryMap.set(fact.category || "新增资料", (categoryMap.get(fact.category || "新增资料") || 0) + 1);
  }

  const gaps = (dashboard.gaps || []).map((gap) => {
    const matchedFact = facts.find(
      (fact) => fact.question?.trim() === gap.question?.trim(),
    );
    return matchedFact
      ? { ...gap, status: "resolved", ownerAnswer: matchedFact.answer }
      : gap;
  });

  return {
    ...dashboard,
    summary: {
      ...dashboard.summary,
      unresolved: gaps.filter((gap) => gap.status === "open").length,
    },
    gaps,
    recentQuestions: uniqueBy(
      [...questions, ...(dashboard.recentQuestions || [])],
      (item) => item.id || `${item.text}|${item.createdAt}`,
    ).slice(0, 8),
    feedback: uniqueBy(
      [
        ...feedback.map((item) => ({
          author: item.author || "匿名旅人",
          quote: item.quote,
          tag: "刚刚提交",
          live: true,
        })),
        ...(dashboard.feedback || []),
      ],
      (item) => `${item.author}|${item.quote}`,
    ),
    knowledge: {
      ...dashboard.knowledge,
      total: (dashboard.knowledge?.total || 0) + facts.filter(
        (fact) =>
          !(dashboard.knowledge?.recent || []).some(
            (serverFact) =>
              serverFact.id === fact.id ||
              (serverFact.question === fact.question && serverFact.answer === fact.answer),
          ),
      ).length,
      categories: [...categoryMap.entries()].map(([category, count]) => ({
        category,
        count,
      })),
      recent: knowledgeRecent,
    },
  };
}
