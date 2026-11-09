import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const dataDir = path.join(root, "server", "data");
const catalog = JSON.parse(fs.readFileSync(path.join(dataDir, "catalog.json"), "utf8"));
const knowledge = JSON.parse(
  fs.readFileSync(path.join(dataDir, "owner-knowledge.json"), "utf8"),
);
const extraKnowledge = JSON.parse(
  fs.readFileSync(path.join(dataDir, "owner-knowledge-extra.json"), "utf8"),
);
const failures = [];
const shops = [];
const towns = [];

const requiredShopFields = [
  "id",
  "name",
  "story",
  "products",
  "hours",
  "signatureChoice",
  "solo",
  "ordering",
  "etiquette",
  "commonMisunderstandings",
  "ownerQuestions",
  "ownerWillNotAnswer",
  "petPolicy",
  "accessibility",
  "faqs",
  "recommendations",
  "testimonials",
  "liveStatus",
];

if (!catalog.meta?.isFictional) failures.push("Catalog must be explicitly fictional");
if (catalog.regions?.length < 2) failures.push("Expected at least 2 regions");

for (const region of catalog.regions || []) {
  for (const town of region.towns || []) {
    towns.push({ ...town, regionId: region.id, regionName: region.name });
    if (!town.dataFile) continue;
    const source = JSON.parse(fs.readFileSync(path.join(dataDir, town.dataFile), "utf8"));
    if (!source.place?.name) failures.push(`${town.id}: missing place`);
    for (const shop of source.shops || []) {
      shops.push({ ...shop, regionId: region.id, townId: town.id });
      for (const field of requiredShopFields) {
        if (shop[field] === undefined || shop[field] === null) {
          failures.push(`${shop.id}: missing ${field}`);
        }
      }
      if (!source.merchantSeeds?.[shop.id]) {
        failures.push(`${shop.id}: missing merchant seed`);
      }
      for (const testimonial of shop.testimonials || []) {
        if (testimonial.simulated !== true) {
          failures.push(`${testimonial.id}: preloaded testimonial must be marked simulated`);
        }
      }
      for (const key of ["business", "stock"]) {
        const item = shop.liveStatus?.[key];
        if (!item?.state || !item?.label) {
          failures.push(`${shop.id}: liveStatus.${key} needs state and label`);
        }
      }
      if (!shop.liveStatus?.updatedAt) {
        failures.push(`${shop.id}: liveStatus needs updatedAt`);
      }
      const knowledgeIds = new Set(
        [...(knowledge[shop.id] || []), ...(extraKnowledge[shop.id] || [])].map(
          (fact) => fact.id,
        ),
      );
      if (knowledgeIds.size < 30) {
        failures.push(`${shop.id}: expected at least 30 unique owner knowledge facts`);
      }
    }
  }
}

const shopIds = new Set(shops.map((shop) => shop.id));
for (const shop of shops) {
  if (!knowledge[shop.id]) failures.push(`${shop.id}: missing owner knowledge`);
  if (!extraKnowledge[shop.id]) failures.push(`${shop.id}: missing extra owner knowledge`);
  for (const recommendation of shop.recommendations || []) {
    if (!shopIds.has(recommendation.shopId)) {
      failures.push(`${shop.id}: recommendation points to unknown shop ${recommendation.shopId}`);
    }
  }
}

if (shops.length < 5) failures.push("Expected at least 5 shops");
if (towns.filter((town) => town.status === "open").length < 2) {
  failures.push("Expected at least 2 open towns");
}

if (failures.length) {
  console.error(`Dataset validation failed (${failures.length})`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

const knowledgeCount = Object.values(knowledge).reduce(
  (sum, entries) => sum + entries.length,
  0,
) + Object.values(extraKnowledge).reduce((sum, entries) => sum + entries.length, 0);
console.log(
  `Dataset valid: ${catalog.regions.length} regions, ${towns.length} towns, ${shops.length} shops, ${knowledgeCount} owner facts.`,
);
