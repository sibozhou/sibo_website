import { SiteFrame } from "./site-frame";

export const dynamic = "force-static";

export default function Home() {
  return (
    <SiteFrame page="home">
      <section className="intro" aria-labelledby="intro-title">
        <p className="eyebrow">Health economics · Data science</p>
        <h1 id="intro-title">Sibo Zhou<span className="name-period">.</span></h1>
        <p className="lead">Understanding health care decisions.<br />Improving the evidence behind them.</p>
        <div className="intro-copy">
          <p>I am a Predoctoral Scholar at UC Berkeley’s Haas School of Business and a Research Statistician at the U.S. Department of Veterans Affairs, working with Prof. David Chan.</p>
          <p>My research uses causal inference and health care data to study physician decision-making and patient outcomes. I also collaborate with Prof. Eric T. Wong at Brown University on natural-history studies in neuro-oncology.</p>
        </div>
        <div className="text-links">
          <a className="primary-link" href="research/">Explore my research <span aria-hidden="true">↗</span></a>
          <a href="Sibo_Zhou_CV.pdf">Curriculum vitae <span className="file-label">PDF</span></a>
        </div>
      </section>
      <section className="editorial-section" aria-labelledby="background-title">
        <h2 className="section-label" id="background-title">Background</h2>
        <div className="section-body">
          <p>I received my Sc.M. in Data Science from Brown University in 2026. Previously, I studied applied and computational mathematics, economics and data science, religious studies, and global studies at the University of Southern California.</p>
          <p>Before joining Berkeley and the VA, I worked with Prof. Robert Blair at Brown and Prof. Yuehao Bai at USC. I have also taught as a teaching assistant in statistical learning, data engineering, research methods, and data science.</p>
        </div>
      </section>
      <section className="editorial-section contact-section" aria-labelledby="contact-title">
        <h2 className="section-label" id="contact-title">Get in touch</h2>
        <div className="section-body">
          <p>For research inquiries and collaboration:</p>
          <a className="contact-email" href="mailto:sibozhou@berkeley.edu">sibozhou@berkeley.edu <span aria-hidden="true">↗</span></a>
          <a className="linkedin-link" href="https://www.linkedin.com/in/sibo-zhou88">LinkedIn <span aria-hidden="true">↗</span></a>
        </div>
      </section>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org", "@type": "Person", name: "Sibo Zhou",
        url: "https://sibozhou.github.io/sibo_website/",
        jobTitle: ["Predoctoral Scholar", "Research Statistician"],
        email: "mailto:sibozhou@berkeley.edu",
        sameAs: ["https://www.linkedin.com/in/sibo-zhou88"],
      }) }} />
    </SiteFrame>
  );
}
