import { ArrowLeft, LayoutDashboard, PenLine, RefreshCw, Store } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import MerchantOutputPanel from "../components/merchant/MerchantOutputPanel";
import OwnerInputPanel from "../components/merchant/OwnerInputPanel";
import { useData } from "../context/DataContext";
import { api } from "../lib/api";
import { roomPath } from "../lib/paths";
import { mergeDashboardWithLocal } from "../lib/demoState";

export default function MerchantPage() {
  const { regionId, townId, shopId } = useParams();
  const { data } = useData();
  const [searchParams, setSearchParams] = useSearchParams();
  const view = searchParams.get("view") === "output" ? "output" : "input";
  const shop = data.shops.find(
    (item) =>
      item.id === shopId &&
      item.townId === townId &&
      item.regionId === regionId,
  );
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = async () => {
    setLoading(true);
    setError("");
    try {
      const payload = await api.merchant(shopId);
      setDashboard(mergeDashboardWithLocal(payload));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setDashboard(null);
    loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId, townId, regionId]);

  if (!shop) {
    return (
      <main className="state-page">
        <span className="eyebrow">没有这间里屋</span>
        <h1>店铺不存在。</h1>
        <Link className="text-link" to="/merchant">重新选择店铺</Link>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="merchant-loading" role="status" aria-live="polite">
        <RefreshCw className="spin" size={24} />
        <span>正在整理店主资料与游客回声</span>
      </main>
    );
  }

  if (error && !dashboard) {
    return (
      <main className="state-page">
        <span className="eyebrow">工作台暂时没连上</span>
        <h1>再敲一次门。</h1>
        <p>{error}</p>
        <button className="button button--ink" type="button" onClick={loadDashboard}>
          重新加载
        </button>
      </main>
    );
  }

  const setView = (nextView) => {
    setSearchParams(nextView === "output" ? { view: "output" } : {}, {
      replace: true,
    });
  };

  return (
    <main className="merchant-workbench">
      <div className="workbench-topline">
        <div>
          <Link className="text-link" to="/merchant">
            <ArrowLeft size={15} />
            切换店铺
          </Link>
          <span>/</span>
          <span>{shop.regionName}</span>
          <span>/</span>
          <span>{shop.townName}</span>
          <span>/</span>
          <strong>{shop.name}</strong>
        </div>
        <div>
          <Link className="button button--small button--ghost" to={roomPath(shop)}>
            <Store size={15} />
            查看游客端
          </Link>
        </div>
      </div>

      <header className="workbench-header">
        <div>
          <span className="eyebrow">{shop.owner.name}的店主工作台</span>
          <h1>{shop.name}</h1>
          <p>{shop.tagline}</p>
        </div>
        <div className="workbench-header__identity">
          <span>{shop.regionName} · {shop.townName}</span>
          <strong>店主 {shop.owner.name}</strong>
          <small>资料更新于 {dashboard?.shop.lastUpdated || shop.lastUpdated}</small>
        </div>
      </header>

      <nav className="workbench-switch" aria-label="切换店主输入与输出">
        <button
          type="button"
          className={view === "input" ? "is-active" : ""}
          onClick={() => setView("input")}
        >
          <PenLine size={18} />
          <span>
            <strong>店主资料</strong>
          </span>
          <em>{dashboard?.knowledge.total || 0} 条</em>
        </button>
        <button
          type="button"
          className={view === "output" ? "is-active" : ""}
          onClick={() => setView("output")}
        >
          <LayoutDashboard size={18} />
          <span>
            <strong>游客回声</strong>
          </span>
          <em>{dashboard?.summary.conversations || 0} 次</em>
        </button>
      </nav>

      <div className="workbench-context-strip">
        <span>店主资料 {dashboard.knowledge.total} 条</span>
        <span>待补资料 {dashboard.summary.unresolved} 个</span>
      </div>

      {error ? <div className="inline-error" role="alert">{error}</div> : null}

      {view === "input" ? (
        <OwnerInputPanel
          dashboard={dashboard}
          onUpdated={(nextDashboard) => {
            setDashboard(nextDashboard);
            setError("");
          }}
        />
      ) : (
        <MerchantOutputPanel
          dashboard={dashboard}
          onSwitchInput={() => setView("input")}
        />
      )}
    </main>
  );
}
