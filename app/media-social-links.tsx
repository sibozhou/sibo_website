import type { Language } from "./languages";

const posts = [
  { icon: "x", label: "USC post on X", href: "https://x.com/USC/status/1787955243994726820?s=20" },
  { icon: "instagram", label: "USC post on Instagram", href: "https://www.instagram.com/p/C72E_FaSwvP/" },
  { icon: "linkedin", label: "USC Dornsife post on LinkedIn", href: "https://www.linkedin.com/posts/uscdornsife_international-student-earns-four-bachelor-activity-7192238670182014976-9dWk/" },
];

export function MediaSocialLinks({ language }: { language: Language }) {
  const facebook = language === "zh-hant"
    ? { icon: "facebook", label: "USC Taiwan post on Facebook", href: "https://www.facebook.com/USC.TW/photos/南加大-usc-各學院正陸續舉辦畢業慶典-其中一位大學部的國際學生將以取得四個學士學位的驚人紀錄-為自己的大學學習寫下精彩結局-這位同學-sibo-carl-z/838944394937168/" }
    : { icon: "facebook", label: "USC Dornsife post on Facebook", href: "https://www.facebook.com/uscdornsife/photos/sibo-carl-zhou-never-set-out-to-be-an-overachievera-native-of-haikou-on-chinas-s/973889751412532/" };
  return (
    <ul className="social-links" aria-label="USC social media posts" lang="en">
      {[...posts, facebook].map((post) => (
        <li key={post.icon}>
          <a href={post.href} aria-label={post.label}>
            <span className={"social-icon social-icon-" + post.icon} aria-hidden="true" />
          </a>
        </li>
      ))}
    </ul>
  );
}
