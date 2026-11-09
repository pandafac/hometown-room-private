import {
  ArrowLeft,
  ArrowRight,
  Check,
  LoaderCircle,
  MessageSquareQuote,
  Printer,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Seal from "../components/Seal";
import SourceBadge from "../components/SourceBadge";
import { useData } from "../context/DataContext";
import { api } from "../lib/api";
import { merchantPath, roomPath } from "../lib/paths";
import { addLocalFeedback } from "../lib/demoState";

function readSavedCard(townId, shopId) {
  try {
    return JSON.parse(
      sessionStorage.getItem(`hometown-room-card-${townId}-${shopId}`) || "null",
    );
  } catch {
    return null;
  }
}

export default function ArrivalCardPage() {
  const { townId, shopId } = useParams();
  const { data } = useData();
  const shop = data.shops.find((item) => item.id === shopId && item.townId === townId);
  const town = data.towns.find((item) => item.id === townId);
  const saved = useMemo(() => readSavedCard(townId, shopId), [townId, shopId]);
  const card = saved?.card;
  const nextShop = card?.nextStop?.shopId
      ? data.shops.find((item) => item.id === card.nextStop.shopId)
    : null;

  const [helpful, setHelpful] = useState(true);
  const [author, setAuthor] = useState("");
  const [quote, setQuote] = useState("");
  const [consent, setConsent] = useState(true);
  const [feedbackState, setFeedbackState] = useState("idle");
  const [feedbackError, setFeedbackError] = useState("");

  if (!shop || !card) {
    return (
      <main className="state-page">
        <span className="eyebrow">这张纸还没有写</span>
        <h1>先去会客厅问一句话。</h1>
        <p>到店卡会根据本次对话生成；直接打开这个地址时，还没有可整理的内容。</p>
        <Link className="button button--ink" to={roomPath({ townId, id: shopId })}>
          回到会客厅
          <ArrowRight size={17} />
        </Link>
      </main>
    );
  }

  const submitFeedback = async (event) => {
    event.preventDefault();
    if (!consent) {
      setFeedbackError("需要同意匿名展示，才能把这句话交给店主。");
      return;
    }
    setFeedbackError("");
    setFeedbackState("loading");
    try {
      const response = await api.feedback({
        shopId,
        sessionId: saved.sessionId,
        helpful,
        author,
        quote,
        consent,
      });
      addLocalFeedback(shopId, response.feedback);
      setFeedbackState("done");
    } catch (error) {
      setFeedbackState("idle");
      setFeedbackError(error.message);
    }
  };

  return (
    <main className="arrival-page">
      <div className="arrival-toolbar no-print">
        <Link className="text-link" to={roomPath(shop)}>
          <ArrowLeft size={16} />
          回到这次对话
        </Link>
        <div>
          <SourceBadge tone="teal">
            {saved.generatedBy === "ai" ? "DeepSeek 整理" : "店主资料整理"}
          </SourceBadge>
          <button className="button button--small button--ink" type="button" onClick={() => window.print()}>
            <Printer size={16} />
            打印 / 保存 PDF
          </button>
        </div>
      </div>

      <section className="arrival-layout">
        <article className={`arrival-card arrival-card--${shop.accent}`}>
          <header className="arrival-card__header">
            <div className="arrival-card__identity">
              <Seal tone={shop.accent}>{shop.stamp}</Seal>
              <div>
                <span className="small-caps">FIRST VISIT CARD · {shop.number}</span>
                <strong>{card.headline}</strong>
              </div>
            </div>
            <div className="arrival-card__place">
              <span>{town?.place.name || shop.townName}</span>
              <small>{town?.place.seasonLabel}</small>
            </div>
          </header>

          <div className="arrival-card__intro">
            <span>{shop.name}</span>
            <h1>{card.summary}</h1>
          </div>

          <div className="arrival-grid">
            <section className="arrival-module arrival-module--wide">
              <span className="module-number">01</span>
              <div>
                <h2>{card.order.title}</h2>
                <p>{card.order.detail}</p>
              </div>
            </section>
            <section className="arrival-module">
              <span className="module-number">02</span>
              <div>
                <h2>{card.seat.title}</h2>
                <p>{card.seat.detail}</p>
              </div>
            </section>
            <section className="arrival-module">
              <span className="module-number">03</span>
              <div>
                <h2>{card.askOwner.title}</h2>
                <p>{card.askOwner.detail}</p>
              </div>
            </section>
            <section className="phrase-card">
              <span>进门可以说的一句</span>
              <strong>{card.phrase.phrase}</strong>
              <p>{card.phrase.meaning}</p>
            </section>
            <section className="arrival-module">
              <span className="module-number">04</span>
              <div>
                <h2>{card.avoid.title}</h2>
                <p>{card.avoid.detail}</p>
              </div>
            </section>
          </div>

          <section className="next-stop">
            <div>
              <span className="eyebrow">吃完、坐完，再慢慢走</span>
              <h2>{card.nextStop.title}</h2>
              <p>{card.nextStop.detail}</p>
            </div>
            <div className="next-stop__action">
              <Seal tone={nextShop?.accent || "teal"} compact>
                {nextShop?.stamp || "去"}
              </Seal>
              {nextShop ? (
                <Link className="round-link" to={roomPath(nextShop)} aria-label={`进入${nextShop.name}会客厅`}>
                  <ArrowRight size={20} />
                </Link>
              ) : null}
            </div>
          </section>

          <footer className="arrival-card__footer">
            <div>
              <span>店主资料版本</span>
              <strong>{shop.lastUpdated}</strong>
            </div>
            <p>{card.sourceNote}</p>
          </footer>
        </article>

        <aside className="feedback-panel no-print">
          <div className="feedback-panel__eyebrow">
            <MessageSquareQuote size={18} />
            <span>留一句体验回声</span>
          </div>
          <h2>这张卡，有没有让你更知道<br />接下来该怎么做？</h2>
          <p>
            这句话会匿名出现在店主回声板，帮助下一位游客，也帮助店主知道哪里还没有讲明白。
          </p>

          {feedbackState === "done" ? (
            <div className="feedback-success" role="status">
              <span className="success-mark">
                <Check size={20} />
              </span>
              <h3>回声已经交给店家。</h3>
              <Link className="text-link" to={merchantPath(shop)}>
                去店家的回声板看看
                <ArrowRight size={16} />
              </Link>
            </div>
          ) : (
            <form className="feedback-form" onSubmit={submitFeedback}>
              <fieldset>
                <legend>这次有没有帮到你？</legend>
                <div className="choice-pair">
                  <button
                    type="button"
                    className={helpful ? "is-selected" : ""}
                    onClick={() => setHelpful(true)}
                  >
                    有帮助
                  </button>
                  <button
                    type="button"
                    className={!helpful ? "is-selected" : ""}
                    onClick={() => setHelpful(false)}
                  >
                    还不太确定
                  </button>
                </div>
              </fieldset>
              <label>
                <span>怎么称呼你</span>
                <input
                  type="text"
                  value={author}
                  onChange={(event) => setAuthor(event.target.value)}
                  placeholder="可以留空，显示为匿名旅人"
                  maxLength={20}
                />
              </label>
              <label>
                <span>哪一句最有用？</span>
                <textarea
                  value={quote}
                  onChange={(event) => setQuote(event.target.value)}
                  placeholder="比如：知道吧台可以一个人坐，我才敢进去。"
                  maxLength={180}
                  rows={4}
                />
                <small>{quote.length}/180</small>
              </label>
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(event) => setConsent(event.target.checked)}
                />
                <span>同意匿名展示这段体验，不包含联系方式。</span>
              </label>
              {feedbackError ? (
                <p className="form-error" role="alert">
                  {feedbackError}
                </p>
              ) : null}
              <button className="button button--rust button--full" type="submit" disabled={feedbackState === "loading"}>
                {feedbackState === "loading" ? <LoaderCircle className="spin" size={17} /> : null}
                留下体验回声
              </button>
            </form>
          )}
        </aside>
      </section>
    </main>
  );
}
