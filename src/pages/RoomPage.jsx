import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  CircleAlert,
  Clock3,
  LoaderCircle,
  MapPin,
  RotateCcw,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import Seal from "../components/Seal";
import ShopStatusTags from "../components/ShopStatusTags";
import SourceBadge from "../components/SourceBadge";
import { useData } from "../context/DataContext";
import { api } from "../lib/api";
import { cardPath, townPath } from "../lib/paths";
import { addLocalQuestion, getLocalFacts } from "../lib/demoState";

function newSessionId(townId, shopId) {
  const key = `hometown-room-session-${townId}-${shopId}`;
  const existing = sessionStorage.getItem(key);
  if (existing) return existing;
  const created = `session-${shopId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  sessionStorage.setItem(key, created);
  return created;
}

function initialSuggestions(shop) {
  return [
    "我一个人来，应该坐哪里？",
    "第一次来怎么点？",
    shop.ownerQuestions[0],
    "先做什么、后做什么？",
  ];
}

export default function RoomPage() {
  const { townId, shopId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { data } = useData();
  const shop = data.shops.find((item) => item.id === shopId && item.townId === townId);
  const town = data.towns.find((item) => item.id === townId);
  const [sessionId] = useState(() => newSessionId(townId, shopId));
  const [messages, setMessages] = useState(() => [
    {
      id: "welcome",
      role: "assistant",
      content: shop
        ? `你好，我是${shop.name}的 AI 接待员。回答来自店主${shop.owner.name}确认的资料。今天想先问什么？`
        : "",
      meta: { followups: shop ? initialSuggestions(shop) : [] },
    },
  ]);
  const [draft, setDraft] = useState(searchParams.get("prompt") || "");
  const [suggestions, setSuggestions] = useState(shop ? initialSuggestions(shop) : []);
  const [isThinking, setIsThinking] = useState(false);
  const [isCardLoading, setIsCardLoading] = useState(false);
  const [error, setError] = useState("");
  const feedRef = useRef(null);
  const inputRef = useRef(null);

  const questionsAsked = useMemo(
    () => messages.filter((message) => message.role === "user"),
    [messages],
  );
  const topics = useMemo(
    () => [
      ...new Set(
        messages
        .filter((message) => message.role === "assistant" && message.meta?.intent)
        .map((message) => message.meta.intent)
        .slice(-6),
      ),
    ].slice(-4),
    [messages],
  );

  useEffect(() => {
    const feed = feedRef.current;
    if (feed) {
      feed.scrollTop = feed.scrollHeight;
    }
  }, [messages, isThinking]);

  if (!shop) {
    return (
      <main className="state-page">
        <span className="eyebrow">没有找到这扇门</span>
        <h1>会客厅不存在。</h1>
        <Link className="text-link" to="/">
          <ArrowLeft size={16} />
          回到云溪镇
        </Link>
      </main>
    );
  }

  const sendMessage = async (rawText) => {
    const text = rawText.trim();
    if (!text || isThinking) return;
    setError("");
    const userMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
    };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setDraft("");
    setIsThinking(true);

    try {
      const result = await api.chat({
        shopId,
        sessionId,
        additionalFacts: getLocalFacts(shopId),
        messages: nextMessages.map(({ role, content }) => ({ role, content })),
      });
      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: result.reply,
          meta: {
            intent: result.intent,
            covered: result.covered,
            gapQuestion: result.gapQuestion,
            factRefs: result.factRefs,
            followups: result.followups,
            mode: result.mode,
          },
        },
      ]);
      addLocalQuestion(shopId, {
        id: `local-question-${Date.now()}`,
        shopId,
        text,
        intent: result.intent,
        coverage: result.covered,
        createdAt: new Date().toISOString(),
      });
      setSuggestions(result.followups?.length ? result.followups : initialSuggestions(shop));
    } catch (requestError) {
      setError(requestError.message);
      setMessages((current) => current.filter((message) => message.id !== userMessage.id));
      setDraft(text);
    } finally {
      setIsThinking(false);
    }
  };

  const makeArrivalCard = async () => {
    if (!questionsAsked.length || isCardLoading) return;
    setIsCardLoading(true);
    setError("");
    try {
      const result = await api.arrivalCard({
        shopId,
        sessionId,
        additionalFacts: getLocalFacts(shopId),
        messages: messages.map(({ role, content }) => ({ role, content })),
      });
      sessionStorage.setItem(
        `hometown-room-card-${townId}-${shopId}`,
        JSON.stringify({
          card: result.card,
          generatedBy: result.mode,
          createdAt: new Date().toISOString(),
          sessionId,
          conversation: messages.map(({ role, content }) => ({ role, content })),
        }),
      );
      navigate(cardPath(shop));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsCardLoading(false);
    }
  };

  const resetConversation = () => {
    if (isThinking) return;
    const sessionKey = `hometown-room-session-${townId}-${shopId}`;
    sessionStorage.removeItem(sessionKey);
    sessionStorage.removeItem(`hometown-room-card-${townId}-${shopId}`);
    window.location.reload();
  };

  return (
    <main className="room-page">
      <div className="room-breadcrumb">
        <Link to={townPath(shop.regionId, shop.townId)}>
          <ArrowLeft size={15} />
          {town?.name || shop.townName}
        </Link>
        <span>/</span>
        <span>{shop.regionName}</span>
        <span>/</span>
        <span>{shop.area}</span>
        <span>/</span>
        <strong>{shop.name}</strong>
        <button className="plain-button room-reset" type="button" onClick={resetConversation}>
          <RotateCcw size={14} />
          重开本次对话
        </button>
      </div>

      <div className="room-grid">
        <aside className="room-context">
          <div className={`room-context__cover room-context__cover--${shop.accent}`}>
            <div className="room-context__cover-top">
              <span>{shop.number}</span>
              <Seal tone={shop.accent}>{shop.stamp}</Seal>
            </div>
            <span className="small-caps">{shop.englishName}</span>
            <h1>{shop.name}</h1>
            <p>{shop.tagline}</p>
            <div className="ink-rule" />
            <blockquote>“{shop.storyQuote.replaceAll("“", "").replaceAll("”", "")}”</blockquote>
            <small>店主 {shop.owner.name} · {shop.owner.since}</small>
          </div>

          <div className="room-context__facts">
            <div className="room-context__status">
              <div className="room-context__status-heading">
                <span>今日状态</span>
                {shop.liveStatus?.updatedAt ? <small>{shop.liveStatus.updatedAt}</small> : null}
              </div>
              <ShopStatusTags status={shop.liveStatus} compact />
            </div>
            <div>
              <Clock3 size={15} />
              <span>
                <small>店主提供的营业时间</small>
                {shop.hours.display}
              </span>
            </div>
            <div>
              <MapPin size={15} />
              <span>
                <small>走到这里</small>
                {shop.address}
              </span>
            </div>
          </div>

          <div className="ai-boundary-note">
            <CircleAlert size={17} />
            <p>
              由店主资料生成，不代替店主承诺；现场安排以店铺当天说明为准。
            </p>
          </div>

          <button
            className="card-callout"
            type="button"
            disabled={!questionsAsked.length || isCardLoading}
            onClick={makeArrivalCard}
          >
            <span className="card-callout__top">
              <span>第一次到店卡</span>
              {isCardLoading ? (
                <LoaderCircle className="spin" size={18} />
              ) : (
                <ArrowRight size={18} />
              )}
            </span>
            <strong>{questionsAsked.length ? "把这次对话带走" : "先问一个问题"}</strong>
            <small>
              {questionsAsked.length
                ? "整理成怎么点、怎么坐、进门说什么。"
                : "至少问一件事，才能整理出你的到店卡。"}
            </small>
          </button>
        </aside>

        <section className="chat-panel" aria-label={`${shop.name} AI 会客厅`}>
          <header className="chat-panel__header">
            <div>
              <span className={`status-dot ${isThinking ? "status-dot--busy" : ""}`} />
              <div>
                <strong>{shop.owner.name}的资料会客厅</strong>
                <small>AI 接待员</small>
              </div>
            </div>
          </header>

          <div className="chat-feed" ref={feedRef} aria-live="polite">
            <div className="chat-date-mark">
              <span>今天 · 第一次见面</span>
            </div>

            {messages.map((message) => (
              <article
                key={message.id}
                className={`message message--${message.role}`}
              >
                {message.role === "assistant" ? (
                  <Seal compact tone={shop.accent}>
                    会
                  </Seal>
                ) : null}
                <div className="message__body">
                  <div className="message__label">
                    {message.role === "assistant" ? "AI 接待员" : "你"}
                  </div>
                  <div className="message__bubble">
                    {message.content}
                  </div>
                  {message.meta?.sourceBadge ? (
                    <div className="message__sources">
                      <SourceBadge tone="paper">{message.meta.sourceBadge}</SourceBadge>
                    </div>
                  ) : null}
                  {message.meta?.factRefs?.length ? (
                    <div className="message__sources">
                      <span>依据</span>
                      {message.meta.factRefs.map((ref) => (
                        <SourceBadge key={ref}>{ref}</SourceBadge>
                      ))}
                      {message.meta.covered === "missing" ? (
                        <SourceBadge tone="rust">资料缺口</SourceBadge>
                      ) : null}
                    </div>
                  ) : null}
                  {message.meta?.gapQuestion ? (
                    <div className="gap-detected">
                      <span>这个问题会留给店主</span>
                      <p>{message.meta.gapQuestion}</p>
                    </div>
                  ) : null}
                </div>
              </article>
            ))}

            {isThinking ? (
              <article className="message message--assistant">
                <Seal compact tone={shop.accent}>会</Seal>
                <div className="message__body">
                  <div className="message__label">AI 接待员</div>
                  <div className="thinking-bubble" role="status">
                    <span />
                    <span />
                    <span />
                    <em>正在翻店主资料</em>
                  </div>
                </div>
              </article>
            ) : null}

            {error ? (
              <div className="inline-error" role="alert">
                <CircleAlert size={17} />
                <span>{error} 当前会客厅仍会尝试使用本地资料回答。</span>
              </div>
            ) : null}
          </div>

          <div className="chat-panel__composer">
            {suggestions.length ? (
              <div className="suggestion-row" aria-label="建议追问">
                {suggestions.slice(0, 3).map((suggestion) => (
                  <button
                    type="button"
                    key={suggestion}
                    onClick={() => sendMessage(suggestion)}
                    disabled={isThinking}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            ) : null}
            <form
              className="composer"
              onSubmit={(event) => {
                event.preventDefault();
                sendMessage(draft);
              }}
            >
              <textarea
                ref={inputRef}
                rows="1"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    sendMessage(draft);
                  }
                }}
                placeholder="比如：我一个人，下午想安静坐一会儿，怎么安排？"
                aria-label="向 AI 接待员提问"
              />
              <button
                className="send-button"
                type="submit"
                disabled={!draft.trim() || isThinking}
                aria-label="发送问题"
              >
                {isThinking ? <LoaderCircle className="spin" size={19} /> : <ArrowUp size={19} />}
              </button>
            </form>
            <div className="composer__footer">
              <span>“店主提供”表示内容来自店铺资料</span>
              <span>{topics.length ? `已聊：${topics.join(" · ")}` : "先从一件具体的小事问起"}</span>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
