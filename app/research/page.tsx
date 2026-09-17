import type { Metadata } from "next";
import { SiteFrame } from "../site-frame";

export const dynamic = "force-static";
export const metadata: Metadata = {
  title: "Research — Sibo Zhou",
  description: "Working papers and research by Sibo Zhou on health, education, and clinical outcomes.",
  alternates: { canonical: "https://sibozhou.github.io/sibo_website/research/" },
  openGraph: { title: "Research — Sibo Zhou", description: "Working papers on health, education, and clinical outcomes.", url: "https://sibozhou.github.io/sibo_website/research/" },
};

const papers = [
  {
    title: "Education selectively improves TB and HIV knowledge: causal evidence from Lesotho",
    authors: <>Jingwei Huang and <strong>Sibo Zhou</strong></>,
    note: "Authors listed alphabetically.",
  },
  {
    title: "The Natural History of Lymphomatosis Cerebri: An Analytical Assessment",
    authors: <>Laura Schroeder*, <strong>Sibo Zhou*</strong>, Elizabeth Xu*, Shiva Gautam, and Eric T. Wong</>,
    note: "* Equal contribution. American Neurological Association Annual Meeting, 2026. Presenting author: Sibo Zhou.",
  },
  {
    title: "The Natural History of Glioblastoma in Multiple Sclerosis Patients",
    authors: <>Nazim Khan*, Rohan Cherukuru*, <strong>Sibo Zhou</strong>, Hsien-Chung Chen, Clark C Chen, Jonathan Cahill, Shiva Gautam, and Eric T. Wong</>,
  },
  {
    title: "Diagnostic Considerations for Neurolymphomatosis: A Natural History Analysis",
    authors: <>Francesca Rothell*, Mary Ann Nguyen*, Elizabeth Xu, Quan Ho, <strong>Sibo Zhou</strong>, Shiva Gautam, and Eric T. Wong</>,
  },
];

export default function Research() {
  return (
    <SiteFrame page="research">
      <section className="intro research-intro" aria-labelledby="research-title">
        <p className="eyebrow">Working papers &amp; publications</p>
        <h1 id="research-title">Research<span className="name-period">.</span></h1>
        <p className="research-description">My work spans health economics, causal inference, and clinical outcomes—with a focus on how evidence informs decisions.</p>
        <div className="text-links section-jumps" aria-label="Research sections">
          <a href="#working-papers">Working papers <span aria-hidden="true">↓</span></a>
          <a href="#publications">Publications <span aria-hidden="true">↓</span></a>
        </div>
      </section>
      <section className="editorial-section papers-section" id="working-papers" aria-labelledby="working-title">
        <h2 className="section-label" id="working-title">Working papers<span className="section-count">01—04</span></h2>
        <div className="paper-list">
          {papers.map((paper, index) => (
            <article className="paper" key={paper.title}>
              <span className="paper-number" aria-hidden="true">0{index + 1}</span>
              <h3>{paper.title}</h3>
              <p className="authors">{paper.authors}</p>
              {paper.note && <p className="paper-note">{paper.note}</p>}
            </article>
          ))}
          <p className="availability-note">For inquiries about these papers, <a href="mailto:sibozhou@berkeley.edu">please contact me <span aria-hidden="true">↗</span></a>.</p>
        </div>
      </section>
      <section className="editorial-section" id="publications" aria-labelledby="publications-title">
        <h2 className="section-label" id="publications-title">Publications</h2>
        <div className="section-body"><p>My current manuscripts are listed above as working papers. Published articles will be added here as they become available.</p></div>
      </section>
    </SiteFrame>
  );
}
