import { Store, UserRound } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import Seal from "./Seal";

export default function SiteHeader({ minimal = false }) {
  const location = useLocation();
  const visitorActive =
    location.pathname === "/visit" ||
    location.pathname.startsWith("/visit/") ||
    location.pathname.startsWith("/room/") ||
    location.pathname.startsWith("/card/");
  const merchantActive =
    location.pathname === "/merchant" ||
    location.pathname.startsWith("/merchant/");

  return (
    <header className={`site-header ${minimal ? "site-header--minimal" : ""}`}>
      <div className="site-header__inner">
        <Link to="/" className="brand-lockup" aria-label="返回会客厅封面">
          <Seal compact>会</Seal>
          <span className="brand-lockup__text">
            <strong>会客厅</strong>
            <small>HOMETOWN ROOM</small>
          </span>
        </Link>

        <nav className="portal-switch" aria-label="选择入口">
          <Link className={visitorActive ? "is-active" : ""} to="/visit">
            <UserRound size={15} />
            <span className="portal-label-long">我是游客</span>
            <span className="portal-label-short">游客</span>
          </Link>
          <Link className={merchantActive ? "is-active" : ""} to="/merchant">
            <Store size={15} />
            <span className="portal-label-long">我是店主</span>
            <span className="portal-label-short">店主</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
