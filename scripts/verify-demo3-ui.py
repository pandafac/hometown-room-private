from __future__ import annotations

import json
import re
from pathlib import Path

from playwright.sync_api import Page, sync_playwright


ROOT = Path(__file__).resolve().parents[1]
HTML_PATH = ROOT / "outputs" / "会客厅Demo 5.0.html"
ARTIFACT_DIR = ROOT / ".codex-artifacts"


def wait_for_room(page: Page) -> None:
    page.wait_for_selector(".app-shell[data-hk-room-editorial]", timeout=60_000)
    page.wait_for_selector(".chat-panel", state="visible", timeout=60_000)
    page.wait_for_selector(".hk-room-story", state="visible", timeout=60_000)
    page.wait_for_selector(".hk-room-plan-row", state="visible", timeout=60_000)
    page.wait_for_timeout(800)
    page.locator(".hk-room-story").scroll_into_view_if_needed()
    page.evaluate(
        """async () => {
            const images = Array.from(document.querySelectorAll('.hk-room-crop-image'));
            await Promise.all(images.map(async (image) => {
                if (!image.complete) {
                    await new Promise((resolve) => {
                        image.addEventListener('load', resolve, { once: true });
                        image.addEventListener('error', resolve, { once: true });
                    });
                }
                if (image.decode) {
                    try { await image.decode(); } catch (_) {}
                }
            }));
        }"""
    )
    page.wait_for_timeout(300)
    page.evaluate("window.scrollTo(0, 0)")


def visible_text(page: Page) -> str:
    return page.locator("body").inner_text()


def box_dict(locator) -> dict[str, float]:
    box = locator.bounding_box()
    if not box:
        raise AssertionError(f"Element has no bounding box: {locator}")
    return {key: round(float(value), 2) for key, value in box.items()}


def assert_clean_copy(page: Page) -> None:
    text = visible_text(page)
    forbidden = [
        "演示",
        "非实时",
        "非实地",
        "非实际测绘",
        "虚构产品",
        "示意影像",
        "示例",
        "架空",
        "真实店主",
    ]
    found = [term for term in forbidden if term in text]
    matching_lines = [
        ascii(line.strip())
        for line in text.splitlines()
        if any(term in line for term in found)
    ]
    assert not found, f"Visible explanatory copy remains: {found}; {matching_lines}"


def verify_room(viewport: dict[str, int], label: str, errors: list[str]) -> dict:
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
        page.goto(HTML_PATH.as_uri() + "#/room/shiao/banshan-tofu", wait_until="load", timeout=120_000)
        wait_for_room(page)
        assert_clean_copy(page)

        header = page.locator(".chat-panel__header")
        header_text = " ".join(header.inner_text().split())
        assert "AI 接待员" in header_text, header_text
        assert "半山豆腐坊" not in header_text or "AI 接待员" in header_text, header_text
        contact = page.locator(".hk-demo3-contact-fact")
        assert contact.count() == 1 and contact.is_visible()
        assert "店主尚未提供" in contact.inner_text()

        hidden_copy = {
            "banner_caption": page.locator(".hk-room-banner__caption").count(),
            "status_note": page.locator(".hk-room-status__note").count(),
            "plan_disclaimer": page.locator(".hk-room-plan-disclaimer").count(),
            "footer": page.locator(".global-footer").count(),
            "boundary_note": page.locator(".ai-boundary-note").count(),
        }
        for name, count in hidden_copy.items():
            if count:
                assert not page.locator(
                    {
                        "banner_caption": ".hk-room-banner__caption",
                        "status_note": ".hk-room-status__note",
                        "plan_disclaimer": ".hk-room-plan-disclaimer",
                        "footer": ".global-footer",
                        "boundary_note": ".ai-boundary-note",
                    }[name]
                ).first.is_visible(), f"{name} is still visible"

        plan = box_dict(page.locator(".hk-room-plan"))
        legend = box_dict(page.locator(".hk-room-legend"))
        assert legend["y"] >= plan["y"] + plan["height"] - 2, (plan, legend)
        assert abs(legend["x"] - plan["x"]) <= 2, (plan, legend)

        layout = {}
        if viewport["width"] >= 1024:
            grid = box_dict(page.locator(".room-grid"))
            chat = box_dict(page.locator(".chat-panel"))
            story = box_dict(page.locator(".hk-room-story"))
            ratio = chat["width"] / grid["width"]
            assert ratio >= 0.5, f"Assistant width is only {ratio:.2%}: {chat} / {grid}"
            assert chat["x"] > story["x"], (chat, story)
            layout = {
                "grid": grid,
                "chat": chat,
                "story": story,
                "chat_ratio": round(ratio, 4),
            }
        else:
            chat = box_dict(page.locator(".chat-panel"))
            story = box_dict(page.locator(".hk-room-story"))
            assert chat["y"] < story["y"], (chat, story)
            layout = {"chat": chat, "story": story}

        overflow = page.evaluate(
            "() => ({ width: window.innerWidth, scrollWidth: document.documentElement.scrollWidth })"
        )
        assert overflow["scrollWidth"] <= overflow["width"] + 1, overflow
        page.evaluate("window.scrollTo(0, 0)")
        page.wait_for_timeout(250)

        ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
        page.screenshot(path=str(ARTIFACT_DIR / f"demo3-{label}-room-viewport.png"))
        page.screenshot(
            path=str(ARTIFACT_DIR / f"demo3-{label}-room.png"),
            full_page=True,
        )

        result = {
            "label": label,
            "viewport": viewport,
            "header": header_text,
            "plan": plan,
            "legend": legend,
            "hidden_copy": hidden_copy,
            "overflow": overflow,
            "layout": layout,
        }

        suggestion_row = page.locator(".suggestion-row").first
        suggestion_toggle = suggestion_row.locator(".hk-demo3-suggestion-toggle")
        suggestion_choices = suggestion_row.locator(
            ":scope > button:not(.hk-demo3-suggestion-toggle)"
        )
        assert suggestion_toggle.is_visible(), "Suggestion collapse control is not visible"
        assert suggestion_toggle.inner_text().strip() == "收起"
        assert suggestion_choices.count() >= 1
        assert all(choice.is_visible() for choice in suggestion_choices.all())

        feed_height_before = box_dict(page.locator(".chat-feed"))["height"]
        suggestion_row_height_before = box_dict(suggestion_row)["height"]
        suggestion_toggle.click()
        page.wait_for_selector('.suggestion-row[data-hk-suggestions-collapsed="true"]')
        page.wait_for_timeout(250)
        assert suggestion_toggle.inner_text().strip() == "展开"
        assert all(not choice.is_visible() for choice in suggestion_choices.all())
        feed_height_after = box_dict(page.locator(".chat-feed"))["height"]
        suggestion_row_height_after = box_dict(suggestion_row)["height"]
        assert feed_height_after >= feed_height_before + 50, (
            feed_height_before,
            feed_height_after,
        )
        assert suggestion_row_height_after < suggestion_row_height_before
        result["suggestion_collapse"] = {
            "row_height_before": suggestion_row_height_before,
            "row_height_after": suggestion_row_height_after,
            "chat_feed_gain": round(feed_height_after - feed_height_before, 2),
        }
        page.screenshot(
            path=str(ARTIFACT_DIR / f"demo3-{label}-suggestions-collapsed.png")
        )

        suggestion_toggle.click()
        page.wait_for_selector('.suggestion-row[data-hk-suggestions-collapsed="false"]')
        page.wait_for_timeout(200)
        assert suggestion_toggle.inner_text().strip() == "收起"
        assert all(choice.is_visible() for choice in suggestion_choices.all())

        if viewport["width"] >= 1024:
            page.evaluate("window.scrollTo(0, 760)")
            page.wait_for_timeout(250)
            sticky_chat = box_dict(page.locator(".chat-panel"))
            first_scroll_y = page.evaluate("window.scrollY")
            assert first_scroll_y > 500
            assert 10 <= sticky_chat["y"] <= 20, sticky_chat
            page.screenshot(path=str(ARTIFACT_DIR / "demo3-desktop-sticky-scroll.png"))

            page.evaluate("window.scrollTo(0, 1260)")
            page.wait_for_timeout(250)
            sticky_chat_far = box_dict(page.locator(".chat-panel"))
            far_metrics = page.evaluate(
                """() => {
                    const rect = (selector) => {
                        const box = document.querySelector(selector).getBoundingClientRect();
                        return { top: box.top, bottom: box.bottom, height: box.height };
                    };
                    const chat = document.querySelector('.chat-panel');
                    return {
                        scrollY: window.scrollY,
                        maxScroll: document.documentElement.scrollHeight - window.innerHeight,
                        grid: rect('.room-grid'),
                        chat: rect('.chat-panel'),
                        story: rect('.hk-room-story'),
                        page: rect('.room-page'),
                        position: getComputedStyle(chat).position,
                        top: getComputedStyle(chat).top,
                    };
                }"""
            )
            assert 0 <= sticky_chat_far["y"] <= 20, (
                sticky_chat_far,
                far_metrics,
            )
            result["sticky_chat"] = {
                "near_scroll_top": sticky_chat["y"],
                "far_scroll_top": sticky_chat_far["y"],
            }

            page.reload(wait_until="load", timeout=120_000)
            wait_for_room(page)
            composer = page.locator(".composer textarea")
            composer.fill("下午四点还营业吗？")
            composer.press("Enter")
            page.wait_for_function(
                "document.querySelectorAll('.message--assistant').length >= 2",
                timeout=75_000,
            )
            page.evaluate(
                """() => {
                    const bubble = document.createElement('div');
                    bubble.className = 'thinking-bubble';
                    bubble.id = 'hk-test-thinking';
                    bubble.style.display = 'none';
                    document.querySelector('.chat-feed').appendChild(bubble);
                }"""
            )
            composer.fill("第一次来怎么点？")
            queue_row = page.locator(".hk-demo3-queue-row")
            page.wait_for_selector('.hk-demo3-queue-row:not([hidden])', timeout=10_000)
            queue_button = queue_row.locator(".hk-demo3-queue-action")
            assert queue_button.is_visible()
            assert queue_button.inner_text().strip() == "排队发送"
            composer.press("Enter")
            page.wait_for_selector('.hk-demo3-queue-cancel:not([hidden])', timeout=10_000)
            assert "已排队" in queue_row.inner_text()
            assert composer.input_value() == ""
            page.screenshot(path=str(ARTIFACT_DIR / "demo3-desktop-queued-question.png"))
            page.evaluate("document.querySelector('#hk-test-thinking').remove()")
            page.wait_for_function(
                "document.querySelectorAll('.message--assistant').length >= 3",
                timeout=75_000,
            )
            page.wait_for_timeout(500)
            arrival = page.locator(".hk-room-arrival-button")
            assert arrival.count() == 1, "Arrival card button is missing"
            assert arrival.is_enabled(), "Arrival card button did not become available"
            page.wait_for_selector('.suggestion-row[data-hk-suggestions-collapsed="true"]')
            assert suggestion_toggle.inner_text().strip() == "展开"
            assert all(not choice.is_visible() for choice in suggestion_choices.all())
            result["chat_message_count"] = page.locator(".message").count()
            result["arrival_card_enabled"] = True
            result["suggestions_auto_collapsed"] = True
            result["queued_followup_sent"] = "第一次来怎么点？" in page.locator(
                ".chat-feed"
            ).inner_text()

            page.screenshot(
                path=str(ARTIFACT_DIR / "demo3-desktop-after-chat.png"),
                full_page=True,
            )

            arrival.click()
            page.wait_for_url(re.compile(r".*#/card/.*"), timeout=75_000)
            page.wait_for_selector(".app-shell", timeout=60_000)
            assert_clean_copy(page)
            result["arrival_card_route"] = page.url.split("#", 1)[-1]

            page.goto(HTML_PATH.as_uri() + "#/merchant", wait_until="load", timeout=120_000)
            page.wait_for_selector(".merchant-entry-page, .merchant-workbench", timeout=60_000)
            assert_clean_copy(page)
            result["merchant_entry_loaded"] = True
            page.screenshot(
                path=str(ARTIFACT_DIR / "demo3-desktop-merchant.png"),
                full_page=True,
            )

            route_checks = []
            for route in [
                "/",
                "/visit",
                "/visit/jiangnan",
                "/visit/jiangnan/yunxi",
                "/merchant/mountain/shiao/banshan-tofu",
            ]:
                page.goto(HTML_PATH.as_uri() + "#" + route, wait_until="load", timeout=120_000)
                page.wait_for_selector(".app-shell", timeout=60_000)
                page.wait_for_timeout(400)
                try:
                    assert_clean_copy(page)
                except AssertionError as error:
                    raise AssertionError(f"{route}: {error}\n{visible_text(page)}") from error
                route_checks.append(route)
            result["clean_routes"] = route_checks

        browser.close()
        return result


def main() -> None:
    assert HTML_PATH.exists(), f"Missing revised HTML: {HTML_PATH}"
    errors: list[str] = []
    results = [
        verify_room({"width": 1440, "height": 1000}, "desktop", errors),
        verify_room({"width": 390, "height": 844}, "mobile", errors),
    ]
    assert not errors, errors
    print(json.dumps({"ok": True, "results": results}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
