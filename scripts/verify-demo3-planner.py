from __future__ import annotations

import json
from pathlib import Path

from playwright.sync_api import Page, sync_playwright


ROOT = Path(__file__).resolve().parents[1]
HTML_PATH = ROOT / "outputs" / "会客厅Demo 5.0.html"
ARTIFACT_DIR = ROOT / ".codex-artifacts"


def box(locator) -> dict[str, float]:
    value = locator.bounding_box()
    assert value, f"Missing bounding box: {locator}"
    return {key: round(float(item), 2) for key, item in value.items()}


def verify_planner(viewport: dict[str, int], label: str, errors: list[str]) -> dict:
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
        page.goto(
            HTML_PATH.as_uri() + "#/visit/jiangnan/yunxi",
            wait_until="load",
            timeout=120_000,
        )
        page.wait_for_selector(".hk-today-planner", timeout=60_000)
        page.wait_for_selector(".hk-today-card", timeout=60_000)
        page.wait_for_timeout(800)

        planner = page.locator(".hk-today-planner")
        planner.scroll_into_view_if_needed()
        page.wait_for_timeout(300)

        cards = page.locator(".hk-today-card")
        assert cards.count() == 6
        assert "你想先问什么" in page.locator(".hk-today-planner__choices-head h3").inner_text()
        assert "点店铺才进入会客厅" in page.locator(
            ".hk-today-planner__choices-head p"
        ).inner_text()

        for selector in [
            ".hk-today-planner__choices-head > button",
            ".hk-today-planner__list-status",
            ".hk-today-planner__under-grid",
            ".hk-today-planner__draft-note",
            ".hk-today-planner__foot",
        ]:
            target = page.locator(selector)
            if target.count():
                assert not target.first.is_visible(), f"{selector} is still visible"

        indexes = [item.inner_text().strip() for item in page.locator(".hk-today-card__index").all()]
        assert all("/" not in item for item in indexes), indexes
        assert all(not item.is_visible() for item in page.locator(".hk-today-card__question").all())
        assert all(not item.is_visible() for item in page.locator(".hk-today-card__reason").all())

        grid = page.locator(".hk-today-planner__grid")
        grid_box = box(grid)
        first_box = box(cards.nth(0))
        second_box = box(cards.nth(1))
        if viewport["width"] > 1280:
            assert abs(first_box["y"] - second_box["y"]) <= 2
            assert first_box["width"] < grid_box["width"] / 2
        elif viewport["width"] > 340:
            assert abs(first_box["y"] - second_box["y"]) <= 2
            assert abs(first_box["x"] - second_box["x"]) > 2
        else:
            assert abs(first_box["x"] - second_box["x"]) <= 2
            assert first_box["y"] < second_box["y"]

        grid_height_before = grid_box["height"]
        ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
        page.screenshot(
            path=str(ARTIFACT_DIR / f"demo3-planner-{label}-initial.png")
        )
        cards.nth(0).click()
        page.wait_for_selector('.hk-today-card[aria-pressed="true"]')
        page.wait_for_timeout(350)
        selected = page.locator('.hk-today-card[aria-pressed="true"]')
        assert selected.count() == 1
        assert not selected.locator(".hk-today-card__question").is_visible()
        assert not selected.locator(".hk-today-card__reason").is_visible()
        selected_box = box(selected)
        assert selected_box["width"] < grid_box["width"]
        detail = page.locator(".hk-demo3-scenario-detail")
        assert detail.is_visible()
        detail_box = box(detail)
        assert detail_box["width"] >= grid_box["width"] - 2
        assert selected.locator(".hk-today-card__title").inner_text().strip() in detail.inner_text()
        assert selected.locator(".hk-today-card__question").text_content().strip() in detail.inner_text()
        assert abs(box(grid)["height"] - grid_height_before) <= 2
        draft = page.locator(".hk-today-planner__draft-input")
        draft_value = draft.input_value().strip()
        assert draft_value, "Selecting a situation should prepare a draft question"

        cards.nth(1).click()
        page.wait_for_timeout(250)
        selected = page.locator('.hk-today-card[aria-pressed="true"]')
        assert selected.count() == 1
        assert selected.get_attribute("data-id") == "rain"
        assert cards.nth(1).locator(".hk-today-card__title").inner_text().strip() in detail.inner_text()

        quiet = page.locator('.hk-today-planner__option[data-key="need"][data-value="quiet"]')
        quiet.click()
        assert quiet.get_attribute("aria-pressed") == "true"

        overflow = page.evaluate(
            "() => ({width: innerWidth, scrollWidth: document.documentElement.scrollWidth})"
        )
        assert overflow["scrollWidth"] <= overflow["width"] + 1, overflow

        page.screenshot(path=str(ARTIFACT_DIR / f"demo3-planner-{label}-viewport.png"))
        planner.screenshot(path=str(ARTIFACT_DIR / f"demo3-planner-{label}.png"))

        browser.close()
        return {
            "label": label,
            "viewport": viewport,
            "initial_grid_height": round(grid_height_before, 2),
            "selected_card_width": selected_box["width"],
            "grid_width": grid_box["width"],
            "detail_width": detail_box["width"],
            "draft_prepared": bool(draft_value),
            "indexes": indexes,
            "quiet_condition_selected": True,
            "overflow": overflow,
        }


def main() -> None:
    assert HTML_PATH.exists(), HTML_PATH
    errors: list[str] = []
    results = [
        verify_planner({"width": 1440, "height": 1000}, "desktop", errors),
        verify_planner({"width": 390, "height": 844}, "mobile", errors),
    ]
    assert not errors, errors
    print(json.dumps({"ok": True, "results": results}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
