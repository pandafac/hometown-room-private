import fs from "node:fs";
import path from "node:path";
import { build } from "vite";
import { getDataset, getMerchant } from "../server/runtime.js";

const root = path.resolve(import.meta.dirname, "..");
const distDir = "D:\\codex-tools\\standalone-build";
const workspaceOutput = path.join(root, "outputs");
const deliveryOutput = path.join(root, "deliverables");
const desktopOutput = "D:\\会客厅-Demo2.0";

function readEnvFile() {
  const envPath = path.join(root, ".env.local");
  const content = fs.readFileSync(envPath, "utf8");
  return Object.fromEntries(
    content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const index = line.indexOf("=");
        return [line.slice(0, index), line.slice(index + 1)];
      }),
  );
}

function escapeInlineScript(value) {
  return String(value).replace(/<\/script/gi, "<\\/script");
}

await build({
  root,
  configFile: path.join(root, "vite.standalone.config.js"),
});

const data = getDataset();
const dashboards = Object.fromEntries(
  data.shops.map((shop) => [shop.id, getMerchant(shop.id)]),
);
const env = readEnvFile();
const bootstrap = [
  `window.__STANDALONE_WORLD__=${escapeInlineScript(JSON.stringify({ data, dashboards }))};`,
  `window.__DEEPSEEK_API_KEY__=${JSON.stringify(env.DEEPSEEK_API_KEY || "")};`,
  `window.__DEEPSEEK_BASE_URL__=${JSON.stringify(env.DEEPSEEK_BASE_URL || "https://api.deepseek.com")};`,
  `window.__DEEPSEEK_MODEL__=${JSON.stringify(env.DEEPSEEK_MODEL || "deepseek-flash")};`,
].join("\n");

let html = fs.readFileSync(path.join(distDir, "index.standalone.html"), "utf8");
const jsName = fs.readdirSync(distDir).find((name) => name.endsWith(".js"));
const cssName = fs.readdirSync(distDir).find((name) => name.endsWith(".css"));

if (!jsName || !cssName) {
  throw new Error("Standalone build did not produce the expected JS/CSS assets");
}

const js = escapeInlineScript(fs.readFileSync(path.join(distDir, jsName), "utf8"));
const css = fs.readFileSync(path.join(distDir, cssName), "utf8");

html = html.replace(/<script[^>]*src="[^"]+\.js"[^>]*><\/script>/i, "");
html = html.replace(/<link[^>]*href="[^"]+\.css"[^>]*>/i, "");
html = html.replace(
  "</head>",
  () => `<style>${css}</style>\n<script>${bootstrap}</script>\n</head>`,
);
html = html.replace(
  "</body>",
  () => `<script type="module">${js}</script>\n</body>`,
);

const introSource = fs.readFileSync(
  path.join(root, "public", "product-intro.html"),
  "utf8",
);
const introStandalone = introSource.replaceAll(
  'href="/"',
  'href="./会客厅-Demo2.0.html"',
);

for (const outputDir of [workspaceOutput, deliveryOutput, desktopOutput]) {
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, "会客厅-Demo2.0.html"), html, "utf8");
  fs.writeFileSync(
    path.join(outputDir, "会客厅-Demo2.0-产品介绍.html"),
    introStandalone,
    "utf8",
  );
}

console.log(
  JSON.stringify(
    {
      app: path.join(desktopOutput, "会客厅-Demo2.0.html"),
      intro: path.join(desktopOutput, "会客厅-Demo2.0-产品介绍.html"),
      appBytes: Buffer.byteLength(html),
      introBytes: Buffer.byteLength(introStandalone, "utf8"),
      apiKeyEmbedded: Boolean(env.DEEPSEEK_API_KEY),
    },
    null,
    2,
  ),
);
