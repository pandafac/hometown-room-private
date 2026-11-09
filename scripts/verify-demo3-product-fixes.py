from __future__ import annotations

import json
import re
from pathlib import Path

from playwright.sync_api import Page, sync_playwright


ROOT = Path(__file__).resolve().parents[1]
HTML_PATH = ROOT / "outputs" / "会客厅Demo 5.0.html"
ARTIFACT_DIR = ROOT / ".codex-artifacts" / "product-fixes"


def box(locator) -> dict[str, float]:
    value = locator.bounding_box()
    assert value, locator
    return {key: round(float(item), 2) for key, item in value.items()}


def wait_base(page: Page, selector: str) -> None:
    page.wait_for_selector(".app-shell", timeout=60_000)
    page.wait_for_selector(selector, timeout=60_000)
    page.wait_for_timeout(500)


def verify_desktop(errors: list[str]) -> dict:
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1440, "height": 1000})
        page.on("pageerror", lambda error: errors.append(f"pageerror: {error}"))
        page.on(
            "console",
            lambda message: errors.append(f"console: {message.text}")
            if message.type == "error"
            and "fonts.googleapis.com" not in message.text
            and "fonts.gstatic.com" not in message.text
            else None,
        )
        ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)

        # Single-town regions skip the no-choice intermediate page.
        page.goto(HTML_PATH.as_uri() + "#/", wait_until="load", timeout=120_000)
        wait_base(page, '.region-mini__link[href="#/visit/jiangnan"]')
        region_link = page.locator(
            '.region-mini__link[data-hk-single-town-target="#/visit/jiangnan/yunxi"]'
        )
        assert region_link.count() == 1
        region_link.click()
        page.wait_for_url(re.compile(r".*#/visit/jiangnan/yunxi"), timeout=30_000)
        wait_base(page, ".town-page")

        # Returning to the region remains possible and is not force-redirected.
        page.get_by_role("link", name="返回江南水乡").click()
        page.wait_for_url(re.compile(r".*#/visit/jiangnan$"), timeout=30_000)
        page.wait_for_timeout(300)
        assert page.url.endswith("#/visit/jiangnan")

        # A selected situation now changes the visible shop order and highlights one result.
        page.goto(
            HTML_PATH.as_uri() + "#/visit/jiangnan/yunxi",
            wait_until="load",
            timeout=120_000,
        )
        wait_base(page, ".hk-today-planner")
        page.locator('.hk-today-card[data-id="hot"]').click()
        page.wait_for_timeout(500)
        ranked = page.locator(".town-shop").evaluate_all(
            """nodes => nodes.map((node) => ({
                name: node.querySelector('h3')?.innerText,
                order: Number(node.style.order || 0),
                fit: node.getAttribute('data-hk-today-fit'),
                href: node.getAttribute('href') || node.querySelector('a[href]')?.getAttribute('href')
            })).sort((a, b) => a.order - b.order)"""
        )
        assert "ayuan-noodles" in ranked[0]["href"]
        assert ranked[0]["fit"] == "true"
        badge = page.locator(".town-shop .hk-demo3-fit-badge")
        assert badge.count() == 1 and badge.inner_text().strip() == "更符合今天"
        assert "更合适的店排在前面" in page.locator(
            ".town-shops .section-heading .eyebrow"
        ).inner_text()
        assert "选一家店，开始问 AI" in page.locator(
            ".town-shops .section-heading h2"
        ).inner_text()
        conditions_box = box(page.locator(".hk-today-planner__conditions"))
        choices_box = box(page.locator(".hk-today-planner__choices"))
        assert conditions_box["x"] < choices_box["x"]
        assert conditions_box["width"] < choices_box["width"]
        assert abs(conditions_box["y"] - choices_box["y"]) <= 2
        assert page.evaluate(
            """() => Boolean(
                document.querySelector('.hk-today-planner__choices-head')
                    ?.closest('.hk-today-planner__conditions') &&
                document.querySelector('.hk-today-planner__grid')
                    ?.closest('.hk-today-planner__conditions')
            )"""
        )
        assert page.evaluate(
            """() => Boolean(
                document.querySelector('.town-shops')?.closest('.hk-today-planner__choices')
            )"""
        )
        assert page.evaluate(
            """() => Boolean(
                document.querySelector('.hk-today-planner__draft')
                    ?.closest('.hk-today-planner__conditions')
            )"""
        )
        assert page.evaluate(
            """() => Boolean(
                document.querySelector('.hk-today-planner__draft')
                    ?.closest('.hk-today-planner__conditions')
            )"""
        )
        page.locator(".town-shops").scroll_into_view_if_needed()
        page.wait_for_timeout(250)
        assert box(page.locator(".town-shops"))["y"] < 100
        page.screenshot(path=str(ARTIFACT_DIR / "town-state-ranking.png"))

        # Compound questions must answer every detected intent.
        page.goto(
            HTML_PATH.as_uri() + "#/room/yunxi/qiaoxi-tea",
            wait_until="load",
            timeout=120_000,
        )
        wait_base(page, ".chat-panel")
        composer = page.locator(".composer textarea")
        composer.fill("我一个人来，应该坐哪里？店里能带电脑坐一会儿吗？")
        composer.press("Enter")
        page.wait_for_function(
            "document.querySelectorAll('.message--assistant').length >= 2",
            timeout=75_000,
        )
        page.wait_for_timeout(500)
        answer = page.locator(".message--assistant").last
        answer_text = answer.locator(".message__bubble").inner_text()
        assert "座位" in answer_text or "吧台" in answer_text
        assert "Wi-Fi" in answer_text or "电脑" in answer_text
        assert "资料" in answer_text or "补充" in answer_text or "插座" in answer_text
        page.screenshot(path=str(ARTIFACT_DIR / "multi-intent-answer.png"), full_page=True)

        # Entering from the merchant selector lands on owner input/setup, not output.
        page.goto(HTML_PATH.as_uri() + "#/merchant", wait_until="load", timeout=120_000)
        wait_base(page, ".merchant-entry-card")
        page.get_by_role("button", name=re.compile("进入店主工作台")).click()
        page.wait_for_url(re.compile(r".*#/merchant/jiangnan/yunxi/qiaoxi-tea$"), timeout=30_000)
        wait_base(page, ".owner-fact-form")
        entry_tab = page.locator(".workbench-switch button.is-active")
        assert "店主资料" in entry_tab.inner_text()

        # A bare workbench URL also defaults to the owner's input/setup view.
        page.goto(
            HTML_PATH.as_uri() + "#/merchant/jiangnan/yunxi/qiaoxi-tea",
            wait_until="load",
            timeout=120_000,
        )
        wait_base(page, ".owner-fact-form")
        active_tab = page.locator(".workbench-switch button.is-active")
        assert "店主资料" in active_tab.inner_text()
        assert page.locator(".hk-owner-dashboard").count() == 0 or not page.locator(
            ".hk-owner-dashboard"
        ).is_visible()

        # Merchant output uses an explicit route and one content-generation area.
        page.goto(
            HTML_PATH.as_uri()
            + "#/merchant/jiangnan/yunxi/qiaoxi-tea?view=output",
            wait_until="load",
            timeout=120_000,
        )
        wait_base(page, ".hk-owner-dashboard")
        page.wait_for_timeout(700)
        custom_content = page.locator(".hk-owner-content")
        original_studio = page.locator(".content-studio")
        assert custom_content.count() == 1 and not custom_content.is_visible()
        assert original_studio.count() == 1 and original_studio.is_visible()
        topics = box(page.locator(".hk-owner-topics"))
        priorities = box(page.locator(".hk-owner-priorities"))
        assert abs(topics["y"] - priorities["y"]) <= 2
        assert priorities["x"] > topics["x"]
        page.screenshot(path=str(ARTIFACT_DIR / "merchant-output-layout.png"), full_page=True)

        content_tab = page.locator(
            '.workbench-switch .hk-owner-nav-tab[data-hk-owner-action="content"]'
        )
        assert content_tab.count() == 1
        content_tab.click()
        page.wait_for_timeout(500)
        assert page.evaluate("window.scrollY") > 0
        assert original_studio.is_visible()

        # Merchant input remains split into reference and action rails.
        page.goto(
            HTML_PATH.as_uri()
            + "#/merchant/jiangnan/yunxi/qiaoxi-tea",
            wait_until="load",
            timeout=120_000,
        )
        wait_base(page, ".owner-fact-form")
        inventory = box(page.locator(".knowledge-inventory"))
        editor = box(page.locator(".owner-fact-editor"))
        assert abs(inventory["y"] - editor["y"]) <= 2
        assert editor["x"] > inventory["x"]
        page.screenshot(path=str(ARTIFACT_DIR / "merchant-input-layout.png"), full_page=True)

        overflow = page.evaluate(
            "() => ({width: innerWidth, scrollWidth: document.documentElement.scrollWidth})"
        )
        assert overflow["scrollWidth"] <= overflow["width"] + 1
        browser.close()

        return {
            "single_town_direct": True,
            "return_to_region": True,
            "ranked_shop": ranked[0],
            "multi_intent_answer": answer_text,
            "custom_content_hidden": True,
            "original_content_visible": True,
            "merchant_input_columns": True,
            "overflow": overflow,
        }


def verify_mobile(errors: list[str]) -> dict:
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 390, "height": 844})
        page.on("pageerror", lambda error: errors.append(f"mobile pageerror: {error}"))
        page.goto(
            HTML_PATH.as_uri() + "#/visit/jiangnan/yunxi",
            wait_until="load",
            timeout=120_000,
        )
        wait_base(page, ".hk-today-planner")
        conditions_box = box(page.locator(".hk-today-planner__conditions"))
        choices_box = box(page.locator(".hk-today-planner__choices"))
        assert abs(conditions_box["x"] - choices_box["x"]) <= 2
        assert choices_box["y"] > conditions_box["y"]
        assert page.evaluate(
            """() => Boolean(
                document.querySelector('.hk-today-planner__draft')
                    ?.closest('.hk-today-planner__choices')
            )"""
        )
        page.goto(
            HTML_PATH.as_uri() + "#/merchant/jiangnan/yunxi/qiaoxi-tea",
            wait_until="load",
            timeout=120_000,
        )
        wait_base(page, ".owner-fact-form")
        inventory = box(page.locator(".knowledge-inventory"))
        editor = box(page.locator(".owner-fact-editor"))
        assert abs(inventory["x"] - editor["x"]) <= 2
        assert editor["y"] > inventory["y"]
        page.goto(
            HTML_PATH.as_uri()
            + "#/merchant/jiangnan/yunxi/qiaoxi-tea?view=output",
            wait_until="load",
            timeout=120_000,
        )
        wait_base(page, ".hk-owner-dashboard")
        page.wait_for_timeout(500)
        overflow = page.evaluate(
            "() => ({width: innerWidth, scrollWidth: document.documentElement.scrollWidth})"
        )
        assert overflow["scrollWidth"] <= overflow["width"] + 1
        assert not page.locator(".hk-owner-content").is_visible()
        page.screenshot(
            path=str(ARTIFACT_DIR / "merchant-output-mobile.png"),
            full_page=True,
        )
        browser.close()
        return {
            "merchant_mobile_stacked": True,
            "custom_content_hidden": True,
            "overflow": overflow,
        }


def main() -> None:
    assert HTML_PATH.exists(), HTML_PATH
    errors: list[str] = []
    result = {
        "ok": True,
        "desktop": verify_desktop(errors),
        "mobile": verify_mobile(errors),
        "errors": errors,
    }
    assert not errors, errors
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
