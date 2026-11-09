const base = process.env.SMOKE_BASE_URL || "http://localhost:8787";

async function get(path) {
  const response = await fetch(`${base}${path}`);
  const body = await response.json();
  if (!response.ok) throw new Error(`${path}: ${response.status} ${JSON.stringify(body)}`);
  return body;
}

const health = await get("/api/health");
const bootstrap = await get("/api/bootstrap");
const merchant = await get(`/api/merchant/${bootstrap.shops[0].id}`);

if (!bootstrap.shops.length) throw new Error("No shops returned");
if (!merchant.questionClusters.length) throw new Error("Merchant question clusters missing");

console.log(
  JSON.stringify(
    {
      ok: true,
      model: health.model,
      aiConfigured: health.aiConfigured,
      shops: bootstrap.shops.length,
      scenarios: bootstrap.scenarios.length,
      merchantClusters: merchant.questionClusters.length,
    },
    null,
    2,
  ),
);
