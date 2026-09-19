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

test("favicon is the same ink as the main text", async () => {
  const icon = await readFile(new URL("favicon.svg", output), "utf8");
  assert.match(icon, /<circle cx="16" cy="16" r="14" fill="#242622"/);
  assert.doesNotMatch(icon, /<path/);
});

test("neutral palette and static accessible fallbacks replace seasonal colors", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(css, /--ink: #242622/);
  assert.match(css, /--accent: var\(--ink\)/);
  assert.match(css, /--accent-surface: var\(--ink\)/);
  assert.doesNotMatch(css, /data-season|#754c47|#9aafa6|header-color/);
  assert.match(css, /prefers-reduced-motion: no-preference/);
  assert.match(css, /forced-colors: none/);
  assert.match(css, /\.disclosure-toggle::before \{[^}]*background: var\(--paper\)/);
  assert.match(css, /\.disclosure-toggle:hover::before \{ opacity: 0; \}/);
  assert.match(css, /\.disclosure-toggle, \.disclosure-toggle::before, \.disclosure-panel \{ transition: none; \}/);
});

test("downloadable CV is a PDF", async () => {
  const pdf = await readFile(new URL("Sibo_Zhou_CV.pdf", output));
  assert.equal(pdf.subarray(0, 5).toString(), "%PDF-");
});

test("one diagonal ink wave covers slimmer bars and footer, not the header", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.equal((css.match(/animation: site-color-wave/g) ?? []).length, 1);
  assert.match(css, /--wave-paint: linear-gradient\(135deg in oklab/);
  assert.match(css, /--inverse-paint: linear-gradient\(135deg/);
  assert.match(css, /\.disclosure-toggle \.section-label, \.site-footer p, \.language-switch/);
  assert.match(css, /--wave-travel/);
  assert.match(css, /data-open="true"[^]*?-webkit-text-fill-color: var\(--ink\)/);
  assert.match(css, /:focus-visible \.section-label/);
  assert.match(css, /:hover \.section-label/);
  assert.match(css, /--disclosure-space: 44px/);
  assert.match(css, /--disclosure-space: 38px/);
  assert.match(css, /--disclosure-space: 30px/);
  const profiles = [...css.matchAll(/--wave-unit: ([\d.]+)vw;\s*--wave-duration: ([\d.]+)s;/g)];
  assert.deepEqual(profiles.map(([, unit, duration]) => [+unit, +duration]), [[1,95],[.9,89],[.75,80]]);
  assert.equal((css.match(/--wave-paint: linear-gradient/g) ?? []).length, 1);
  const curve = css.match(/--wave-paint: linear-gradient\([^]*?\n    \);/)?.[0] ?? "";
  assert.equal((curve.match(/calc\(var\(--wave-x\)/g) ?? []).length, 130);
});

test("diagonal coordinates remain joined after expansion and responsive resizing", async () => {
  const source = await readFile(new URL("../app/site-color-wave.tsx", import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  for (const [width, unit, duration] of [[1440,1,95],[834,.9,89],[390,.75,80]]) {
    let resize, cleanup;
    const make = (left, top, bottom = top + 30) => ({
      rect: { left, top, bottom }, values: {},
      getBoundingClientRect() { return this.rect; },
      style: { setProperty(name, value) { this.owner.values[name] = value; } },
    });
    const bar = make(0,600,700), footer = make(20,900,1000), label = make(20,640), footerLabel = make(20,930);
    const elements = [bar,footer,label,footerLabel];
    elements.forEach(el => { el.style.owner = el; });
    const root = { clientWidth: width, dataset: {}, values: {} };
    root.style = { setProperty: (k,v) => { root.values[k] = v; }, removeProperty: k => { delete root.values[k]; } };
    const exports = {};
    runInNewContext(compiled, {
      exports, require: () => ({ useEffect: fn => { cleanup = fn(); } }),
      CSS: { registerProperty() {}, supports: () => true },
      document: { documentElement: root,
        querySelector: selector => selector === ".site-footer" ? footer : bar,
        querySelectorAll: selector => selector === ".disclosure-toggle, .site-footer" ? [bar,footer] : selector === ".disclosure-panel" ? [] : [label,footerLabel],
      },
      window: { innerWidth: width, addEventListener: (_,fn) => { resize = fn; }, removeEventListener() {} },
      ResizeObserver: class { observe() {} disconnect() {} },
      getComputedStyle: () => ({ getPropertyValue: name => name === "--wave-unit" ? unit + "vw" : duration + "s" }),
    });
    exports.SiteColorWave({ pageKey: "en/home" });
    assert.equal(root.dataset.colorWave, "ready");
    assert.equal(parseFloat(bar.values["--wave-origin"]), 0);
    assert.equal(parseFloat(label.values["--wave-origin"]), 60 / Math.SQRT2);
    assert.equal(parseFloat(footer.values["--wave-origin"]), 299 / Math.SQRT2);
    const travel = (width + 400) / Math.SQRT2;
    assert.equal(parseFloat(root.values["--wave-travel"]), travel);
    const delay = root.values["--wave-delay"];
    const distance = travel + 153 * unit * width / 100;
    assert.ok(Math.abs(-parseFloat(delay) / duration * distance / (51 * unit * width / 100) - .25) < 1e-10);
    footer.rect.top += 200; footer.rect.bottom += 200; footerLabel.rect.top += 200;
    resize();
    assert.equal(parseFloat(footer.values["--wave-origin"]), 499 / Math.SQRT2);
    assert.equal(root.values["--wave-delay"], delay, "Expansion must not reset the animation phase");
    cleanup();
    assert.equal(root.dataset.colorWave, undefined);
  }
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

test("photo masks use spatial dithering with preserved clear and opaque boundaries", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  for (const name of ["desktop","tablet","mobile"]) {
    assert.ok(css.includes('mask-image: url("./masks/photo-' + name + '.png")'));
    const png = await readFile(new URL("../app/masks/photo-" + name + ".png", import.meta.url));
    assert.equal(png.subarray(1,4).toString(), "PNG");
    const width = png.readUInt32BE(16), height = png.readUInt32BE(20);
    assert.deepEqual([width,height,png[24],png[25]], [1536,1024,8,4]);
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
      assert.ok(new Set(Array.from({length:100},(_,x)=>alpha(x,50))).size>1);
    } else {
      assert.equal(alpha(0,500),0);
      assert.equal(alpha(width-1,500),255);
      const boundary=name==="desktop"?.56:.30;
      assert.equal(alpha(Math.ceil(width*boundary),500),255);
      assert.ok(new Set(Array.from({length:100},(_,y)=>alpha(200,y))).size>1);
    }
  }
});
