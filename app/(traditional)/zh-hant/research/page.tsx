import { ResearchPage } from "../../../research-page";
import { researchMetadata } from "../../../site-metadata";

export const dynamic = "force-static";
export const metadata = researchMetadata("zh-hant");

export default function TraditionalResearch() {
  return <ResearchPage language="zh-hant" />;
}
