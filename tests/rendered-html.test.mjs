import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { inflateSync } from "node:zlib";
import ts from "typescript";

const output = new URL("../dist/client/", import.meta.url);
const site = process.env.PAGES_SITE_URL ?? "https://sibozhou.com/";
const basePath = new URL(site).pathname;

for (const route of ["", "research/", "zh/", "zh/research/", "zh-hant/", "zh-hant/research/"]) {
  test(`static ${route || "home"} page and every local link resolve on GitHub Pages`, async () => {
    const html = await readFile(new URL(route + "index.html", output), "utf8");
    assert.doesNotMatch(html, /id="seasonal-theme"/);
    const markup = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, "");
    assert.equal((markup.match(/<h1\b/g) ?? []).length, 1);
    assert.match(markup, /aria-current="page"/);
    assert.match(markup, /id="main-content"/);
    assert.doesNotMatch(markup, /class="header-color"/);
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
    assert.match(arrowLinks[0][0], /class="wordmark/);
    assert.deepEqual(arrowLinks.slice(1).map(([, href]) => href), research ? [] : ["mailto:sibozhou@berkeley.edu", "https://www.linkedin.com/in/sibo-zhou88"]);
    for (const [link] of arrowLinks) {
      assert.match(link, /<span class="link-label"/);
      assert.match(link, /<span class="link-arrow" aria-hidden="true">↗<\/span>/);
    }
    const languageTag = traditional ? "zh-Hant" : chinese ? "zh-Hans" : "en";
    assert.ok(markup.includes(`<html lang="${languageTag}"`));
    const suffix = research ? "research/" : "";
    const alternateRoute = chinese ? suffix : "zh/" + suffix;
    for (const className of ["wordmark"]) {
      const link = markup.match(new RegExp(`<a class="${className}[^\"]*"[^>]*href="([^\"]+)"[^>]*>([\\s\\S]*?)<\\/a>`));
      assert.ok(link, `Missing ${className}`);
      assert.equal(new URL(link[1], site + route).href, site + alternateRoute);
      assert.equal(link[2].replace(/<[^>]*>/g, ""), chinese ? "Sibo↗" : "思博↗");
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

test("name and contact arrows share a small top-aligned treatment", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(css, /--type-arrow: 12px/);
  assert.match(css, /\.wordmark, \.contact-link \{[^}]*align-items: flex-start; column-gap: 6px/);
  assert.match(css, /\.wordmark \.link-label, \.contact-link \.link-label, \.wordmark \.link-arrow, \.contact-link \.link-arrow \{[^}]*text-box-trim: trim-both; text-box-edge: cap alphabetic/);
  assert.match(css, /a\.wordmark:is\(:hover, :focus-visible\) \{ text-decoration-line: none/);
  assert.match(css, /a\.wordmark:is\(:hover, :focus-visible\) \.link-label \{ text-decoration-line: underline/);
  assert.match(css, /\.site-shell \.site-header a\.wordmark:is\(:hover, :focus-visible\) \{ text-decoration-line: none/);
  assert.doesNotMatch(css, /\.wordmark \{ column-gap: 0; \}/);
  assert.match(css, /\.wordmark:not\(\.wordmark-english\) \.link-label \{ letter-spacing: 0; \}/);
});

test("tablet introduction uses a compact portrait and measured reading width", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  const tablet = css.slice(css.indexOf("/* Tablet widths"), css.indexOf("@media (max-width: 540px)"));
  assert.match(tablet, /\.intro \{ padding: 32px 0 40px/);
  assert.match(tablet, /grid-row: 1 \/ 3; inset: 0 [^;]+ -40px 0; width: auto; height: auto/);
  assert.match(tablet, /\.hero-content \{ grid-column: 1; grid-row: 2/);
  assert.match(tablet, /\.home-intro \.intro-copy \{ max-width: 64ch/);
  assert.match(tablet, /\.lead \{ font-size: 20px; max-width: 32ch/);
  assert.match(tablet, /min-width: 541px\) and \(max-width: 700px/);
});

test("favicon is the same ink as the main text", async () => {
  const icon = await readFile(new URL("favicon.svg", output), "utf8");
  assert.match(icon, /<circle cx="16" cy="16" r="14" fill="#242622"/);
  assert.doesNotMatch(icon, /<path/);
});

test("animated footer fills the screen and section text keeps desktop layout on tablets", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(css, /\.site-shell \{[^}]*min-height: 100vh; min-height: 100dvh; display: flex; flex-direction: column/);
  assert.match(css, /\.site-footer \{[^}]*flex-grow: 1;[^}]*align-content: flex-start/);
  assert.match(css, /\.disclosure-toggle \.section-label \{ display: block; width: fit-content/);
  assert.match(css, /\.site-shell \{ width: 100%; min-height: 0; display: block/);
});

test("neutral palette and static accessible fallbacks replace seasonal colors", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(css, /--ink: #242622/);
  assert.match(css, /--accent: var\(--ink\)/);
  assert.match(css, /--accent-surface: var\(--ink\)/);
  assert.doesNotMatch(css, /data-season|#754c47|#9aafa6|header-color/);
  assert.doesNotMatch(css, /prefers-reduced-motion: no-preference/);
  assert.match(css, /@media screen and \(forced-colors: none\) \{[^]*?animation: site-color-wave/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{\s*html \{ scroll-behavior: auto; \}/);
  assert.match(css, /forced-colors: none/);
  assert.match(css, /\.disclosure-toggle::before \{[^}]*background: var\(--paper\)/);
  assert.match(css, /\.disclosure-toggle:hover::before \{ opacity: 0; \}/);
  assert.match(css, /\.disclosure-toggle, \.disclosure-toggle::before, \.disclosure-panel \{ transition: none; \}/);
});

test("downloadable CV is a PDF", async () => {
  const pdf = await readFile(new URL("Sibo_Zhou_CV.pdf", output));
  assert.equal(pdf.subarray(0, 5).toString(), "%PDF-");
});

test("one diagonal ink wave covers bars and footer while the header stays static", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.equal((css.match(/animation: site-color-wave/g) ?? []).length, 1);
  assert.doesNotMatch(css, /:root\[data-color-wave="ready"\] \.site-header/);
  assert.match(css, /:is\(#main-content, \.site-footer\) \{ animation: site-color-wave/);
  const inverse = css.match(/--inverse-paint: repeating-linear-gradient\([^]*?\);/)?.[0] ?? "";
  assert.doesNotMatch(inverse, /var\(--(?:paper|ink)\) 0/);
  assert.ok(inverse.includes("- 53.2 * var(--wave-unit)"));
  assert.ok(inverse.includes("- 47.2 * var(--wave-unit)"));
  assert.match(css, /--wave-paint: repeating-linear-gradient\(105deg in oklab/);
  assert.match(css, /--inverse-paint: repeating-linear-gradient\(105deg/);
  assert.match(css, /\.disclosure-toggle \.section-label, \.site-footer p, \.language-switch/);
  assert.doesNotMatch(css, /--wave-travel/);
  assert.ok(css.includes("to { --wave-x: calc(127.5 * var(--wave-unit)); }"));
  assert.match(css, /data-open="true"[^]*?-webkit-text-fill-color: var\(--ink\)/);
  assert.match(css, /:focus-visible \.section-label/);
  assert.match(css, /:hover \.section-label/);
  assert.match(css, /--disclosure-space: 44px/);
  assert.match(css, /--disclosure-space: 38px/);
  assert.match(css, /--disclosure-space: 30px/);
  const profiles = [...css.matchAll(/--wave-unit: ([\d.]+)vw;\s*--wave-duration: ([\d.]+)s;/g)];
  assert.deepEqual(profiles.map(([, unit, duration]) => [+unit, +duration]), [[1,92],[.9,86],[.75,77]]);
  assert.equal((css.match(/--wave-paint: repeating-linear-gradient/g) ?? []).length, 1);
  const curve = css.match(/--wave-paint: repeating-linear-gradient\([^]*?\n    \);/)?.[0] ?? "";
  assert.equal((curve.match(/calc\(var\(--wave-x\)/g) ?? []).length, 131);
  // Equal 51-unit plateaus and mirrored 51-unit fades. The loop moves exactly
  // one 204-unit repeat, so its final frame and first frame are identical.
  assert.equal(127.5 - 76.5, 25.5 - (-25.5));
  assert.equal(127.5 - (-76.5), 4 * 51);
});

test("wave position stays stable during repeated toggles, scrolling, and mobile resize events", async () => {
  const source = await readFile(new URL("../app/site-color-wave.tsx", import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const horizontal = Math.cos(15 * Math.PI / 180), vertical = Math.sin(15 * Math.PI / 180);
  for (const [width, unit, duration] of [[1440,1,92],[834,.9,86],[390,.75,77]]) {
    let resize, cleanup, observedResize;
    const observed = [];
    const make = (left, top, bottom = top + 30) => ({
      rect: { left, top, bottom }, values: {},
      getBoundingClientRect() { return { ...this.rect, height: this.rect.bottom - this.rect.top }; },
      contains(label) { return this.label === label; },
      style: { setProperty(name, value) { this.owner.values[name] = value; } },
    });
    const bar = make(0,600,700), footer = make(20,900,1000), label = make(20,640), footerLabel = make(20,930);
    const photo = make(width / 2,200,500);
    const header = make(20,0,72), headerLabel = make(20,25,45);
    header.style.owner = header; headerLabel.style.owner = headerLabel;
    photo.rect.width = width / 2;
    const midpoint = width === 390 ? NaN : width === 834 ? .14 : .3084760577;
    bar.label = label; footer.label = footerLabel;
    const elements = [bar,footer,label,footerLabel];
    elements.forEach(el => { el.style.owner = el; });
    const root = { clientWidth: width, dataset: {}, values: {} };
    root.style = { setProperty: (k,v) => { root.values[k] = v; }, removeProperty: k => { delete root.values[k]; } };
    const exports = {};
    runInNewContext(compiled, {
      exports, require: () => ({ useEffect: fn => { cleanup = fn(); } }),
      CSS: { registerProperty() {}, supports: () => true },
      document: { documentElement: root,
        querySelector: selector => selector === ".site-footer" ? footer : selector === ".hero-art" ? photo : selector === ".site-header" ? header : null,
        querySelectorAll: selector => selector === ".disclosure-toggle, .site-footer" ? [bar,footer] : selector.startsWith(".site-header") ? [headerLabel] : [label,footerLabel],
      },
      window: { innerWidth: width, addEventListener: (_,fn) => { resize = fn; }, removeEventListener() {} },
      ResizeObserver: class { constructor(fn) { observedResize = fn; } observe(el) { observed.push(el); } disconnect() {} },
      getComputedStyle: () => ({ getPropertyValue: name => name === "--wave-unit" ? unit + "vw" : name === "--wave-entry-shift" ? (width === 1440 ? ".03" : "0") : name === "--photo-fade-midpoint" ? String(midpoint) : duration + "s" }),
    });
    exports.SiteColorWave({ pageKey: "en/home" });
    assert.equal(root.dataset.colorWave, "ready");
    assert.deepEqual(header.values, {});
    assert.deepEqual(headerLabel.values, {});
    assert.equal(parseFloat(bar.values["--wave-origin"]), 0);
    assert.equal(parseFloat(label.values["--wave-origin"]), 20 * horizontal + 40 * vertical);
    assert.equal(parseFloat(footer.values["--wave-origin"]), 99 * vertical);
    assert.equal(root.values["--wave-travel"], undefined);
    const delay = root.values["--wave-delay"];
    const distance = 204 * unit * width / 100;
    const center = -76.5 * unit * width / 100 - parseFloat(delay) / duration * distance;
    const photoBoundary = (photo.rect.left + midpoint * photo.rect.width) * horizontal;
    if (Number.isFinite(midpoint)) {
      const delta = center - 51 * unit * width / 100 - photoBoundary + (width === 1440 ? .03 * width * horizontal : 0);
      assert.ok(Math.abs(delta / distance - Math.round(delta / distance)) < 1e-10, "Opening wave midpoint must continue the photo fade modulo its repeat");
    } else {
      assert.ok(Math.abs(center + 63.75 * unit * width / 100) < 1e-10, "Mobile without a side fade retains a finite opening phase");
    }
    const origins = elements.map(el => el.values["--wave-origin"]);
    assert.deepEqual(observed, elements, "Do not observe the static header or expanding content");
    for (const shift of [20,80,100,400,-400,-100,-80,-20,900,-900]) {
      footer.rect.top += shift; footer.rect.bottom += shift;
      footerLabel.rect.top += shift; footerLabel.rect.bottom += shift;
      observedResize();
      resize(); // Mobile browser chrome also emits height-only resize events.
      assert.equal(root.values["--wave-travel"], undefined, "Toggling must not introduce a layout-dependent endpoint");
      assert.deepEqual(elements.map(el => el.values["--wave-origin"]), origins);
      assert.equal(root.values["--wave-delay"], delay, "Toggling must not reset the animation phase");
    }
    for (const el of elements) { el.rect.top -= 300; el.rect.bottom -= 300; }
    resize();
    assert.deepEqual(elements.map(el => el.values["--wave-origin"]), origins, "Scrolling must not shift wave coordinates");
    root.clientWidth += 200;
    resize();
    assert.equal(root.values["--wave-width"], `${width + 200}px`);
    assert.equal(root.values["--wave-delay"], delay, "A width change must not recalculate the running animation's starting phase");
    cleanup();
    assert.equal(root.dataset.colorWave, undefined);
  }
});

test("wave lifecycle has no reload, navigation, or iteration handler", async () => {
  const wave = await readFile(new URL("../app/site-color-wave.tsx", import.meta.url), "utf8");
  const disclosure = await readFile(new URL("../app/home-disclosure.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(wave + disclosure, /location\.|reload\(|router\.refresh|animationiteration|animationend|setInterval/);
  assert.match(disclosure, /type="button"/);
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

test("photo masks follow the bar diagonal with dithered, feathered left edges", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  for (const name of ["desktop","tablet","mobile"]) {
    assert.ok(css.includes('url("./masks/photo-' + name + '.png")'));
    const png = await readFile(new URL("../app/masks/photo-" + name + ".png", import.meta.url));
    assert.equal(png.subarray(1,4).toString(), "PNG");
    const width = png.readUInt32BE(16), height = png.readUInt32BE(20);
    assert.deepEqual([width,height,png[24],png[25]], [1536,name === "mobile" ? 1024 : 4096,8,4]);
    const parts = [];
    for (let offset=8; offset<png.length;) {
      const length=png.readUInt32BE(offset);
      if (png.toString("ascii",offset+4,offset+8)==="IDAT") parts.push(png.subarray(offset+8,offset+8+length));
      offset+=length+12;
    }
    const raw=inflateSync(Buffer.concat(parts));
    const alpha=(x,y)=>raw[y*(width*2+1)+2+x*2];
    if(name==="mobile") {
      assert.equal(alpha(500,0),0); assert.equal(alpha(500,height-1),0);
      assert.equal(alpha(500,Math.round(height*.5)),255);
      for (const x of [0, width-1]) {
        for (const y of [.2,.5,.7]) assert.equal(alpha(x,Math.round(height*y)),255, "Mobile side edges must remain opaque");
      }
      assert.ok(new Set(Array.from({length:100},(_,x)=>alpha(x,50))).size>1);
    } else {
      for (const y of [0,500,height-1]) assert.equal(alpha(0,y),0);
      assert.equal(alpha(width-1,height-1),255);
      const boundary=name==="desktop"?.4368:.30;
      assert.equal(alpha(Math.ceil(width*boundary),height-1),255);
      const midpoint=name==="desktop"?.3084760577:.14;
      assert.ok(css.includes(`--photo-fade-midpoint: ${String(midpoint).slice(1)}`));
      assert.ok(Math.abs(alpha(Math.round((width-1)*midpoint),height-1)-127.5)<=3, "Opening wave anchor must match the actual photo mask midpoint");
      // A 75-degree boundary has normal (cos15, sin15), starting at bottom-left.
      assert.ok(Math.abs(alpha(350,height-101)-alpha(323,height-1)) <= 4);
      for (const y of [height-1000,height-600,height-200,height-1]) {
        const x = Math.round(250 + (height-1-y) * Math.tan(15*Math.PI/180));
        assert.ok(Math.abs(alpha(x,y)-alpha(250,height-1)) <= 4, "Fade must continue through the full visible height");
      }
      assert.ok(alpha(220,height-1) > alpha(220,height-500));
      assert.ok(new Set(Array.from({length:100},(_,y)=>alpha(400,height-1-y))).size>1);
    }
  }
  assert.match(css, /mask-size: 100% auto; mask-position: left bottom/);
  const mobile = css.slice(css.indexOf("@media (max-width: 540px)"));
  assert.match(mobile, /left: -20px; width: calc\(100% \+ 40px\)/);
  assert.match(mobile, /mask-image: url\("\.\/masks\/photo-mobile.png"\); mask-size: 100% 100%/);
  assert.doesNotMatch(mobile, /photo-desktop.png|mask-composite/);
});
