from __future__ import annotations

import json
from pathlib import Path

from playwright.sync_api import Browser, Page, sync_playwright


ROOT = Path(__file__).resolve().parents[1]
HTML_PATH = ROOT / "outputs" / "会客厅Demo 5.0.html"
ARTIFACT_DIR = ROOT / ".codex-artifacts" / "video-audit"


def new_room_page(browser: Browser) -> Page:
    page = browser.new_page(viewport={"width": 1440, "height": 1000})
    page.goto(
        HTML_PATH.as_uri() + "#/room/yunxi/qiaoxi-tea",
        wait_until="load",
        timeout=120_000,
    )
    page.wait_for_selector(".chat-panel", timeout=60_000)
    page.wait_for_timeout(600)
    return page


def ask(page: Page, question: str, expected_assistant_count: int = 2) -> None:
    composer = page.locator(".composer textarea")
    composer.fill(question)
    composer.press("Enter")
    page.wait_for_function(
        f"document.querySelectorAll('.message--assistant').length >= {expected_assistant_count}",
        timeout=75_000,
    )
    page.wait_for_timeout(400)


def last_answer(page: Page) -> dict:
    message = page.locator(".message--assistant").last
    return {
        "reply": message.locator(".message__bubble").inner_text(),
        "sources": message.locator(".message__sources").all_inner_texts(),
        "gap": message.locator(".gap-detected").all_inner_texts(),
        "followups": page.locator(".suggestion-row button").all_inner_texts(),
    }


def main() -> None:
    assert HTML_PATH.exists(), HTML_PATH
    results = []
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)

        page = new_room_page(browser)
        ask(page, "店里有 Wi-Fi 和插座吗？我想带电脑坐一会儿。")
        results.append({"case": "facilities_only", **last_answer(page)})
        page.close()

        page = new_room_page(browser)
        ask(page, "我一个人来，应该坐哪里？店里能带电脑坐一会儿吗？")
        results.append({"case": "solo_and_facilities", **last_answer(page)})
        page.screenshot(
            path=str(ARTIFACT_DIR / "ai-multi-intent.png"),
            full_page=True,
        )
        page.close()

        page = new_room_page(browser)
        ask(page, "下午四点需要排队吗？")
        ask(page, "那什么时候排队的人多？我是不是得早一点来？", 3)
        results.append(
            {
                "case": "queue_followup",
                "answer": last_answer(page),
                "messages": page.locator(".message").all_inner_texts(),
            }
        )
        page.close()

        page = new_room_page(browser)
        ask(page, "我不吃香菜")
        results.append({"case": "dietary_only", **last_answer(page)})
        page.screenshot(
            path=str(ARTIFACT_DIR / "ai-dietary.png"),
            full_page=True,
        )
        page.close()

        page = new_room_page(browser)
        ask(page, "你不是接入了 deepseek 吗？")
        results.append({"case": "model_meta", **last_answer(page)})
        page.close()

        browser.close()

    facilities_only = next(item for item in results if item["case"] == "facilities_only")
    combined = next(item for item in results if item["case"] == "solo_and_facilities")
    queue = next(item for item in results if item["case"] == "queue_followup")
    dietary = next(item for item in results if item["case"] == "dietary_only")
    ok = (
        ("Wi-Fi" in facilities_only["reply"] or "wifi" in facilities_only["reply"].lower())
        and ("Wi-Fi" in combined["reply"] or "电脑" in combined["reply"])
        and ("座位" in combined["reply"] or "吧台" in combined["reply"])
        and ("排队" in queue["answer"]["reply"] or "高峰" in queue["answer"]["reply"])
        and ("香菜" in dietary["reply"] and "开在旧桥西头的小茶寮" not in dietary["reply"])
        and all(
            not any(
                token in (" ".join(item.get("sources", [])) + " " + item.get("reply", ""))
                for token in ["hours.", "solo.", "commonMisunderstandings", "tea-extra-", "knowledgeBase"]
            )
            for item in [facilities_only, combined, dietary, queue["answer"]]
        )
    )
    print(json.dumps({"ok": ok, "results": results}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
