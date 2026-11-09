import dotenv from "dotenv";

dotenv.config({ path: ".env.local", quiet: true });
dotenv.config({ quiet: true });

const apiKey = process.env.DEEPSEEK_API_KEY;
const baseUrl = (process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com").replace(/\/$/, "");
const model = process.env.DEEPSEEK_MODEL || "deepseek-flash";

export function getAIConfig() {
  return {
    configured: Boolean(apiKey),
    model,
    endpoint: `${baseUrl}/chat/completions`,
  };
}

export async function callDeepSeek({ messages, temperature = 0.35, maxTokens = 1400 }) {
  if (!apiKey) {
    throw new Error("DEEPSEEK_API_KEY is not configured");
  }

  let lastError;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);
    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: attempt === 0 ? temperature : Math.min(temperature, 0.18),
          max_tokens: maxTokens,
          response_format: { type: "json_object" },
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`DeepSeek API ${response.status}: ${body.slice(0, 300)}`);
      }

      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error("DeepSeek returned an empty response");
      }

      return parseJSON(content);
    } catch (error) {
      lastError = error;
      const retryable = /empty response|Unable to parse JSON/i.test(error.message);
      if (!retryable || attempt === 1) throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastError;
}

function parseJSON(content) {
  if (typeof content !== "string") {
    return content;
  }

  const trimmed = content.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
    if (fenced) {
      return JSON.parse(fenced);
    }
    const first = trimmed.indexOf("{");
    const last = trimmed.lastIndexOf("}");
    if (first >= 0 && last > first) {
      return JSON.parse(trimmed.slice(first, last + 1));
    }
    throw new Error("Unable to parse JSON returned by DeepSeek");
  }
}
