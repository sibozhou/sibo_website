import { MapPage } from "../../map-page";
import { mapMetadata } from "../../site-metadata";

export const dynamic = "force-static";
export const metadata = mapMetadata("en");

export default function Map() {
  return <MapPage />;
}
