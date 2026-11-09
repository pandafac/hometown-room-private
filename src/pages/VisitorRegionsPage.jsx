import { ArrowLeft, ArrowRight, MapPin, Store } from "lucide-react";
import { Link } from "react-router-dom";
import JourneySteps from "../components/JourneySteps";
import PlaceSearch from "../components/PlaceSearch";
import SourceBadge from "../components/SourceBadge";
import { useData } from "../context/DataContext";

export default function VisitorRegionsPage() {
  const { data } = useData();

  return (
    <main className="flow-page">
      <div className="flow-topline">
        <Link className="text-link" to="/">
          <ArrowLeft size={15} />
          返回封面
        </Link>
        <span>游客入口</span>
      </div>

      <section className="flow-intro">
        <div>
          <span className="eyebrow">游客入口 · 01</span>
          <h1>你想去哪一片地方？</h1>
          <p>先选地区，再进入小镇和店铺。</p>
        </div>
        <JourneySteps current={1} />
      </section>

      <div className="flow-search">
        <PlaceSearch compact />
      </div>

      <section className="region-list region-list--full">
        <div className="region-card-grid">
          {data.regions.map((region) => {
            const isOpen = region.status === "open";
            const content = (
              <>
                <header>
                  <span>{region.eyebrow}</span>
                  <SourceBadge tone={isOpen ? "teal" : "rust"}>
                    {isOpen ? "可进入" : "筹备中"}
                  </SourceBadge>
                </header>
                <span className="region-card__vertical">{region.shortName}</span>
                <h2>{region.name}</h2>
                <p className="region-card__tagline">{region.tagline}</p>
                <p className="region-card__description">{region.description}</p>
                <div className="region-card__meta">
                  <span>
                    <MapPin size={14} />
                    {region.towns.map((town) => town.name).join(" · ")}
                  </span>
                  <span>
                    <Store size={14} />
                    {region.shopCount} 家店
                  </span>
                </div>
                <span className={`region-card__action ${isOpen ? "" : "is-disabled"}`}>
                  {isOpen ? (
                    <>
                    进入{region.shortName}
                    <ArrowRight size={16} />
                    </>
                  ) : (
                    "资料仍在整理"
                  )}
                </span>
              </>
            );
            const className = `region-card region-card--${region.accent} ${
              !isOpen ? "region-card--disabled" : "region-card--interactive"
            }`;
            return isOpen ? (
              <Link
                className={className}
                to={`/visit/${region.id}`}
                key={region.id}
                aria-label={`进入${region.name}`}
              >
                {content}
              </Link>
            ) : (
              <article className={className} key={region.id} aria-disabled="true">
                {content}
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
