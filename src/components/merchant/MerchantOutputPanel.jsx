import {
  ArrowRight,
  Check,
  Clipboard,
  Clock3,
  LoaderCircle,
  PenLine,
  Sparkles,
} from "lucide-react";
import { useMemo, useState } from "react";
import SourceBadge from "../SourceBadge";
import { api } from "../../lib/api";
import { getLocalFacts } from "../../lib/demoState";

function Metric({ label, value, suffix }) {
  return (
    <article className="metric-card">
      <span>{label}</span>
      <strong>
        {value}
        <small>{suffix}</small>
      </strong>
    </article>
  );
}

export default function MerchantOutputPanel({ dashboard, onSwitchInput }) {
  const [generatingSeed, setGeneratingSeed] = useState("");
  const [generatedContent, setGeneratedContent] = useState(null);
  const [contentMode, setContentMode] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const maxQuestionCount = useMemo(
    () => Math.max(...dashboard.questionClusters.map((item) => item.count), 1),
    [dashboard.questionClusters],
  );
  const openGaps = dashboard.gaps.filter((gap) => gap.status === "open");

  const generateContent = async (seed) => {
    setGeneratingSeed(seed.id);
    setGeneratedContent(null);
    setError("");
    try {
      const result = await api.content({
        shopId: dashboard.shop.id,
        seedId: seed.id,
        additionalFacts: getLocalFacts(dashboard.shop.id),
      });
      setGeneratedContent(result.content);
      setContentMode(result.mode);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setGeneratingSeed("");
    }
  };

  const copyContent = async () => {
    if (!generatedContent) return;
    const text = `${generatedContent.title}\n\n${generatedContent.body}\n\n${generatedContent.cta}\n\n${generatedContent.sourceNote}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setError("浏览器没有允许复制，请手动选择文本。");
    }
  };

  return (
    <div className="merchant-output-view">
      <section className="merchant-summary">
        <div className="merchant-summary__identity">
          <span>{dashboard.period}</span>
          <h2>{dashboard.shop.name}</h2>
          <p>
            店主 {dashboard.shop.owner.name} · 资料更新于 {dashboard.shop.lastUpdated}
          </p>
          <button className="text-link plain-button" type="button" onClick={onSwitchInput}>
            回到店主资料输入
            <ArrowRight size={15} />
          </button>
        </div>
        <div className="metric-grid">
          <Metric
            label="这段日子有人来问"
            value={dashboard.summary.conversations}
            suffix="次"
          />
          <Metric
            label="带走一张到店卡"
            value={dashboard.summary.arrivalCards}
            suffix="张"
          />
          <Metric
            label="体验回声有帮助"
            value={dashboard.summary.helpfulRate}
            suffix="%"
          />
          <Metric
            label="还等你补一句"
            value={dashboard.summary.unresolved}
            suffix="个"
          />
        </div>
      </section>

      {error ? <div className="inline-error" role="alert">{error}</div> : null}

      <div className="merchant-dashboard-grid">
        <section className="merchant-panel question-panel">
          <header className="panel-heading">
            <div>
              <span className="eyebrow">游客问题</span>
              <h2>问题不是噪声，是需求排期。</h2>
            </div>
            <span className="panel-index">A</span>
          </header>
          <div className="question-bars">
            {dashboard.questionClusters.map((cluster) => (
              <article key={cluster.label} className="question-row">
                <div className="question-row__top">
                  <strong>{cluster.label}</strong>
                  <span>
                    {cluster.count} 次
                    {cluster.trend ? (
                      <small className={cluster.trend > 0 ? "trend-up" : "trend-down"}>
                        {cluster.trend > 0 ? `+${cluster.trend}` : cluster.trend}
                      </small>
                    ) : null}
                  </span>
                </div>
                <div className="question-bar" aria-hidden="true">
                  <i style={{ width: `${Math.max(8, (cluster.count / maxQuestionCount) * 100)}%` }} />
                </div>
                <p>“{cluster.example}”</p>
              </article>
            ))}
          </div>

          <div className="recent-feed">
            <div className="subsection-title">
              <span>刚刚发生在会客厅</span>
              <small>只显示问题主题与时间</small>
            </div>
            {dashboard.recentQuestions?.length ? (
              dashboard.recentQuestions.slice(0, 5).map((question) => (
                <div className="recent-question" key={question.id}>
                  <span className={`coverage-dot coverage-dot--${question.coverage}`} />
                  <div>
                    <strong>{question.intent}</strong>
                    <p>“{question.text}”</p>
                  </div>
                  <time>
                    {new Date(question.createdAt).toLocaleTimeString("zh-CN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </time>
                </div>
              ))
            ) : (
              <div className="empty-live">
                <Clock3 size={18} />
                <p>还没有本次新对话。去游客入口问一个问题，再回来就会出现在这里。</p>
              </div>
            )}
          </div>
        </section>

        <section className="merchant-panel gap-output-panel">
          <header className="panel-heading">
            <div>
              <span className="eyebrow">待补资料</span>
              <h2>AI 停下来问你的问题。</h2>
            </div>
            <span className="panel-index">B</span>
          </header>
          <div className="gap-output-list">
            {openGaps.length ? (
              openGaps.map((gap) => (
                <article key={gap.id}>
                  <div>
                    <span>{gap.category}</span>
                    <strong>“{gap.question}”</strong>
                    <p>{gap.exampleContext}</p>
                  </div>
                  <span className="gap-output-count">{gap.occurrences} 次</span>
                </article>
              ))
            ) : (
              <div className="gap-all-clear">
                <Check size={20} />
                <p>当前没有待补充问题。</p>
              </div>
            )}
            <button className="button button--rust button--full" type="button" onClick={onSwitchInput}>
              <PenLine size={16} />
              去店主资料里补充
            </button>
          </div>
        </section>
      </div>

      <section className="merchant-panel feedback-board">
        <header className="panel-heading panel-heading--row">
          <div>
            <span className="eyebrow">体验回声</span>
            <h2>用过的人，真正被哪一句帮到？</h2>
          </div>
        </header>
        <div className="feedback-grid">
          {dashboard.feedback.slice(0, 6).map((feedback, index) => (
            <article className={`feedback-quote ${feedback.live ? "feedback-quote--live" : ""}`} key={`${feedback.author}-${index}`}>
              <span className="feedback-quote__number">{String(index + 1).padStart(2, "0")}</span>
              <p>“{feedback.quote}”</p>
              <footer>
                <strong>{feedback.author}</strong>
                <SourceBadge tone={feedback.live ? "rust" : "paper"}>{feedback.tag}</SourceBadge>
              </footer>
            </article>
          ))}
        </div>
      </section>

      <section className="merchant-panel content-studio">
        <header className="panel-heading">
          <div>
            <span className="eyebrow">内容工坊</span>
            <h2>从游客真正问过的问题里，长出一条内容。</h2>
          </div>
          <span className="panel-index">C</span>
        </header>

        <div className="content-seed-grid">
          {dashboard.contentSeeds.map((seed) => (
            <article className="content-seed" key={seed.id}>
              <span>{seed.type}</span>
              <h3>{seed.title}</h3>
              <p>{seed.angle}</p>
              <div className="content-seed__sources">
                {seed.sourceQuestions.map((question) => (
                  <SourceBadge key={question}>{question}</SourceBadge>
                ))}
              </div>
              <button
                className="button button--ink button--full"
                type="button"
                onClick={() => generateContent(seed)}
                disabled={Boolean(generatingSeed)}
              >
                {generatingSeed === seed.id ? (
                  <LoaderCircle className="spin" size={16} />
                ) : (
                  <Sparkles size={16} />
                )}
                用 DeepSeek 生成
              </button>
            </article>
          ))}
        </div>

        {generatedContent ? (
          <div className="content-result" aria-live="polite">
            <header>
              <div>
                <span className="eyebrow">{generatedContent.format}</span>
                <h3>{generatedContent.title}</h3>
              </div>
              <div className="content-result__actions">
                <SourceBadge tone="teal">
                  {contentMode === "ai" ? "AI 生成" : "资料摘要"}
                </SourceBadge>
                <button className="button button--small button--ghost" type="button" onClick={copyContent}>
                  {copied ? <Check size={15} /> : <Clipboard size={15} />}
                  {copied ? "已复制" : "复制全文"}
                </button>
              </div>
            </header>
            <div className="content-result__body">{generatedContent.body}</div>
            <div className="content-result__cta">
              <span>可使用的一句话</span>
              <p>{generatedContent.cta}</p>
            </div>
            <footer>{generatedContent.sourceNote}</footer>
          </div>
        ) : null}
      </section>
    </div>
  );
}
