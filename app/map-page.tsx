import type { Language } from "./languages";
import { PersonalMap } from "./personal-map";
import { SiteFrame } from "./site-frame";

export function MapPage({ language = "en" }: { language?: Language }) {
  return (
    <SiteFrame page="map" language={language}>
      <PersonalMap language={language} />
    </SiteFrame>
  );
}
