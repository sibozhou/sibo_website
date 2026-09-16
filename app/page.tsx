const research = [
  {
    title:
      "Education selectively improves TB and HIV knowledge: causal evidence from Lesotho",
    authors: (
      <>
        Jingwei Huang and <strong>Sibo Zhou</strong>
      </>
    ),
    meta: "Working paper · Authors listed alphabetically",
  },
  {
    title:
      "The Natural History of Lymphomatosis Cerebri: An Analytical Assessment",
    authors: (
      <>
        Laura Schroeder, <strong>Sibo Zhou</strong>, Elizabeth Xu, Shiva Gautam,
        and Eric T. Wong
      </>
    ),
    meta: "American Neurological Association Annual Meeting · 2026",
    note: "Equal contributor and presenting author",
  },
  {
    title:
      "The Natural History of Glioblastoma in Multiple Sclerosis Patients",
    authors: (
      <>
        Nazim Khan, Rohan Cherukuru, <strong>Sibo Zhou</strong>, Hsien-Chung
        Chen, Clark C Chen, Jonathan Cahill, Shiva Gautam, and Eric T. Wong
      </>
    ),
    meta: "Working paper",
  },
  {
    title:
      "Diagnostic Considerations for Neurolymphomatosis: A Natural History Analysis",
    authors: (
      <>
        Francesca Rothell, Mary Ann Nguyen, Elizabeth Xu, Quan Ho, <strong>Sibo
        Zhou</strong>, Shiva Gautam, and Eric T. Wong
      </>
    ),
    meta: "Working paper",
  },
];

const appointments = [
  {
    dates: "2026—Now",
    role: "Predoctoral Scholar",
    place: "Haas School of Business, UC Berkeley",
    detail: "With Prof. David Chan",
  },
  {
    dates: "2026—Now",
    role: "Research Statistician",
    place: "U.S. Department of Veterans Affairs",
    detail: "Office of Research and Development",
  },
  {
    dates: "2026—Now",
    role: "Clinical Research Collaborator",
    place: "Warren Alpert Medical School, Brown University",
    detail: "With Prof. Eric T. Wong",
  },
  {
    dates: "2024—2026",
    role: "Research Assistant",
    place: "Watson School, Brown University",
    detail: "With Prof. Robert Blair",
  },
  {
    dates: "2023—2024",
    role: "Research Assistant",
    place: "Department of Economics, USC",
    detail: "With Prof. Yuehao Bai",
  },
];

const teaching = [
  ["DATA 2020", "Statistical Learning", "Brown · Spring 2026"],
  ["DATA 1050", "Data Engineering", "Brown · Fall 2025"],
  ["IAPA 1500D", "Research Design and Methods", "Brown · Spring 2025"],
  ["DSCI 250", "Introduction to Data Science", "USC · Fall 2023"],
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: "Sibo Zhou",
  jobTitle: ["Predoctoral Scholar", "Research Statistician"],
  email: "mailto:sibozhou@berkeley.edu",
  sameAs: ["https://www.linkedin.com/in/sibo-zhou88"],
  affiliation: [
    {
      "@type": "Organization",
      name: "Haas School of Business, University of California, Berkeley",
    },
    {
      "@type": "Organization",
      name: "U.S. Department of Veterans Affairs",
    },
  ],
  alumniOf: [
    { "@type": "CollegeOrUniversity", name: "Brown University" },
    {
      "@type": "CollegeOrUniversity",
      name: "University of Southern California",
    },
  ],
  knowsAbout: [
    "Health economics",
    "Physician decision-making",
    "Causal inference",
    "Health care data science",
    "Clinical outcomes",
  ],
};

export const dynamic = "force-static";

export default function Home() {
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>

      <div className="site-shell">
        <header className="site-header">
          <a className="wordmark" href="#top" aria-label="Sibo Zhou, home">
            Sibo Zhou
          </a>
          <nav className="site-nav" aria-label="Primary navigation">
            <a href="#research">Research</a>
            <a href="#background">Background</a>
            <a href="#teaching">Teaching</a>
            <a href="Sibo_Zhou_CV.pdf">CV</a>
          </nav>
        </header>

        <main id="main-content" className="content-column">
          <section className="hero" id="top" aria-labelledby="hero-title">
            <p className="eyebrow">Researcher · Statistician</p>
            <h1 id="hero-title">
              I study decisions in health care—and what they mean for patients.
            </h1>
            <p className="hero-copy">
              I am a Predoctoral Scholar at UC Berkeley&apos;s Haas School of
              Business and a Research Statistician at the U.S. Department of
              Veterans Affairs. My work uses causal inference and large-scale
              health care data to study physician decision-making and patient
              outcomes. I also collaborate on natural-history studies in
              neuro-oncology.
            </p>
            <div className="contact-links" aria-label="Contact links">
              <a href="mailto:sibozhou@berkeley.edu">
                Email <span aria-hidden="true">↗</span>
              </a>
              <a
                href="https://www.linkedin.com/in/sibo-zhou88"
                target="_blank"
                rel="noreferrer"
              >
                LinkedIn <span aria-hidden="true">↗</span>
              </a>
              <a href="Sibo_Zhou_CV.pdf">
                Download CV <span aria-hidden="true">↓</span>
              </a>
            </div>
          </section>

          <section
            className="section"
            id="research"
            aria-labelledby="research-title"
          >
            <div className="section-heading">
              <p className="section-number">01</p>
              <h2 id="research-title">Selected research</h2>
            </div>

            <article className="current-work">
              <div className="current-work-topline">
                <p className="item-label">Current work</p>
                <p className="item-meta">Berkeley Haas + VA</p>
              </div>
              <h3>Physician decisions under incomplete evidence</h3>
              <p>
                Two ongoing projects examine treatment decisions, provider
                decision time, and patient outcomes using VA health care data.
              </p>
            </article>

            <div className="research-list">
              {research.map((item) => (
                <article className="research-item" key={item.title}>
                  <p className="item-meta">{item.meta}</p>
                  <h3>{item.title}</h3>
                  <p className="authors">{item.authors}</p>
                  {item.note ? <p className="item-note">{item.note}</p> : null}
                </article>
              ))}
            </div>
          </section>

          <section
            className="section"
            id="background"
            aria-labelledby="background-title"
          >
            <div className="section-heading">
              <p className="section-number">02</p>
              <h2 id="background-title">Background</h2>
            </div>

            <div className="appointment-list">
              {appointments.map((appointment) => (
                <article
                  className="appointment"
                  key={`${appointment.role}-${appointment.place}`}
                >
                  <p className="appointment-dates">{appointment.dates}</p>
                  <div>
                    <h3>{appointment.role}</h3>
                    <p>{appointment.place}</p>
                    <p className="appointment-detail">{appointment.detail}</p>
                  </div>
                </article>
              ))}
            </div>

            <div className="education-grid" aria-label="Education">
              <article>
                <p className="item-label">Education</p>
                <h3>Brown University</h3>
                <p>Sc.M. in Data Science, 2026</p>
              </article>
              <article>
                <p className="item-label">Education</p>
                <h3>University of Southern California</h3>
                <p>
                  B.S. Applied &amp; Computational Mathematics; B.S. Economics
                  &amp; Data Science; B.A. Religious Studies; B.A. Global Studies,
                  2024
                </p>
              </article>
            </div>
          </section>

          <section
            className="section"
            id="teaching"
            aria-labelledby="teaching-title"
          >
            <div className="section-heading">
              <p className="section-number">03</p>
              <h2 id="teaching-title">Teaching</h2>
            </div>
            <div className="teaching-list">
              {teaching.map(([course, name, term]) => (
                <article className="teaching-item" key={course}>
                  <p className="course-code">{course}</p>
                  <h3>{name}</h3>
                  <p className="item-meta">{term}</p>
                </article>
              ))}
            </div>

            <div className="recognition">
              <p className="item-label">Selected recognition</p>
              <p>
                USC Renaissance Scholar Prize Winner and USC Dornsife Scholar
                Award, 2024.
              </p>
            </div>
          </section>
        </main>

        <footer className="site-footer content-column">
          <div>
            <p className="footer-name">Sibo Zhou</p>
            <p>UC Berkeley · U.S. Department of Veterans Affairs</p>
          </div>
          <div className="footer-links">
            <a href="mailto:sibozhou@berkeley.edu">sibozhou@berkeley.edu</a>
            <a
              href="https://www.linkedin.com/in/sibo-zhou88"
              target="_blank"
              rel="noreferrer"
            >
              LinkedIn
            </a>
          </div>
        </footer>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </>
  );
}
