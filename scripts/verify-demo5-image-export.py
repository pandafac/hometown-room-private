from __future__ import annotations

import json
import tempfile
from pathlib import Path

from PIL import Image
from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]
HTML_PATH = ROOT / "outputs" / "会客厅Demo 5.0.html"


def main() -> None:
    assert HTML_PATH.exists(), HTML_PATH
    errors: list[str] = []

    with tempfile.TemporaryDirectory(prefix="hometown-room-card-") as temp_dir:
        image_path = Path(temp_dir) / "arrival-card.png"
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True)
            context = browser.new_context(
                viewport={"width": 1440, "height": 1000},
                accept_downloads=True,
            )
            page = context.new_page()
            page.on("pageerror", lambda error: errors.append(str(error)))
            page.on(
                "console",
                lambda message: errors.append(message.text)
                if message.type == "error"
                else None,
            )

            page.goto(
                HTML_PATH.as_uri() + "#/room/shiao/banshan-tofu",
                wait_until="load",
                timeout=120_000,
            )
            page.wait_for_selector(".chat-panel", timeout=60_000)
            composer = page.locator(".composer textarea")
            composer.fill("我一个人来，怎么点、坐哪里？")
            composer.press("Enter")
            page.wait_for_function(
                "document.querySelectorAll('.message--assistant').length >= 2",
                timeout=90_000,
            )
            page.locator(".hk-room-arrival-button").click()
            page.wait_for_selector(".hk-save-image-button", timeout=90_000)

            styles = page.evaluate(
                """() => {
                    const read = (selector) => {
                        const element = document.querySelector(selector);
                        const style = getComputedStyle(element);
                        const rect = element.getBoundingClientRect();
                        return {
                            fontSize: parseFloat(style.fontSize),
                            height: rect.height,
                        };
                    };
                    return {
                        intro: read('.arrival-card__intro h1'),
                        body: read('.arrival-module p'),
                        badge: read('.arrival-toolbar .source-badge'),
                        print: read('.arrival-toolbar button'),
                        save: read('.hk-save-image-button'),
                    };
                }"""
            )
            assert styles["intro"]["fontSize"] <= 56, styles
            assert styles["body"]["fontSize"] >= 15, styles
            assert styles["badge"]["height"] >= 28, styles
            assert styles["print"]["height"] >= 40, styles
            assert styles["save"]["height"] >= 40, styles

            with page.expect_download(timeout=120_000) as download_info:
                page.locator(".hk-save-image-button").click()
            download = download_info.value
            download.save_as(image_path)
            page.wait_for_function(
                "document.querySelector('.hk-save-image-status')?.textContent.includes('图片已保存')",
                timeout=30_000,
            )

            assert download.failure() is None
            download_bytes = image_path.stat().st_size
            assert download_bytes > 100_000
            with Image.open(image_path) as image:
                assert image.format == "PNG"
                assert image.width >= 1400
                assert image.height >= 2000
                image_dimensions = [image.width, image.height]
                image.verify()

            mobile_layouts = {}
            for width in (390, 320):
                page.set_viewport_size({"width": width, "height": 844})
                page.wait_for_timeout(300)
                assert page.locator(".hk-save-image-button").is_visible()
                overflow = page.evaluate(
                    "document.documentElement.scrollWidth > "
                    "document.documentElement.clientWidth"
                )
                assert not overflow, width
                mobile_layouts[width] = {"overflow": overflow}
            context.close()

            owner = browser.new_page(viewport={"width": 1440, "height": 1000})
            owner.goto(
                HTML_PATH.as_uri()
                + "#/merchant/mountain/shiao/banshan-tofu?view=input",
                wait_until="load",
                timeout=120_000,
            )
            owner.wait_for_selector(".owner-fact-form", timeout=60_000)
            checkbox = owner.locator(
                '.owner-fact-form .checkbox-row input[type="checkbox"]'
            ).evaluate(
                """element => {
                    const rect = element.getBoundingClientRect();
                    return { width: rect.width, height: rect.height };
                }"""
            )
            assert 16 <= checkbox["width"] <= 20, checkbox
            assert 16 <= checkbox["height"] <= 20, checkbox
            owner.close()
            browser.close()

    result = {
        "ok": not errors,
        "download": {
            "filename": download.suggested_filename,
            "bytes": download_bytes,
            "dimensions": image_dimensions,
        },
        "styles": styles,
        "checkbox": checkbox,
        "mobile_layouts": mobile_layouts,
        "errors": errors,
    }
    print(json.dumps(result, ensure_ascii=False, indent=2))
    assert result["ok"], errors


if __name__ == "__main__":
    main()
