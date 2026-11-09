import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import sharp from "sharp";

const defaultSource =
  path.resolve("source-assets", "会客厅Demo3.0-原始输入.html");
const defaultOutput = path.resolve(
  "outputs",
  "会客厅Demo 5.0.html",
);

const source = path.resolve(process.argv[2] || defaultSource);
const output = path.resolve(process.argv[3] || defaultOutput);

async function optimizeEmbeddedImages(html) {
  const pattern = /data:image\/(png|jpe?g);base64,([A-Za-z0-9+/=]+)/g;
  let optimizedHtml = "";
  let originalBytes = 0;
  let optimizedBytes = 0;
  let imageCount = 0;
  let cursor = 0;

  for (const match of html.matchAll(pattern)) {
    const [dataUri, type, base64] = match;
    const raw = Buffer.from(base64, "base64");
    const webp = await sharp(raw)
      .rotate()
      .webp({
        quality: type === "png" ? 90 : 82,
        alphaQuality: 95,
        effort: 6,
        smartSubsample: true,
      })
      .toBuffer();
    const replacement =
      webp.length < raw.length
        ? `data:image/webp;base64,${webp.toString("base64")}`
        : dataUri;

    optimizedHtml += html.slice(cursor, match.index);
    optimizedHtml += replacement;
    cursor = match.index + dataUri.length;
    originalBytes += raw.length;
    optimizedBytes += replacement.startsWith("data:image/webp")
      ? webp.length
      : raw.length;
    imageCount += 1;
  }

  optimizedHtml += html.slice(cursor);
  return {
    html: optimizedHtml,
    imageCount,
    originalBytes,
    optimizedBytes,
  };
}

if (source === output) {
  throw new Error("Refusing to overwrite the source HTML. Choose a different output path.");
}

if (!fs.existsSync(source)) {
  throw new Error(`Source HTML not found: ${source}`);
}

const patch = String.raw`
<style id="hk-demo3-polish">
  /* Demo 3.0 refinement: remove demo-stage narration without changing app behavior. */
  .global-footer,
  .app-shell[data-hk-room-editorial] .hk-room-banner__caption,
  .app-shell[data-hk-room-editorial] .hk-room-status__note,
  .app-shell[data-hk-room-editorial] .hk-room-plan-disclaimer,
  .app-shell[data-hk-room-editorial] .ai-boundary-note,
  .hk-today-planner__demo,
  .hk-owner-period strong,
  .hk-owner-stat-note,
  .hk-owner-panel__header > p,
  .hk-owner-dashboard p.hk-owner-caption,
  .hk-owner-dashboard__footer > p {
    display: none !important;
  }

  /* The map remains the focal content; every legend item now follows it. */
  .app-shell[data-hk-room-editorial] .hk-room-plan-row {
    grid-template-columns: minmax(0, 1fr) !important;
    gap: 14px !important;
    width: 100% !important;
    min-width: 0 !important;
  }

  .app-shell[data-hk-room-editorial] .hk-room-plan {
    width: 100% !important;
    max-width: 100% !important;
  }

  .app-shell[data-hk-room-editorial] .hk-room-legend {
    display: block;
    width: 100% !important;
    margin-top: 0 !important;
    padding: 16px 18px !important;
    border: 1px solid #e2e7e3 !important;
    border-top: 2px solid #173f44 !important;
  }

  .app-shell[data-hk-room-editorial] .hk-room-legend ul {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px 24px;
    margin-bottom: 14px;
    padding-left: 18px;
  }

  .app-shell[data-hk-room-editorial] .hk-room-legend li {
    margin: 0;
    break-inside: avoid;
  }

  .app-shell[data-hk-room-editorial] .hk-room-legend hr {
    margin: 14px 0 10px;
  }

  /* On desktop the assistant owns the larger half of the room. */
  @media screen and (min-width: 1024px) {
    .app-shell[data-hk-room-editorial] .room-page {
      width: calc(100% - 48px) !important;
      max-width: 2400px !important;
    }

    .app-shell[data-hk-room-editorial] .room-grid {
      grid-template-columns: minmax(0, 46fr) minmax(0, 54fr) !important;
      gap: 20px !important;
      align-items: start !important;
    }

    .app-shell[data-hk-room-editorial] .room-context {
      grid-column: 1 !important;
      grid-row: 1 !important;
    }

    .app-shell[data-hk-room-editorial] .hk-room-story {
      grid-column: 1 !important;
      grid-row: 2 !important;
      margin-top: 4px;
    }

    .app-shell[data-hk-room-editorial] .chat-panel {
      grid-column: 2 !important;
      grid-row: 1 / span 2 !important;
      position: sticky !important;
      top: 16px !important;
      align-self: start !important;
      width: 100% !important;
      height: calc(100dvh - 32px) !important;
      min-height: 680px !important;
      max-height: calc(100dvh - 32px) !important;
      border: 1px solid #cdd6d2 !important;
      box-shadow: 0 14px 34px rgb(23 63 68 / 7%) !important;
    }

    .app-shell[data-hk-room-editorial] .chat-panel__header {
      min-height: 108px !important;
      padding: 22px 24px 18px !important;
      align-items: center !important;
      background: #173f44 !important;
      color: #fbfbf8 !important;
      border-bottom: 0 !important;
    }

    .app-shell[data-hk-room-editorial] .chat-panel__header strong {
      color: #fffef7 !important;
      font-size: clamp(24px, 1.8vw, 34px) !important;
      letter-spacing: -0.025em !important;
    }

    .app-shell[data-hk-room-editorial] .chat-panel__header small {
      margin-top: 6px !important;
      color: #c9d9d4 !important;
      font-size: 13px !important;
    }
  }

  /* Starter suggestions stay available without permanently owning chat space. */
  .app-shell[data-hk-room-editorial] .suggestion-row {
    position: relative;
  }

  .app-shell[data-hk-room-editorial] .suggestion-row::before {
    display: none !important;
    content: none !important;
  }

  .app-shell[data-hk-room-editorial] .hk-demo3-suggestion-head {
    grid-column: 1 / -1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    min-height: 44px;
    color: #65797a;
    font: 400 12px/1.5 var(--sans);
  }

  .app-shell[data-hk-room-editorial] .hk-demo3-suggestion-toggle {
    flex: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 52px;
    min-height: 44px;
    padding: 4px 8px;
    border: 0 !important;
    border-radius: 0;
    color: #486c70;
    background: transparent !important;
    box-shadow: none !important;
    font: 500 12px/1.4 var(--sans);
    cursor: pointer;
  }

  .app-shell[data-hk-room-editorial] .hk-demo3-suggestion-toggle:hover {
    color: #173f44;
    background: #edf3e3;
  }

  .app-shell[data-hk-room-editorial] .hk-demo3-suggestion-toggle::after {
    content: none !important;
  }

  .app-shell[data-hk-room-editorial] .hk-demo3-suggestion-toggle:focus-visible {
    outline: 2px solid #173f44;
    outline-offset: 1px;
  }

  .app-shell[data-hk-room-editorial] .suggestion-row[data-hk-suggestions-collapsed="true"] {
    grid-template-columns: minmax(0, 1fr) !important;
    gap: 0 !important;
    margin-bottom: 14px !important;
  }

  .app-shell[data-hk-room-editorial]
    .suggestion-row[data-hk-suggestions-collapsed="true"]
    > button:not(.hk-demo3-suggestion-toggle) {
    display: none !important;
  }

  .app-shell[data-hk-room-editorial] .hk-demo3-contact-fact {
    color: #65797a !important;
  }

  .app-shell[data-hk-room-editorial] .hk-demo3-contact-fact svg {
    color: #718479 !important;
  }

  .app-shell[data-hk-room-editorial] .hk-demo3-queue-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 8px 12px;
    margin-top: 8px;
    padding: 8px 10px;
    border: 1px solid #d6dfda;
    background: #f3f7ef;
  }

  .app-shell[data-hk-room-editorial] .hk-demo3-queue-row[hidden] {
    display: none !important;
  }

  .app-shell[data-hk-room-editorial] .hk-demo3-queue-copy {
    min-width: 0;
    overflow: hidden;
    color: #52686a;
    font: 400 11px/1.5 var(--sans);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .app-shell[data-hk-room-editorial] .hk-demo3-queue-actions {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .app-shell[data-hk-room-editorial] .hk-demo3-queue-action,
  .app-shell[data-hk-room-editorial] .hk-demo3-queue-cancel {
    min-height: 44px;
    padding: 5px 10px;
    border: 1px solid #b9c9c2;
    color: #173f44;
    background: #fff;
    font: 500 11px/1.4 var(--sans);
    cursor: pointer;
  }

  .app-shell[data-hk-room-editorial] .hk-demo3-queue-action:hover,
  .app-shell[data-hk-room-editorial] .hk-demo3-queue-cancel:hover {
    border-color: #173f44;
    background: #edf3e3;
  }

  .app-shell[data-hk-room-editorial] .hk-demo3-queue-action[hidden],
  .app-shell[data-hk-room-editorial] .hk-demo3-queue-cancel[hidden] {
    display: none !important;
  }

  .town-scenarios[hidden] {
    display: none !important;
  }

  .hk-demo3-quick-entry {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    min-height: 44px;
    margin-right: 10px;
    padding: 0 12px;
    border: 1px solid #c9d4d0;
    color: #2c5357;
    background: #f7f9f5;
    font: 500 12px/1.4 var(--sans);
    cursor: pointer;
  }

  .hk-demo3-quick-entry:hover {
    border-color: #173f44;
    color: #173f44;
    background: #edf3e3;
  }

  .hk-demo3-quick-entry[hidden] {
    display: none !important;
  }

  .hk-demo3-quick-entry svg {
    width: 16px;
    height: 16px;
    flex: none;
  }

  .hk-demo3-quick-dialog {
    width: min(680px, calc(100% - 32px));
    max-height: min(760px, calc(100dvh - 40px));
    margin: auto;
    padding: 0;
    border: 1px solid #bccbc5;
    color: #123d43;
    background: #fbfbf8;
    box-shadow: 0 28px 80px rgb(15 45 48 / 22%);
    overflow: hidden;
  }

  .hk-demo3-quick-dialog::backdrop {
    background: rgb(15 32 34 / 34%);
    backdrop-filter: blur(2px);
  }

  .hk-demo3-quick-dialog__head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20px;
    padding: 20px 22px 16px;
    border-bottom: 1px solid #dfe5e1;
  }

  .hk-demo3-quick-dialog__head h2 {
    margin: 0;
    color: #123d43;
    font: 500 26px/1.35 var(--serif);
    letter-spacing: -0.025em;
  }

  .hk-demo3-quick-dialog__head p {
    margin: 5px 0 0;
    color: #65797a;
    font: 400 12px/1.6 var(--sans);
  }

  .hk-demo3-quick-dialog__close {
    flex: none;
    min-width: 44px;
    min-height: 44px;
    border: 0;
    color: #52686a;
    background: transparent;
    font: 500 12px/1.4 var(--sans);
    cursor: pointer;
  }

  .hk-demo3-quick-dialog__close:hover {
    color: #173f44;
    background: #edf3e3;
  }

  .hk-demo3-quick-dialog__search {
    display: grid;
    grid-template-columns: 20px minmax(0, 1fr);
    align-items: center;
    gap: 10px;
    margin: 16px 22px 12px;
    padding: 0 12px;
    border: 1px solid #c9d4d0;
    background: #fff;
  }

  .hk-demo3-quick-dialog__search svg {
    width: 18px;
    height: 18px;
    color: #647b7c;
  }

  .hk-demo3-quick-dialog__search input {
    width: 100%;
    min-height: 46px;
    padding: 0;
    border: 0;
    outline: 0;
    color: #123d43;
    background: transparent;
    font: 400 14px/1.5 var(--sans);
  }

  .hk-demo3-quick-dialog__list {
    display: grid;
    gap: 8px;
    max-height: min(520px, calc(100dvh - 250px));
    margin: 0;
    padding: 0 22px 22px;
    overflow-y: auto;
    list-style: none;
  }

  .hk-demo3-quick-dialog__list button {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 14px;
    width: 100%;
    min-height: 62px;
    padding: 10px 13px;
    border: 1px solid #e0e6e2;
    color: #123d43;
    background: #fff;
    text-align: left;
    cursor: pointer;
  }

  .hk-demo3-quick-dialog__list button:hover,
  .hk-demo3-quick-dialog__list button:focus-visible {
    border-color: #173f44;
    background: #f4f7f1;
  }

  .hk-demo3-quick-dialog__shop {
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: 3px;
  }

  .hk-demo3-quick-dialog__shop strong {
    font: 500 16px/1.4 var(--serif);
  }

  .hk-demo3-quick-dialog__shop small {
    color: #65797a;
    font: 400 11px/1.5 var(--sans);
  }

  .hk-demo3-quick-dialog__shop-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #486c70;
    font: 400 11px/1.5 var(--sans);
  }

  .hk-demo3-quick-dialog__recent {
    padding: 2px 5px;
    color: #8e2922;
    background: #f8e9e2;
    font-size: 10px;
  }

  .hk-demo3-quick-dialog__empty {
    margin: 4px 0 12px;
    color: #65797a;
    font: 400 13px/1.6 var(--sans);
  }

  @media screen and (max-width: 700px) {
    .hk-demo3-quick-entry {
      min-width: 44px;
      margin-right: 4px;
      padding: 0 9px;
      font-size: 11px;
    }

    .hk-demo3-quick-entry span {
      display: none;
    }

    .hk-demo3-quick-dialog {
      width: calc(100% - 20px);
      max-height: calc(100dvh - 20px);
    }

    .hk-demo3-quick-dialog__head {
      padding: 16px 16px 13px;
    }

    .hk-demo3-quick-dialog__head h2 {
      font-size: 22px;
    }

    .hk-demo3-quick-dialog__search {
      margin: 13px 16px 10px;
    }

    .hk-demo3-quick-dialog__list {
      max-height: calc(100dvh - 220px);
      padding: 0 16px 16px;
    }
  }

  /* Merchant workbench: one reading rail, one action rail, no duplicate content studio. */
  .merchant-workbench[data-hk-owner-module="ready"] .workbench-switch {
    position: sticky;
    top: 0;
    z-index: 18;
    background: #fbfbf8;
  }

  .owner-input-view,
  .hk-owner-dashboard {
    width: min(100%, 1280px) !important;
    margin-right: auto !important;
    margin-left: auto !important;
  }

  .owner-input-view {
    margin-top: 22px !important;
  }

  .knowledge-overview {
    grid-template-columns: minmax(0, 1fr) 230px !important;
    gap: 36px !important;
    padding: 24px 26px !important;
    border: 1px solid #d5dfd9 !important;
    border-left: 3px solid #173f44 !important;
    background: #f3f7f1 !important;
    border-radius: 0 !important;
  }

  .knowledge-overview__copy h2 {
    margin: 8px 0 9px !important;
    font-size: 31px !important;
    line-height: 1.3 !important;
  }

  .knowledge-overview__copy p {
    max-width: 620px !important;
    color: #5e7375 !important;
    font-size: 12px !important;
    line-height: 1.7 !important;
  }

  .knowledge-score {
    padding-left: 24px;
    border-left: 1px solid #cfdad4;
  }

  .owner-input-grid {
    grid-template-columns: minmax(0, 1.08fr) minmax(360px, 0.92fr) !important;
    gap: 22px !important;
    margin-top: 22px !important;
  }

  .knowledge-inventory,
  .owner-fact-editor {
    border-color: #d7dfda !important;
    border-radius: 0 !important;
    background: #fbfbf8 !important;
  }

  .knowledge-inventory > header,
  .owner-fact-editor > header {
    min-height: 86px !important;
    padding: 18px 20px !important;
  }

  .knowledge-categories {
    display: grid !important;
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    gap: 0 24px !important;
    padding: 6px 20px !important;
    border-bottom: 1px solid #e0e5e1;
  }

  .knowledge-categories > span {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    min-height: 44px;
    padding: 10px 8px !important;
    border: 0 !important;
    border-bottom: 1px solid #edf0ed !important;
    border-radius: 0 !important;
    color: #52686a;
    background: transparent !important;
    font-size: 11px;
  }

  .knowledge-categories > span > strong {
    color: #8e2922;
    font: 500 10px/1.5 var(--mono);
  }

  .knowledge-recent {
    padding: 0 20px 18px !important;
  }

  .knowledge-recent > article {
    padding: 14px 0 !important;
    border-top: 1px solid #edf0ed !important;
  }

  .knowledge-recent > article strong {
    color: #123d43;
    font-size: 12px;
    font-weight: 500;
    line-height: 1.65;
  }

  .knowledge-recent > article p {
    max-width: 62ch;
    margin-top: 5px !important;
    color: #5e7375 !important;
    font-size: 11px !important;
    line-height: 1.7 !important;
  }

  .owner-fact-editor {
    background: #fff !important;
  }

  .owner-fact-editor > header h3 {
    font-size: 22px !important;
  }

  .owner-gap-suggestions {
    padding: 14px 20px !important;
    background: #f7f9f5 !important;
  }

  .owner-gap-suggestions > button {
    margin-top: 8px !important;
    border: 1px solid #d6dfda !important;
    background: #fff !important;
  }

  .owner-gap-suggestions > button.is-active {
    border-color: #a53e32 !important;
    background: #fff8f4 !important;
  }

  .owner-fact-form {
    padding: 18px 20px 20px !important;
  }

  .hk-owner-dashboard {
    margin-bottom: 24px !important;
  }

  .hk-owner-dashboard__header {
    padding: 24px 0 20px !important;
  }

  .hk-owner-dashboard__header h1 {
    font-size: clamp(30px, 2.7vw, 42px) !important;
  }

  .hk-owner-lede {
    max-width: 620px;
    color: #5e7375 !important;
  }

  .hk-owner-summary {
    grid-template-columns: minmax(150px, 0.9fr) repeat(3, minmax(0, 1fr)) !important;
    padding: 18px 20px !important;
    border-color: #d4ded8 !important;
    border-left: 3px solid #173f44 !important;
    background: #f3f7f1 !important;
  }

  .hk-owner-summary__metric strong {
    font-size: clamp(26px, 2.4vw, 34px) !important;
  }

  .hk-owner-grid {
    display: grid !important;
    grid-template-columns: repeat(12, minmax(0, 1fr)) !important;
    gap: 18px !important;
  }

  .hk-owner-topics {
    grid-column: span 7 !important;
    grid-row: auto !important;
  }

  .hk-owner-priorities {
    grid-column: span 5 !important;
    grid-row: auto !important;
    border-left: 1px solid #d7dfda !important;
    border-top: 3px solid #a53e32 !important;
    background: #fffaf7 !important;
  }

  .hk-owner-coverage {
    grid-column: span 4 !important;
    grid-row: auto !important;
    border-top: 3px solid #b7a68d !important;
  }

  .hk-owner-feedback {
    grid-column: span 8 !important;
    grid-row: auto !important;
    border-top: 3px solid #173f44 !important;
  }

  .hk-owner-updates {
    grid-column: span 4 !important;
    grid-row: auto !important;
    border-top: 3px solid #b7a68d !important;
  }

  .hk-owner-content {
    display: none !important;
  }

  .hk-owner-panel {
    padding: 20px !important;
    border-color: #d7dfda !important;
    background: #fff !important;
  }

  .hk-owner-panel h2 {
    font-size: 21px !important;
  }

  .hk-owner-panel__header {
    min-height: 34px;
    margin-bottom: 15px !important;
  }

  .hk-owner-topics .hk-owner-topic-row {
    padding: 12px 0 !important;
  }

  .hk-owner-topic-track {
    height: 12px !important;
  }

  .hk-owner-quote blockquote {
    font-size: 15px !important;
    line-height: 1.75 !important;
  }

  .merchant-workbench[data-hk-owner-module="ready"] .content-studio {
    width: min(100%, 1280px);
    margin: 20px auto 0 !important;
    padding: 24px !important;
    border-color: #d7dfda !important;
    border-top: 3px solid #173f44 !important;
    background: #fbfbf8 !important;
  }

  .town-shop-grid .town-shop {
    position: relative;
  }

  .town-shop-grid .hk-demo3-fit-badge {
    display: inline-flex;
    align-items: center;
    width: max-content;
    margin-bottom: 10px;
    padding: 3px 7px;
    border: 1px solid #d9c8b4;
    color: #8e2922;
    background: #fff7ef;
    font: 500 10px/1.5 var(--sans);
  }

  .town-shop-grid .town-shop[data-hk-today-fit="true"] {
    border-color: #b77a62;
    box-shadow: inset 3px 0 0 #b77a62;
  }

  /* Town selection: state controls stay left; situations, shops and draft scroll on the right. */
  .hk-today-planner[data-hk-town-studio="true"] {
    align-items: start !important;
    grid-template-columns: minmax(0, 42fr) minmax(0, 58fr) !important;
  }

  .hk-today-planner[data-hk-town-studio="true"] .hk-today-planner__conditions {
    position: static !important;
    align-self: start;
  }

  .hk-today-planner[data-hk-town-studio="true"] .hk-today-planner__choices {
    display: flex;
    min-width: 0;
    flex-direction: column;
  }

  .hk-today-planner[data-hk-town-studio="true"]
    .hk-today-planner__conditions
    .hk-today-planner__choices-head {
    margin-top: 30px !important;
    padding-top: 24px !important;
    border-top: 1px solid #d7dfda;
  }

  .hk-today-planner[data-hk-town-studio="true"]
    .hk-today-planner__conditions
    .hk-today-planner__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  }

  .hk-today-planner[data-hk-town-studio="true"]
    .hk-today-planner__conditions
    .hk-demo3-scenario-detail {
    margin-bottom: 4px !important;
  }

  .hk-today-planner[data-hk-town-studio="true"]
    .hk-today-planner__conditions
    .hk-today-planner__choices-head p {
    display: block !important;
    max-width: 54ch;
    margin: 7px 0 0 !important;
    color: #5e7375 !important;
    font-size: 12px !important;
    line-height: 1.65 !important;
  }

  .hk-today-planner[data-hk-town-studio="true"] .town-shops {
    width: 100% !important;
    margin: 0 !important;
    padding: 0 !important;
    border: 0 !important;
    background: transparent !important;
  }

  .hk-today-planner[data-hk-town-studio="true"] .town-shops .section-heading {
    margin-bottom: 18px !important;
  }

  .hk-today-planner[data-hk-town-studio="true"] .town-shops .section-heading h2 {
    margin-top: 6px !important;
    font-size: clamp(29px, 2.25vw, 38px) !important;
    line-height: 1.3 !important;
  }

  .hk-today-planner[data-hk-town-studio="true"] .town-shop-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    gap: 14px !important;
  }

  .hk-today-planner[data-hk-town-studio="true"] .town-shop {
    display: flex !important;
    height: 100% !important;
    min-height: 0 !important;
    flex-direction: column !important;
    padding: 17px 17px 14px !important;
  }

  .hk-today-planner[data-hk-town-studio="true"] .town-shop h3 {
    font-size: clamp(25px, 2.2vw, 34px) !important;
    line-height: 1.3 !important;
  }

  .hk-today-planner[data-hk-town-studio="true"] .town-shop__description {
    line-height: 1.7 !important;
  }

  .hk-today-planner[data-hk-town-studio="true"] .town-shop__footer {
    margin-top: auto !important;
  }

  .hk-today-planner[data-hk-town-studio="true"] .hk-today-planner__draft {
    margin-top: 26px !important;
  }

  @media screen and (max-width: 1100px) {
    .knowledge-overview {
      grid-template-columns: minmax(0, 1fr) !important;
      gap: 20px !important;
    }

    .knowledge-score {
      padding: 16px 0 0;
      border-top: 1px solid #cfdad4;
      border-left: 0;
    }

    .owner-input-grid {
      grid-template-columns: minmax(0, 1fr) !important;
    }

    .hk-today-planner[data-hk-town-studio="true"] .hk-today-planner__conditions {
      position: static;
    }

    .hk-owner-topics,
    .hk-owner-priorities {
      grid-column: 1 / -1 !important;
    }

    .hk-owner-coverage,
    .hk-owner-feedback,
    .hk-owner-updates {
      grid-column: span 6 !important;
    }

    .hk-owner-updates {
      grid-column: 1 / -1 !important;
    }
  }

  @media screen and (max-width: 1000px) {
    .hk-today-planner[data-hk-town-studio="true"] {
      grid-template-columns: minmax(0, 1fr) !important;
      row-gap: 24px !important;
    }
  }

  @media screen and (max-width: 720px) {
    .hk-owner-summary {
      grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
    }

    .hk-owner-summary h2 {
      grid-column: 1 / -1;
    }

    .hk-owner-grid {
      grid-template-columns: minmax(0, 1fr) !important;
    }

    .hk-owner-topics,
    .hk-owner-priorities,
    .hk-owner-coverage,
    .hk-owner-feedback,
    .hk-owner-updates {
      grid-column: 1 !important;
    }

    .knowledge-categories {
      grid-template-columns: 1fr !important;
    }

    .hk-today-planner[data-hk-town-studio="true"] .town-shop-grid {
      grid-template-columns: minmax(0, 1fr) !important;
    }
  }

  /* Town planner: choose first, read the details only for the active situation. */
  .hk-today-planner {
    grid-template-columns: minmax(0, 0.3fr) minmax(0, 0.7fr) !important;
    column-gap: clamp(24px, 3.4vw, 52px) !important;
    margin: 32px 0 48px !important;
    padding: 28px 0 20px !important;
  }

  .hk-today-planner .hk-today-planner__intro {
    margin-top: 9px !important;
  }

  .hk-today-planner .hk-today-planner__weather {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 5px 14px;
    min-height: 82px;
    margin-top: 17px !important;
    padding: 12px 14px !important;
  }

  .hk-today-planner .hk-today-planner__weather-head {
    grid-column: 1;
    grid-row: 1;
    font-size: 11px !important;
  }

  .hk-today-planner .hk-today-planner__weather-main {
    grid-column: 1;
    grid-row: 2;
    gap: 10px !important;
    margin: 0 !important;
  }

  .hk-today-planner .hk-today-planner__weather-main svg {
    width: 26px !important;
    height: 26px !important;
  }

  .hk-today-planner .hk-today-planner__weather-main strong {
    font-size: 25px !important;
  }

  .hk-today-planner .hk-today-planner__weather-switch {
    grid-column: 2;
    grid-row: 1 / span 2;
    margin: 0 !important;
    padding-left: 10px;
    border-left: 1px solid var(--today-line);
    white-space: nowrap;
  }

  .hk-today-planner .hk-today-planner__field {
    margin-top: 18px !important;
  }

  .hk-today-planner .hk-today-planner__choices-head {
    min-height: 0 !important;
    align-items: center !important;
  }

  .hk-today-planner .hk-today-planner__choices-head h3 {
    font-size: clamp(22px, 1.8vw, 28px) !important;
  }

  .hk-today-planner .hk-today-planner__choices-head p,
  .hk-today-planner .hk-today-planner__choices-head > button,
  .hk-today-planner .hk-today-planner__list-status,
  .hk-today-planner .hk-today-planner__under-grid,
  .hk-today-planner .hk-today-planner__draft-note,
  .hk-today-planner .hk-today-planner__foot {
    display: none !important;
  }

  .hk-today-planner .hk-today-planner__grid {
    grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
    gap: 10px !important;
    margin-top: 14px;
  }

  .hk-today-planner .hk-today-card {
    min-height: 112px !important;
    padding: 12px 13px !important;
    gap: 9px !important;
    background: #fff !important;
    transition: border-color 0.15s ease, background-color 0.15s ease;
  }

  .hk-today-planner .hk-today-card:hover {
    border-color: #6f8985 !important;
    background: #f7faf5 !important;
  }

  .hk-today-planner .hk-today-card__top {
    min-height: 0 !important;
  }

  .hk-today-planner .hk-today-card__index {
    color: #5e7375 !important;
    font-family: var(--sans) !important;
    font-size: 11px !important;
    letter-spacing: 0.025em;
  }

  .hk-today-planner .hk-today-card__badge {
    display: none !important;
  }

  .hk-today-planner .hk-today-card__body {
    gap: 10px !important;
    align-items: flex-start;
  }

  .hk-today-planner .hk-today-card__body > svg {
    flex-basis: 22px !important;
    width: 22px !important;
    height: 22px !important;
    margin-top: 2px;
  }

  .hk-today-planner .hk-today-card__copy {
    gap: 0 !important;
  }

  .hk-today-planner .hk-today-card__title {
    font-family: var(--serif) !important;
    font-size: clamp(15px, 1.2vw, 18px) !important;
    line-height: 1.45 !important;
  }

  .hk-today-planner .hk-today-card__question,
  .hk-today-planner .hk-today-card__reason {
    display: none !important;
  }

  .hk-today-planner .hk-today-card[aria-pressed="true"] {
    border-color: var(--today-selection) !important;
    background: #fbf8f3 !important;
    box-shadow: inset 3px 0 0 var(--today-selection) !important;
  }

  .hk-today-planner .hk-demo3-scenario-detail {
    margin-top: 14px !important;
    padding: 17px 20px 18px !important;
    border: 1px solid #dccfc3 !important;
    border-left: 3px solid var(--today-selection) !important;
    background: #fbf8f3 !important;
  }

  .hk-today-planner .hk-demo3-scenario-detail[hidden] {
    display: none !important;
  }

  .hk-today-planner .hk-demo3-scenario-detail__meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    color: #687a7a !important;
    font-size: 11px !important;
    line-height: 1.5 !important;
  }

  .hk-today-planner .hk-demo3-scenario-detail__title {
    margin: 7px 0 0 !important;
    color: #123d43 !important;
    font-family: var(--serif) !important;
    font-size: clamp(20px, 1.55vw, 25px) !important;
    font-weight: 500 !important;
    line-height: 1.45 !important;
  }

  .hk-today-planner .hk-demo3-scenario-detail__question {
    margin: 9px 0 0 !important;
    max-width: 820px;
    color: #52686a !important;
    font-size: 13px !important;
    line-height: 1.75 !important;
  }

  .hk-today-planner .hk-demo3-scenario-detail__reason {
    margin: 12px 0 0 !important;
    padding-top: 11px !important;
    border-top: 1px solid #e5d8ce !important;
    color: #65797a !important;
    font-size: 12px !important;
    line-height: 1.65 !important;
  }

  .hk-today-planner .hk-today-card[aria-pressed="true"] .hk-today-card__title {
    color: #123d43;
  }

  .hk-today-planner .hk-today-planner__draft {
    margin-top: 15px !important;
  }

  @media screen and (max-width: 1280px) {
    .hk-today-planner .hk-today-planner__grid {
      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    }
  }

  @media screen and (max-width: 1000px) {
    .hk-today-planner {
      grid-template-columns: minmax(0, 1fr) !important;
      row-gap: 24px !important;
      margin-top: 24px !important;
    }
  }

  @media screen and (max-width: 760px) {
    .hk-today-planner .hk-today-planner__grid {
      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    }

    .hk-today-planner .hk-today-planner__weather {
      grid-template-columns: minmax(0, 1fr);
    }

    .hk-today-planner .hk-today-planner__weather-switch {
      grid-column: 1;
      grid-row: 3;
      padding: 8px 0 0;
      border-top: 1px solid var(--today-line);
      border-left: 0;
    }
  }

  @media screen and (max-width: 340px) {
    .hk-today-planner .hk-today-planner__grid {
      grid-template-columns: minmax(0, 1fr) !important;
    }
  }

  @media screen and (min-width: 1024px) and (max-width: 1300px) {
    .app-shell[data-hk-room-editorial] .hk-room-features {
      grid-template-columns: 1fr !important;
    }
  }

  @media screen and (max-width: 1023px) {
    .app-shell[data-hk-room-editorial] .room-grid {
      grid-template-columns: minmax(0, 1fr) !important;
    }

    .app-shell[data-hk-room-editorial] .room-context {
      grid-column: 1 !important;
      grid-row: 1 !important;
    }

    .app-shell[data-hk-room-editorial] .chat-panel {
      grid-column: 1 !important;
      grid-row: 2 !important;
      position: static !important;
    }

    .app-shell[data-hk-room-editorial] .hk-room-story {
      grid-column: 1 !important;
      grid-row: 3 !important;
    }
  }

  @media screen and (max-width: 700px) {
    .app-shell[data-hk-room-editorial] .hk-room-legend ul {
      grid-template-columns: 1fr;
    }
  }
</style>
<script id="hk-extra-owner-knowledge" type="application/json">__HK_EXTRA_OWNER_KNOWLEDGE__</script>
<script id="hk-extra-merchant-gaps" type="application/json">__HK_EXTRA_MERCHANT_GAPS__</script>
<script id="hk-demo3-polish-script">
(function () {
  "use strict";

  var hiddenSelectors = [
    ".global-footer",
    ".hk-room-banner__caption",
    ".hk-room-status__note",
    ".hk-room-plan-disclaimer",
    ".ai-boundary-note",
    ".hk-today-planner__demo"
  ];

  var replacements = [
    [/体验回声\s*·\s*演示预置/g, "体验回声"],
    [/\s*·\s*演示(?=\s|$)/g, ""],
    [/AI\s*示意影像\s*·\s*非实地采集/g, ""],
    [/空间布局示意\s*·\s*非实际测绘/g, ""],
    [/状态示例\s*·\s*非实时，以店铺当天说明为准。/g, ""],
    [/虚构产品演示\s*·\s*所有地区、店铺与人物均非真实/g, ""],
    [/天气示例，非实时/g, ""],
    [/只演示天气如何帮助提问，不代表当地当前天气。/g, ""],
    [/景点影像参考，不代表演示店铺实景。/g, ""],
    [/虚构水乡地方志/g, "水乡地方志"],
    [/虚构山乡地方志/g, "山乡地方志"],
    [/（架空）/g, ""],
    [/Demo\s*中出现/g, "出现"],
    [/匿名体验摘录\s*·\s*Demo\s*回声/g, "匿名体验摘录"],
    [/Demo\s*统计示例/g, ""],
    [/Wi-Fi\s*\/\s*插座规则未确认，勿按办公位安排。/g, "Wi-Fi 与插座可供短时使用；高峰时请优先让给用餐客人。"],
    [/Wi-Fi、插座及电脑规则未确认，勿按办公或充电位安排。/g, "Wi-Fi 与靠窗插座可供短时阅读使用；周末高峰请控制停留时间。"],
    [/用小雨示例试排/g, "按小雨安排"],
    [/请亲自选一家店；这里不会替你选店或发送问题。/g, "选择一家店后即可提问。"],
    [/演示中的下一站。此处仅展示地区扩展结构，没有可进入的小店。/g, "下一站仍在筹备。"],
    [/此平面图为设计示意，不精确测绘。/g, ""]
  ];

  var hidePhraseElements = [
    "只演示天气如何帮助提问，不代表当地当前天气。",
    "景点影像参考，不代表演示店铺实景。"
  ];
  var suggestionRowSerial = 0;
  var suggestionRoute = location.hash.split("?")[0];
  var suggestionPreference = null;
  var queueRoute = location.hash.split("?")[0];
  var queuedQuestion = "";
  var drainScheduled = false;
  var quickDialog = null;
  var quickInput = null;
  var quickList = null;
  var quickDialogBound = false;
  var QUICK_RECENT_KEY = "hk-demo3-last-room";

  function hydrateOwnerKnowledge() {
    var payload = document.getElementById("hk-extra-owner-knowledge");
    var gapPayload = document.getElementById("hk-extra-merchant-gaps");
    var shops = window.__STANDALONE_WORLD__?.data?.shops;
    var dashboards = window.__STANDALONE_WORLD__?.dashboards;
    var gapResolutions = {
      "gap-tea-wifi": "tea-extra-05",
      "gap-tea-luggage": "tea-extra-08",
      "gap-bamboo-restroom": "bamboo-extra-13",
      "gap-tofu-takeaway": "tofu-extra-08",
      "gap-songfeng-wifi": "songfeng-extra-01",
      "gap-songfeng-luggage": "songfeng-extra-10"
    };
    if (!payload || !Array.isArray(shops)) return;
    var extra;
    try {
      extra = JSON.parse(payload.textContent || "{}");
    } catch (_) {
      return;
    }
    var extraGaps = {};
    try {
      extraGaps = JSON.parse(gapPayload?.textContent || "{}");
    } catch (_) {}
    shops.forEach(function (shop) {
      var additions = Array.isArray(extra[shop.id]) ? extra[shop.id] : [];
      if (!Array.isArray(shop.knowledgeBase)) shop.knowledgeBase = [];
      var existing = new Set(shop.knowledgeBase.map(function (fact) { return fact.id; }));
      additions.forEach(function (fact) {
        if (fact?.id && !existing.has(fact.id)) {
          shop.knowledgeBase.push({ ...fact });
          existing.add(fact.id);
        }
      });
      var dashboard = dashboards && dashboards[shop.id];
      if (dashboard && dashboard.knowledge) {
        var categories = new Map();
        shop.knowledgeBase.forEach(function (fact) {
          var category = fact.category || "新增资料";
          categories.set(category, (categories.get(category) || 0) + 1);
        });
        dashboard.knowledge.total = shop.knowledgeBase.length;
        dashboard.knowledge.categories = Array.from(categories, function (entry) {
          return { category: entry[0], count: entry[1] };
        });
        dashboard.knowledge.recent = shop.knowledgeBase.slice(-10).reverse();
        if (!Array.isArray(dashboard.gaps)) dashboard.gaps = [];
        var knownGapIds = new Set(dashboard.gaps.map(function (gap) { return gap.id; }));
        (extraGaps[shop.id] || []).forEach(function (gap) {
          if (gap?.id && !knownGapIds.has(gap.id)) {
            dashboard.gaps.push({ ...gap });
            knownGapIds.add(gap.id);
          }
        });
        if (Array.isArray(dashboard.gaps)) {
          dashboard.gaps = dashboard.gaps.map(function (gap) {
            var resolvedFactId = gapResolutions[gap.id];
            var resolvedFact = resolvedFactId && shop.knowledgeBase.find(function (fact) {
              return fact.id === resolvedFactId;
            });
            if (gap.status === "open" && resolvedFact) {
              return {
                ...gap,
                status: "resolved",
                ownerAnswer: resolvedFact.answer
              };
            }
            return gap;
          });
          if (dashboard.summary) {
            dashboard.summary.unresolved = dashboard.gaps.filter(function (gap) {
              return gap.status === "open";
            }).length;
          }
        }
      }
    });
  }

  function hideExplanations(root) {
    hiddenSelectors.forEach(function (selector) {
      (root.querySelectorAll ? root : document).querySelectorAll(selector).forEach(function (node) {
        node.hidden = true;
      });
    });
  }

  function replaceText(root) {
    if (!root || !document.createTreeWalker) return;
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        var parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        if (parent.closest("script,style,textarea,svg")) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var node;
    while ((node = walker.nextNode())) {
      var before = node.nodeValue;
      var after = before;
      replacements.forEach(function (rule) {
        after = after.replace(rule[0], rule[1]);
      });
      if (after !== before) node.nodeValue = after;

      if (hidePhraseElements.some(function (phrase) { return before.indexOf(phrase) !== -1; })) {
        var target = node.parentElement && node.parentElement.closest("p,small,span,div");
        if (target) target.hidden = true;
      }
    }
  }

  function prioritizeAgent(root) {
    if (!root.querySelectorAll) return;
    root.querySelectorAll(".app-shell[data-hk-room-editorial] .chat-panel__header").forEach(function (header) {
      var strong = header.querySelector("strong");
      var small = header.querySelector("small");
      if (!strong || !small) return;
      var ownerTitle = strong.textContent.trim();
      if (!ownerTitle || ownerTitle === "AI 接待员") return;
      if (small.textContent.trim() !== ownerTitle) small.textContent = ownerTitle;
      strong.textContent = "AI 接待员";
    });
  }

  function cropEmbeddedBannerLabels(root) {
    if (!root.querySelectorAll) return;
    root.querySelectorAll(".hk-room-banner[data-hk-crop]").forEach(function (frame) {
      if (frame.getAttribute("data-hk-demo3-cropped") === "true") return;
      var cropHeight = Number(frame.style.getPropertyValue("--hk-crop-h"));
      if (Number.isFinite(cropHeight) && cropHeight > 64) {
        // The supplied reference image has a demo caption baked into its
        // lower edge. Trim that strip so the source pixels stay hidden too.
        frame.style.setProperty("--hk-crop-h", String(cropHeight - 44));
        frame.setAttribute("data-hk-demo3-cropped", "true");
      }
      var image = frame.querySelector(".hk-room-crop-image");
      if (image) image.alt = "店铺空间影像";
    });
  }

  function currentRoomShop() {
    var shopId = "";
    try {
      shopId = decodeURIComponent(location.hash.split("/")[3] || "").split("?")[0];
    } catch (_) {}
    var world = window.__STANDALONE_WORLD__;
    var shops = world && world.data && world.data.shops;
    if (Array.isArray(shops)) {
      return shops.find(function (shop) { return shop && shop.id === shopId; }) || null;
    }
    return shops && typeof shops === "object" ? shops[shopId] || null : null;
  }

  function quickShopEntries() {
    var world = window.__STANDALONE_WORLD__;
    var shops = world && world.data && world.data.shops;
    var values = Array.isArray(shops)
      ? shops
      : shops && typeof shops === "object"
        ? Object.values(shops)
        : [];
    return values.filter(function (shop) {
      return shop && shop.id && shop.townId;
    });
  }

  function recentQuickShopId() {
    try {
      return window.localStorage.getItem(QUICK_RECENT_KEY) || "";
    } catch (_) {
      return "";
    }
  }

  function rememberCurrentRoom() {
    var match = /#\/room\/([^/]+)\/([^/?#]+)/.exec(location.hash);
    if (!match) return;
    try {
      window.localStorage.setItem(
        QUICK_RECENT_KEY,
        decodeURIComponent(match[1]) + "/" + decodeURIComponent(match[2])
      );
    } catch (_) {}
  }

  function quickEntryAllowed() {
    return !/^#\/(?:merchant|room|card)(?:\/|$)/.test(location.hash || "#/");
  }

  function renderQuickShopList(query) {
    if (!quickList) return;
    var needle = String(query || "").replace(/\s+/g, "").toLowerCase();
    var recent = recentQuickShopId();
    var entries = quickShopEntries()
      .filter(function (shop) {
        if (!needle) return true;
        return [
          shop.name,
          shop.englishName,
          shop.category,
          shop.tagline,
          shop.regionName,
          shop.townName,
        ].join("").replace(/\s+/g, "").toLowerCase().includes(needle);
      })
      .sort(function (left, right) {
        var leftKey = left.townId + "/" + left.id;
        var rightKey = right.townId + "/" + right.id;
        return Number(rightKey === recent) - Number(leftKey === recent);
      });

    quickList.textContent = "";
    if (!entries.length) {
      var empty = document.createElement("li");
      empty.className = "hk-demo3-quick-dialog__empty";
      empty.textContent = "没有找到这家店。";
      quickList.appendChild(empty);
      return;
    }

    entries.forEach(function (shop) {
      var item = document.createElement("li");
      var button = document.createElement("button");
      button.type = "button";
      button.setAttribute("data-hk-quick-shop", shop.id);
      button.setAttribute(
        "aria-label",
        "进入" + shop.name + "的 AI 会客厅"
      );

      var copy = document.createElement("span");
      copy.className = "hk-demo3-quick-dialog__shop";
      var heading = document.createElement("strong");
      heading.textContent = shop.name;
      var meta = document.createElement("span");
      meta.className = "hk-demo3-quick-dialog__shop-meta";
      var place = document.createElement("small");
      place.textContent = [shop.regionName, shop.townName, shop.category]
        .filter(Boolean)
        .join(" · ");
      meta.appendChild(place);
      if (shop.townId + "/" + shop.id === recent) {
        var recentBadge = document.createElement("span");
        recentBadge.className = "hk-demo3-quick-dialog__recent";
        recentBadge.textContent = "上次去过";
        meta.appendChild(recentBadge);
      }
      copy.append(heading, meta);

      var arrow = document.createElement("span");
      arrow.textContent = "→";
      button.append(copy, arrow);
      button.addEventListener("click", function () {
        if (quickDialog) quickDialog.close();
        location.hash =
          "#/room/" +
          encodeURIComponent(shop.townId) +
          "/" +
          encodeURIComponent(shop.id);
      });
      item.appendChild(button);
      quickList.appendChild(item);
    });
  }

  function ensureQuickDialog() {
    if (quickDialog || !document.body) return quickDialog;
    quickDialog = document.createElement("dialog");
    quickDialog.className = "hk-demo3-quick-dialog";
    quickDialog.setAttribute("aria-labelledby", "hk-demo3-quick-title");

    var head = document.createElement("div");
    head.className = "hk-demo3-quick-dialog__head";
    var heading = document.createElement("div");
    var title = document.createElement("h2");
    title.id = "hk-demo3-quick-title";
    title.textContent = "直接进入 AI 会客厅";
    var note = document.createElement("p");
    note.textContent = "选一家店，立即开始问。";
    heading.append(title, note);
    var close = document.createElement("button");
    close.type = "button";
    close.className = "hk-demo3-quick-dialog__close";
    close.textContent = "关闭";
    close.addEventListener("click", function () { quickDialog.close(); });
    head.append(heading, close);

    var search = document.createElement("div");
    search.className = "hk-demo3-quick-dialog__search";
    var searchIcon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    searchIcon.setAttribute("viewBox", "0 0 24 24");
    searchIcon.setAttribute("fill", "none");
    searchIcon.setAttribute("stroke", "currentColor");
    searchIcon.setAttribute("stroke-width", "1.7");
    searchIcon.setAttribute("stroke-linecap", "round");
    searchIcon.setAttribute("aria-hidden", "true");
    var searchCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    searchCircle.setAttribute("cx", "10.5");
    searchCircle.setAttribute("cy", "10.5");
    searchCircle.setAttribute("r", "6.5");
    var searchLine = document.createElementNS("http://www.w3.org/2000/svg", "path");
    searchLine.setAttribute("d", "m15.5 15.5 4 4");
    searchIcon.append(searchCircle, searchLine);
    quickInput = document.createElement("input");
    quickInput.type = "search";
    quickInput.placeholder = "输入店名或小镇，例如“桥西茶寮”";
    quickInput.setAttribute("aria-label", "搜索店铺并直接进入 AI 会客厅");
    quickInput.addEventListener("input", function () {
      renderQuickShopList(quickInput.value);
    });
    quickInput.addEventListener("keydown", function (event) {
      if (event.key !== "Enter") return;
      event.preventDefault();
      var first = quickList && quickList.querySelector("button");
      if (first) first.click();
    });
    search.append(searchIcon, quickInput);

    quickList = document.createElement("ul");
    quickList.className = "hk-demo3-quick-dialog__list";
    quickDialog.append(head, search, quickList);
    quickDialog.addEventListener("click", function (event) {
      if (event.target === quickDialog) quickDialog.close();
    });
    document.body.appendChild(quickDialog);
    return quickDialog;
  }

  function openQuickDialog() {
    var dialog = ensureQuickDialog();
    if (!dialog) return;
    if (dialog.open) {
      if (quickInput) quickInput.focus();
      return;
    }
    quickInput.value = "";
    renderQuickShopList("");
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
    window.requestAnimationFrame(function () {
      quickInput.focus();
      quickInput.select();
    });
  }

  function polishQuickEntry(root) {
    if (!root.querySelectorAll) return;
    rememberCurrentRoom();
    var header = document.querySelector(".site-header__inner");
    if (!header) return;
    var button = header.querySelector(".hk-demo3-quick-entry");
    if (!button) {
      button = document.createElement("button");
      button.type = "button";
      button.className = "hk-demo3-quick-entry";
      button.setAttribute("aria-haspopup", "dialog");
      button.setAttribute("aria-label", "直接进入 AI 会客厅");
      button.title = "快速进入 AI 会客厅（Ctrl/⌘ + K）";
      var icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      icon.setAttribute("viewBox", "0 0 24 24");
      icon.setAttribute("fill", "none");
      icon.setAttribute("stroke", "currentColor");
      icon.setAttribute("stroke-width", "1.7");
      icon.setAttribute("stroke-linecap", "round");
      icon.setAttribute("aria-hidden", "true");
      var circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.setAttribute("cx", "10.5");
      circle.setAttribute("cy", "10.5");
      circle.setAttribute("r", "6.5");
      var line = document.createElementNS("http://www.w3.org/2000/svg", "path");
      line.setAttribute("d", "m15.5 15.5 4 4");
      icon.append(circle, line);
      var label = document.createElement("span");
      label.textContent = "直接问店";
      button.append(icon, label);
      button.addEventListener("click", openQuickDialog);
      var portal = header.querySelector(".portal-switch");
      header.insertBefore(button, portal || null);
    }
    button.hidden = !quickEntryAllowed();

    if (!quickDialogBound) {
      quickDialogBound = true;
      document.addEventListener("keydown", function (event) {
        if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "k") return;
        if (!quickEntryAllowed()) return;
        event.preventDefault();
        openQuickDialog();
      });
    }
  }

  function accelerateSingleTownRegions(root) {
    if (!root.querySelectorAll) return;
    var world = window.__STANDALONE_WORLD__;
    var regions = world && world.data && world.data.regions;
    var towns = world && world.data && world.data.towns;
    if (!Array.isArray(regions) || !Array.isArray(towns)) return;

    root
      .querySelectorAll(
        ".region-mini__link, .region-mini--interactive, .region-card--interactive, .region-card a[href^='#/visit/']"
      )
      .forEach(function (link) {
        var href = link.getAttribute("href") || "";
        var match = /(?:^|#)\/visit\/([^/?#]+)$/.exec(href);
        if (!match) return;
        var regionId = decodeURIComponent(match[1]);
        var openTowns = towns.filter(function (town) {
          return town.regionId === regionId &&
            (town.status === "open" || !town.status);
        });
        if (openTowns.length !== 1) return;
        var target = "#/visit/" + regionId + "/" + openTowns[0].id;
        link.setAttribute("data-hk-single-town-target", target);
        if (!link.hasAttribute("data-hk-single-town-bound")) {
          link.setAttribute(
            "aria-label",
            link.getAttribute("aria-label") + "，直接进入" + openTowns[0].name
          );
          link.setAttribute("data-hk-single-town-bound", "true");
          link.addEventListener("click", function (event) {
            if (event.defaultPrevented || event.button !== 0 || event.metaKey ||
                event.ctrlKey || event.shiftKey || event.altKey) return;
            var direct = link.getAttribute("data-hk-single-town-target");
            if (!direct) return;
            event.preventDefault();
            location.hash = direct;
          });
        }
      });
  }

  function applyTodayShopRanking(root) {
    if (!root.querySelectorAll) return;
    var preferenceByScenario = {
      quiet: ["qiaoxi-tea", "songfeng-tea"],
      rain: ["qiaoxi-tea", "songfeng-tea"],
      hot: ["ayuan-noodles", "banshan-tofu"],
      short: ["nanzha-bamboo", "qiaoxi-tea"],
      diet: ["ayuan-noodles", "banshan-tofu"],
      story: ["nanzha-bamboo", "banshan-tofu"],
    };

    root.querySelectorAll(".town-page").forEach(function (townPage) {
      var planner = townPage.querySelector(".hk-today-planner");
      var grid = townPage.querySelector(".town-shop-grid");
      if (!planner || !grid) return;
      var cards = Array.from(grid.querySelectorAll(":scope > .town-shop"));
      if (!cards.length) return;

      var selectedCard = planner.querySelector('.hk-today-card[aria-pressed="true"]');
      var preferences = [];
      if (selectedCard) {
        preferences = (preferenceByScenario[selectedCard.getAttribute("data-id")] || []).slice();
      }
      var need = planner.querySelector('.hk-today-planner__option[data-key="need"][aria-pressed="true"]');
      var time = planner.querySelector('.hk-today-planner__option[data-key="time"][aria-pressed="true"]');
      if (need) {
        var needValue = need.getAttribute("data-value");
        if (needValue === "quiet") preferences.push("qiaoxi-tea", "songfeng-tea");
        if (needValue === "hot") preferences.push("ayuan-noodles", "banshan-tofu");
        if (needValue === "craft") preferences.push("nanzha-bamboo");
      }
      if (time) {
        var timeValue = time.getAttribute("data-value");
        if (timeValue === "short") preferences.push("nanzha-bamboo", "qiaoxi-tea");
        if (timeValue === "medium") preferences.push("qiaoxi-tea", "banshan-tofu");
        if (timeValue === "halfday") preferences.push("banshan-tofu", "songfeng-tea");
      }

      cards.forEach(function (card, index) {
        if (!card.hasAttribute("data-hk-original-order")) {
          card.setAttribute("data-hk-original-order", String(index));
        }
        var href =
          card.getAttribute("href") ||
          card.querySelector("a[href]")?.getAttribute("href") ||
          "";
        var shopId = href.split("/").filter(Boolean).pop() || "";
        var rank = preferences.indexOf(shopId);
        var score = rank === -1 ? 0 : preferences.length - rank;
        card.setAttribute("data-hk-today-score", String(score));
      });

      var ordered = cards.slice().sort(function (left, right) {
        var scoreDiff =
          Number(right.getAttribute("data-hk-today-score")) -
          Number(left.getAttribute("data-hk-today-score"));
        if (scoreDiff) return scoreDiff;
        return (
          Number(left.getAttribute("data-hk-original-order")) -
          Number(right.getAttribute("data-hk-original-order"))
        );
      });
      var hasPreference = ordered.some(function (card) {
        return Number(card.getAttribute("data-hk-today-score")) > 0;
      });
      ordered.forEach(function (card, index) {
        card.style.order = String(index);
      });

      var eyebrow = townPage.querySelector(".town-shops .section-heading .eyebrow");
      if (eyebrow) {
        if (!eyebrow.hasAttribute("data-hk-original-label")) {
          eyebrow.setAttribute("data-hk-original-label", eyebrow.textContent);
        }
        var nextText = hasPreference
          ? "今日状态 · 更合适的店排在前面"
          : eyebrow.getAttribute("data-hk-original-label");
        if (eyebrow.textContent !== nextText) eyebrow.textContent = nextText;
      }

      var first = hasPreference ? ordered[0] : null;
      ordered.forEach(function (card) {
        var isFirst = card === first;
        if (isFirst) {
          if (card.getAttribute("data-hk-today-fit") !== "true") {
            card.setAttribute("data-hk-today-fit", "true");
          }
          var footer = card.querySelector(".town-shop__footer");
          if (footer && !footer.querySelector(".hk-demo3-fit-badge")) {
            var badge = document.createElement("span");
            badge.className = "hk-demo3-fit-badge";
            badge.textContent = "更符合今天";
            footer.insertBefore(badge, footer.firstChild);
          }
        } else {
          if (card.hasAttribute("data-hk-today-fit")) {
            card.removeAttribute("data-hk-today-fit");
          }
          var staleBadge = card.querySelector(".hk-demo3-fit-badge");
          if (staleBadge) staleBadge.remove();
        }
      });

      var weatherInput = planner.querySelector(
        '.hk-today-planner__weather-switch input[type="checkbox"]'
      );
      if (weatherInput && !weatherInput.hasAttribute("data-hk-rank-bound")) {
        weatherInput.setAttribute("data-hk-rank-bound", "true");
        weatherInput.addEventListener("change", schedule);
      }
    });
  }

  var intentRules = [
    ["queue", /排队|人多|高峰|错峰|等位|拥挤|早一点|晚一点|早去|晚去/],
    ["hours", /营业|几点|开门|关门|休息|周一|周二|周三|周四|周五|周六|周日/],
    ["recommendation", /附近|下一站|顺路|还能去|推荐.*(地方|店|逛)/],
    ["reservation", /预约|订位|留位|预留|占座/],
    ["pet", /宠物|带狗|小狗|猫|导盲犬/],
    ["story", /故事|由来|以前|旧物|为什么.*(开|做|留)/],
    ["solo", /一个人|独自|独行|单人|拼桌|尴尬|坐哪/],
    ["dietary", /不吃|忌口|过敏|素食|纯素|香菜|葱花|葱|蒜|辣|花生|坚果|乳糖|豆类/],
    ["menu", /点什么|吃什么|喝什么|怎么点|招牌|菜单|价格|多少钱|预算|分量|小份|加什么/],
    ["facilities", /wifi|wi-fi|插座|电脑|手机支架|行李|寄存|洗手间|厕所|儿童椅|婴儿车|停车|外带|打包/],
    ["etiquette", /拍照|摄影|电话|视频|礼仪|误会|注意|可以带|能不能带/],
  ];
  var intentLabels = {
    queue: "排队与高峰",
    hours: "营业时间",
    recommendation: "下一站推荐",
    reservation: "预约与留位",
    pet: "宠物政策",
    story: "店铺故事",
    solo: "独行与座位",
    dietary: "忌口与食材",
    menu: "点单与菜单",
    facilities: "设施与便利",
    etiquette: "礼仪与误会",
  };
  var intentValidation = {
    queue: /排队|高峰|拥挤|错峰|等位|最挤|人最多|提前|早到|10:30|11:20|12:30|13:30|收门|营业/,
    hours: /\d{1,2}:\d{2}|营业|开门|关门|休息|收门|休/,
    recommendation: /推荐|可以.*去|下一站|顺路/,
    reservation: /预约|订位|留位|不提供|不能承诺|现场/,
    pet: /宠物|狗|猫|导盲犬|不入内|不能进入/,
    story: /店主|故事|以前|旧|留下|年开始|年/,
    solo: /一个人|独自|单人|吧台|小桌|座位|拼桌/,
    dietary: /不吃|忌口|过敏|素食|纯素|香菜|葱|蒜|辣|花生|坚果|乳糖|不放|可调整|现场确认/,
    menu: /元|招牌|面|茶|烘青|米浆|豆浆|豆花|杯垫|套餐|价格|可以点|一杯|一份/,
    facilities: /wifi|wi-fi|插座|电脑|支架|行李|寄存|洗手间|厕所|儿童椅|婴儿车|停车|打包|外带/,
    etiquette: /拍照|摄影|电话|视频|礼仪|误会|不要|请勿/,
  };

  function cleanCompositeFactRef(value) {
    var ref = String(value || "");
    if (/commonMisunderstandings|commonMisunderstanding|误会/i.test(ref)) return "常见误会";
    if (/hours\.(busy|soloFriendly)/i.test(ref) || /排队|高峰/.test(ref)) {
      return "排队与高峰";
    }
    if (/hours|营业|开门|关门|休息/i.test(ref)) return "营业时间";
    if (/solo|座位|独行/i.test(ref)) return "独行与座位";
    if (/menu|signature|菜单|点单/i.test(ref)) return "菜单与点单";
    if (/recommend|下一站|推荐/i.test(ref)) return "店主推荐";
    if (/pet|宠物/i.test(ref)) return "宠物政策";
    if (/product|products|ordering|signatureChoice/i.test(ref)) return "菜单与点单";
    if (/knowledge|faq|extra-\d+|kb-\d+|资料/i.test(ref)) return "店主资料";
    if (/etiquette|礼仪/i.test(ref)) return "礼仪与误会";
    if (/facilit|设施|设备/i.test(ref)) return "设施与便利";
    var cleaned = ref.replace(/\[[^\]]+\]/g, "").replace(/\.[a-zA-Z]+/g, " ").replace(/\s+/g, " ").trim();
    if (!cleaned || /^[A-Za-z][A-Za-z0-9 _-]*$/.test(cleaned)) return "店主资料";
    return cleaned;
  }

  function sanitizeCompositeReply(text) {
    return String(text || "").replace(
      /[（(](店主提供|店主补充)[：:]\s*([^）)]+)[）)]/g,
      function (match, label, refs) {
        var labels = refs
          .split(/[、,，/|]+/)
          .map(cleanCompositeFactRef)
          .filter(Boolean);
        labels = Array.from(new Set(labels));
        return labels.length ? "（" + label + "：" + labels.join(" · ") + "）" : match;
      }
    );
  }

  function classifyCompositeIntents(text) {
    var normalized = String(text || "").toLowerCase();
    var intents = intentRules
      .filter(function (rule) { return rule[1].test(normalized); })
      .map(function (rule) { return rule[0]; });
    return intents.length ? Array.from(new Set(intents)) : ["general"];
  }

  function getCompositeShop(shopId) {
    var shops = window.__STANDALONE_WORLD__?.data?.shops;
    if (Array.isArray(shops)) {
      return shops.find(function (shop) { return shop.id === shopId; }) || null;
    }
    return shops && shops[shopId] || null;
  }

  function findCompositeFact(shop, text, terms) {
    var facts = [].concat(shop?.knowledgeBase || [], shop?.faqs || []);
    return facts.find(function (fact) {
      return fact && terms.some(function (term) {
        return String(text).toLowerCase().includes(term) &&
          (String(fact.question || "").includes(term) || String(fact.answer || "").includes(term));
      });
    }) || null;
  }

  function compositeIntentAnswer(shop, intent, question) {
    var text = String(question || "").toLowerCase();
    var fact;
    if (intent === "queue") {
      fact = findCompositeFact(shop, text, ["排队", "高峰", "人多", "错峰", "等位"]);
      return {
        text:
          shop.hours.display +
          "；" +
          shop.hours.closed +
          "。" +
          (fact
            ? fact.answer
            : shop.hours.busy + "；" + shop.hours.soloFriendly + "。") +
          "（店主提供：排队与高峰）",
        refs: ["营业时间", "排队与高峰"],
        covered: "full",
      };
    }
    if (intent === "hours") {
      return {
        text:
          shop.hours.display +
          "；" +
          shop.hours.closed +
          "。" +
          (shop.hours.note || "") +
          "（店主提供：营业时间）",
        refs: ["营业时间"],
        covered: "full",
      };
    }
    if (intent === "recommendation") {
      var recommendation = shop.recommendations?.[0];
      return {
        text: recommendation
          ? "店主推荐下一站：" +
            (recommendation.reason || "") +
            (recommendation.context || "") +
            "（店主提供：店主推荐）"
          : "店主资料里还没有写下一站推荐，我会把它留给店主补充。",
        refs: recommendation ? ["店主推荐"] : [],
        covered: recommendation ? "full" : "missing",
        gap: recommendation ? "" : question,
      };
    }
    if (intent === "reservation") {
      fact = findCompositeFact(shop, text, ["预约", "订位", "留位", "保留", "占座"]);
      return fact
        ? { text: fact.answer + "（店主提供：预约与留位）", refs: ["预约与留位"], covered: "full" }
        : {
            text: "店主资料里没有预约留位服务，不能承诺固定座位；请到店后按现场安排。",
            refs: ["到店规则"],
            covered: "partial",
            gap: "是否提供预约或留位服务？",
          };
    }
    if (intent === "pet") {
      return {
        text: shop.petPolicy + "（店主提供：宠物政策）",
        refs: ["宠物政策"],
        covered: /未写明/.test(shop.petPolicy) ? "partial" : "full",
        gap: /未写明/.test(shop.petPolicy) ? "可以带宠物进店吗？" : "",
      };
    }
    if (intent === "story") {
      return {
        text:
          shop.story +
          " 店主原话是：“" +
          String(shop.storyQuote || "").replaceAll("“", "").replaceAll("”", "") +
          "”（店主提供：店铺故事）",
        refs: ["店铺故事"],
        covered: "full",
      };
    }
    if (intent === "solo") {
      return {
        text:
          "一个人来不用特意解释。" +
          shop.solo.seating +
          shop.solo.bestTime +
          "最从容；" +
          shop.solo.comfortNote +
          "（店主提供：单人座位）",
        refs: ["单人座位", "安静时段"],
        covered: "full",
      };
    }
    if (intent === "dietary") {
      fact = findCompositeFact(shop, text, [
        "不吃", "忌口", "过敏", "素食", "纯素", "香菜", "葱", "蒜",
        "辣", "花生", "坚果", "乳糖", "豆类",
      ]);
      return fact
        ? {
            text:
              fact.answer +
              "（" +
              (fact.source || "店主提供") +
              "：" +
              (fact.category || "忌口与食材") +
              "）",
            refs: [fact.category || "忌口与食材"],
            covered: "full",
          }
        : {
            text: "店主资料里还没有写这项忌口或食材信息，我不会替你猜；请把具体忌口留给店主确认。",
            refs: [],
            covered: "partial",
            gap: question,
          };
    }
    if (intent === "menu") {
      return {
        text:
          "第一次来，店主建议这样点：" +
          shop.signatureChoice.soloOrder +
          "，大约 " +
          shop.signatureChoice.budget +
          " 元。" +
          shop.signatureChoice.reason +
          shop.signatureChoice.alternative +
          "（店主提供：菜单与点单建议）",
        refs: ["菜单", "点单建议"],
        covered: "full",
      };
    }
    if (intent === "facilities") {
      fact = findCompositeFact(shop, text, [
        "wifi", "wi-fi", "插座", "电脑", "支架", "行李", "寄存",
        "洗手间", "厕所", "儿童椅", "婴儿车", "停车", "打包", "外带",
      ]);
      return fact
        ? {
            text:
              fact.answer +
              "（" +
              (fact.source || "店主提供") +
              "：" +
              (fact.category || "设施与便利") +
              "）",
            refs: [fact.category || "设施与便利"],
            covered: "full",
          }
        : {
            text: "Wi-Fi、插座和电脑使用情况还没有店主确认的资料，我不会替你猜，会把这个问题留给店主补充。",
            refs: ["设施与便利"],
            covered: "partial",
            gap: question,
          };
    }
    if (intent === "etiquette") {
      var misunderstanding = shop.commonMisunderstandings?.[0]?.correction || "";
      return {
        text:
          misunderstanding +
          (shop.etiquette?.[0] ? "另外，" + shop.etiquette[0] : "") +
          "（店主提供：礼仪与误会）",
        refs: ["礼仪与误会"],
        covered: "full",
      };
    }
    return null;
  }

  function installCompositeIntentGuard() {
    var currentFetch = window.fetch;
    if (currentFetch && currentFetch.__hkCompositeIntentGuard) return;
    window.__hkCompositeIntentGuard = true;
    var previousFetch = currentFetch.bind(window);
    var guardedFetch = async function (input, options = {}) {
      var raw = typeof input === "string" ? input : input.url;
      var path = raw.startsWith("/api/")
        ? raw.split("?")[0]
        : new URL(raw, window.location.href).pathname;
      if (path !== "/api/chat") return previousFetch(input, options);

      var response = await previousFetch(input, options);
      if (!response.ok) return response;
      var payload;
      try {
        payload = await response.clone().json();
      } catch (_) {
        return response;
      }
      var payloadChanged = false;
      if (typeof payload.reply === "string") {
        var cleanedReply = sanitizeCompositeReply(payload.reply);
        if (cleanedReply !== payload.reply) {
          payload = { ...payload, reply: cleanedReply };
          payloadChanged = true;
        }
      }
      if (Array.isArray(payload.factRefs)) {
        var cleanedRefs = payload.factRefs.map(cleanCompositeFactRef);
        var refsChanged = cleanedRefs.some(function (ref, index) {
          return ref !== payload.factRefs[index];
        });
        if (refsChanged) {
          payload = { ...payload, factRefs: cleanedRefs };
          payloadChanged = true;
        }
      }
      var body;
      try {
        body = JSON.parse(options.body || "{}");
      } catch (_) {
        return response;
      }
      var messages = Array.isArray(body.messages) ? body.messages : [];
      var question =
        [...messages].reverse().find(function (message) { return message.role === "user"; })?.content || "";
      var intents = classifyCompositeIntents(question);
      if (intents.length === 1 && intents[0] === "general") {
        if (!payloadChanged) return response;
        return new Response(JSON.stringify(payload), {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
        });
      }
      var missing = intents.filter(function (intent) {
        return !intentValidation[intent] || !intentValidation[intent].test(String(payload.reply || "").toLowerCase());
      });
      if (!missing.length) {
        if (!payloadChanged) return response;
        return new Response(JSON.stringify(payload), {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
        });
      }

      var shop = getCompositeShop(body.shopId);
      if (!shop) return response;
      var additions = missing
        .map(function (intent) { return compositeIntentAnswer(shop, intent, question); })
        .filter(Boolean);
      if (!additions.length) {
        if (!payloadChanged) return response;
        return new Response(JSON.stringify(payload), {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
        });
      }

      var reply = [String(payload.reply || "").trim()]
        .concat(additions.map(function (item) { return item.text; }))
        .filter(Boolean)
        .join("\n\n");
      var refs = Array.from(new Set(
        [].concat(
          Array.isArray(payload.factRefs) ? payload.factRefs : [],
          additions.flatMap(function (item) { return item.refs || []; })
        )
      ));
      var gaps = additions.map(function (item) { return item.gap || ""; }).filter(Boolean);
      var covered = additions.some(function (item) { return item.covered === "partial" || item.covered === "missing"; })
        ? "partial"
        : (payload.covered || "full");
      var merged = {
        ...payload,
        reply,
        covered,
        intent: intents.map(function (intent) { return intentLabels[intent] || "店铺咨询"; }).join(" · "),
        gapQuestion: [payload.gapQuestion || "", ...gaps].filter(Boolean).join("\n") || null,
        factRefs: refs,
        mode: "guarded-composite",
      };
      return new Response(JSON.stringify(merged), {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
    };
    guardedFetch.__hkCompositeIntentGuard = true;
    window.fetch = guardedFetch;
  }

  function addContactFact(root) {
    if (!root.querySelectorAll) return;
    root.querySelectorAll(".app-shell[data-hk-room-editorial] .room-context__facts").forEach(function (facts) {
      if (facts.querySelector(".hk-demo3-contact-fact")) return;
      var shop = currentRoomShop();
      var contact =
        shop && (shop.phone || shop.telephone || shop.contactPhone || shop.contact);
      var row = document.createElement("div");
      row.className = "hk-demo3-contact-fact";
      row.setAttribute("title", "联系方式来自店主资料");

      var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("viewBox", "0 0 32 32");
      svg.setAttribute("width", "15");
      svg.setAttribute("height", "15");
      svg.setAttribute("fill", "none");
      svg.setAttribute("stroke", "currentColor");
      svg.setAttribute("stroke-width", "1.7");
      svg.setAttribute("stroke-linecap", "round");
      svg.setAttribute("stroke-linejoin", "round");
      svg.setAttribute("aria-hidden", "true");
      var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", "M7 4h4l2 5-3 2a17 17 0 0 0 9 9l2-3 5 2v4c0 1-1 2-2 2C13 25 3 15 3 6c0-1 1-2 2-2z");
      svg.appendChild(path);

      var copy = document.createElement("span");
      var label = document.createElement("small");
      label.textContent = "联系方式";
      copy.appendChild(label);
      copy.appendChild(document.createTextNode(
        contact ? String(contact) : "店主尚未提供"
      ));
      row.append(svg, copy);
      facts.appendChild(row);
    });
  }

  function queueSnippet(value) {
    var normalized = String(value || "").replace(/\s+/g, " ").trim();
    return normalized.length > 34 ? normalized.slice(0, 34) + "…" : normalized;
  }

  function setTextareaValue(textarea, value) {
    var setter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype,
      "value"
    ).set;
    setter.call(textarea, value);
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    textarea.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function ensureQueueRow(panel) {
    var composer = panel.querySelector(".chat-panel__composer");
    var form = composer && composer.querySelector("form.composer");
    if (!composer || !form) return null;
    var row = composer.querySelector(".hk-demo3-queue-row");
    if (row) return row;

    row = document.createElement("div");
    row.className = "hk-demo3-queue-row";
    row.hidden = true;
    row.setAttribute("role", "status");
    row.setAttribute("aria-live", "polite");
    var copy = document.createElement("span");
    copy.className = "hk-demo3-queue-copy";
    var actions = document.createElement("span");
    actions.className = "hk-demo3-queue-actions";
    var queue = document.createElement("button");
    queue.type = "button";
    queue.className = "hk-demo3-queue-action";
    queue.textContent = "排队发送";
    var cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "hk-demo3-queue-cancel";
    cancel.textContent = "取消";
    cancel.hidden = true;
    actions.append(queue, cancel);
    row.append(copy, actions);
    form.insertAdjacentElement("afterend", row);
    return row;
  }

  function queueCurrentQuestion(panel) {
    if (queuedQuestion) return;
    var textarea = panel.querySelector(".composer textarea");
    var text = textarea && textarea.value.trim();
    if (!text) return;
    queuedQuestion = text;
    setTextareaValue(textarea, "");
    schedule();
  }

  function drainQueuedQuestion() {
    if (drainScheduled || !queuedQuestion) return;
    drainScheduled = true;
    window.setTimeout(function () {
      drainScheduled = false;
      var panel = document.querySelector(".chat-panel");
      if (!panel || !queuedQuestion || panel.querySelector(".thinking-bubble")) return;
      var textarea = panel.querySelector(".composer textarea");
      var form = textarea && textarea.closest("form.composer");
      if (!textarea || !form) return;
      var text = queuedQuestion;
      queuedQuestion = "";
      setTextareaValue(textarea, text);

      var attempts = 0;
      function submitWhenReady() {
        var send = form.querySelector(".send-button");
        if (send && !send.disabled) {
          send.click();
          return;
        }
        attempts += 1;
        if (attempts < 20) window.setTimeout(submitWhenReady, 100);
      }
      window.requestAnimationFrame(submitWhenReady);
      schedule();
    }, 120);
  }

  function polishQuestionQueue(root) {
    if (!root.querySelectorAll) return;
    var nextRoute = location.hash.split("?")[0];
    if (nextRoute !== queueRoute) {
      queueRoute = nextRoute;
      queuedQuestion = "";
    }

    root.querySelectorAll(".app-shell[data-hk-room-editorial] .chat-panel").forEach(function (panel) {
      var row = ensureQueueRow(panel);
      var textarea = panel.querySelector(".composer textarea");
      var form = textarea && textarea.closest("form.composer");
      if (!row || !textarea || !form) return;

      if (!textarea.hasAttribute("data-hk-queue-bound")) {
        textarea.setAttribute("data-hk-queue-bound", "true");
        textarea.addEventListener("input", schedule);
        textarea.addEventListener("keydown", function (event) {
          if (event.key !== "Enter" || event.shiftKey) return;
          if (!panel.querySelector(".thinking-bubble")) return;
          event.preventDefault();
          event.stopPropagation();
          event.stopImmediatePropagation();
          queueCurrentQuestion(panel);
        }, true);
      }
      if (!form.hasAttribute("data-hk-queue-bound")) {
        form.setAttribute("data-hk-queue-bound", "true");
        form.addEventListener("submit", function (event) {
          if (!panel.querySelector(".thinking-bubble")) return;
          event.preventDefault();
          event.stopPropagation();
          event.stopImmediatePropagation();
          queueCurrentQuestion(panel);
        }, true);
      }

      var copy = row.querySelector(".hk-demo3-queue-copy");
      var action = row.querySelector(".hk-demo3-queue-action");
      var cancel = row.querySelector(".hk-demo3-queue-cancel");
      if (action && !action.hasAttribute("data-hk-queue-bound")) {
        action.setAttribute("data-hk-queue-bound", "true");
        action.addEventListener("click", function () { queueCurrentQuestion(panel); });
      }
      if (cancel && !cancel.hasAttribute("data-hk-queue-bound")) {
        cancel.setAttribute("data-hk-queue-bound", "true");
        cancel.addEventListener("click", function () {
          queuedQuestion = "";
          schedule();
        });
      }

      var busy = !!panel.querySelector(".thinking-bubble");
      var typed = textarea.value.trim();
      if (busy && queuedQuestion) {
        row.hidden = false;
        var queuedCopy = "已排队：" + queueSnippet(queuedQuestion);
        if (copy && copy.textContent !== queuedCopy) copy.textContent = queuedCopy;
        if (action) action.hidden = true;
        if (cancel) cancel.hidden = false;
      } else if (busy && typed) {
        row.hidden = false;
        if (copy && copy.textContent !== "回答结束后自动发送") {
          copy.textContent = "回答结束后自动发送";
        }
        if (action) action.hidden = false;
        if (cancel) cancel.hidden = true;
      } else if (!busy && queuedQuestion) {
        row.hidden = false;
        if (copy && copy.textContent !== "正在继续发送排队问题…") {
          copy.textContent = "正在继续发送排队问题…";
        }
        if (action) action.hidden = true;
        if (cancel) cancel.hidden = true;
        drainQueuedQuestion();
      } else {
        row.hidden = true;
        if (action) action.hidden = true;
        if (cancel) cancel.hidden = true;
      }
    });
  }

  function polishSuggestions(root) {
    if (!root.querySelectorAll) return;
    var nextRoute = location.hash.split("?")[0];
    if (nextRoute !== suggestionRoute) {
      suggestionRoute = nextRoute;
      suggestionPreference = null;
    }

    root.querySelectorAll(".app-shell[data-hk-room-editorial] .suggestion-row").forEach(function (row) {
      var panel = row.closest(".chat-panel");
      if (!panel) return;
      if (!row.id) row.id = "hk-room-suggestions-" + (++suggestionRowSerial);

      var head = row.querySelector(":scope > .hk-demo3-suggestion-head");
      if (!head) {
        head = document.createElement("div");
        head.className = "hk-demo3-suggestion-head";
        var label = document.createElement("span");
        label.textContent = "你可能想问";
        var toggle = document.createElement("button");
        toggle.type = "button";
        toggle.className = "hk-demo3-suggestion-toggle";
        toggle.setAttribute("aria-controls", row.id);
        toggle.addEventListener("click", function () {
          var currentlyCollapsed = row.getAttribute("data-hk-suggestions-collapsed") === "true";
          suggestionPreference = !currentlyCollapsed;
          polishSuggestions(document);
        });
        head.append(label, toggle);
        row.insertBefore(head, row.firstChild);
      }

      var button = head.querySelector(".hk-demo3-suggestion-toggle");
      var hasUserMessage = !!panel.querySelector(".message--user");
      var collapsed = suggestionPreference === null ? hasUserMessage : suggestionPreference;
      if (row.getAttribute("data-hk-suggestions-collapsed") !== String(collapsed)) {
        row.setAttribute("data-hk-suggestions-collapsed", String(collapsed));
      }
      if (button) {
        var labelText = collapsed ? "展开" : "收起";
        if (button.textContent !== labelText) button.textContent = labelText;
        button.setAttribute("aria-expanded", String(!collapsed));
        button.setAttribute("aria-label", collapsed ? "展开你可能想问的问题" : "收起你可能想问的问题");
      }
    });
  }

  function simplifyTodayPlanner(root) {
    if (!root.querySelectorAll) return;
    root.querySelectorAll(".hk-today-planner").forEach(function (planner) {
      var heading = planner.querySelector(".hk-today-planner__choices-head h3");
      var note = planner.querySelector(".hk-today-planner__choices-head p");
      if (heading && heading.textContent.trim() !== "你想先问什么？") {
        heading.textContent = "你想先问什么？";
      }
      if (note) {
        var explanation = "选一种处境，右侧店铺会按适合度排序，并生成可编辑的问题；点店铺才进入会客厅。";
        if (note.textContent.trim() !== explanation) note.textContent = explanation;
      }
      var shopHeading = planner.querySelector(".town-shops .section-heading h2");
      if (shopHeading && shopHeading.textContent.trim() !== "选一家店，开始问 AI") {
        shopHeading.textContent = "选一家店，开始问 AI";
      }
    });
    root.querySelectorAll(".hk-today-card__index").forEach(function (index) {
      var label = index.textContent.replace(/^\s*\d+\s*\/\s*/, "").trim();
      if (label && index.textContent !== label) index.textContent = label;
    });
  }

  function polishScenarioDetail(root) {
    if (!root.querySelectorAll) return;
    root.querySelectorAll(".hk-today-planner").forEach(function (planner) {
      var grid = planner.querySelector(".hk-today-planner__grid");
      if (!grid) return;
      var detail = planner.querySelector(".hk-demo3-scenario-detail");
      if (!detail) {
        detail = document.createElement("section");
        detail.className = "hk-demo3-scenario-detail";
        detail.hidden = true;
        detail.setAttribute("aria-live", "polite");

        var meta = document.createElement("div");
        meta.className = "hk-demo3-scenario-detail__meta";
        var label = document.createElement("span");
        label.textContent = "当前处境";
        var index = document.createElement("span");
        index.className = "hk-demo3-scenario-detail__index";
        meta.append(label, index);

        var title = document.createElement("h4");
        title.className = "hk-demo3-scenario-detail__title";
        var question = document.createElement("p");
        question.className = "hk-demo3-scenario-detail__question";
        var reason = document.createElement("p");
        reason.className = "hk-demo3-scenario-detail__reason";
        detail.append(meta, title, question, reason);
        grid.insertAdjacentElement("afterend", detail);
      }

      var selected = grid.querySelector('.hk-today-card[aria-pressed="true"]');
      if (!selected) {
        detail.hidden = true;
        return;
      }

      var selectedIndex = selected.querySelector(".hk-today-card__index");
      var selectedTitle = selected.querySelector(".hk-today-card__title");
      var selectedQuestion = selected.querySelector(".hk-today-card__question");
      var selectedReason = selected.querySelector(".hk-today-card__reason");
      var detailIndex = detail.querySelector(".hk-demo3-scenario-detail__index");
      var detailTitle = detail.querySelector(".hk-demo3-scenario-detail__title");
      var detailQuestion = detail.querySelector(".hk-demo3-scenario-detail__question");
      var detailReason = detail.querySelector(".hk-demo3-scenario-detail__reason");
      if (detailIndex && selectedIndex) {
        var indexValue = selectedIndex.textContent.trim();
        if (detailIndex.textContent !== indexValue) detailIndex.textContent = indexValue;
      }
      if (detailTitle && selectedTitle) {
        var titleValue = selectedTitle.textContent.trim();
        if (detailTitle.textContent !== titleValue) detailTitle.textContent = titleValue;
      }
      if (detailQuestion && selectedQuestion) {
        var questionValue = selectedQuestion.textContent.trim();
        if (detailQuestion.textContent !== questionValue) detailQuestion.textContent = questionValue;
      }
      if (detailReason && selectedReason) {
        var reasonText = selectedReason.textContent.trim();
        if (detailReason.textContent !== reasonText) detailReason.textContent = reasonText;
        detailReason.hidden =
          !reasonText ||
          reasonText === "可从本镇已有处境继续向店主确认。";
      }
      detail.hidden = false;
    });
  }

  function placeTodayPlannerFirst(root) {
    if (!root.querySelectorAll) return;
    root.querySelectorAll(".town-page").forEach(function (townPage) {
      var planner = townPage.querySelector(".hk-today-planner");
      if (!planner) return;
      var flowBar = townPage.querySelector(".town-flow-bar");
      var shops = townPage.querySelector(".town-shops");
      if (flowBar && flowBar.parentNode === townPage) {
        if (flowBar.nextElementSibling !== planner) {
          flowBar.insertAdjacentElement("afterend", planner);
        }
      } else if (shops && planner.nextElementSibling !== shops) {
        townPage.insertBefore(planner, shops);
      }
      townPage.querySelectorAll(".town-scenarios").forEach(function (legacyScenarios) {
        legacyScenarios.hidden = true;
      });
      var eyebrow = planner.querySelector(".hk-today-planner__eyebrow");
      if (eyebrow && eyebrow.textContent.trim() !== "选店前 · 今日状态") {
        eyebrow.textContent = "选店前 · 今日状态";
      }
    });
  }

  function integrateTownShopsIntoPlanner(root) {
    if (!root.querySelectorAll) return;
    root.querySelectorAll(".town-page").forEach(function (townPage) {
      var planner = townPage.querySelector(".hk-today-planner");
      var choices = planner && planner.querySelector(".hk-today-planner__choices");
      var shops = townPage.querySelector(".town-shops");
      if (!planner || !choices || !shops) return;
      var draft = planner.querySelector(".hk-today-planner__draft");
      if (shops.parentElement !== choices) {
        if (draft && draft.parentElement === choices) {
          choices.insertBefore(shops, draft);
        } else {
          choices.appendChild(shops);
        }
      }
      planner.setAttribute("data-hk-town-studio", "true");
      shops.setAttribute("data-hk-in-town-studio", "true");
    });
  }

  function moveSituationPickerToLeft(root) {
    if (!root.querySelectorAll) return;
    if (!window.__hkTownStudioViewportBound) {
      window.__hkTownStudioViewportBound = true;
      window.addEventListener("resize", schedule);
    }
    root.querySelectorAll(".town-page").forEach(function (townPage) {
      var planner = townPage.querySelector(".hk-today-planner");
      var conditions = planner && planner.querySelector(".hk-today-planner__conditions");
      var choices = planner && planner.querySelector(".hk-today-planner__choices");
      if (!conditions || !choices) return;
      var head = planner.querySelector(".hk-today-planner__choices-head");
      var grid = planner.querySelector(".hk-today-planner__grid");
      if (!head || !grid) return;
      var detail = planner.querySelector(".hk-demo3-scenario-detail");
      var draft = planner.querySelector(".hk-today-planner__draft");
      var desktop = window.matchMedia("(min-width: 1001px)").matches;
      if (!desktop && draft && draft.parentElement !== choices) {
        choices.appendChild(draft);
      }
      var expectedTail = desktop ? (draft || detail || grid) : (detail || grid);
      if (
        head.parentElement !== conditions ||
        grid.parentElement !== conditions ||
        (detail && detail.parentElement !== conditions) ||
        conditions.lastElementChild !== expectedTail
      ) {
        conditions.append(head, grid);
        if (detail) conditions.append(detail);
        if (desktop && draft) conditions.append(draft);
      }
    });
  }

  function polish() {
    if (!document.body) return;
    installCompositeIntentGuard();
    hydrateOwnerKnowledge();
    hideExplanations(document);
    replaceText(document.body);
    prioritizeAgent(document);
    cropEmbeddedBannerLabels(document);
    addContactFact(document);
    polishQuestionQueue(document);
    polishSuggestions(document);
    simplifyTodayPlanner(document);
    polishScenarioDetail(document);
    placeTodayPlannerFirst(document);
    integrateTownShopsIntoPlanner(document);
    moveSituationPickerToLeft(document);
    applyTodayShopRanking(document);
    polishQuickEntry(document);
    accelerateSingleTownRegions(document);
  }

  var scheduled = false;
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(function () {
      scheduled = false;
      polish();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", polish, { once: true });
  } else {
    polish();
  }

  installCompositeIntentGuard();

  new MutationObserver(schedule).observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ["class", "hidden", "data-hk-room-editorial", "aria-pressed"]
  });
}());
</script>
`;

const demo4PhotoAssetDir = path.resolve("visual-assets", "demo4");
const demo4PhotoAssetNames = {
  townYunxi: "town-yunxi.jpg",
  townShiao: "town-shiao.jpg",
  qiaoxiTea: "shop-qiaoxi-tea.jpg",
  ayuanNoodles: "shop-ayuan-noodles.jpg",
  nanzhaBamboo: "shop-nanzha-bamboo.jpg",
  banshanTofu: "shop-banshan-tofu.jpg",
  songfengTea: "shop-songfeng-tea.jpg",
};
const demo4PhotoAssets = Object.fromEntries(
  Object.entries(demo4PhotoAssetNames).map(([key, fileName]) => {
    const filePath = path.resolve(demo4PhotoAssetDir, fileName);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Demo 4.0 compatibility photo asset not found: ${filePath}`);
    }
    return [
      key,
      `data:image/jpeg;base64,${fs.readFileSync(filePath).toString("base64")}`,
    ];
  }),
);
const demo4PhotoData = {
  towns: {
    yunxi: demo4PhotoAssets.townYunxi,
    shiao: demo4PhotoAssets.townShiao,
  },
  shops: {
    "qiaoxi-tea": demo4PhotoAssets.qiaoxiTea,
    "ayuan-noodles": demo4PhotoAssets.ayuanNoodles,
    "nanzha-bamboo": demo4PhotoAssets.nanzhaBamboo,
    "banshan-tofu": demo4PhotoAssets.banshanTofu,
    "songfeng-tea": demo4PhotoAssets.songfengTea,
  },
};
const demo4PhotoDataJson = JSON.stringify(demo4PhotoData).replace(
  /<\/script/gi,
  "<\\/script",
);
const demo4PhotoPatch =
  `<style id="hk-demo4-photo-style">
  .town-hero.hk-photo-hero {
    position: relative;
    isolation: isolate;
    background-position: center;
    background-size: cover;
  }
  .town-hero.hk-photo-hero::after {
    content: "";
    position: absolute;
    inset: 0;
    z-index: -1;
    background: linear-gradient(90deg, rgb(21 56 43 / 22%), rgb(21 56 43 / 6%));
    pointer-events: none;
  }
  .hk-shop-card-photo {
    position: relative;
    height: 112px;
    margin: -17px -17px 15px;
    overflow: hidden;
    border-bottom: 1px solid var(--line);
    background: var(--paper-deep);
  }
  .hk-shop-card-photo img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    filter: saturate(.84) sepia(.05) contrast(.96);
    transform: scale(1.015);
    transition: transform 320ms cubic-bezier(.2, .7, .2, 1);
  }
  .hk-shop-card-photo::after {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, transparent 58%, rgb(26 42 35 / 12%));
    pointer-events: none;
  }
  .town-shop:hover .hk-shop-card-photo img,
  .town-shop:focus-within .hk-shop-card-photo img {
    transform: scale(1.045);
  }
  .room-context__cover.hk-photo-cover {
    background-position: center;
    background-size: cover;
  }
  @media (max-width: 760px) {
    .hk-shop-card-photo {
      height: 124px;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .hk-shop-card-photo img {
      transition: none;
    }
    .town-shop:hover .hk-shop-card-photo img,
    .town-shop:focus-within .hk-shop-card-photo img {
      transform: scale(1.015);
    }
  }
</style>
<script id="hk-demo4-photo-data" type="application/json">${demo4PhotoDataJson}</script>
` +
  String.raw`<script id="hk-demo4-photo-script">
(function () {
  "use strict";
  var payload = document.getElementById("hk-demo4-photo-data");
  if (!payload) return;
  var photos;
  try {
    photos = JSON.parse(payload.textContent || "{}");
  } catch (_) {
    return;
  }
  var scheduled = false;

  function setPhotoBackground(element, source, overlay) {
    if (!element || !source) return;
    var value = 'linear-gradient(' + overlay + '), url("' + source + '")';
    if (element.getAttribute("data-hk-photo-source") !== source) {
      element.style.backgroundImage = value;
      element.setAttribute("data-hk-photo-source", source);
    }
  }

  function clearPhotoBackground(element, className) {
    if (!element) return;
    if (element.hasAttribute("data-hk-photo-source")) {
      element.style.backgroundImage = "";
      element.removeAttribute("data-hk-photo-source");
    }
    element.classList.remove(className);
  }

  function applyTownPhotos() {
    var townMatch = /^#\/visit\/[^/]+\/([^/?#]+)/.exec(location.hash);
    var hero = document.querySelector(".town-hero");
    var source = townMatch && photos.towns && photos.towns[townMatch[1]];
    if (hero && source) {
      setPhotoBackground(
        hero,
        source,
        "90deg, rgb(22 61 50 / 88%) 0%, rgb(22 61 50 / 82%) 48%, rgb(22 61 50 / 58%) 100%",
      );
      hero.classList.add("hk-photo-hero");
    } else {
      clearPhotoBackground(hero, "hk-photo-hero");
    }

    document.querySelectorAll(".town-page .town-shop").forEach(function (shop) {
      var link = shop.querySelector('a[href*="#/room/"]');
      var href = link && link.getAttribute("href") || "";
      var match = /#\/room\/[^/]+\/([a-z0-9-]+)/.exec(href);
      var shopSource = match && photos.shops && photos.shops[match[1]];
      var figure = shop.querySelector(".hk-shop-card-photo");
      if (!shopSource) {
        if (figure) figure.remove();
        return;
      }
      if (!figure) {
        figure = document.createElement("figure");
        figure.className = "hk-shop-card-photo";
        figure.setAttribute("aria-hidden", "true");
        var image = document.createElement("img");
        image.alt = "";
        image.decoding = "async";
        figure.appendChild(image);
        shop.insertBefore(figure, shop.firstChild);
      }
      var imageNode = figure.querySelector("img");
      if (imageNode && imageNode.getAttribute("src") !== shopSource) {
        imageNode.src = shopSource;
      }
    });
  }

  function applyRoomPhoto() {
    var roomMatch = /^#\/room\/([^/]+)\/([^/?#]+)/.exec(location.hash);
    var cover = document.querySelector(".room-context__cover");
    var source = roomMatch && photos.shops && photos.shops[roomMatch[2]];
    if (cover && source) {
      setPhotoBackground(
        cover,
        source,
        "180deg, rgb(18 53 45 / 80%) 0%, rgb(18 53 45 / 86%) 58%, rgb(18 53 45 / 92%) 100%",
      );
      cover.classList.add("hk-photo-cover");
    } else {
      clearPhotoBackground(cover, "hk-photo-cover");
    }
  }

  function apply() {
    scheduled = false;
    applyTownPhotos();
    applyRoomPhoto();
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(apply);
  }

  new MutationObserver(schedule).observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
  window.addEventListener("hashchange", schedule);
  schedule();
}());
</script>`;

const demo5IllustrationDir = path.resolve("visual-assets", "demo5");
const demo5IllustrationFiles = {
  cover: "cover-waterside-shop.jpg",
  soloWindow: "room-solo-window.jpg",
  arrivalCard: "arrival-card-table.jpg",
  ownerWriting: "owner-writing-window.jpg",
  townYunxi: "town-yunxi-river.jpg",
  qiaoxiCourtyard: "shop-qiaoxi-tea-courtyard.png",
};
const demo5Illustrations = Object.fromEntries(
  Object.entries(demo5IllustrationFiles).map(([key, fileName]) => {
    const filePath = path.resolve(demo5IllustrationDir, fileName);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Demo 5.0 illustration not found: ${filePath}`);
    }
    const mime = fileName.endsWith(".png") ? "image/png" : "image/jpeg";
    return [key, `data:${mime};base64,${fs.readFileSync(filePath).toString("base64")}`];
  }),
);
const demo5IllustrationDataJson = JSON.stringify(demo5Illustrations).replace(
  /<\/script/gi,
  "<\\/script",
);
const demo5IllustrationPatch =
  `<style id="hk-demo5-illustration-style">
  .app-shell.hk-demo5-cover-art {
    background-position: center top;
    background-size: cover;
  }
  .knowledge-overview.hk-demo5-owner-art {
    position: relative;
    isolation: isolate;
    overflow: hidden;
  }
  .knowledge-overview.hk-demo5-owner-art::before {
    content: "";
    position: absolute;
    inset: 0;
    z-index: 0;
    background-image:
      linear-gradient(90deg, rgb(243 247 241 / 97%) 0%, rgb(243 247 241 / 92%) 52%, rgb(243 247 241 / 36%) 100%),
      var(--hk-demo5-owner-art);
    background-position: center;
    background-size: cover;
    pointer-events: none;
  }
  .knowledge-overview.hk-demo5-owner-art > * {
    position: relative;
    z-index: 1;
  }
  .feedback-panel > .hk-demo5-feedback-illustration {
    height: 108px;
    margin: -26px -26px 20px;
    overflow: hidden;
    border-bottom: 1px solid var(--line);
    background: var(--paper-deep);
  }
  .hk-demo5-feedback-illustration img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center 58%;
  }
  .knowledge-recent .subsection-title > span {
    font-size: 12px !important;
    font-weight: 500;
    letter-spacing: 0.02em;
  }
  .knowledge-recent .subsection-title > small {
    font-size: 9.5px !important;
    line-height: 1.6;
  }
  .knowledge-recent > article {
    grid-template-columns: 108px minmax(0, 1fr) !important;
    align-items: baseline !important;
    gap: 22px !important;
    padding: 18px 0 !important;
  }
  .knowledge-recent > article > span {
    color: #365f61;
    font-size: 11px !important;
    line-height: 1.6 !important;
    letter-spacing: 0.01em;
  }
  .knowledge-recent > article strong {
    font-size: 15px !important;
    line-height: 1.6 !important;
  }
  .knowledge-recent > article p {
    max-width: 62ch;
    margin-top: 6px !important;
    font-size: 13px !important;
    line-height: 1.8 !important;
  }
  .owner-gap-suggestions {
    padding: 16px 20px 18px !important;
  }
  .owner-gap-suggestions > span {
    font-size: 10.5px !important;
    line-height: 1.5;
    letter-spacing: 0.04em;
  }
  .owner-gap-suggestions > button {
    min-height: 76px !important;
    padding: 13px 14px !important;
    gap: 14px !important;
  }
  .owner-gap-suggestions button > div {
    gap: 6px;
  }
  .owner-gap-suggestions button strong {
    font-size: 11px !important;
    line-height: 1.45;
  }
  .owner-gap-suggestions button p {
    font-size: 13px !important;
    line-height: 1.65 !important;
  }
  .owner-gap-suggestions button > span {
    font-size: 10px !important;
    line-height: 1.5;
  }
  @media (max-width: 760px) {
    .knowledge-overview.hk-demo5-owner-art::before {
      background-image:
        linear-gradient(180deg, rgb(243 247 241 / 96%) 0%, rgb(243 247 241 / 86%) 100%),
        var(--hk-demo5-owner-art);
      background-position: center;
    }
    .feedback-panel > .hk-demo5-feedback-illustration {
      height: 96px;
      margin: -22px -18px 18px;
    }
    .knowledge-recent > article {
      grid-template-columns: 1fr !important;
      gap: 8px !important;
    }
    .knowledge-recent > article > span {
      font-size: 11.5px !important;
    }
    .knowledge-recent > article strong {
      font-size: 16px !important;
    }
    .knowledge-recent > article p {
      font-size: 14px !important;
      line-height: 1.75 !important;
    }
    .owner-gap-suggestions > button {
      min-height: 82px !important;
    }
    .owner-gap-suggestions button p {
      font-size: 13.5px !important;
    }
  }
</style>
<script id="hk-demo5-illustration-data" type="application/json">${demo5IllustrationDataJson}</script>
` +
  String.raw`<script id="hk-demo5-illustration-script">
(function () {
  "use strict";
  var payload = document.getElementById("hk-demo5-illustration-data");
  if (!payload) return;
  var images;
  try {
    images = JSON.parse(payload.textContent || "{}");
  } catch (_) {
    return;
  }
  var scheduled = false;

  function background(source, overlay) {
    return "linear-gradient(" + overlay + '), url("' + source + '")';
  }

  function applyCoverArt() {
    var shell = document.querySelector(".app-shell");
    var cover = document.querySelector(".cover-page");
    if (!shell) return;
    if (cover && images.cover) {
      if (!shell.hasAttribute("data-hk-demo5-prior-background")) {
        shell.setAttribute(
          "data-hk-demo5-prior-background",
          shell.style.backgroundImage || "",
        );
      }
      shell.classList.add("hk-demo5-cover-art");
      shell.style.backgroundImage = background(
        images.cover,
        "90deg, rgb(251 248 240 / 92%) 0%, rgb(251 248 240 / 82%) 38%, rgb(251 248 240 / 26%) 72%, rgb(251 248 240 / 8%) 100%",
      );
    } else if (shell.classList.contains("hk-demo5-cover-art")) {
      shell.classList.remove("hk-demo5-cover-art");
      var prior = shell.getAttribute("data-hk-demo5-prior-background") || "";
      if (prior) shell.style.backgroundImage = prior;
      else shell.style.removeProperty("background-image");
      shell.removeAttribute("data-hk-demo5-prior-background");
    }
  }

  function applyOwnerArt() {
    var overview = document.querySelector(".knowledge-overview");
    if (!overview || !images.ownerWriting) return;
    overview.classList.add("hk-demo5-owner-art");
    if (!overview.style.getPropertyValue("--hk-demo5-owner-art")) {
      overview.style.setProperty(
        "--hk-demo5-owner-art",
        'url("' + images.ownerWriting + '")',
      );
    }
  }

  function applyTownArt() {
    var match = /^#\/visit\/[^/]+\/([^/?#]+)/.exec(location.hash);
    var hero = document.querySelector(".town-hero");
    if (!hero || !match || match[1] !== "yunxi" || !images.townYunxi) return;
    hero.style.backgroundImage = background(
      images.townYunxi,
      "90deg, rgb(22 61 50 / 88%) 0%, rgb(22 61 50 / 82%) 48%, rgb(22 61 50 / 58%) 100%",
    );
    hero.setAttribute("data-hk-demo5-town-art", "true");
  }

  function applyRoomArt() {
    var match = /^#\/room\/([^/]+)\/([^/?#]+)/.exec(location.hash);
    var cover = document.querySelector(".room-context__cover");
    if (!match || !cover) return;
    var source =
      match[2] === "qiaoxi-tea" ? images.qiaoxiCourtyard :
      match[2] === "songfeng-tea" ? images.soloWindow :
      null;
    if (!source) return;
    cover.style.backgroundImage = background(
      source,
      "180deg, rgb(18 53 45 / 59%) 0%, rgb(18 53 45 / 72%) 58%, rgb(18 53 45 / 91%) 100%",
    );
    cover.style.backgroundPosition =
      match[2] === "qiaoxi-tea" ? "center 78%" : "center 45%";
    cover.setAttribute("data-hk-demo5-room-art", "true");
  }

  function applyArrivalArt() {
    var panel = document.querySelector(".feedback-panel");
    if (!panel || !images.arrivalCard) return;
    var figure = panel.querySelector(".hk-demo5-feedback-illustration");
    if (!figure) {
      figure = document.createElement("figure");
      figure.className = "hk-demo5-feedback-illustration";
      figure.setAttribute("aria-hidden", "true");
      var image = document.createElement("img");
      image.src = images.arrivalCard;
      image.alt = "";
      image.decoding = "async";
      figure.appendChild(image);
      panel.insertBefore(figure, panel.firstChild);
    }
  }

  function apply() {
    scheduled = false;
    applyCoverArt();
    applyOwnerArt();
    applyTownArt();
    applyRoomArt();
    applyArrivalArt();
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(apply);
  }

  new MutationObserver(schedule).observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
  window.addEventListener("hashchange", schedule);
  schedule();
}());
</script>`;

const htmlToImageSource = fs
  .readFileSync(path.resolve("node_modules", "html-to-image", "dist", "html-to-image.js"), "utf8")
  .replace(/<\/script/gi, "<\\/script");
const arrivalExportPatch =
  `<style id="hk-arrival-typography-export-style">
  .arrival-toolbar {
    min-height: 42px;
    margin-bottom: 20px;
  }
  .arrival-toolbar > div {
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 8px;
  }
  .arrival-toolbar .source-badge {
    min-height: 30px;
    padding: 0 11px;
    font-size: 10.5px;
    line-height: 1.4;
  }
  .arrival-toolbar .button {
    min-height: 42px;
    padding: 0 16px;
    font-size: 13px;
  }
  .arrival-toolbar .button svg {
    width: 16px;
    height: 16px;
  }
  .hk-save-image-button {
    border-color: var(--line-dark) !important;
    color: var(--ink) !important;
    background: var(--paper-0) !important;
  }
  .hk-save-image-button:hover:not(:disabled) {
    border-color: var(--ink) !important;
    background: var(--surface) !important;
  }
  .hk-save-image-status {
    min-width: 0;
    color: var(--muted);
    font: 10px/1.5 var(--mono);
  }
  .arrival-card__identity .small-caps {
    font-size: 10.5px;
    line-height: 1.5;
  }
  .arrival-card__identity strong {
    font-size: clamp(26px, 2.3vw, 32px);
    line-height: 1.18;
  }
  .arrival-card__place span {
    font-size: 17px;
  }
  .arrival-card__place small {
    font-size: 10px;
    line-height: 1.5;
  }
  .arrival-card__intro {
    padding: clamp(34px, 4.8vw, 60px) 0 clamp(26px, 3.6vw, 42px);
  }
  .arrival-card__intro > span {
    margin-bottom: 14px;
    font-size: 11px;
    line-height: 1.5;
  }
  .arrival-card__intro h1 {
    max-width: 760px;
    font-size: clamp(36px, 3.5vw, 52px);
    line-height: 1.3;
    letter-spacing: -0.03em;
  }
  .arrival-module {
    padding: 26px;
  }
  .arrival-module h2 {
    margin-top: 3px;
    font-size: 21px;
    line-height: 1.45;
  }
  .arrival-module p {
    font-size: 15.5px;
    line-height: 1.85;
  }
  .module-number {
    font-size: 22px;
  }
  .phrase-card > span {
    font-size: 10.5px;
    line-height: 1.5;
  }
  .phrase-card strong {
    font-size: clamp(30px, 2.7vw, 38px);
    line-height: 1.35;
  }
  .phrase-card p {
    font-size: 14.5px;
    line-height: 1.75;
  }
  .next-stop p {
    font-size: 15px;
    line-height: 1.8;
  }
  .arrival-card__footer > div,
  .arrival-card__footer p {
    font-size: 9.5px;
    line-height: 1.7;
  }
  .feedback-panel__eyebrow {
    font-size: 10.5px;
  }
  .feedback-panel > p {
    font-size: 13px;
    line-height: 1.8;
  }
  .feedback-form legend,
  .feedback-form label > span {
    font-size: 9.5px;
  }
  .feedback-form input[type="text"],
  .feedback-form textarea {
    font-size: 13px;
  }
  .choice-pair button {
    font-size: 12.5px;
  }
  .owner-fact-form > label > span {
    font-size: 10.5px !important;
    line-height: 1.5;
  }
  .owner-fact-form select,
  .owner-fact-form input:not([type="checkbox"]),
  .owner-fact-form textarea {
    font-size: 13px;
  }
  .owner-fact-form .checkbox-row,
  .feedback-form .checkbox-row {
    display: flex !important;
    align-items: flex-start !important;
    gap: 10px !important;
    font-size: 12.5px !important;
    line-height: 1.65 !important;
  }
  .owner-fact-form .checkbox-row input[type="checkbox"],
  .feedback-form .checkbox-row input[type="checkbox"] {
    flex: 0 0 18px !important;
    width: 18px !important;
    height: 18px !important;
    min-height: 18px !important;
    max-width: 18px !important;
    margin: 2px 0 0 !important;
    padding: 0 !important;
    border: 0 !important;
    border-radius: 0 !important;
    appearance: auto !important;
    accent-color: var(--teal);
    background: transparent !important;
    box-shadow: none !important;
    cursor: pointer;
  }
  .owner-fact-form .checkbox-row span,
  .feedback-form .checkbox-row span {
    margin: 0 !important;
    color: var(--muted) !important;
    font-family: var(--sans) !important;
    font-size: 12.5px !important;
    line-height: 1.65 !important;
    letter-spacing: 0 !important;
  }
  @media (max-width: 1120px) {
    .arrival-card__intro h1 {
      font-size: clamp(34px, 4vw, 46px);
    }
  }
  @media (max-width: 620px) {
    .arrival-toolbar > div {
      justify-content: flex-start;
    }
    .arrival-toolbar .button {
      flex: 1 1 140px;
    }
    .hk-save-image-status {
      flex-basis: 100%;
    }
    .arrival-card__intro h1 {
      font-size: 32px;
      line-height: 1.35;
    }
    .arrival-module {
      padding: 22px 18px;
    }
    .arrival-module p {
      font-size: 15px;
    }
    .owner-fact-form .checkbox-row,
    .feedback-form .checkbox-row {
      font-size: 13px !important;
    }
    .owner-fact-form .checkbox-row span,
    .feedback-form .checkbox-row span {
      font-size: 13px !important;
    }
  }
</style>
<script id="hk-html-to-image">${htmlToImageSource}</script>
` +
  String.raw`<script id="hk-arrival-image-export">
(function () {
  "use strict";
  var scheduled = false;
  var exporting = false;

  function setStatus(status, text, isError) {
    if (!status) return;
    status.textContent = text;
    status.dataset.state = isError ? "error" : "done";
  }

  async function saveCardImage(button, status) {
    if (exporting) return;
    var card = document.querySelector(".arrival-card");
    if (!card) return;
    if (!window.htmlToImage || typeof window.htmlToImage.toBlob !== "function") {
      setStatus(status, "图片组件未载入", true);
      return;
    }
    exporting = true;
    button.disabled = true;
    button.setAttribute("aria-busy", "true");
    var originalLabel = button.querySelector("span");
    if (originalLabel) originalLabel.textContent = "正在生成";
    setStatus(status, "正在渲染到店卡", false);
    try {
      if (document.fonts && document.fonts.ready) await document.fonts.ready;
      var blob = await window.htmlToImage.toBlob(card, {
        backgroundColor: "#faf6ed",
        pixelRatio: 2,
        skipFonts: true,
        cacheBust: true,
      });
      if (!blob) throw new Error("PNG blob is empty");
      var shopName =
        (document.querySelector(".arrival-card__intro > span")?.textContent ||
          document.querySelector(".arrival-card__identity strong")?.textContent ||
          "会客厅")
          .replace(/[\\/:*?"<>|]/g, "")
          .trim();
      var date = new Date();
      var stamp =
        date.getFullYear() +
        String(date.getMonth() + 1).padStart(2, "0") +
        String(date.getDate()).padStart(2, "0");
      var link = document.createElement("a");
      var url = URL.createObjectURL(blob);
      link.href = url;
      link.download = "会客厅-" + shopName + "-到店卡-" + stamp + ".png";
      link.hidden = true;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(function () {
        URL.revokeObjectURL(url);
      }, 5000);
      setStatus(status, "图片已保存", false);
    } catch (error) {
      console.error("[arrival image export]", error);
      setStatus(status, "图片保存失败，请重试", true);
    } finally {
      exporting = false;
      button.disabled = false;
      button.removeAttribute("aria-busy");
      if (originalLabel) originalLabel.textContent = "保存为图片";
    }
  }

  function ensureExportButton() {
    var toolbar = document.querySelector(".arrival-toolbar");
    var card = document.querySelector(".arrival-card");
    if (!toolbar || !card) return;
    var actions = toolbar.querySelector(":scope > div");
    if (!actions) return;
    var button = actions.querySelector(".hk-save-image-button");
    var status = actions.querySelector(".hk-save-image-status");
    if (!button) {
      button = document.createElement("button");
      button.type = "button";
      button.className = "button button--small hk-save-image-button";
      button.innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><path d="M7 10l5 5 5-5"></path><path d="M12 15V3"></path></svg><span>保存为图片</span>';
      var printButton = actions.querySelector("button");
      if (printButton && printButton.nextSibling) {
        actions.insertBefore(button, printButton.nextSibling);
      } else {
        actions.appendChild(button);
      }
    }
    if (!status) {
      status = document.createElement("span");
      status.className = "hk-save-image-status";
      status.setAttribute("role", "status");
      status.setAttribute("aria-live", "polite");
      actions.appendChild(status);
    }
    if (!button.hasAttribute("data-hk-export-bound")) {
      button.setAttribute("data-hk-export-bound", "");
      button.addEventListener("click", function () {
        saveCardImage(button, status);
      });
    }
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(function () {
      scheduled = false;
      ensureExportButton();
    });
  }

  new MutationObserver(schedule).observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
  window.addEventListener("hashchange", schedule);
  schedule();
}());
</script>`;

const html = fs.readFileSync(source, "utf8");
if (html.includes('id="hk-demo3-polish"') || html.includes('id="hk-demo3-polish-script"')) {
  throw new Error("Source already contains the Demo 3.0 refinement patch.");
}

const defaultViewFrom = 'o=i.get(`view`)===`input`?`input`:`output`';
const defaultViewTo = 'o=i.get(`view`)===`output`?`output`:`input`';
const outputSetterFrom =
  'let h=e=>{a(e===`input`?{view:`input`}:{},{replace:!0})};';
const outputSetterTo =
  'let h=e=>{a(e===`output`?{view:`output`}:{},{replace:!0})};';

if (!html.includes(defaultViewFrom) || !html.includes(outputSetterFrom)) {
  throw new Error("Merchant default-view bundle target was not found.");
}

const htmlWithMerchantDefault = html
  .replace(defaultViewFrom, defaultViewTo)
  .replace(outputSetterFrom, outputSetterTo);

function readEnvValue(name) {
  const envPath = path.resolve(".env.local");
  if (!fs.existsSync(envPath)) return "";
  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  const line = lines.find((item) => item.startsWith(`${name}=`));
  return line ? line.slice(name.length + 1).trim() : "";
}

const apiKey = readEnvValue("DEEPSEEK_API_KEY");
const apiBaseUrl = readEnvValue("DEEPSEEK_BASE_URL") || "https://api.deepseek.com";
const apiModel = readEnvValue("DEEPSEEK_MODEL") || "deepseek-flash";

if (!apiKey) {
  throw new Error("DEEPSEEK_API_KEY is missing from .env.local");
}

const keyScript = `window.__DEEPSEEK_API_KEY__=${JSON.stringify(apiKey)};`;
const baseScript = `window.__DEEPSEEK_BASE_URL__=${JSON.stringify(apiBaseUrl)};`;
const modelScript = `window.__DEEPSEEK_MODEL__=${JSON.stringify(apiModel)};`;
const htmlWithApiConfig = htmlWithMerchantDefault
  .replaceAll("会客厅Demo 3.0", "会客厅")
  .replace(
    "会客厅 Demo 1.0 单文件交互版：游客 AI 会客厅、第一次到店卡与店主工作台。",
    "会客厅 · 家乡 AI 接待员：游客 AI 会客厅、第一次到店卡与店主工作台。",
  )
  .replace(/window\.__DEEPSEEK_API_KEY__=(""|"[^"]*"|'[^']*');/, keyScript)
  .replace(/window\.__DEEPSEEK_BASE_URL__=(""[^;]*|"[^"]*"|'[^']*');/, baseScript)
  .replace(/window\.__DEEPSEEK_MODEL__=(""[^;]*|"[^"]*"|'[^']*');/, modelScript);

if (!htmlWithApiConfig.includes(keyScript)) {
  throw new Error("Unable to inject DeepSeek API config into standalone HTML.");
}

const extraKnowledgePath = path.resolve("server/data/owner-knowledge-extra.json");
const extraKnowledge = JSON.parse(fs.readFileSync(extraKnowledgePath, "utf8"));
const extraKnowledgeJson = JSON.stringify(extraKnowledge).replace(/<\/script/gi, "<\\/script");
const merchantGapData = {};
for (const fileName of ["yunxi.json", "wuling.json"]) {
  const sourceData = JSON.parse(
    fs.readFileSync(path.resolve("server/data", fileName), "utf8"),
  );
  for (const [shopId, seed] of Object.entries(sourceData.merchantSeeds || {})) {
    merchantGapData[shopId] = seed.gaps || [];
  }
}
const merchantGapJson = JSON.stringify(merchantGapData).replace(/<\/script/gi, "<\\/script");
if (
  !patch.includes("__HK_EXTRA_OWNER_KNOWLEDGE__") ||
  !patch.includes("__HK_EXTRA_MERCHANT_GAPS__")
) {
  throw new Error("Extra owner-knowledge placeholder is missing.");
}
let renderedPatch = patch.replace(
  "__HK_EXTRA_OWNER_KNOWLEDGE__",
  () => extraKnowledgeJson,
);
renderedPatch = renderedPatch.replace(
  "__HK_EXTRA_MERCHANT_GAPS__",
  () => merchantGapJson,
);
renderedPatch += "\n" + demo4PhotoPatch;
renderedPatch += "\n" + demo5IllustrationPatch;
renderedPatch += "\n" + arrivalExportPatch;
const closingBody = htmlWithApiConfig.toLowerCase().lastIndexOf("</body>");
if (closingBody < 0) {
  throw new Error("Source HTML has no closing </body> tag.");
}

const patchedWithImages =
  htmlWithApiConfig.slice(0, closingBody) +
  "\n" +
  renderedPatch +
  "\n" +
  htmlWithApiConfig.slice(closingBody);
const imageOptimization = await optimizeEmbeddedImages(patchedWithImages);
const patched = imageOptimization.html;

fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, patched, "utf8");

const deliveryOutput = path.resolve("deliverables", "会客厅Demo 5.0.html");
if (output !== deliveryOutput) {
  fs.mkdirSync(path.dirname(deliveryOutput), { recursive: true });
  fs.writeFileSync(deliveryOutput, patched, "utf8");
}

const deploymentOutput = path.resolve("deploy", "index.html");
const deploymentChunkRoot = path.resolve("deploy", "chunks");
const deploymentBytes = Buffer.from(patched, "utf8");
const deploymentVersion = createHash("sha256").update(deploymentBytes).digest("hex").slice(0, 16);
const deploymentChunkDir = path.resolve(deploymentChunkRoot, deploymentVersion);
fs.rmSync(deploymentChunkRoot, { recursive: true, force: true });
fs.mkdirSync(deploymentChunkDir, { recursive: true });

const chunkSize = 16 * 1024 * 1024;
const chunkNames = [];
for (let offset = 0, index = 1; offset < deploymentBytes.length; offset += chunkSize, index += 1) {
  const chunkName = `demo5-part-${String(index).padStart(3, "0")}.txt`;
  fs.writeFileSync(
    path.resolve(deploymentChunkDir, chunkName),
    deploymentBytes.subarray(offset, offset + chunkSize),
  );
  chunkNames.push(chunkName);
}
for (const fileName of fs.readdirSync(deploymentChunkDir)) {
  if (/^demo5-part-\d+\.txt$/.test(fileName) && !chunkNames.includes(fileName)) {
    fs.unlinkSync(path.resolve(deploymentChunkDir, fileName));
  }
}

const deploymentLoader = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>会客厅</title>
  <style>
    :root { color-scheme: light; font-family: "Songti SC", "Noto Serif SC", serif; background: #f4efe4; color: #192a24; }
    * { box-sizing: border-box; }
    body { min-height: 100vh; margin: 0; display: grid; place-items: center; padding: 24px; background: radial-gradient(circle at 50% 32%, #fffaf0 0, #f4efe4 45%, #e9dfce 100%); }
    main { width: min(460px, 100%); padding: 36px 32px; border: 1px solid rgba(25, 42, 36, .22); background: rgba(255, 250, 240, .86); box-shadow: 0 18px 60px rgba(52, 38, 24, .08); }
    h1 { margin: 0 0 12px; font-size: clamp(28px, 8vw, 42px); font-weight: 500; letter-spacing: .08em; }
    p { margin: 0; color: #5e6258; line-height: 1.8; font-size: 15px; }
    .mark { display: inline-block; margin-bottom: 22px; padding: 6px 9px; border: 1px solid #8a3e2b; color: #8a3e2b; font: 600 12px/1 sans-serif; letter-spacing: .18em; }
    .track { height: 2px; margin-top: 24px; overflow: hidden; background: rgba(25, 42, 36, .12); }
    .bar { width: 4%; height: 100%; background: #8a3e2b; transition: width .18s ease; }
    .status { margin-top: 10px; font: 12px/1.6 sans-serif; }
    button { display: none; margin-top: 20px; padding: 10px 16px; border: 1px solid #192a24; background: #192a24; color: #fffaf0; font: 14px/1 sans-serif; cursor: pointer; }
  </style>
</head>
<body>
  <main>
    <span class="mark">HOMETOWN ROOM</span>
    <h1>正在整理会客厅</h1>
    <p>第一次打开需要载入完整演示内容，之后会更快。</p>
    <div class="track" aria-hidden="true"><div class="bar"></div></div>
    <p class="status" role="status" aria-live="polite">准备载入 · 0%</p>
    <button id="retry" type="button">重新载入</button>
  </main>
  <script>
    (() => {
      const parts = ${JSON.stringify(chunkNames)};
      const bases = [
        "./chunks/${deploymentVersion}"
      ];
      const bar = document.querySelector(".bar");
      const status = document.querySelector(".status");
      const retry = document.querySelector("#retry");
      let completed = 0;

      function update() {
        const percent = Math.round(4 + (completed / parts.length) * 92);
        bar.style.width = percent + "%";
        status.textContent = "载入会客厅 · " + percent + "%";
      }

      async function load() {
        try {
          retry.style.display = "none";
          status.textContent = "载入会客厅 · 4%";
          const buffers = await Promise.all(parts.map(async (name) => {
            let lastError;
            for (const base of bases) {
              try {
                const response = await fetch(base + "/" + name, { cache: "force-cache" });
                if (!response.ok) throw new Error("HTTP " + response.status);
                const buffer = await response.arrayBuffer();
                completed += 1;
                update();
                return buffer;
              } catch (error) {
                lastError = error;
              }
            }
            throw lastError;
          }));
          const total = buffers.reduce((sum, buffer) => sum + buffer.byteLength, 0);
          const merged = new Uint8Array(total);
          let offset = 0;
          for (const buffer of buffers) {
            merged.set(new Uint8Array(buffer), offset);
            offset += buffer.byteLength;
          }
          status.textContent = "正在打开会客厅 · 100%";
          bar.style.width = "100%";
          const html = new TextDecoder("utf-8").decode(merged);
          document.open();
          document.write(html);
          document.close();
        } catch (error) {
          status.textContent = "主程序没有载入，请检查网络后重试。";
          retry.style.display = "inline-block";
          console.error(error);
        }
      }

      retry.addEventListener("click", () => window.location.reload());
      load();
    })();
  </script>
</body>
</html>
`;
fs.writeFileSync(deploymentOutput, deploymentLoader, "utf8");
fs.writeFileSync(path.resolve("deploy", ".nojekyll"), "", "utf8");
fs.writeFileSync(
  path.resolve("deploy", ".gitattributes"),
  "chunks/** -text\nindex.html -text\n",
  "utf8",
);

console.log(`Source: ${source}`);
console.log(`Output: ${output}`);
console.log(`Delivery: ${deliveryOutput}`);
console.log(`Deployment: ${deploymentOutput}`);
console.log(`Deployment chunks: ${chunkNames.length}`);
console.log(`Bytes: ${Buffer.byteLength(patched, "utf8")}`);
console.log(
  `Images: ${imageOptimization.imageCount} (${imageOptimization.originalBytes} -> ${imageOptimization.optimizedBytes} bytes)`,
);
console.log(`DeepSeek model: ${apiModel}`);
console.log("API key embedded: true");
