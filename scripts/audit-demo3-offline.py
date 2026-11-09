from __future__ import annotations

import json
from pathlib import Path

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]
HTML_PATH = ROOT / "outputs" / "会客厅Demo 5.0.html"


def main() -> None:
    errors: list[str] = []
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        context = browser.new_context(offline=True)
        page = context.new_page()
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.goto(
            HTML_PATH.as_uri() + "#/room/yunxi/qiaoxi-tea",
            wait_until="load",
            timeout=120_000,
        )
        page.wait_for_selector(".chat-panel", timeout=60_000)
        composer = page.locator(".composer textarea")
        composer.fill("下午四点需要排队吗？")
        composer.press("Enter")
        page.wait_for_function(
            "document.querySelectorAll('.message--assistant').length >= 2",
            timeout=30_000,
        )
        reply = page.locator(".message--assistant").last.locator(".message__bubble").inner_text()
        print(
            json.dumps(
                {
                    "ok": bool(reply.strip()) and not errors,
                    "reply": reply,
                    "errors": errors,
                },
                ensure_ascii=False,
                indent=2,
            )
        )
        context.close()
        browser.close()


if __name__ == "__main__":
    main()
