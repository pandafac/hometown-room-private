export default function SourceBadge({ children, tone = "paper" }) {
  return <span className={`source-badge source-badge--${tone}`}>{children}</span>;
}
