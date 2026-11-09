from __future__ import annotations

import json
import re
from pathlib import Path

from playwright.sync_api import Page, sync_playwright


ROOT = Path(__file__).resolve().parents[1]
HTML_PATH = ROOT / "outputs" / "会客厅Demo 5.0.html"
ARTIFACT_DIR = ROOT / ".codex-artifacts"


def box(locator) -> dict[str, float]:
    value = locator.bounding_box()
    assert value, locator
    return {key: round(float(item), 2) for key, item in value.items()}


def verify_navigation(viewport: dict[str, int], label: str, errors: list[str]) -> dict:
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        page = browser.new_page(viewport=viewport)

        def on_page_error(error: Exception) -> None:
            errors.append(f"{label} pageerror: {error}")

        def on_console(message) -> None:
            if message.type == "error":
                text = message.text
                if "fonts.googleapis.com" in text or "fonts.gstatic.com" in text:
                    return
                errors.append(f"{label} console: {text}")

        page.on("pageerror", on_page_error)
        page.on("console", on_console)
        page.goto(HTML_PATH.as_uri() + "#/", wait_until="load", timeout=120_000)
        page.wait_for_selector(".hk-demo3-quick-entry", state="visible", timeout=60_000)
        quick_button = page.locator(".hk-demo3-quick-entry")
        assert quick_button.is_visible()

        quick_button.click()
        dialog = page.locator(".hk-demo3-quick-dialog")
        page.wait_for_selector(".hk-demo3-quick-dialog[open]", timeout=10_000)
        assert dialog.is_visible()
        initial_results = page.locator(".hk-demo3-quick-dialog__list button")
        initial_result_count = initial_results.count()
        assert initial_result_count == 5
        ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
        page.screenshot(path=str(ARTIFACT_DIR / f"demo3-quick-entry-{label}.png"))

        search = page.locator(".hk-demo3-quick-dialog__search input")
        search.fill("桥西")
        page.wait_for_timeout(200)
        assert page.locator(".hk-demo3-quick-dialog__list button").count() == 1
        page.locator('.hk-demo3-quick-dialog__list button[data-hk-quick-shop="qiaoxi-tea"]').click()
        page.wait_for_url(re.compile(r".*#/room/yunxi/qiaoxi-tea"), timeout=30_000)
        page.wait_for_selector(".chat-panel", timeout=60_000)
        assert not page.locator(".hk-demo3-quick-entry").is_visible()

        page.goto(HTML_PATH.as_uri() + "#/", wait_until="load", timeout=120_000)
        page.wait_for_selector(".hk-demo3-quick-entry", state="visible", timeout=60_000)
        page.locator(".hk-demo3-quick-entry").click()
        page.wait_for_selector(".hk-demo3-quick-dialog[open]", timeout=10_000)
        first_result = page.locator(".hk-demo3-quick-dialog__list button").first
        assert first_result.get_attribute("data-hk-quick-shop") == "qiaoxi-tea"
        assert "上次去过" in page.locator(".hk-demo3-quick-dialog__list").inner_text()
        page.keyboard.press("Escape")

        page.goto(HTML_PATH.as_uri() + "#/visit/jiangnan/yunxi", wait_until="load", timeout=120_000)
        page.wait_for_selector(".hk-today-planner", timeout=60_000)
        page.wait_for_selector(".town-shops", timeout=60_000)
        page.wait_for_timeout(600)

        flow_bar = page.locator(".town-flow-bar")
        planner = page.locator(".hk-today-planner")
        shops = page.locator(".town-shops")
        order = page.evaluate(
            """() => {
                const flow = document.querySelector('.town-flow-bar');
                const planner = document.querySelector('.hk-today-planner');
                const shops = document.querySelector('.town-shops');
                return {
                    flowBeforePlanner: !!(flow.compareDocumentPosition(planner) & Node.DOCUMENT_POSITION_FOLLOWING),
                    plannerBeforeShops: !!(planner.compareDocumentPosition(shops) & Node.DOCUMENT_POSITION_FOLLOWING),
                    legacyScenariosHidden: [...document.querySelectorAll('.town-scenarios')]
                        .every((node) => node.hidden && !node.offsetParent),
                    plannerEyebrow: planner.querySelector('.hk-today-planner__eyebrow')?.textContent.trim(),
                };
            }"""
        )
        assert order["flowBeforePlanner"]
        assert order["plannerBeforeShops"]
        assert order["legacyScenariosHidden"]
        assert order["plannerEyebrow"] == "选店前 · 今日状态"
        assert box(planner)["y"] < box(shops)["y"]
        assert page.locator(".hk-demo3-quick-entry").is_visible()

        page.keyboard.press("Control+K")
        page.wait_for_selector(".hk-demo3-quick-dialog[open]", timeout=10_000)
        assert dialog.is_visible()
        page.keyboard.press("Escape")

        overflow = page.evaluate(
            "() => ({width: innerWidth, scrollWidth: document.documentElement.scrollWidth})"
        )
        assert overflow["scrollWidth"] <= overflow["width"] + 1, overflow

        page.screenshot(path=str(ARTIFACT_DIR / f"demo3-navigation-{label}-town.png"))
        page.goto(HTML_PATH.as_uri() + "#/merchant", wait_until="load", timeout=120_000)
        page.wait_for_selector(".merchant-entry-page", timeout=60_000)
        assert not page.locator(".hk-demo3-quick-entry").is_visible()

        browser.close()
        return {
            "label": label,
            "viewport": viewport,
            "quick_results": initial_result_count,
            "direct_route": "/room/yunxi/qiaoxi-tea",
            "recent_shop_first": "qiaoxi-tea",
            "order": order,
            "overflow": overflow,
        }


def main() -> None:
    assert HTML_PATH.exists(), HTML_PATH
    errors: list[str] = []
    results = [
        verify_navigation({"width": 1440, "height": 1000}, "desktop", errors),
        verify_navigation({"width": 390, "height": 844}, "mobile", errors),
    ]
    assert not errors, errors
    print(json.dumps({"ok": True, "results": results}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
