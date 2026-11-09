import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Clock3,
  MapPin,
  Quote,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import JourneySteps from "../components/JourneySteps";
import Seal from "../components/Seal";
import ShopStatusTags from "../components/ShopStatusTags";
import { useData } from "../context/DataContext";
import { roomPath, visitPath } from "../lib/paths";

export default function TownPage() {
  const { regionId, townId } = useParams();
  const { data } = useData();
  const navigate = useNavigate();
  const region = data.regions.find((item) => item.id === regionId);
  const town = data.towns.find(
    (item) => item.id === townId && item.regionId === regionId,
  );
  const shops = data.shops.filter((shop) => shop.townId === townId);
  const scenarios = data.scenarios.filter((scenario) => scenario.townId === townId);

  if (!region || !town) {
    return (
      <main className="state-page">
        <h1>这座小镇还没有开门。</h1>
        <Link className="text-link" to={visitPath}>
          回到地区选择
        </Link>
      </main>
    );
  }

  const openScenario = (scenario) => {
    const shop = shops.find((item) => item.id === scenario.shopIds[0]);
    if (!shop) return;
    navigate(`${roomPath(shop)}?prompt=${encodeURIComponent(scenario.starter)}`);
  };

  return (
    <main className="town-page">
      <div className="flow-topline">
        <Link className="text-link" to={`/visit/${region.id}`}>
          <ArrowLeft size={15} />
          返回{region.name}
        </Link>
        <span>游客入口 / {region.name} / {town.name}</span>
      </div>

      <section className={`town-hero town-hero--${region.accent}`}>
        <div className="town-hero__copy">
          <span className="eyebrow">{town.place.eyebrow}</span>
          <h1>{town.name}</h1>
          <p>{town.place.intro}</p>
          <div className="town-hero__route">
            <span>{town.place.seasonLabel}</span>
            <i />
            <span>{town.shopCount} 家授权小店</span>
            <i />
            <span>{town.place.tags.join(" · ")}</span>
          </div>
        </div>
        <div className="town-hero__note">
          <Seal tone={region.accent}>{town.name.slice(0, 2)}</Seal>
          <span className="small-caps">TOWN NOTE</span>
          <blockquote>“{town.coverQuote}”</blockquote>
          <p>{town.heroNote}</p>
        </div>
      </section>

      <div className="town-flow-bar">
        <JourneySteps current={3} />
      </div>

      <section className="town-shops">
        <div className="section-heading compact-heading">
          <div>
            <span className="eyebrow">小镇里的三扇门</span>
            <h2>你此刻需要哪一种接待？</h2>
          </div>
        </div>
        <div className="town-shop-grid">
          {shops.map((shop) => {
            const review = shop.testimonials[0];
            return (
              <Link
                className={`town-shop town-shop--${shop.accent} town-shop--interactive`}
                to={roomPath(shop)}
                key={shop.id}
                aria-label={`进入${shop.name}会客厅`}
              >
                <div className="town-shop__top">
                  <span className="shop-number">{shop.number}</span>
                  <span>{shop.category}</span>
                  <Seal compact tone={shop.accent}>{shop.stamp}</Seal>
                </div>
                <span className="small-caps">{shop.englishName}</span>
                <h3>{shop.name}</h3>
                <p className="town-shop__tagline">{shop.tagline}</p>
                <p className="town-shop__description">{shop.shortDescription}</p>
                <ShopStatusTags status={shop.liveStatus} showUpdatedAt />
                <div className="town-shop__facts">
                  <span>
                    <Clock3 size={14} />
                    {shop.hours.display}
                  </span>
                  <span>
                    <MapPin size={14} />
                    {shop.area}
                  </span>
                </div>
                <blockquote>
                  <Quote size={15} />
                  <p>“{review.quote}”</p>
                  <span>{review.author}</span>
                </blockquote>
                <div className="town-shop__footer">
                  <span className="town-shop__enter">
                    进入会客厅
                    <ArrowUpRight size={19} />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="town-scenarios">
        <div>
          <span className="eyebrow">不知道从哪问起？</span>
          <h2>选一句最像你的处境。</h2>
        </div>
        <div className="town-scenario-list">
          {scenarios.map((scenario) => (
            <button type="button" key={scenario.id} onClick={() => openScenario(scenario)}>
              <span>{scenario.label}</span>
              <p>{scenario.description}</p>
              <ArrowRight size={16} />
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
