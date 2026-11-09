import {
  ArrowRight,
  BookOpenText,
  LayoutDashboard,
  PenLine,
  ShieldCheck,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Seal from "../components/Seal";
import { useData } from "../context/DataContext";
import { merchantPath } from "../lib/paths";

export default function MerchantEntryPage() {
  const { data } = useData();
  const navigate = useNavigate();
  const openRegions = data.regions.filter((region) => region.status === "open");
  const [regionId, setRegionId] = useState(openRegions[0]?.id || "");
  const [townId, setTownId] = useState(
    openRegions[0]?.towns.find((town) => town.status === "open")?.id || "",
  );
  const [shopId, setShopId] = useState(
    data.shops.find(
      (shop) =>
        shop.regionId === openRegions[0]?.id &&
        shop.townId === openRegions[0]?.towns.find((town) => town.status === "open")?.id,
    )?.id || "",
  );

  const towns = useMemo(
    () => data.regions.find((region) => region.id === regionId)?.towns || [],
    [data.regions, regionId],
  );
  const shops = useMemo(
    () => data.shops.filter((shop) => shop.regionId === regionId && shop.townId === townId),
    [data.shops, regionId, townId],
  );

  const changeRegion = (nextRegionId) => {
    const nextTown =
      data.regions
        .find((region) => region.id === nextRegionId)
        ?.towns.find((town) => town.status === "open") || null;
    const nextShop =
      data.shops.find(
        (shop) => shop.regionId === nextRegionId && shop.townId === nextTown?.id,
      ) || null;
    setRegionId(nextRegionId);
    setTownId(nextTown?.id || "");
    setShopId(nextShop?.id || "");
  };

  const changeTown = (nextTownId) => {
    const nextShop =
      data.shops.find(
        (shop) => shop.regionId === regionId && shop.townId === nextTownId,
      ) || null;
    setTownId(nextTownId);
    setShopId(nextShop?.id || "");
  };

  const selectedShop = data.shops.find((shop) => shop.id === shopId);

  return (
    <main className="merchant-entry-page">
      <section className="merchant-entry-hero">
        <div className="merchant-entry-hero__copy">
          <span className="eyebrow">店主入口 · 独立工作台</span>
          <h1>把你知道的，<br /><em>交给 AI 讲清楚。</em></h1>
          <p>
            先确认店内资料，再查看游客问题和可用内容。
          </p>
          <div className="merchant-io">
            <article>
              <PenLine size={20} />
              <span>你的输入</span>
              <strong>店主确认过的资料</strong>
            </article>
            <ArrowRight size={20} />
            <article>
              <BookOpenText size={20} />
              <span>AI 接待</span>
              <strong>只使用这些事实回答</strong>
            </article>
            <ArrowRight size={20} />
            <article>
              <LayoutDashboard size={20} />
              <span>你的输出</span>
              <strong>问题回声与内容草稿</strong>
            </article>
          </div>
        </div>

        <div className="merchant-entry-card">
          <div className="merchant-entry-card__top">
            <Seal tone="teal">店主</Seal>
            <div>
              <span className="small-caps">MERCHANT ACCESS</span>
              <h2>进入经营中的店</h2>
            </div>
          </div>
          <label>
            <span>地区</span>
            <select value={regionId} onChange={(event) => changeRegion(event.target.value)}>
              {openRegions.map((region) => (
                <option key={region.id} value={region.id}>
                  {region.name} · {region.tagline}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>小镇</span>
            <select value={townId} onChange={(event) => changeTown(event.target.value)}>
              {towns
                .filter((town) => town.status === "open")
                .map((town) => (
                  <option key={town.id} value={town.id}>
                    {town.name} · {town.subtitle}
                  </option>
                ))}
            </select>
          </label>

          <label>
            <span>店铺</span>
            <select value={shopId} onChange={(event) => setShopId(event.target.value)}>
              {shops.map((shop) => (
                <option key={shop.id} value={shop.id}>
                  {shop.name} · {shop.owner.name}
                </option>
              ))}
            </select>
          </label>

          {selectedShop ? (
            <div className="merchant-entry-card__selected">
              <span>{selectedShop.category}</span>
              <strong>{selectedShop.name}</strong>
              <p>
                店主 {selectedShop.owner.name}
              </p>
            </div>
          ) : null}

          <button
            className="button button--rust button--full"
            type="button"
            disabled={!selectedShop}
            onClick={() => selectedShop && navigate(merchantPath(selectedShop))}
          >
            进入店主工作台
            <ArrowRight size={17} />
          </button>

          <div className="merchant-entry-card__privacy">
            <ShieldCheck size={16} />
            <span>游客回声只展示问题主题和匿名称呼，不展示完整私人聊天记录。</span>
          </div>
        </div>
      </section>

    </main>
  );
}
