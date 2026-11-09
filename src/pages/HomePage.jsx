import {
  ArrowRight,
  ArrowUpRight,
  Compass,
  LayoutDashboard,
  MapPin,
} from "lucide-react";
import { Link } from "react-router-dom";
import PlaceSearch from "../components/PlaceSearch";
import SourceBadge from "../components/SourceBadge";
import { useData } from "../context/DataContext";

export default function HomePage() {
  const { data } = useData();

  return (
    <main className="cover-page">
      <section className="cover-hero">
        <div className="cover-hero__brand">
          <div className="eyebrow-row">
            <span className="eyebrow">家乡会客厅</span>
            <span className="hairline" />
            <span className="small-caps">LOCAL RECEPTION NETWORK</span>
          </div>
          <h1>
            会客
            <br />
            <em>厅。</em>
          </h1>
          <p>
            让第一次来的人知道怎么走进一家店，
            <br />
            也让店主听见那些重复出现的问题。
          </p>
          <PlaceSearch />
          <div className="cover-hero__proof">
            <span>{data.meta.regionCount} 个地区</span>
            <span>{data.meta.townCount} 座开放小镇</span>
            <span>{data.meta.shopCount} 家授权小店</span>
          </div>
        </div>

        <div className="entry-choice" aria-label="选择身份入口">
          <div className="entry-choice__heading">
            <span className="small-caps">CHOOSE YOUR DOOR</span>
            <h2>今天，你从哪扇门进来？</h2>
          </div>

          <Link className="entry-card entry-card--visitor" to="/visit">
            <div className="entry-card__top">
              <span>01 · 游客入口</span>
              <ArrowUpRight size={21} />
            </div>
            <div className="entry-card__body">
              <Compass size={42} strokeWidth={1.2} />
              <div>
                <h3>我要去一个地方</h3>
                <p>选地区、进小镇、找一家店，把它当作第一次进门的接待员。</p>
              </div>
            </div>
          </Link>

          <Link className="entry-card entry-card--merchant" to="/merchant">
            <div className="entry-card__top">
              <span>02 · 店主入口</span>
              <ArrowUpRight size={21} />
            </div>
            <div className="entry-card__body">
              <LayoutDashboard size={42} strokeWidth={1.2} />
              <div>
                <h3>我在经营一家店</h3>
                <p>录入店主资料，看见游客问题，再把回声变成下一次表达。</p>
              </div>
            </div>
          </Link>
        </div>
      </section>

      <section className="region-preview">
        <div className="region-preview__heading">
          <span className="eyebrow">地区目录</span>
          <h2>先从一片地方开始。</h2>
          <p>选择一片地方，再从不同小镇进入。</p>
        </div>
        <div className="region-preview__grid">
          {data.regions.map((region, index) => {
            const content = (
              <>
                <div className="region-mini__top">
                  <span>{region.eyebrow}</span>
                  <SourceBadge tone={region.status === "open" ? "teal" : "rust"}>
                    {region.status === "open" ? "已开放" : "筹备中"}
                  </SourceBadge>
                </div>
                <h3>{region.name}</h3>
                <p>{region.description}</p>
                <div className="region-mini__meta">
                  <span>
                    <MapPin size={13} />
                    {region.townCount} 座小镇
                  </span>
                  <span>{region.shopCount} 家店</span>
                </div>
                <span className="region-mini__link">
                  {region.status === "open" ? "从这里进入" : "暂不接待"}
                  {region.status === "open" ? <ArrowRight size={15} /> : null}
                </span>
                <span className="region-mini__index">0{index + 1}</span>
              </>
            );
            const className = `region-mini region-mini--${region.accent} ${
              region.status !== "open" ? "is-disabled" : ""
            }`;
            return region.status === "open" ? (
              <Link
                className={`${className} region-mini--interactive`}
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
