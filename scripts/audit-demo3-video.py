from __future__ import annotations

import json
import re
from pathlib import Path
from time import monotonic

from playwright.sync_api import Page, sync_playwright


ROOT = Path(__file__).resolve().parents[1]
HTML_PATH = ROOT / "outputs" / "会客厅Demo 5.0.html"
ARTIFACT_DIR = ROOT / ".codex-artifacts" / "video-audit"


def wait_for_ready(page: Page, selector: str) -> None:
    page.wait_for_selector(".app-shell", timeout=60_000)
    if selector:
        page.wait_for_selector(selector, timeout=60_000)
    page.evaluate("document.fonts && document.fonts.ready")
    page.wait_for_timeout(500)
    page.evaluate("window.scrollTo(0, 0)")


def visible_page_facts(page: Page) -> dict:
    return page.evaluate(
        """() => {
            const visible = (node) => {
                if (!(node instanceof Element)) return false;
                const style = getComputedStyle(node);
                const box = node.getBoundingClientRect();
                return style.display !== 'none' && style.visibility !== 'hidden' &&
                    box.width > 0 && box.height > 0;
            };
            const text = document.body.innerText || '';
            const headings = [...document.querySelectorAll('h1,h2,h3')]
                .filter(visible)
                .map((node) => node.innerText.replace(/\\s+/g, ' ').trim())
                .filter(Boolean);
            const interactive = [...document.querySelectorAll('a,button,input,select,textarea,summary')]
                .filter(visible);
            const unlabeled = interactive.filter((node) => {
                const associatedLabels = node.labels
                    ? [...node.labels].map((label) => label.innerText).join(' ')
                    : '';
                const name = [
                    node.getAttribute('aria-label'),
                    node.getAttribute('title'),
                    node.innerText,
                    node.getAttribute('placeholder'),
                    associatedLabels
                ].filter(Boolean).join(' ').trim();
                return !name;
            }).map((node) => node.tagName.toLowerCase() + '.' + (node.className || ''));
            const imagesWithoutAlt = [...document.querySelectorAll('img')]
                .filter(visible)
                .filter((node) => !node.hasAttribute('alt'))
                .length;
            return {
                title: document.title,
                headings: headings.slice(0, 8),
                visibleTextLength: text.replace(/\\s+/g, '').length,
                interactiveCount: interactive.length,
                unlabeledInteractive: unlabeled,
                imagesWithoutAlt,
                overflow: {
                    width: innerWidth,
                    scrollWidth: document.documentElement.scrollWidth,
                    height: innerHeight,
                    scrollHeight: document.documentElement.scrollHeight,
                },
            };
        }"""
    )


def capture(
    page: Page,
    route: str,
    name: str,
    ready_selector: str,
    console_errors: list[str],
    failed_requests: list[str],
    full_page: bool = True,
) -> dict:
    started = monotonic()
    page.goto(HTML_PATH.as_uri() + "#" + route, wait_until="load", timeout=120_000)
    wait_for_ready(page, ready_selector)
    load_ms = round((monotonic() - started) * 1000)
    facts = visible_page_facts(page)
    facts["route"] = route
    facts["load_ms"] = load_ms
    facts["console_errors"] = list(console_errors)
    facts["failed_requests"] = list(failed_requests)
    page.screenshot(
        path=str(ARTIFACT_DIR / f"{name}-viewport.png"),
        full_page=False,
    )
    if full_page:
        page.screenshot(
            path=str(ARTIFACT_DIR / f"{name}-full.png"),
            full_page=True,
        )
    console_errors.clear()
    failed_requests.clear()
    return facts


def run_desktop_audit() -> dict:
    errors: list[str] = []
    failed_requests: list[str] = []
    pages: list[dict] = []

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1440, "height": 1000})

        def on_page_error(error: Exception) -> None:
            errors.append(f"pageerror: {error}")

        def on_console(message) -> None:
            if message.type == "error":
                text = message.text
                if "fonts.googleapis.com" in text or "fonts.gstatic.com" in text:
                    return
                errors.append(f"console: {text}")

        def on_request_failed(request) -> None:
            failed_requests.append(request.url)

        page.on("pageerror", on_page_error)
        page.on("console", on_console)
        page.on("requestfailed", on_request_failed)
        ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)

        for route, name, selector in [
            ("/", "home", ".cover-page"),
            ("/visit", "regions", ".region-card-grid"),
            ("/visit/jiangnan", "towns", ".town-list"),
            ("/visit/jiangnan/yunxi", "town-yunxi", ".hk-today-planner"),
            ("/room/yunxi/qiaoxi-tea", "room-initial", ".chat-panel"),
            ("/merchant", "merchant-entry", ".merchant-entry-page"),
        ]:
            pages.append(
                capture(
                    page,
                    route,
                    name,
                    selector,
                    errors,
                    failed_requests,
                )
            )

        page.goto(
            HTML_PATH.as_uri() + "#/room/yunxi/qiaoxi-tea",
            wait_until="load",
            timeout=120_000,
        )
        wait_for_ready(page, ".chat-panel")
        composer = page.locator(".composer textarea")
        composer.fill("我一个人来，应该坐哪里？店里能带电脑坐一会儿吗？")
        composer.press("Enter")
        page.wait_for_function(
            "document.querySelectorAll('.message--assistant').length >= 2",
            timeout=75_000,
        )
        page.wait_for_timeout(500)
        room_reply = page.locator(".message--assistant").last.locator(".message__bubble").inner_text()
        page.screenshot(
            path=str(ARTIFACT_DIR / "room-answer-full.png"),
            full_page=True,
        )
        arrival = page.locator(".hk-room-arrival-button")
        assert arrival.is_enabled(), "Arrival card button is unavailable after a question"
        arrival.click()
        page.wait_for_url(re.compile(r".*#/card/.*"), timeout=75_000)
        page.wait_for_selector(".app-shell", timeout=60_000)
        page.wait_for_timeout(700)
        card_facts = visible_page_facts(page)
        card_facts["route"] = "/card/yunxi/qiaoxi-tea"
        card_facts["console_errors"] = list(errors)
        pages.append(card_facts)
        page.screenshot(
            path=str(ARTIFACT_DIR / "arrival-card-full.png"),
            full_page=True,
        )

        for route, name, selector in [
            (
                "/merchant/jiangnan/yunxi/qiaoxi-tea?view=input",
                "merchant-input",
                ".merchant-workbench",
            ),
            (
                "/merchant/jiangnan/yunxi/qiaoxi-tea?view=output",
                "merchant-output",
                ".merchant-workbench",
            ),
        ]:
            pages.append(
                capture(
                    page,
                    route,
                    name,
                    selector,
                    errors,
                    failed_requests,
                )
            )

        performance = page.evaluate(
            """() => ({
                domContentLoaded: Math.round(performance.getEntriesByType('navigation')[0]?.domContentLoadedEventEnd || 0),
                loadEvent: Math.round(performance.getEntriesByType('navigation')[0]?.loadEventEnd || 0),
                transferSize: performance.getEntriesByType('navigation')[0]?.transferSize || 0,
                fontStatus: document.fonts ? document.fonts.status : 'unsupported'
            })"""
        )
        browser.close()

    return {
        "pages": pages,
        "room_reply": room_reply,
        "performance": performance,
        "errors": errors,
    }


def run_mobile_audit() -> dict:
    errors: list[str] = []
    failed_requests: list[str] = []
    pages: list[dict] = []
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 390, "height": 844})
        page.on("pageerror", lambda error: errors.append(f"pageerror: {error}"))
        page.on(
            "console",
            lambda message: errors.append(f"console: {message.text}")
            if message.type == "error"
            and "fonts.googleapis.com" not in message.text
            and "fonts.gstatic.com" not in message.text
            else None,
        )
        page.on("requestfailed", lambda request: failed_requests.append(request.url))

        for route, name, selector in [
            ("/", "mobile-home", ".cover-page"),
            ("/visit/jiangnan/yunxi", "mobile-town-yunxi", ".hk-today-planner"),
            ("/room/yunxi/qiaoxi-tea", "mobile-room", ".chat-panel"),
            ("/merchant", "mobile-merchant-entry", ".merchant-entry-page"),
        ]:
            pages.append(
                capture(
                    page,
                    route,
                    name,
                    selector,
                    errors,
                    failed_requests,
                    full_page=True,
                )
            )
        browser.close()
    return {"pages": pages, "errors": errors}


def main() -> None:
    assert HTML_PATH.exists(), HTML_PATH
    desktop = run_desktop_audit()
    mobile = run_mobile_audit()
    assert not desktop["errors"], desktop["errors"]
    assert not mobile["errors"], mobile["errors"]
    print(
        json.dumps(
            {
                "ok": True,
                "file_bytes": HTML_PATH.stat().st_size,
                "desktop": desktop,
                "mobile": mobile,
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
