import { ArrowRight, MapPin, Search, Store } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useData } from "../context/DataContext";
import { regionPath, roomPath, townPath } from "../lib/paths";

const kindLabels = {
  region: "地区",
  town: "小镇",
  shop: "店铺",
};

const kindIcons = {
  region: MapPin,
  town: MapPin,
  shop: Store,
};

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .replaceAll(" ", "");
}

export default function PlaceSearch({ compact = false, autoFocus = false }) {
  const { data } = useData();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const entries = useMemo(() => {
    const regionEntries = data.regions.map((region) => ({
      id: `region-${region.id}`,
      kind: "region",
      label: region.name,
      meta: `${region.tagline} · ${region.status === "open" ? "已开放" : "筹备中"}`,
      searchText: `${region.name} ${region.shortName} ${region.tagline} ${region.description}`,
      path: regionPath(region.id),
    }));

    const townEntries = data.towns.map((town) => ({
      id: `town-${town.id}`,
      kind: "town",
      label: town.name,
      meta: `${town.regionName} · ${town.subtitle}`,
      searchText: `${town.name} ${town.regionName} ${town.subtitle} ${town.description}`,
      path: townPath(town.regionId, town.id),
    }));

    const shopEntries = data.shops.map((shop) => ({
      id: `shop-${shop.id}`,
      kind: "shop",
      label: shop.name,
      meta: `${shop.regionName} · ${shop.townName} · ${shop.category}`,
      status: shop.liveStatus?.business?.label,
      searchText: [
        shop.name,
        shop.englishName,
        shop.category,
        shop.tagline,
        shop.regionName,
        shop.townName,
        ...(shop.products || []).map((product) => product.name),
      ].join(" "),
      path: roomPath(shop),
    }));

    return [...regionEntries, ...townEntries, ...shopEntries];
  }, [data]);

  const results = useMemo(() => {
    const needle = normalize(query);
    if (!needle) return [];
    return entries
      .filter((entry) => normalize(entry.searchText).includes(needle))
      .sort((left, right) => {
        const leftStarts = normalize(left.label).startsWith(needle) ? 1 : 0;
        const rightStarts = normalize(right.label).startsWith(needle) ? 1 : 0;
        return rightStarts - leftStarts;
      })
      .slice(0, 7);
  }, [entries, query]);

  const hasQuery = Boolean(query.trim());

  return (
    <section
      className={`place-search ${compact ? "place-search--compact" : ""}`}
      aria-label="搜索地点和店铺"
    >
      <form
        className="place-search__form"
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          if (results[0]) navigate(results[0].path);
        }}
      >
        <Search size={19} aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setQuery("");
            }
          }}
          placeholder="搜索地区、小镇或店铺，例如“云溪镇”"
          aria-label="搜索地点和店铺"
          aria-controls="place-search-results"
          aria-expanded={hasQuery}
          autoFocus={autoFocus}
        />
        {hasQuery ? (
          <button type="button" className="place-search__clear" onClick={() => setQuery("")}>
            清除
          </button>
        ) : null}
      </form>

      {!hasQuery ? (
        <div className="place-search__hints">
          <span>快速查找</span>
          {["云溪镇", "桥西茶寮", "石岙镇"].map((hint) => (
            <button type="button" key={hint} onClick={() => setQuery(hint)}>
              {hint}
            </button>
          ))}
        </div>
      ) : (
        <div className="place-search__panel" id="place-search-results">
          <div className="place-search__summary" role="status">
            {results.length ? `找到 ${results.length} 个结果` : `没有找到“${query.trim()}”`}
          </div>
          {results.length ? (
            <ul className="place-search__results">
              {results.map((result) => {
                const Icon = kindIcons[result.kind];
                return (
                  <li key={result.id}>
                    <Link to={result.path}>
                      <span className={`place-search__kind place-search__kind--${result.kind}`}>
                        <Icon size={13} aria-hidden="true" />
                        {kindLabels[result.kind]}
                      </span>
                      <span className="place-search__result-copy">
                        <strong>{result.label}</strong>
                        <small>
                          {result.meta}
                          {result.status ? ` · ${result.status}` : ""}
                        </small>
                      </span>
                      <ArrowRight size={16} aria-hidden="true" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="place-search__empty">试试地区名、小镇名或店铺名。</p>
          )}
        </div>
      )}
    </section>
  );
}
