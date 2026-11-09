from __future__ import annotations

import json
from pathlib import Path

from playwright.sync_api import Page, sync_playwright


ROOT = Path(__file__).resolve().parents[1]
HTML_PATH = ROOT / "outputs" / "会客厅Demo 5.0.html"


def ask(page: Page, question: str, expected: int) -> str:
    composer = page.locator(".composer textarea")
    composer.fill(question)
    composer.press("Enter")
    page.wait_for_function(
        f"document.querySelectorAll('.message--assistant').length >= {expected}",
        timeout=75_000,
    )
    page.wait_for_timeout(400)
    return page.locator(".message--assistant").last.locator(".message__bubble").inner_text()


def main() -> None:
    errors: list[str] = []
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()
        page.on("pageerror", lambda error: errors.append(str(error)))

        page.goto(
            HTML_PATH.as_uri() + "#/room/yunxi/qiaoxi-tea",
            wait_until="load",
            timeout=120_000,
        )
        page.wait_for_selector(".chat-panel", timeout=60_000)
        first_answer = ask(page, "可以开发票吗？", 2)

        page.goto(
            HTML_PATH.as_uri()
            + "#/merchant/jiangnan/yunxi/qiaoxi-tea?view=input",
            wait_until="load",
            timeout=120_000,
        )
        page.wait_for_selector(".owner-fact-form", timeout=60_000)
        invoice_gap = page.locator(".owner-gap-suggestions button").filter(
            has_text="可以开发票吗？"
        )
        if invoice_gap.count():
            invoice_gap.first.click()
        page.locator(".owner-fact-form textarea").fill(
            "可以提供电子普通发票，付款后联系店主登记抬头。"
        )
        page.locator('.owner-fact-form input[type="checkbox"]').check()
        page.locator('.owner-fact-form button[type="submit"]').click()
        page.wait_for_selector(".owner-fact-success", timeout=30_000)
        saved_message = page.locator(".owner-fact-success").inner_text()

        page.goto(
            HTML_PATH.as_uri() + "#/room/yunxi/qiaoxi-tea",
            wait_until="load",
            timeout=120_000,
        )
        page.wait_for_selector(".chat-panel", timeout=60_000)
        second_answer = ask(page, "可以开发票吗？", 2)
        uses_saved_fact = "电子普通发票" in second_answer

        print(
            json.dumps(
                {
                    "ok": uses_saved_fact and not errors,
                    "first_answer": first_answer,
                    "saved_message": saved_message,
                    "second_answer": second_answer,
                    "uses_saved_fact": uses_saved_fact,
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
