import http from "node:http";
import assert from "node:assert/strict";
import { getProviders, callProvider, runOcr } from "./ocr.ts";

const GOOD = {
  store_name: "แม็คโคร",
  purchase_date: "2026-08-01",
  category: "วัตถุดิบ",
  items: [{ item_name: "น้ำปลา", quantity: 2, unit_price: 50, total_price: 100 }],
  subtotal: 100,
  tax_amount: 7,
  total_amount: 107,
};
const EMPTY = { ...GOOD, items: [], total_amount: null };

// Mock OpenAI-compatible server. mode picks the failure it simulates.
function server(mode, seen) {
  return new Promise((resolve) => {
    const s = http.createServer((req, res) => {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        seen?.push({ auth: req.headers.authorization, body: JSON.parse(body) });
        if (mode === "500") {
          res.writeHead(500).end("upstream exploded");
          return;
        }
        const payload = mode === "empty" ? EMPTY : GOOD;
        if (mode === "plainjson") {
          res.writeHead(200, { "content-type": "application/json" });
          res.end(JSON.stringify({ choices: [{ message: { content: JSON.stringify(payload) } }] }));
          return;
        }
        // SSE, split mid-JSON across chunks like a real stream.
        const text = "```json\n" + JSON.stringify(payload) + "\n```";
        res.writeHead(200, { "content-type": "text/event-stream" });
        for (const ch of text.match(/.{1,17}/gs)) {
          res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: ch } }] })}\n\n`);
        }
        res.write("data: [DONE]\n\n");
        res.end();
      });
    });
    s.listen(0, "127.0.0.1", () => resolve({ s, url: `http://127.0.0.1:${s.address().port}/v1` }));
  });
}

const IMG = "data:image/jpeg;base64,AAAA";
let pass = 0;
const check = (name, fn) => { fn(); console.log(`  ok  ${name}`); pass++; };

// --- getProviders ---------------------------------------------------
check("local primary is tagged local, gets shorter timeout", () => {
  const [p] = getProviders({ OCR_BASE_URL: "http://127.0.0.1:11434/v1", OCR_MODEL: "qwen2.5vl:7b" });
  assert.equal(p.source, "local");
  assert.equal(p.timeoutMs, 180_000);
  assert.equal(p.apiKey, undefined);
});
check("cloud primary is tagged cloud", () => {
  const [p] = getProviders({ OCR_BASE_URL: "https://gen.ai.kku.ac.th/api/v1", OCR_MODEL: "m", OCR_API_KEY: "k" });
  assert.equal(p.source, "cloud");
  assert.equal(p.timeoutMs, 240_000);
});
check("localhost-prefixed cloud host is NOT mistaken for local", () => {
  const [p] = getProviders({ OCR_BASE_URL: "https://localhost.evil.com/v1", OCR_MODEL: "m" });
  assert.equal(p.source, "cloud");
});
check("incomplete provider is skipped", () => {
  assert.equal(getProviders({ OCR_BASE_URL: "http://127.0.0.1:11434/v1" }).length, 0);
});
check("both providers, primary first", () => {
  const ps = getProviders({
    OCR_BASE_URL: "http://127.0.0.1:11434/v1", OCR_MODEL: "local",
    OCR_FALLBACK_BASE_URL: "https://gen.ai.kku.ac.th/api/v1", OCR_FALLBACK_MODEL: "cloud", OCR_FALLBACK_API_KEY: "k",
  });
  assert.equal(ps.length, 2);
  assert.deepEqual(ps.map((p) => p.model), ["local", "cloud"]);
});
check("cloud-only (Vercel) config yields exactly one provider", () => {
  const ps = getProviders({ OCR_BASE_URL: "https://gen.ai.kku.ac.th/api/v1", OCR_MODEL: "m", OCR_API_KEY: "k" });
  assert.equal(ps.length, 1);
});

// --- callProvider ---------------------------------------------------
{
  const seen = [];
  const { s, url } = await server("sse", seen);
  const r = await callProvider({ source: "local", label: "L", baseUrl: url, model: "m", timeoutMs: 5000 }, IMG);
  check("SSE chunks reassemble and code fences are stripped", () => {
    assert.equal(r.total_amount, 107);
    assert.equal(r.items.length, 1);
    assert.equal(r.source, "local");
    assert.equal(r.category, "วัตถุดิบ");
  });
  check("no Authorization header when no key (Ollama)", () => assert.equal(seen[0].auth, undefined));
  check("request carries stream:true, model and the image", () => {
    assert.equal(seen[0].body.stream, true);
    assert.equal(seen[0].body.model, "m");
    assert.equal(seen[0].body.messages[0].content[1].image_url.url, IMG);
  });
  s.close();
}
{
  const seen = [];
  const { s, url } = await server("plainjson", seen);
  const r = await callProvider({ source: "cloud", label: "C", baseUrl: url, model: "m", apiKey: "secret", timeoutMs: 5000 }, IMG);
  check("gateway ignoring stream:true still parses", () => assert.equal(r.total_amount, 107));
  check("Authorization sent when a key is configured", () => assert.equal(seen[0].auth, "Bearer secret"));
  s.close();
}
{
  const { s, url } = await server("empty");
  await assert.rejects(
    callProvider({ source: "local", label: "L", baseUrl: url, model: "m", timeoutMs: 5000 }, IMG),
    /parsed but empty/
  );
  check("parsed-but-empty result is rejected as a miss", () => {});
  s.close();
}

// --- runOcr fallback chain ------------------------------------------
{
  const weak = await server("empty");
  const good = await server("sse");
  const out = await runOcr(IMG, [
    { source: "local", label: "L", baseUrl: weak.url, model: "m", timeoutMs: 5000 },
    { source: "cloud", label: "C", baseUrl: good.url, model: "m", apiKey: "k", timeoutMs: 5000 },
  ]);
  check("weak local read falls through to cloud", () => {
    assert.ok("result" in out);
    assert.equal(out.result.total_amount, 107);
    assert.equal(out.result.source, "cloud");
  });
  weak.s.close(); good.s.close();
}
{
  const good = await server("sse");
  const dead = "http://127.0.0.1:1/v1"; // nothing listening
  const out = await runOcr(IMG, [
    { source: "local", label: "L", baseUrl: dead, model: "m", timeoutMs: 3000 },
    { source: "cloud", label: "C", baseUrl: good.url, model: "m", timeoutMs: 5000 },
  ]);
  check("dead local server falls through to cloud", () => {
    assert.ok("result" in out);
    assert.equal(out.result.source, "cloud");
  });
  good.s.close();
}
{
  const bad = await server("500");
  const good = await server("sse");
  const out = await runOcr(IMG, [
    { source: "local", label: "L", baseUrl: bad.url, model: "m", timeoutMs: 5000 },
    { source: "cloud", label: "C", baseUrl: good.url, model: "m", timeoutMs: 5000 },
  ]);
  check("upstream 500 falls through to cloud", () => assert.ok("result" in out));
  bad.s.close(); good.s.close();
}
{
  const good = await server("sse");
  const seen = [];
  const out = await runOcr(IMG, [{ source: "local", label: "L", baseUrl: good.url, model: "m", timeoutMs: 5000 }]);
  check("healthy local read never reaches a fallback", () => {
    assert.ok("result" in out);
    assert.equal(out.result.source, "local");
  });
  good.s.close();
}
{
  const a = await server("empty");
  const b = await server("500");
  const out = await runOcr(IMG, [
    { source: "local", label: "AI ในเครื่อง", baseUrl: a.url, model: "m", timeoutMs: 5000 },
    { source: "cloud", label: "AI สำรอง", baseUrl: b.url, model: "m", timeoutMs: 5000 },
  ]);
  check("both failing reports both reasons in the SERVER detail", () => {
    assert.ok("clientError" in out);
    assert.match(out.detail, /AI ในเครื่อง/);
    assert.match(out.detail, /AI สำรอง/);
  });
  check("the CLIENT message leaks no provider, model, URL or upstream body", () => {
    assert.ok("clientError" in out);
    for (const secret of ["127.0.0.1", "http", "://", "upstream exploded", "[m]", "HTTP 500"]) {
      assert.ok(
        !out.clientError.includes(secret),
        `client message leaked "${secret}": ${out.clientError}`
      );
    }
  });
  a.s.close(); b.s.close();
}

console.log(`\n${pass} checks passed`);
