import { ResearchPage } from "../../../research-page";
import { researchMetadata } from "../../../site-metadata";

export const dynamic = "force-static";
export const metadata = researchMetadata("zh");

export default function ChineseResearch() {
  return <ResearchPage language="zh" />;
}
