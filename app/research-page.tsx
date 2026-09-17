import { SiteFrame } from "./site-frame";

const papers = [
  {
    title: "Education selectively improves TB and HIV knowledge: causal evidence from Lesotho",
    authors: <>Jingwei Huang and <strong>Sibo Zhou</strong></>,
    note: "Authors listed alphabetically.",
    noteZh: "作者按姓氏字母顺序排列。",
  },
  {
    title: "The Natural History of Lymphomatosis Cerebri: An Analytical Assessment",
    authors: <>Laura Schroeder*, <strong>Sibo Zhou*</strong>, Elizabeth Xu*, Shiva Gautam, and Eric T. Wong</>,
    note: "* Equal contribution. American Neurological Association Annual Meeting, 2026. Presenting author: Sibo Zhou.",
    noteZh: "* 同等贡献。2026 年美国神经病学协会年会；报告人：Sibo Zhou。",
  },
  {
    title: "The Natural History of Glioblastoma in Multiple Sclerosis Patients",
    authors: <>Nazim Khan*, Rohan Cherukuru*, <strong>Sibo Zhou</strong>, Hsien-Chung Chen, Clark C Chen, Jonathan Cahill, Shiva Gautam, and Eric T. Wong</>,
  },
];

export function ResearchPage({ language = "en" }: { language?: "en" | "zh" }) {
  const zh = language === "zh";
  return (
    <SiteFrame page="research" language={language}>
      <section className="intro research-intro" aria-labelledby="research-title">
        <h1 id="research-title">{zh ? "研究" : "Research"}{!zh && <span className="name-period">.</span>}</h1>
        <p className="research-description">{zh ? "我的研究兴趣涵盖健康经济学、机器学习与统计学。以下列出我在教育与健康领域的研究，以及参与的神经肿瘤学合作研究。" : "My interests span health economics, machine learning, and statistics. The work below includes studies of education and health, alongside collaborative research in neuro-oncology."}</p>
        <div className="text-links section-jumps" aria-label={zh ? "研究分类" : "Research sections"}>
          <a href="#working-papers">{zh ? "工作论文" : "Working papers"} <span className="link-arrow" aria-hidden="true">↓</span></a>
          <a href="#publications">{zh ? "已发表论文" : "Publications"} <span className="link-arrow" aria-hidden="true">↓</span></a>
        </div>
      </section>
      <section className="editorial-section papers-section" id="working-papers" aria-labelledby="working-title">
        <h2 className="section-label" id="working-title">{zh ? "工作论文" : "Working papers"}<span className="section-count">01—03</span></h2>
        <div className="paper-list">
          {papers.map((paper, index) => (
            <article className="paper" key={paper.title}>
              <span className="paper-number" aria-hidden="true">0{index + 1}</span>
              <h3 lang="en">{paper.title}</h3>
              <p className="authors" lang="en">{paper.authors}</p>
              {paper.note && <p className="paper-note">{zh ? paper.noteZh : paper.note}</p>}
            </article>
          ))}
        </div>
      </section>
      <section className="editorial-section" id="publications" aria-labelledby="publications-title">
        <h2 className="section-label" id="publications-title">{zh ? "已发表论文" : "Publications"}<span className="section-count">2026</span></h2>
        <div className="paper-list">
          <article className="paper">
            <span className="paper-number" aria-hidden="true">01</span>
            <h3 lang="en"><a href="https://doi.org/10.3390/cancers18132068">Diagnostic Considerations for Neurolymphomatosis: A Natural History Analysis</a></h3>
            <p className="authors" lang="en">Francesca Rothell, Mary Ann Nguyen, Elizabeth Xu, Quan Ho, <strong>Sibo Zhou</strong>, Shiva Gautam, and Eric T. Wong</p>
            <p className="paper-note"><em>Cancers (Basel)</em>. 2026;18(13):2068. {zh ? "发表于 2026 年 6 月 25 日。" : "Published June 25, 2026."}</p>
            <div className="text-links">
              <a href="https://doi.org/10.3390/cancers18132068">{zh ? "阅读全文" : "Read article"} <span className="link-arrow" aria-hidden="true">↗</span></a>
              <a href="https://pubmed.ncbi.nlm.nih.gov/42449612/">PubMed <span className="link-arrow" aria-hidden="true">↗</span></a>
            </div>
          </article>
        </div>
      </section>
    </SiteFrame>
  );
}
