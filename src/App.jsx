import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { Link, Navigate, Route, Routes, useLocation, useParams } from "react-router-dom";
import SiteHeader from "./components/SiteHeader";
import { DataProvider, useData } from "./context/DataContext";
import { ErrorState, LoadingState } from "./components/LoadingState";
import HomePage from "./pages/HomePage";
import VisitorRegionsPage from "./pages/VisitorRegionsPage";
import VisitorTownsPage from "./pages/VisitorTownsPage";
import TownPage from "./pages/TownPage";
import RoomPage from "./pages/RoomPage";
import ArrivalCardPage from "./pages/ArrivalCardPage";
import MerchantEntryPage from "./pages/MerchantEntryPage";
import MerchantPage from "./pages/MerchantPage";
import { merchantPath, roomPath } from "./lib/paths";

function NotFound() {
  return (
    <main className="state-page">
      <span className="eyebrow">走错了一条巷子</span>
      <h1>这里没有会客厅。</h1>
      <Link className="text-link" to="/">
        <ArrowLeft size={16} />
        回到封面
      </Link>
    </main>
  );
}

function LegacyRoomRedirect() {
  const { shopId } = useParams();
  const { data } = useData();
  const shop = data.shops.find((item) => item.id === shopId);
  return shop ? <Navigate to={roomPath(shop)} replace /> : <NotFound />;
}

function LegacyMerchantRedirect() {
  const { shopId } = useParams();
  const { data } = useData();
  const shop = data.shops.find((item) => item.id === shopId);
  return shop ? <Navigate to={merchantPath(shop)} replace /> : <NotFound />;
}

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

function AppFrame() {
  const { data, error, loading } = useData();
  const location = useLocation();
  const productIntroHref = window.__STANDALONE_MODE__
    ? "./会客厅-Demo2.0-产品介绍.html"
    : "/product-intro.html";

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={() => window.location.reload()} />;

  return (
    <div className="app-shell">
      <SiteHeader minimal={location.pathname.startsWith("/room/")} />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/visit" element={<VisitorRegionsPage />} />
        <Route path="/visit/:regionId" element={<VisitorTownsPage />} />
        <Route path="/visit/:regionId/:townId" element={<TownPage />} />
        <Route path="/room/:townId/:shopId" element={<RoomPage />} />
        <Route path="/card/:townId/:shopId" element={<ArrivalCardPage />} />
        <Route path="/merchant" element={<MerchantEntryPage />} />
        <Route
          path="/merchant/:regionId/:townId/:shopId"
          element={<MerchantPage />}
        />
        <Route path="/room/:shopId" element={<LegacyRoomRedirect />} />
        <Route path="/merchant/:shopId" element={<LegacyMerchantRedirect />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <footer className="global-footer no-print">
        <span>虚构产品演示 · 所有地区、店铺与人物均非真实</span>
        <a href={productIntroHref} target="_blank" rel="noreferrer">
          产品介绍
        </a>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <DataProvider>
      <ScrollToTop />
      <AppFrame />
    </DataProvider>
  );
}
