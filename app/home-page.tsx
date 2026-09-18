import { SiteFrame } from "./site-frame";
import { chineseText, type Language } from "./languages";
import { MediaSocialLinks } from "./media-social-links";
import { HomeDisclosure } from "./home-disclosure";

const programs = {
  dataScience: "https://graduateprograms.brown.edu/graduate-program/data-science-scm",
  mathematics: "https://catalogue.usc.edu/preview_program.php?catoid=22&poid=31855&hl",
  economics: "https://catalogue.usc.edu/preview_program.php?catoid=22&poid=32704&hl",
  religion: "https://catalogue.usc.edu/preview_program.php?catoid=22&poid=31917&hl",
  globalStudies: "https://catalogue.usc.edu/preview_program.php?catoid=22&poid=31701&hl",
};

export function HomePage({ language = "en" }: { language?: Language }) {
  const zh = language !== "en";
  const t = (text: string) => chineseText(language, text);
  const assets = zh ? "../" : "";
  return (
    <SiteFrame page="home" language={language}>
      <section className="intro home-intro" aria-labelledby="intro-title">
        <div className="hero-heading">
          <h1 id="intro-title">{zh ? "周思博" : "Sibo Zhou"}</h1>
          <p className="lead">{zh ? t("以经济学与数据，理解人的行为与健康。") : "Understanding people and health through economics and data."}</p>
        </div>
        <div className="hero-art">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="hero-photo" src={assets + "sibo-zhou-coast.jpg"} alt={zh ? "周思博" : "Sibo Zhou"} width={1012} height={1800} fetchPriority="high" />
        </div>
        <div className="hero-content">
        <div className="intro-copy">
          <p>{zh ? "我目前在" : "I am a Predoctoral Scholar at "}<a href="https://haas.berkeley.edu/">{zh ? t("加州大学伯克利分校哈斯商学院") : "UC Berkeley Haas"}</a>{zh ? t("担任研究专员，同时在") : " and a Research Statistician at the "}<a href="https://www.va.gov/">{zh ? t("美国退伍军人事务部（VA）") : "VA"}</a>{zh ? t("担任研究统计师，与 ") : ", working with "}<a href="https://haas.berkeley.edu/faculty/david-chan/">{zh ? "David Chan 教授" : "Prof. David Chan"}</a>{zh ? t("合作开展健康经济学研究。") : " on health economics research."}</p>
          <p>{zh ? <>{t("此外，我与")}<a href="https://brown.edu/">{t("布朗大学")}</a>的 </> : "I also collaborate with "}<a href="https://neurosurgery.med.brown.edu/people/eric-t-wong-md">{zh ? "Eric T. Wong 教授" : "Prof. Eric T. Wong"}</a>{zh ? t("合作，开展神经肿瘤学研究。") : <> at <a href="https://brown.edu/">Brown</a> on neuro-oncology studies.</>}</p>
        </div>
        <div className="text-links">
          <a className="primary-link" href="research/">{zh ? "了解我的研究" : "Explore my research"}</a>
          <a className="cv-link" href={assets + "Sibo_Zhou_CV.pdf"}>{zh ? t("个人简历（英文）") : "Curriculum vitae"} <span className="file-label">PDF</span></a>
        </div>
        </div>
      </section>
      <HomeDisclosure id="background" label={zh ? t("教育与经历") : "Background"}>
        <div className="section-body">
          <p>{zh ? <>{t("我于 2026 年获得")}<a href="https://brown.edu/">{t("布朗大学")}</a><a href={programs.dataScience}>{t("数据科学硕士")}</a>{t("学位。此前，我在")}<a href="https://usc.edu/">{t("南加州大学")}</a>{t("获得四个学士学位，专业分别为")}<a href={programs.mathematics}>{t("应用数学")}</a>、<a href={programs.economics}>{t("经济学与数据科学")}</a>、<a href={programs.religion}>{t("宗教学")}</a>及<a href={programs.globalStudies}>全球研究</a>。</> : <>I received my <a href={programs.dataScience}>Sc.M. in Data Science</a> from <a href="https://brown.edu/">Brown University</a> in 2026. Previously, I earned four bachelor’s degrees at the <a href="https://usc.edu/">University of Southern California</a>, in <a href={programs.mathematics}>applied and computational mathematics</a>, <a href={programs.economics}>economics and data science</a>, <a href={programs.religion}>religious studies</a>, and <a href={programs.globalStudies}>global studies</a>.</>}</p>
          <p>{zh ? <>在加入<a href="https://haas.berkeley.edu/">{t("伯克利")}</a>{t("与")}<a href="https://www.va.gov/">VA</a>{t("之前，我曾担任研究助理，与")}<a href="https://brown.edu/">{t("布朗大学")}</a>的 </> : <>Before joining <a href="https://haas.berkeley.edu/">Haas</a> and the <a href="https://www.va.gov/">VA</a>, I worked with </>}<a href="https://home.watson.brown.edu/people/faculty/watson-faculty/robert-blair">{zh ? "Robert Blair 教授" : "Prof. Robert Blair"}</a>{zh ? <>及<a href="https://usc.edu/">{t("南加州大学")}</a>的 </> : <> at <a href="https://brown.edu/">Brown</a> and </>}<a href="https://dornsife.usc.edu/profile/yuehao-bai/">{zh ? "Yuehao Bai 教授" : "Prof. Yuehao Bai"}</a>{zh ? "合作。" : <> at <a href="https://usc.edu/">USC</a> as a Research Assistant.</>}</p>
          <p>{zh ? <>我也曾在 <a href="https://www.rocketmortgage.com/">Rocket Mortgage</a>{" "}{t("担任数据科学实习生，并在")}<a href="https://www.ey.com/zh_cn">安永（EY）</a>{t("担任精算咨询实习生。")}</> : <>My industry experience includes internships in data science at <a href="https://www.rocketmortgage.com/">Rocket Mortgage</a> and actuarial consulting at <a href="https://www.ey.com/zh_cn">EY</a>.</>}</p>
        </div>
      </HomeDisclosure>
      <HomeDisclosure id="news" label={zh ? t("荣誉与报道") : "Recognition & media"}>
        <div>
          <article className="news-story">
          <p className="news-meta">{zh ? t("南加州大学") + " · " : "USC Dornsife · "}<time dateTime="2024-05-02">{zh ? "2024 年 5 月 2 日" : "May 2, 2024"}</time></p>
          <h3 lang="en"><a href="https://dornsife.usc.edu/news/stories/international-student-renaissance-scholar-earns-four-bachelors-degrees/">International student graduates with 4 bachelor’s degrees from USC Dornsife</a></h3>
          </article>
          {zh && (
            <article className="news-story">
              <p className="news-meta">{t("USC南加大中国 微信公众号 · ")}<time dateTime="2024-05-14">2024 年 5 月 14 日</time></p>
              <h3><a href="https://mp.weixin.qq.com/s/MTZ60leYEtZBZ_XnhVgJxw">{t("“我只是想不断探索”")}</a></h3>
            </article>
          )}
          <MediaSocialLinks language={language} />
          <ul className="recognition-links">
            <li>
              <a href="https://libraries.usc.edu/wallofscholars?award=1551">Steven and Kathryn Sample Renaissance Scholar Prize</a>
              <p>{zh ? t("南加州大学图书馆 · 学者荣誉墙 · 2024 年") : "USC Libraries · Wall of Scholars · 2024"}</p>
            </li>
            <li>
              <a href="https://dornsife.usc.edu/dornsife-scholars-program/2024-dornsife-scholar-award-recipients/">USC Dornsife Scholar Prize</a>
              <p>{zh ? t("南加州大学 Dornsife 文理学院 · 2024 年") : "USC Dornsife · 2024"}</p>
            </li>
          </ul>
        </div>
      </HomeDisclosure>
      <HomeDisclosure id="contact" label={zh ? t("联系我") : "Get in touch"}>
        <div className="section-body">
          <a className="contact-link" href="mailto:sibozhou@berkeley.edu">sibozhou@berkeley.edu <span className="link-arrow" aria-hidden="true">↗</span></a>
          <a className="contact-link" href="https://www.linkedin.com/in/sibo-zhou88">linkedin.com/in/sibo-zhou88 <span className="link-arrow" aria-hidden="true">↗</span></a>
        </div>
      </HomeDisclosure>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org", "@type": "Person", name: "Sibo Zhou", alternateName: "周思博",
        url: "https://sibozhou.com/" + (zh ? language + "/" : ""),
        jobTitle: ["Predoctoral Scholar", "Research Statistician"],
        email: "mailto:sibozhou@berkeley.edu",
        sameAs: ["https://www.linkedin.com/in/sibo-zhou88"],
      }) }} />
    </SiteFrame>
  );
}
