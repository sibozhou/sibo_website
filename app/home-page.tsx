import { SiteFrame } from "./site-frame";

export function HomePage({ language = "en" }: { language?: "en" | "zh" }) {
  const zh = language === "zh";
  const assets = zh ? "../" : "";
  return (
    <SiteFrame page="home" language={language}>
      <section className="intro home-intro" aria-labelledby="intro-title">
        {/* A pre-sized static image keeps the portrait independent of an image server. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="portrait" src={assets + "sibo-zhou.jpg"} alt={zh ? "周思博" : "Sibo Zhou"} width={675} height={900} fetchPriority="high" />
        <h1 id="intro-title">{zh ? "周思博" : "Sibo Zhou"}{!zh && <span className="name-period">.</span>}</h1>
        <p className="lead">{zh ? "以经济学与数据，理解人的行为与健康。" : "Understanding people and health through economics and data."}</p>
        <div className="intro-copy">
          <p>{zh ? "我目前在" : "I am a Predoctoral Scholar at "}<a href="https://haas.berkeley.edu/">{zh ? "加州大学伯克利分校哈斯商学院" : "UC Berkeley Haas"}</a>{zh ? "担任博士预备研究员，同时在" : " and a Research Statistician at the "}<a href="https://www.va.gov/">{zh ? "美国退伍军人事务部（VA）" : "VA"}</a>{zh ? "担任研究统计师，与 " : ", working with "}<a href="https://haas.berkeley.edu/faculty/david-chan/">{zh ? "David Chan 教授" : "Prof. David Chan"}</a>{zh ? "合作开展研究。" : "."}</p>
          <p>{zh ? "我的研究兴趣涵盖健康经济学、机器学习与统计学。数学、经济学与人文学科的学习经历，使我关注如何将定量方法与对人类行为的理解相结合，探索健康与福祉相关的问题。" : "My interests span health economics, machine learning, and statistics. With a background in mathematics, economics, and the humanities, I am interested in combining quantitative methods with an understanding of human behavior to study health and well-being."}</p>
          <p>{zh ? "此外，我与布朗大学的 " : "I also collaborate with "}<a href="https://neurosurgery.med.brown.edu/people/eric-t-wong-md">{zh ? "Eric T. Wong 教授" : "Prof. Eric T. Wong"}</a>{zh ? "合作，开展神经肿瘤疾病自然病程研究。" : " at Brown University on natural-history studies in neuro-oncology."}</p>
        </div>
        <div className="text-links">
          <a className="primary-link" href="research/">{zh ? "了解我的研究" : "Explore my research"} <span className="link-arrow" aria-hidden="true">↗</span></a>
          <a href={assets + "Sibo_Zhou_CV.pdf"}>{zh ? "个人简历（英文）" : "Curriculum vitae"} <span className="file-label">PDF</span></a>
        </div>
      </section>
      <section className="editorial-section" aria-labelledby="background-title">
        <h2 className="section-label" id="background-title">{zh ? "教育与经历" : "Background"}</h2>
        <div className="section-body">
          <p>{zh ? "我于 2026 年获得布朗大学数据科学理学硕士学位。此前，我在南加州大学学习应用与计算数学、经济学与数据科学、宗教学及全球研究。" : "I received my Sc.M. in Data Science from Brown University in 2026. Previously, I studied applied and computational mathematics, economics and data science, religious studies, and global studies at the University of Southern California."}</p>
          <p>{zh ? "在加入伯克利与美国退伍军人事务部之前，我曾与布朗大学的 " : "Before joining Berkeley and the VA, I worked with "}<a href="https://home.watson.brown.edu/people/faculty/watson-faculty/robert-blair">{zh ? "Robert Blair 教授" : "Prof. Robert Blair"}</a>{zh ? "及南加州大学的 " : " at Brown and "}<a href="https://dornsife.usc.edu/profile/yuehao-bai/">{zh ? "Yuehao Bai 教授" : "Prof. Yuehao Bai"}</a>{zh ? "合作。我也曾担任统计学习、数据工程、定性研究方法与数据科学课程的助教。" : " at USC. I have also taught as a teaching assistant in statistical learning, data engineering, qualitative research methods, and data science."}</p>
        </div>
      </section>
      <section className="editorial-section" aria-labelledby="news-title">
        <h2 className="section-label" id="news-title">{zh ? "荣誉与报道" : "Recognition & media"}</h2>
        <div>
          <article className="news-story">
          <p className="news-meta">{zh ? "南加州大学 Dornsife 学院 · " : "USC Dornsife · "}<time dateTime="2024-05-02">{zh ? "2024 年 5 月 2 日" : "May 2, 2024"}</time></p>
          <h3 lang="en"><a href="https://dornsife.usc.edu/news/stories/international-student-renaissance-scholar-earns-four-bachelors-degrees/">International student graduates with 4 bachelor’s degrees from USC Dornsife <span className="link-arrow" aria-hidden="true">↗</span></a></h3>
          <p className="news-reprint"><a href="https://we-are.usc.edu/2024/05/23/international-student-graduates-with-4-bachelors-degrees-from-usc-dornsife/">{zh ? "另见 We Are SC 报道" : "Also featured in We Are SC"} <span className="link-arrow" aria-hidden="true">↗</span></a> · <time dateTime="2024-05-23">{zh ? "2024 年 5 月 23 日" : "May 23, 2024"}</time></p>
          {zh && <p className="news-reprint"><a href="https://mp.weixin.qq.com/s/MTZ60leYEtZBZ_XnhVgJxw">微信报道 <span className="link-arrow" aria-hidden="true">↗</span></a></p>}
          </article>
          <ul className="recognition-links">
            <li>
              <a href="https://libraries.usc.edu/wallofscholars?award=1551">{zh ? "南加州大学 Renaissance Scholar 奖" : "USC Renaissance Scholar Prize"} <span className="link-arrow" aria-hidden="true">↗</span></a>
              <p>{zh ? "南加州大学图书馆 · 学者荣誉墙 · 2024 年" : "USC Libraries · Wall of Scholars · 2024"}</p>
            </li>
            <li>
              <a href="https://dornsife.usc.edu/dornsife-scholars-program/2024-dornsife-scholar-award-recipients/">{zh ? "南加州大学 Dornsife Scholar 奖" : "USC Dornsife Scholar Award"} <span className="link-arrow" aria-hidden="true">↗</span></a>
              <p>{zh ? "南加州大学 Dornsife 学院 · 2024 年获奖者" : "USC Dornsife · 2024 recipients"}</p>
            </li>
          </ul>
        </div>
      </section>
      <section className="editorial-section contact-section" aria-labelledby="contact-title">
        <h2 className="section-label" id="contact-title">{zh ? "联系我" : "Get in touch"}</h2>
        <div className="section-body">
          <a className="contact-link" href="mailto:sibozhou@berkeley.edu">sibozhou@berkeley.edu <span className="link-arrow" aria-hidden="true">↗</span></a>
          <a className="contact-link" href="https://www.linkedin.com/in/sibo-zhou88">linkedin.com/in/sibo-zhou88 <span className="link-arrow" aria-hidden="true">↗</span></a>
        </div>
      </section>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org", "@type": "Person", name: "Sibo Zhou", alternateName: "周思博",
        url: zh ? "https://sibozhou.com/zh/" : "https://sibozhou.com/",
        jobTitle: ["Predoctoral Scholar", "Research Statistician"],
        email: "mailto:sibozhou@berkeley.edu",
        sameAs: ["https://www.linkedin.com/in/sibo-zhou88"],
      }) }} />
    </SiteFrame>
  );
}
