import {
  Check,
  ChevronRight,
  CircleAlert,
  Database,
  LoaderCircle,
  PenLine,
  Plus,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";
import { addLocalFact, mergeDashboardWithLocal } from "../../lib/demoState";

const fallbackCategories = [
  "位置与到达",
  "营业与高峰",
  "点单与菜单",
  "座位与空间",
  "设施与便利",
  "礼仪与摄影",
  "支付与打包",
  "亲子与无障碍",
  "边界与安全",
  "新增资料",
];

export default function OwnerInputPanel({ dashboard, onUpdated }) {
  const openGaps = dashboard.gaps.filter((gap) => gap.status === "open");
  const categoryOptions = useMemo(() => {
    const current = dashboard.knowledge.categories.map((item) => item.category);
    const gaps = dashboard.gaps.map((item) => item.category);
    return [...new Set([...fallbackCategories, ...current, ...gaps])];
  }, [dashboard.knowledge.categories, dashboard.gaps]);
  const [activeGapId, setActiveGapId] = useState(openGaps[0]?.id || "");
  const [form, setForm] = useState({
    category: openGaps[0]?.category || "新增资料",
    question: openGaps[0]?.question || "",
    answer: "",
    confirmedByOwner: false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedFact, setSavedFact] = useState(null);

  useEffect(() => {
    const firstGap = dashboard.gaps.find((gap) => gap.status === "open");
    setActiveGapId(firstGap?.id || "");
    setForm({
      category: firstGap?.category || "新增资料",
      question: firstGap?.question || "",
      answer: "",
      confirmedByOwner: false,
    });
    setSavedFact(null);
  }, [dashboard.shop.id]);

  const chooseGap = (gap) => {
    setActiveGapId(gap.id);
    setForm((current) => ({
      ...current,
      category: gap.category,
      question: gap.question,
      answer: "",
    }));
    setSavedFact(null);
  };

  const resetToCustom = () => {
    setActiveGapId("");
    setForm({
      category: "新增资料",
      question: "",
      answer: "",
      confirmedByOwner: false,
    });
    setSavedFact(null);
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (!form.question.trim() || !form.answer.trim()) {
      setError("请把问题和店主回答都写清楚。");
      return;
    }
    if (!form.confirmedByOwner) {
      setError("需要确认这条内容由店主本人提供或授权。");
      return;
    }

    setSaving(true);
    try {
      const result = activeGapId
        ? await api.answerGap(activeGapId, {
            shopId: dashboard.shop.id,
            answer: form.answer.trim(),
          })
        : await api.addFact(dashboard.shop.id, {
            category: form.category,
            question: form.question.trim(),
            answer: form.answer.trim(),
            confirmedByOwner: true,
          });
      addLocalFact(dashboard.shop.id, result.fact);
      setSavedFact(result.fact);
      setForm({
        category: "新增资料",
        question: "",
        answer: "",
        confirmedByOwner: false,
      });
      setActiveGapId("");
      onUpdated(mergeDashboardWithLocal(result.dashboard));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="owner-input-view">
      <section className="knowledge-overview">
        <div className="knowledge-overview__copy">
          <span className="eyebrow">店主资料</span>
          <h2>AI 只能读你确认过的内容。</h2>
          <p>
            补充游客可能问到的设施、礼仪和规则。
          </p>
        </div>
        <div className="knowledge-score">
          <span>资料完整度</span>
          <strong>{dashboard.knowledge.completeness}<small>%</small></strong>
          <div className="knowledge-score__track">
            <i style={{ width: `${dashboard.knowledge.completeness}%` }} />
          </div>
          <p>
            <Database size={14} />
            已读 {dashboard.knowledge.total} 条资料
          </p>
        </div>
      </section>

      <div className="owner-input-grid">
        <section className="knowledge-inventory">
          <header>
            <div>
              <span className="eyebrow">当前资料目录</span>
              <h3>会客厅已经知道什么？</h3>
            </div>
          </header>

          <div className="knowledge-categories">
            {dashboard.knowledge.categories.map((item) => (
              <span key={item.category}>
                {item.category}
                <strong>{item.count}</strong>
              </span>
            ))}
          </div>

          <div className="knowledge-recent">
            <div className="subsection-title">
              <span>最近确认的资料</span>
              <small>只显示问题与回答摘要</small>
            </div>
            {dashboard.knowledge.recent.map((fact) => (
              <article key={fact.id}>
                <span>{fact.category}</span>
                <div>
                  <strong>{fact.question}</strong>
                  <p>{fact.answer}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="owner-fact-editor">
          <header>
            <div>
              <span className="eyebrow">新增一条资料</span>
              <h3>{activeGapId ? "回答游客留下的问题" : "补充一条店主知识"}</h3>
            </div>
            {activeGapId ? (
              <button className="plain-button owner-editor-reset" type="button" onClick={resetToCustom}>
                改成自由录入
              </button>
            ) : (
              <PenLine size={19} />
            )}
          </header>

          {openGaps.length ? (
            <div className="owner-gap-suggestions">
              <span>待补问题</span>
              {openGaps.map((gap) => (
                <button
                  key={gap.id}
                  type="button"
                  className={activeGapId === gap.id ? "is-active" : ""}
                  onClick={() => chooseGap(gap)}
                >
                  <div>
                    <strong>{gap.category}</strong>
                    <p>{gap.question}</p>
                  </div>
                  <span>{gap.occurrences} 次</span>
                  <ChevronRight size={15} />
                </button>
              ))}
            </div>
          ) : null}

          <form className="owner-fact-form" onSubmit={submit}>
            <label>
              <span>资料分类</span>
              <select
                value={form.category}
                onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
                disabled={Boolean(activeGapId)}
              >
                {categoryOptions.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </label>
            <label>
              <span>游客可能会怎么问</span>
              <input
                type="text"
                value={form.question}
                onChange={(event) => setForm((current) => ({ ...current, question: event.target.value }))}
                placeholder="例如：店里有手机支架吗？"
                disabled={Boolean(activeGapId)}
                maxLength={180}
              />
            </label>
            <label>
              <span>店主确认的回答</span>
              <textarea
                rows={5}
                value={form.answer}
                onChange={(event) => setForm((current) => ({ ...current, answer: event.target.value }))}
                placeholder="例如：没有公用手机支架，也不外借私人物品；可以正常看手机，视频通话请到门外。"
                maxLength={500}
              />
            </label>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={form.confirmedByOwner}
                onChange={(event) => setForm((current) => ({ ...current, confirmedByOwner: event.target.checked }))}
              />
              <span>我确认这条内容来自店主本人或授权资料。</span>
            </label>
            {error ? (
              <p className="form-error" role="alert">
                <CircleAlert size={14} />
                {error}
              </p>
            ) : null}
            {savedFact ? (
              <div className="owner-fact-success" role="status">
                <span className="success-mark"><Check size={18} /></span>
                <div>
                  <strong>这条资料已经进入 AI 上下文。</strong>
                  <p>下一位游客问到时，会客厅会引用“店主补充”。</p>
                </div>
              </div>
            ) : null}
            <div className="owner-fact-form__footer">
              <button className="button button--ghost button--small" type="button" onClick={resetToCustom}>
                <Plus size={14} />
                从空白填写
              </button>
              <button className="button button--rust" type="submit" disabled={saving}>
                {saving ? <LoaderCircle className="spin" size={16} /> : <PenLine size={16} />}
                写入店主资料
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
