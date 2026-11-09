from pathlib import Path
import json
from playwright.sync_api import sync_playwright


root = Path(__file__).resolve().parents[1]
html_path = root / "outputs" / "会客厅Demo 5.0.html"

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()
    page.goto(html_path.as_uri() + "#/room/yunxi/qiaoxi-tea", wait_until="load", timeout=120_000)
    page.wait_for_selector(".chat-panel", timeout=60_000)
    result = page.evaluate(
        """async () => {
            const key = window.__DEEPSEEK_API_KEY__;
            const base = window.__DEEPSEEK_BASE_URL__ || 'https://api.deepseek.com';
            const model = window.__DEEPSEEK_MODEL__ || 'deepseek-flash';
            const knowledgeCounts = Object.fromEntries(
                (window.__STANDALONE_WORLD__?.data?.shops || []).map((shop) => [
                    shop.id,
                    shop.knowledgeBase?.length || 0
                ])
            );
            try {
                const response = await fetch(`${base}/chat/completions`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${key}`
                    },
                    body: JSON.stringify({
                        model,
                        messages: [{ role: 'user', content: '只回复两个字：成功' }],
                        temperature: 0,
                        max_tokens: 600
                    })
                });
                const text = await response.text();
                return {
                    ok: response.ok,
                    status: response.status,
                    model,
                    hasKey: Boolean(key),
                    fetchGuardInstalled: window.fetch.__hkCompositeIntentGuard === true,
                    knowledgeCounts,
                    body: text.slice(0, 800)
                };
            } catch (error) {
                return {
                    ok: false,
                    error: String(error),
                    model,
                    hasKey: Boolean(key),
                    fetchGuardInstalled: window.fetch.__hkCompositeIntentGuard === true,
                    knowledgeCounts
                };
            }
        }"""
    )
    print(json.dumps(result, ensure_ascii=False, indent=2))
    browser.close()
