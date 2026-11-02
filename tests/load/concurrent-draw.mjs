// Basic concurrency smoke test for Everypaper's API.
// Usage: node tests/load/concurrent-draw.mjs [baseUrl] [concurrency] [strokesPerClient]
//
// Spins up N "visitors" that each create a session and submit strokes
// concurrently via the REST fallback endpoint, reporting latency stats.
// This is a lightweight sanity check, not a substitute for a proper
// k6/artillery run against a staging environment.

const baseUrl = process.argv[2] ?? "http://localhost:4000";
const concurrency = Number(process.argv[3] ?? 20);
const strokesPerClient = Number(process.argv[4] ?? 5);

function randomPoint() {
  return { x: Math.random() * 1000 - 500, y: Math.random() * 1000 - 500 };
}

async function runClient(index) {
  const jar = new Map();
  const fetchWithCookies = async (path, options = {}) => {
    const headers = new Headers(options.headers);
    const cookie = jar.get("cookie");
    if (cookie) headers.set("cookie", cookie);
    const res = await fetch(`${baseUrl}${path}`, { ...options, headers });
    const setCookie = res.headers.get("set-cookie");
    if (setCookie) jar.set("cookie", setCookie.split(";")[0]);
    return res;
  };

  const start = performance.now();
  const sessionRes = await fetchWithCookies("/api/v1/sessions", { method: "POST" });
  if (!sessionRes.ok) {
    return { index, ok: false, error: `session ${sessionRes.status}` };
  }

  const latencies = [];
  for (let i = 0; i < strokesPerClient; i++) {
    const points = Array.from({ length: 10 }, randomPoint);
    const t0 = performance.now();
    const res = await fetchWithCookies("/api/v1/strokes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        clientStrokeId: crypto.randomUUID(),
        color: "#111111",
        brushSize: 4,
        isEraser: false,
        points
      })
    });
    latencies.push(performance.now() - t0);
    if (!res.ok) {
      return { index, ok: false, error: `stroke ${res.status}` };
    }
  }

  return { index, ok: true, totalMs: performance.now() - start, latencies };
}

async function main() {
  console.log(`Running ${concurrency} concurrent visitors x ${strokesPerClient} strokes against ${baseUrl}`);
  const results = await Promise.all(Array.from({ length: concurrency }, (_, i) => runClient(i)));
  const failures = results.filter((r) => !r.ok);
  const successes = results.filter((r) => r.ok);
  const allLatencies = successes.flatMap((r) => r.latencies);
  allLatencies.sort((a, b) => a - b);
  const p = (pct) => allLatencies[Math.floor(allLatencies.length * pct)] ?? NaN;

  console.log(`Succeeded: ${successes.length}/${results.length}`);
  if (failures.length) {
    console.log("Failures:", failures.slice(0, 5));
  }
  if (allLatencies.length) {
    console.log(`Stroke latency ms — p50: ${p(0.5).toFixed(1)}, p90: ${p(0.9).toFixed(1)}, p99: ${p(0.99).toFixed(1)}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
