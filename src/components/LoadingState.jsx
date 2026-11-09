import Seal from "./Seal";

export function LoadingState({ label = "正在翻开地方资料" }) {
  return (
    <div className="state-page" role="status" aria-live="polite">
      <Seal compact>等</Seal>
      <p>{label}</p>
      <span className="loading-rule" />
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <div className="state-page" role="alert">
      <span className="eyebrow">资料暂时没有送到</span>
      <h1>会客厅还没开门。</h1>
      <p>{error || "请确认 API 服务已经启动。"}</p>
      {onRetry ? (
        <button className="button button--ink" type="button" onClick={onRetry}>
          再试一次
        </button>
      ) : null}
    </div>
  );
}
