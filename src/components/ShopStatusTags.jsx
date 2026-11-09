import {
  CircleCheck,
  Clock3,
  PackageX,
  UsersRound,
} from "lucide-react";

const kindIcons = {
  business: {
    open: CircleCheck,
    closed: Clock3,
  },
  crowd: {
    available: UsersRound,
    limited: UsersRound,
    full: UsersRound,
  },
  stock: {
    available: CircleCheck,
    partial: PackageX,
    soldout: PackageX,
  },
};

function StatusPill({ item, kind }) {
  if (!item?.label) return null;
  const Icon = kindIcons[kind]?.[item.state] || CircleCheck;
  return (
    <span className={`shop-status-tag shop-status-tag--${item.state || "neutral"}`}>
      <Icon size={13} aria-hidden="true" />
      <span>{item.label}</span>
    </span>
  );
}

export default function ShopStatusTags({
  status,
  compact = false,
  showUpdatedAt = false,
}) {
  if (!status) return null;

  return (
    <div
      className={`shop-status-tags ${compact ? "shop-status-tags--compact" : ""}`}
      aria-label="今日店铺状态"
    >
      <StatusPill item={status.business} kind="business" />
      <StatusPill item={status.crowd} kind="crowd" />
      <StatusPill item={status.stock} kind="stock" />
      {showUpdatedAt && status.updatedAt ? (
        <small className="shop-status-tags__updated">{status.updatedAt}</small>
      ) : null}
    </div>
  );
}
