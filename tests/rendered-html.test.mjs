import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";
import { runInNewContext } from "node:vm";

const output = new URL("../dist/client/", import.meta.url);
const site = process.env.PAGES_SITE_URL ?? "https://sibozhou.com/";
const basePath = new URL(site).pathname;

for (const route of ["", "research/", "zh/", "zh/research/", "zh-hant/", "zh-hant/research/"]) {
  test(`static ${route || "home"} page and every local link resolve on GitHub Pages`, async () => {
    const html = await readFile(new URL(route + "index.html", output), "utf8");
    assert.match(html, /<head>[^]*?<script id="seasonal-theme">[^]*?<\/script>[^]*?<\/head>/);
    const markup = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, "");
    assert.equal((markup.match(/<h1\b/g) ?? []).length, 1);
    assert.match(markup, /aria-current="page"/);
    assert.match(markup, /id="main-content"/);
    assert.equal((markup.match(/class="header-color"/g) ?? []).length, 3);
    const favicon = markup.match(/<link\b(?=[^>]*rel="icon")[^>]*>/)?.[0] ?? "";
    assert.match(favicon, /type="image\/svg\+xml"/);
    assert.equal(new URL(favicon.match(/href="([^"]+)"/)?.[1] ?? "", site + route).href, "https://sibozhou.com/favicon.svg");
    assert.ok(markup.includes('href="https://sibozhou.com/' + route + '"'));
    assert.doesNotMatch(markup, /codex-preview|Building your site|213-910-6886|We investigated whether/i);
    const traditional = route.startsWith("zh-hant/");
    const chinese = traditional || route.startsWith("zh/");
    const research = route.endsWith("research/");
    const title = research ? chinese ? "研究 — 周思博" : "Research — Sibo Zhou" : traditional ? "認識周思博" : chinese ? "认识周思博" : "Meet Sibo Zhou";
    assert.ok(markup.includes(`<title>${title}</title>`));
    assert.ok(markup.includes(`property="og:title" content="${title}"`));
    const arrowLinks = [...markup.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>[^]*?<\/a>/g)]
      .filter(([link]) => /[↗↓→]/.test(link));
    assert.deepEqual(arrowLinks.map(([, href]) => href), research ? [] : ["mailto:sibozhou@berkeley.edu", "https://www.linkedin.com/in/sibo-zhou88"]);
    const languageTag = traditional ? "zh-Hant" : chinese ? "zh-Hans" : "en";
    assert.ok(markup.includes(`<html lang="${languageTag}"`));
    const suffix = research ? "research/" : "";
    const alternateRoute = chinese ? suffix : "zh/" + suffix;
    for (const className of ["wordmark"]) {
      const link = markup.match(new RegExp(`<a class="${className}[^\"]*"[^>]*href="([^\"]+)"[^>]*>([\\s\\S]*?)<\\/a>`));
      assert.ok(link, `Missing ${className}`);
      assert.equal(new URL(link[1], site + route).href, site + alternateRoute);
      assert.equal(link[2].replace(/<[^>]*>/g, ""), chinese ? "Sibo" : "思博");
    }
    const switches = [...markup.matchAll(/<a class="language-switch"[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/g)];
    const alternatives = [
      { tag: "en", path: "", label: "English" },
      { tag: "zh-Hans", path: "zh/", label: "简体中文" },
      { tag: "zh-Hant", path: "zh-hant/", label: "繁體中文" },
    ].filter((option) => option.tag !== languageTag);
    assert.equal(switches.length, 2);
    switches.forEach(([, href, label], index) => {
      assert.equal(new URL(href, site + route).href, site + alternatives[index].path + suffix);
      assert.equal(label, alternatives[index].label);
    });
    assert.match(markup, /hrefLang="en"|hreflang="en"/);
    assert.match(markup, /hrefLang="zh-Hans"|hreflang="zh-Hans"/);
    assert.match(markup, /hrefLang="zh-Hant"|hreflang="zh-Hant"/);
    if (traditional) {
      const main = markup.match(/<main\b[^]*?<\/main>/)?.[0] ?? "";
      assert.doesNotMatch(main, /[学与书国体奖联数经机习统员发论报网获协]/);
      assert.match(main, research ? /工作論文/ : /資料科學/);
    }
    if (research) {
      assert.doesNotMatch(markup, /class="disclosure-toggle"/);
      assert.ok(markup.includes(chinese ? "研究 — 周思博" : "Research — Sibo Zhou"));
      assert.match(markup, /Education selectively improves TB and HIV knowledge/);
      assert.equal((markup.match(/class="paper"/g) ?? []).length, 4);
      assert.match(markup, /id="publications"/);
      const workingPapers = markup.match(/<section[^>]*id="working-papers"[\s\S]*?<\/section>/)?.[0] ?? "";
      const publications = markup.match(/<section[^>]*id="publications"[\s\S]*?<\/section>/)?.[0] ?? "";
      assert.equal((workingPapers.match(/class="paper"/g) ?? []).length, 3);
      assert.doesNotMatch(workingPapers, /Diagnostic Considerations for Neurolymphomatosis/);
      assert.match(publications, /Diagnostic Considerations for Neurolymphomatosis/);
      assert.match(publications, /https:\/\/doi.org\/10.3390\/cancers18132068/);
      if (chinese) {
        assert.match(markup, /共同第一作者/);
        assert.doesNotMatch(markup, /同等贡献|同等貢獻/);
      } else {
        assert.match(markup, /Equal contribution/);
      }
    } else {
      assert.equal((markup.match(/class="disclosure-toggle"/g) ?? []).length, 3);
      assert.doesNotMatch(markup, /disclosure-indicator/);
      for (const id of ["background", "news", "contact"]) {
        const section = markup.match(new RegExp(`<section[^>]*aria-labelledby="${id}-title"[^]*?<\\/section>`))?.[0] ?? "";
        assert.match(section, /data-open="false"/);
        const labels = traditional ? ["經歷", "相關報導", "聯絡我"] : chinese ? ["经历", "相关报道", "联系我"] : ["Background", "Recognition &amp; media", "Get in touch"];
        assert.ok(section.includes(`<span class="section-label">${labels[["background", "news", "contact"].indexOf(id)]}</span>`));
        const button = section.match(/<button\b[^>]*>/)?.[0] ?? "";
        assert.match(button, /type="button"/);
        assert.match(button, /aria-expanded="false"/);
        assert.ok(button.includes(`aria-controls="${id}-content"`));
        const panel = section.match(/<div class="disclosure-panel"[^>]*>/)?.[0] ?? "";
        assert.ok(panel.includes(`id="${id}-content"`));
        assert.match(panel, /inert=""/);
        assert.match(panel, /aria-hidden="true"/);
      }
      assert.match(markup, /Sibo Zhou/);
      const intro = markup.match(/<section[^>]*aria-labelledby="intro-title"[^]*?<\/section>/)?.[0] ?? "";
      const heading = intro.indexOf('class="hero-heading"');
      const portrait = intro.indexOf('class="hero-art"');
      const biography = intro.indexOf('class="hero-content"');
      assert.ok(heading >= 0 && heading < portrait && portrait < biography, "Identity must precede the mobile portrait and biography");
      assert.match(intro, /sibo-zhou-coast\.jpg/);
      assert.doesNotMatch(intro, /natural-history|自然病程|My interests span|我的研究兴趣|我的研究興趣/);
      const copy = intro.match(/<div class="intro-copy">[^]*?<\/div>/)?.[0] ?? "";
      const paragraphs = [...copy.matchAll(/<p>([^]*?)<\/p>/g)].map(([, paragraph]) => paragraph.replace(/<[^>]*>/g, ""));
      assert.equal(paragraphs.length, 2);
      if (!chinese) {
        assert.deepEqual(paragraphs, [
          "I am a Predoctoral Scholar at UC Berkeley Haas and a Research Statistician at the VA, working with Prof. David Chan on health economics research.",
          "I also collaborate with Prof. Eric T. Wong at Brown on neuro-oncology studies.",
        ]);
      } else {
        assert.match(paragraphs[0], /David Chan/);
        assert.match(paragraphs[1], /Eric T. Wong/);
      }
      assert.ok(markup.includes(traditional ? "加州大學柏克萊分校哈斯商學院" : chinese ? "加州大学伯克利分校哈斯商学院" : "UC Berkeley Haas"));
      assert.ok(markup.includes("https://mp.weixin.qq.com/s/MTZ60leYEtZBZ_XnhVgJxw"));
      assert.match(markup, /Steven and Kathryn Sample Renaissance Scholar Prize/);
      assert.match(markup, /USC Dornsife Scholar Prize/);
      const background = markup.match(/<section[^>]*aria-labelledby="background-title"[^]*?<\/section>/)?.[0] ?? "";
      assert.match(background, /href="https:\/\/haas.berkeley.edu\/"/);
      assert.match(background, /href="https:\/\/www.va.gov\/"/);
      assert.match(background, chinese ? traditional ? /取得四個學士學位/ : /获得四个学士学位/ : /four bachelor’s degrees/);
      assert.equal((background.match(/<p>/g) ?? []).length, 3, "Education, academic experience, and industry experience remain distinct paragraphs");
      for (const program of ["graduate-program/data-science-scm", "catoid=22&amp;poid=31855", "catoid=22&amp;poid=32704", "catoid=22&amp;poid=31917", "catoid=22&amp;poid=31701"]) {
        assert.ok(background.includes(program), `Missing program link: ${program}`);
      }
      const social = markup.match(/<ul class="social-links"[^]*?<\/ul>/)?.[0] ?? "";
      assert.equal((social.match(/<a /g) ?? []).length, chinese ? 4 : 5);
      assert.equal(social.includes("social-icon-wechat"), !chinese);
      if (!chinese) {
        const icons = [...social.matchAll(/social-icon social-icon-([a-z]+)/g)].map((match) => match[1]);
        assert.deepEqual(icons, ["x", "instagram", "linkedin", "facebook", "wechat"]);
        assert.ok(social.includes("https://mp.weixin.qq.com/s/MTZ60leYEtZBZ_XnhVgJxw"));
      }
      for (const platform of ["x", "instagram", "linkedin", "facebook"]) {
        assert.ok(social.includes("social-icon-" + platform));
      }
      assert.equal(social.includes("838944394937168"), traditional);
      assert.equal(social.includes("973889751412532"), !traditional);
      assert.match(social, /1787955243994726820/);
      assert.match(social, /C72E_FaSwvP/);
      assert.match(social, /7192238670182014976-9dWk/);
      assert.equal(social.replace(/<[^>]*>/g, "").trim(), "");
      assert.equal((social.match(/aria-label="[^"]+"/g) ?? []).length, chinese ? 5 : 6);
      assert.doesNotMatch(markup, /news-reprint|We Are SC|School of Religion/);
      if (chinese) {
        assert.match(markup, traditional ? /擔任研究專員/ : /担任研究专员/);
        assert.doesNotMatch(markup, /初级研究专员/);
        assert.match(markup, traditional ? /南加州大學 · / : /南加州大学 · /);
        assert.doesNotMatch(markup, /官方网站|官方網站/);
        assert.match(markup, traditional ? /南加州大學 Dornsife 文理學院/ : /南加州大学 Dornsife 文理学院/);
        const articles = markup.match(/<article class="news-story">[^]*?<\/article>/g) ?? [];
        assert.equal(articles.length, 2);
        assert.ok(markup.indexOf(articles[0]) < markup.indexOf(articles[1]));
        assert.ok(markup.indexOf(articles[1]) < markup.indexOf(social));
        assert.match(articles[1], traditional ? /USC南加大中國 微信公眾號/ : /USC南加大中国 微信公众号/);
        assert.match(articles[1], /dateTime="2024-05-14"|datetime="2024-05-14"/);
        assert.match(articles[1], traditional ? /「我只是想不斷探索」/ : /“我只是想不断探索”/);
      }
      for (const href of ["https://haas.berkeley.edu/", "https://www.va.gov/", "https://haas.berkeley.edu/faculty/david-chan/", "https://neurosurgery.med.brown.edu/people/eric-t-wong-md", "https://home.watson.brown.edu/people/faculty/watson-faculty/robert-blair", "https://dornsife.usc.edu/profile/yuehao-bai/"]) {
        const link = markup.split(`href="${href}"`)[1]?.split("</a>")[0];
        assert.ok(link, `Missing biography link: ${href}`);
        assert.doesNotMatch(link, /link-arrow|↗/);
      }
      assert.match(html, /application\/ld\+json/);
    }

    for (const [, value] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
      const url = new URL(value.replaceAll("&amp;", "&"), site + route);
      if (url.origin !== new URL(site).origin || !["https:", "http:"].includes(url.protocol)) continue;
      assert.ok(url.pathname.startsWith(basePath), `Incorrect base path: ${value}`);
      const path = url.pathname.slice(basePath.length);
      const target = path.endsWith("/") ? path + "index.html" : path;
      await access(new URL(target, output));
      if (url.hash && target.endsWith(".html")) {
        const linkedHtml = await readFile(new URL(target, output), "utf8");
        assert.ok(linkedHtml.includes('id="' + url.hash.slice(1) + '"'), `Missing anchor: ${value}`);
      }
    }
  });
}

test("favicon is the muted-oxblood circle", async () => {
  const icon = await readFile(new URL("favicon.svg", output), "utf8");
  assert.match(icon, /<circle cx="16" cy="16" r="14" fill="#754C47"/);
  assert.doesNotMatch(icon, /<path/);
});

test("oxblood text pairings retain readable contrast", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  const color = (name) => css.match(new RegExp(`--${name}: (#[a-f0-9]{6});`, "i"))?.[1];
  const luminance = (hex) => {
    assert.ok(hex, "Missing palette color");
    const channels = hex.slice(1).match(/../g).map((value) => parseInt(value, 16) / 255)
      .map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  };
  for (const [text, background] of [["paper", "accent-surface"], ["accent", "paper"]]) {
    const values = [luminance(color(text)), luminance(color(background))].sort((a, b) => a - b);
    assert.ok((values[1] + 0.05) / (values[0] + 0.05) >= 4.5, `${text} on ${background} has insufficient contrast`);
  }
  const rgb = (name) => color(name).slice(1).match(/../g).map((value) => parseInt(value, 16));
  const strength = Number(css.match(/--bar-strength: ([\d.]+);/)?.[1]);
  for (const opacity of [0, strength]) {
    const background = "#" + rgb("paper").map((channel, index) =>
      Math.round(channel * (1 - opacity) + rgb("accent-surface")[index] * opacity).toString(16).padStart(2, "0")
    ).join("");
    assert.ok((luminance(background) + 0.05) / (luminance(color("bar-label")) + 0.05) >= 4.5,
      "Winter section labels must remain readable with and without the color wave");
  }
  assert.match(css, /background: var\(--paper\); color: var\(--bar-label\)/);
  assert.match(css, /\.disclosure-toggle::before \{[^}]*background: linear-gradient\(to right, var\(--accent-surface\)[^}]*var\(--paper\) 100%\)/);
  assert.match(css, /\.disclosure-toggle:hover::before \{ opacity: 0; \}/);
  assert.match(css, /\.disclosure-toggle, \.disclosure-toggle::before, \.disclosure-panel \{ transition: none; \}/);
});

test("seasonal palette follows all months, midnight boundaries, and resumed pages", async () => {
  const html = await readFile(new URL("index.html", output), "utf8");
  const script = html.match(/<script id="seasonal-theme">([^]*?)<\/script>/)?.[1];
  assert.ok(script);
  const icon = await readFile(new URL("favicon-summer.svg", output), "utf8");
  assert.match(icon, /fill="#9AAFA6"/);
  let now = new Date(2026, 0, 15, 12);
  let scheduled;
  let delay;
  let metadataChanged;
  const events = {};
  const root = { dataset: {} };
  const favicon = { href: "https://sibozhou.com/favicon.svg" };
  runInNewContext(script, {
    Date: class extends Date { constructor(...args) { super(...(args.length ? args : [now.getTime()])); } },
    URL,
    document: {
      documentElement: root, head: {}, hidden: false,
      querySelectorAll: () => [favicon],
      addEventListener: (name, callback) => { events[name] = callback; },
    },
    window: { addEventListener: (name, callback) => { events[name] = callback; } },
    MutationObserver: class { constructor(callback) { metadataChanged = callback; } observe() {} },
    setTimeout: (callback, ms) => { scheduled = callback; delay = ms; return 1; },
    clearTimeout: () => {},
  });
  const check = (summer) => {
    assert.equal(root.dataset.season, summer ? "summer" : "winter");
    assert.equal(favicon.href, "https://sibozhou.com/" + (summer ? "favicon-summer.svg" : "favicon.svg"));
    assert.ok(delay > 0 && delay <= 25 * 60 * 60 * 1000);
  };
  for (let month = 0; month < 12; month++) {
    now = new Date(2026, month, 15, 12);
    events.pageshow();
    check(month >= 3 && month <= 8);
  }
  for (const month of [2, 8]) {
    now = new Date(2026, month + 1, 1, 0, 0, -1);
    events.visibilitychange();
    assert.equal(delay, 1000);
    check(month === 8);
    now = new Date(2026, month + 1, 1);
    scheduled();
    check(month === 2);
  }
  now = new Date(2027, 5, 1);
  events.visibilitychange();
  check(true);
  favicon.href = "https://sibozhou.com/favicon.svg";
  metadataChanged();
  check(true);
});

test("downloadable CV is a PDF", async () => {
  const pdf = await readFile(new URL("Sibo_Zhou_CV.pdf", output));
  assert.equal(pdf.subarray(0, 5).toString(), "%PDF-");
});

test("bars and header share one slow viewport-aligned wave with fixed section labels", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.equal((css.match(/animation: site-color-wave/g) ?? []).length, 1);
  assert.match(css, /animation: site-color-wave 73s linear infinite/);
  assert.match(css, /from \{ --wave-x: -45vw; \}/);
  const pause = css.match(/([\d.]+)%, 100% \{ --wave-x: 145vw; \}/);
  assert.ok(pause);
  assert.ok(Math.abs(73 * (1 - Number(pause[1]) / 100) - 1) < 0.000001);
  assert.match(css, /@media screen and \(prefers-reduced-motion: no-preference\) and \(forced-colors: none\)/);
  assert.match(css, /\.disclosure-toggle \.section-label \{ padding: 0; color: var\(--bar-label\); \}/);
  assert.match(css, /--bar-label: var\(--ink\)/);
  assert.doesNotMatch(css, /wordmark-color-sweep/);
  // The header subtracts each label's actual viewport position; the
  // edge-to-edge bars start at zero and therefore need no offset.
  assert.ok(css.includes("#000 calc(var(--wave-x) - 15vw),\n      #000 calc(var(--wave-x) + 15vw)"));
  for (const edge of ["- 45vw","- 41.25vw","- 37.5vw","- 33.75vw","- 30vw","- 26.25vw","- 22.5vw","- 18.75vw","- 15vw","+ 15vw","+ 18.75vw","+ 22.5vw","+ 26.25vw","+ 30vw","+ 33.75vw","+ 37.5vw","+ 41.25vw","+ 45vw"]) {
    assert.ok(css.includes(`calc(var(--wave-x) ${edge})`));
    assert.ok(css.includes(`calc(var(--wave-x) - var(--wave-origin) ${edge})`));
  }
  const alignment = await readFile(new URL("../app/site-color-wave.tsx", import.meta.url), "utf8");
  assert.match(alignment, /label\.getBoundingClientRect\(\)\.left/);
  assert.match(alignment, /new ResizeObserver\(align\)/);
});

test("Chinese research preserves English paper titles and authors", async () => {
  const english = await readFile(new URL("research/index.html", output), "utf8");
  for (const route of ["zh/", "zh-hant/"]) {
    const chinese = await readFile(new URL(route + "research/index.html", output), "utf8");
    for (const pattern of [/<h3\b[^>]*>[\s\S]*?<\/h3>/g, /<p class="authors"[^>]*>[\s\S]*?<\/p>/g]) {
      assert.deepEqual(chinese.match(pattern), english.match(pattern));
    }
  }
});
