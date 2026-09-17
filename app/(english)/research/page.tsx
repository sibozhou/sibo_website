import { ResearchPage } from "../../research-page";
import { researchMetadata } from "../../site-metadata";

export const dynamic = "force-static";
export const metadata = researchMetadata("en");

export default function Research() {
  return <ResearchPage />;
}
