import type { Language } from "./languages";
import { PersonalMap } from "./personal-map";
import { SiteFrame } from "./site-frame";

export function MapPage({ language = "en" }: { language?: Language }) {
  const traditional = language === "zh-hant";
  const chinese = language !== "en";
  return (
    <SiteFrame page="map" language={language}>
      <section className="intro map-intro" aria-labelledby="map-title">
        <h1 id="map-title">{traditional ? "地圖" : chinese ? "地图" : "map"}</h1>
        <p className="map-description">{traditional ? "從海口出發，走過的一些地方。" : chinese ? "从海口出发，走过的一些地方。" : "From Haikou, a few places along the way."}</p>
      </section>
      <PersonalMap language={language} />
    </SiteFrame>
  );
}
