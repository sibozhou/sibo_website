import { MapPage } from "../../../map-page";
import { mapMetadata } from "../../../site-metadata";

export const dynamic = "force-static";
export const metadata = mapMetadata("zh");

export default function ChineseMap() {
  return <MapPage language="zh" />;
}
