export default function Seal({ children = "会客厅", tone = "rust", compact = false }) {
  return (
    <span className={`seal seal--${tone} ${compact ? "seal--compact" : ""}`} aria-hidden="true">
      <span>{children}</span>
    </span>
  );
}
