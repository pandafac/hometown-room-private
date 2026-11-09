# Project Agent Instructions

## Canonical Workspace

The active project root is `D:\Guest's Home` after the 2026-11-07 migration. Read and edit files here, not the former C-drive visualization workspace.

## Read First

Before changing product behavior, routes, data, AI prompts, or delivery files:

1. Read `docs/HANDOFF-DEMO4.md` for the current golden file and patch workflow.
2. Read `docs/PRODUCT-CONTEXT.md`.
3. Read `README.md`.
4. Read `docs/DATASET.md` when touching Demo data.
5. Read `docs/DEMO-SCRIPT.md` when changing the presented flow.

`docs/PRODUCT-CONTEXT.md` is the canonical product context. If code and documentation conflict, verify which one changed intentionally before editing.

## Current Golden Delivery

- The current shareable product is `outputs/会客厅Demo 5.0.html` and `deliverables/会客厅Demo 5.0.html`.
- Rebuild it with `node scripts/patch-demo3-ui.mjs`. The script name is historical; it now writes Demo 5.0.
- The script also writes `deploy/index.html`, `deploy/.nojekyll`, `deploy/.gitattributes`, and a versioned `deploy/chunks/<hash>/` file for GitHub Pages.
- The patch script optimizes embedded PNG/JPEG images to WebP with `sharp`; keep this step so the shareable file stays around 12 MB rather than 46 MB.
- Demo 5.0 adds six watercolor illustrations under `visual-assets/demo5/`; keep them illustrative, not represented as real photos of fictional shops.
- Do not run `npm run build:standalone` expecting Demo 5.0. That command rebuilds the older Demo 2.0 source and visual baseline, and must not overwrite the Demo 5.0 deliverable.
- The unpatched Demo 3.0 input is archived at `source-assets/会客厅Demo3.0-原始输入.html`; it is an input artifact, not the current output.

## Product Invariants

- Keep visitor and merchant entrances separate.
- Preserve the hierarchy: cover identity choice -> region -> town -> shop.
- Visitor input is a question; visitor output is an arrival card.
- Merchant input is owner-confirmed knowledge; merchant output is question/feedback insight and content.
- AI may answer only from owner-provided facts and must label source information.
- Missing owner data must be surfaced as a gap, never guessed.
- Testimonials/experience echoes are evidence of experience, not factual store policy.
- Do not claim that Demo data is real.
- Do not add a third-party/local-witness AI role unless the product boundary is explicitly changed.

## Content Rules

Do not reintroduce demo-stage explanatory clutter that the user explicitly removed, including repeated “demo preset” labels, “not impersonating the owner” badges, per-card AI-read-count explanations, large product-methodology paragraphs, AI image disclaimers, map disclaimers, or the visible global fictional footer.

Keep functional labels such as “店主提供”, missing-data notices, and consent confirmations. Internal documentation and video narration must still make clear that Demo data is fictional even though the visible disclaimer clutter has been removed.

## AI Quality Rules

- Keep `server/quality.js` intent detection and post-answer validation.
- Queue/popular-time questions must never fall back to menu recommendations.
- Support multi-intent questions and answer every detected intent.
- Preserve the Demo 5.0 composite-intent guard: after model/fallback output, supplement any missing intent before rendering.
- Include `dietary` intent handling for ingredients, allergies, vegetarian requests and foods such as cilantro, scallions, peanuts or dairy.
- Extract fact refs as readable Chinese labels, not database field paths.
- Preserve local fallback answers when DeepSeek is unavailable.

## Data and Security

- Canonical Demo data lives under `server/data/`.
- Demo 5.0 currently exposes 170 owner facts across 30–36 facts per shop.
- Keep all shop IDs unique and every recommendation target valid.
- Never place an API key in Markdown, `AGENTS.md`, normal frontend source, or a public repository.
- The former temporary public deployment was withdrawn on 2026-11-09: the GitHub repository was made private and its `gh-pages` branch was deleted. Do not republish the generated Demo or embedded key to a public URL without an access-controlled deployment layer.
- After the key expires or is revoked, replace the browser-side key with a server proxy or restricted-key deployment before expecting live AI on the public site.
- Never print the API key in chat, docs, logs or commits. Prefer rotating the key after internal sharing.
- Keep `.env.local` ignored.

## Verification

Run the relevant checks after changes:

```powershell
npm run validate:data
npm run build
npm run test:e2e
npm run build:standalone
```

For the Demo 5.0 patched artifact, run:

```powershell
node scripts/patch-demo3-ui.mjs
python scripts/verify-demo3-product-fixes.py
python scripts/verify-demo3-ui.py
python scripts/verify-demo3-planner.py
python scripts/verify-demo3-navigation.py
python scripts/verify-demo5-image-export.py
python scripts/audit-demo3-ai.py
python scripts/audit-demo3-loop.py
python scripts/audit-demo3-offline.py
```

For UI/routing changes, also verify:

- desktop and 390px mobile layout
- browser console has no errors
- visitor and merchant flows remain separate
- visitor questions, arrival card, feedback, merchant input/output all still work

## Documentation

When behavior or routes change, update `docs/PRODUCT-CONTEXT.md` in the same change. Do not duplicate canonical rules into multiple files; link to the canonical source.
