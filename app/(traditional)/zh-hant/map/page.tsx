import { MapPage } from "../../../map-page";
import { mapMetadata } from "../../../site-metadata";

export const dynamic = "force-static";
export const metadata = mapMetadata("zh-hant");

export default function TraditionalMap() {
  return <MapPage language="zh-hant" />;
}
