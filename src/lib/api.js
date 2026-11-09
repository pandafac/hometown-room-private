async function request(path, options = {}) {
  const response = await fetch(path, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new Error(payload?.error || `请求失败（${response.status}）`);
  }

  return payload;
}

export const api = {
  bootstrap: () => request("/api/bootstrap"),
  health: () => request("/api/health"),
  chat: (body) =>
    request("/api/chat", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  arrivalCard: (body) =>
    request("/api/arrival-card", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  feedback: (body) =>
    request("/api/feedback", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  merchant: (shopId) => request(`/api/merchant/${shopId}`),
  answerGap: (gapId, body) =>
    request(`/api/gaps/${gapId}/answer`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  addFact: (shopId, body) =>
    request(`/api/shops/${shopId}/facts`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  content: (body) =>
    request("/api/content", {
      method: "POST",
      body: JSON.stringify(body),
    }),
};
