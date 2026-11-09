import { ArrowLeft, ArrowRight, Clock3, Store } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import JourneySteps from "../components/JourneySteps";
import Seal from "../components/Seal";
import SourceBadge from "../components/SourceBadge";
import { useData } from "../context/DataContext";
import { townPath, visitPath } from "../lib/paths";

export default function VisitorTownsPage() {
  const { regionId } = useParams();
  const { data } = useData();
  const region = data.regions.find((item) => item.id === regionId);

  if (!region) {
    return (
      <main className="state-page">
        <h1>没有这个地区。</h1>
        <Link className="text-link" to={visitPath}>
          重新选择地区
        </Link>
      </main>
    );
  }

  return (
    <main className="flow-page">
      <div className="flow-topline">
        <Link className="text-link" to={visitPath}>
          <ArrowLeft size={15} />
          返回地区
        </Link>
        <span>游客入口 / {region.name}</span>
      </div>

      <section className="flow-intro">
        <div>
          <span className="eyebrow">游客入口 · 02</span>
          <h1>{region.name}，<br />哪一座小镇？</h1>
          <p>{region.description}</p>
        </div>
        <JourneySteps current={2} />
      </section>

      <section className="town-list">
        {region.towns.map((town) => {
          const isOpen = town.status === "open";
          const content = (
            <>
              <div className="town-card__folio">
                <span className="small-caps">TOWN FILE · {region.eyebrow.replace("地区 ", "")}</span>
                <Seal tone={region.accent}>{town.name.slice(0, 2)}</Seal>
                <span className="town-card__vertical">{region.shortName}</span>
              </div>
              <div className="town-card__body">
                <div className="town-card__heading">
                  <div>
                    <SourceBadge tone={isOpen ? "teal" : "rust"}>
                      {isOpen ? "资料已开放" : "筹备中"}
                    </SourceBadge>
                    <h2>{town.name}</h2>
                    <p className="town-card__subtitle">{town.subtitle}</p>
                  </div>
                  <span className="town-card__number">
                    {String(region.towns.indexOf(town) + 1).padStart(2, "0")}
                  </span>
                </div>
                <p className="town-card__description">{town.description}</p>
                <blockquote>“{town.coverQuote || "资料还在整理中。"}”</blockquote>
                <div className="town-card__footer">
                  <div>
                    <span>
                      <Store size={14} />
                      {town.shopCount} 家店
                    </span>
                    <span>
                      <Clock3 size={14} />
                      半日至一日
                    </span>
                  </div>
                  <span className={`town-card__action ${isOpen ? "" : "is-disabled"}`}>
                    {isOpen ? (
                      <>
                      进入小镇
                      <ArrowRight size={16} />
                      </>
                    ) : (
                      "暂未开放"
                    )}
                  </span>
                </div>
              </div>
            </>
          );
          return isOpen ? (
            <Link
              className={`town-card town-card--${region.accent} town-card--interactive`}
              to={townPath(region.id, town.id)}
              key={town.id}
              aria-label={`进入${town.name}`}
            >
              {content}
            </Link>
          ) : (
            <article
              className={`town-card town-card--${region.accent} town-card--disabled`}
              key={town.id}
              aria-disabled="true"
            >
              {content}
            </article>
          );
        })}
      </section>
    </main>
  );
}
