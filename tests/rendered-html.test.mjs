import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import test from "node:test";

const templateRoot = new URL("../", import.meta.url);

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders Sibo Zhou's research profile", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Sibo Zhou — Research<\/title>/i);
  assert.match(html, /I study decisions in health care/);
  assert.match(html, /Selected research/);
  assert.match(html, /Education selectively improves TB and HIV knowledge/);
  assert.match(html, /Haas School of Business, UC Berkeley/);
  assert.match(html, /href="Sibo_Zhou_CV\.pdf"/);
  assert.match(html, /application\/ld\+json/);
  assert.doesNotMatch(html, /codex-preview|Building your site|react-loading-skeleton/i);
  assert.doesNotMatch(html, /213-910-6886|We investigated whether/);
});

test("ships the downloadable CV", async () => {
  await access(new URL("public/Sibo_Zhou_CV.pdf", templateRoot));
});
