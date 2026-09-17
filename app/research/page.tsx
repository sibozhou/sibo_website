import type { Metadata } from "next";
import { SiteFrame } from "../site-frame";

export const dynamic = "force-static";
export const metadata: Metadata = {
  title: "Research — Sibo Zhou",
  description: "Publications and working papers by Sibo Zhou on health, education, and clinical outcomes.",
  alternates: { canonical: "https://sibozhou.com/research/" },
  openGraph: { title: "Research — Sibo Zhou", description: "Publications and working papers on health, education, and clinical outcomes.", url: "https://sibozhou.com/research/" },
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
];

export default function Research() {
  return (
    <SiteFrame page="research">
      <section className="intro research-intro" aria-labelledby="research-title">
        <h1 id="research-title">Research<span className="name-period">.</span></h1>
        <p className="research-description">My interests span health economics, machine learning, and statistics. The work below includes studies of education and health, alongside collaborative research in neuro-oncology.</p>
        <div className="text-links section-jumps" aria-label="Research sections">
          <a href="#working-papers">Working papers <span aria-hidden="true">↓</span></a>
          <a href="#publications">Publications <span aria-hidden="true">↓</span></a>
        </div>
      </section>
      <section className="editorial-section papers-section" id="working-papers" aria-labelledby="working-title">
        <h2 className="section-label" id="working-title">Working papers<span className="section-count">01—03</span></h2>
        <div className="paper-list">
          {papers.map((paper, index) => (
            <article className="paper" key={paper.title}>
              <span className="paper-number" aria-hidden="true">0{index + 1}</span>
              <h3>{paper.title}</h3>
              <p className="authors">{paper.authors}</p>
              {paper.note && <p className="paper-note">{paper.note}</p>}
            </article>
          ))}
          <p className="availability-note">For inquiries about these papers, <a href="mailto:sibozhou@berkeley.edu">please contact me <span className="link-arrow" aria-hidden="true">↗</span></a>.</p>
        </div>
      </section>
      <section className="editorial-section" id="publications" aria-labelledby="publications-title">
        <h2 className="section-label" id="publications-title">Publications<span className="section-count">2026</span></h2>
        <div className="paper-list">
          <article className="paper">
            <span className="paper-number" aria-hidden="true">01</span>
            <h3><a href="https://doi.org/10.3390/cancers18132068">Diagnostic Considerations for Neurolymphomatosis: A Natural History Analysis</a></h3>
            <p className="authors">Francesca Rothell, Mary Ann Nguyen, Elizabeth Xu, Quan Ho, <strong>Sibo Zhou</strong>, Shiva Gautam, and Eric T. Wong</p>
            <p className="paper-note"><em>Cancers (Basel)</em>. 2026;18(13):2068. Published June 25, 2026.</p>
            <div className="text-links">
              <a href="https://doi.org/10.3390/cancers18132068">Read article <span className="link-arrow" aria-hidden="true">↗</span></a>
              <a href="https://pubmed.ncbi.nlm.nih.gov/42449612/">PubMed <span className="link-arrow" aria-hidden="true">↗</span></a>
            </div>
          </article>
        </div>
      </section>
    </SiteFrame>
  );
}
