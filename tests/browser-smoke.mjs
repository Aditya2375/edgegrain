import { spawn } from "node:child_process";
import {
  writeFileSync,
  readFileSync,
  mkdirSync,
  existsSync,
  rmSync,
  mkdtempSync,
} from "node:fs";

const HTTP_PORT = 8977;
const CDP_PORT = 9378;
const SHOTS = process.env.SMOKE_SHOTS === "1";
const root = new URL("..", import.meta.url).pathname;

const profile = mkdtempSync("/tmp/edgegrain-chrome-");
const server = spawn(
  "python3",
  [
    "-m",
    "http.server",
    String(HTTP_PORT),
    "--bind",
    "127.0.0.1",
    "--directory",
    `${root}docs`,
  ],
  { stdio: "ignore", detached: true },
);
const chrome = spawn(
  "google-chrome",
  [
    "--headless=new",
    "--no-sandbox",
    "--disable-gpu",
    "--disable-dev-shm-usage",
    `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${profile}`,
    "about:blank",
  ],
  { stdio: "ignore", detached: true },
);

const cleanup = async (code) => {
  for (const child of [chrome, server]) {
    try {
      process.kill(-child.pid, "SIGTERM");
    } catch {}
  }
  await Promise.all(
    [chrome, server].map((child) =>
      child.exitCode !== null
        ? Promise.resolve()
        : new Promise((r) => child.once("exit", r)),
    ),
  );
  rmSync(profile, { recursive: true, force: true });
  process.exit(code);
};
const timeout = setTimeout(() => {
  console.error("smoke: timeout");
  cleanup(1);
}, 90000);
process.on("SIGINT", () => cleanup(2));
process.on("uncaughtException", (e) => {
  console.error(e);
  cleanup(1);
});
process.on("unhandledRejection", (e) => {
  console.error(e);
  cleanup(1);
});

async function waitFor(fn, label, timeoutMs = 60000) {
  const start = Date.now();
  for (;;) {
    try {
      const v = await fn();
      if (v) return v;
    } catch {}
    if (Date.now() - start > timeoutMs)
      throw new Error(`timed out waiting for ${label}`);
    await new Promise((r) => setTimeout(r, 250));
  }
}

const checks = [];
const check = (name, ok, detail = "") => {
  checks.push({ name, ok, detail });
  console.log(
    `${ok ? "ok" : "NOT OK"} - ${name}${detail ? " - " + detail : ""}`,
  );
};

await waitFor(
  async () => (await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`)).ok,
  "chrome devtools",
);
const target = await (
  await fetch(`http://127.0.0.1:${CDP_PORT}/json/new`, { method: "PUT" })
).json();
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  ws.onopen = resolve;
  ws.onerror = reject;
});

let mid = 0;
const rpcPending = new Map();
const consoleErrors = [];
const requests = [];
ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  if (msg.method === "Network.requestWillBeSent")
    requests.push(msg.params.request.url);
  if (msg.id && rpcPending.has(msg.id)) {
    rpcPending.get(msg.id)(msg);
    rpcPending.delete(msg.id);
  } else if (msg.method === "Runtime.exceptionThrown")
    consoleErrors.push(
      msg.params.exceptionDetails?.exception?.description ?? "page exception",
    );
};
const cdp = (method, params = {}) =>
  new Promise((resolve) => {
    const id = ++mid;
    rpcPending.set(id, resolve);
    ws.send(JSON.stringify({ id, method, params }));
  });
const evaluate = async (expression) => {
  const res = await cdp("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (res.result?.exceptionDetails)
    throw new Error(JSON.stringify(res.result.exceptionDetails));
  return res.result?.result?.value;
};
const shot = async (name) => {
  if (!SHOTS) return;
  await new Promise((r) => setTimeout(r, 900));
  const metrics = await cdp("Page.getLayoutMetrics");
  const size = metrics.result.cssContentSize;
  const r = await cdp("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: true,
    clip: { x: 0, y: 0, width: size.width, height: size.height, scale: 1 },
  });
  writeFileSync(
    `${root}smoke-${name}.png`,
    Buffer.from(r.result.data, "base64"),
  );
};

await cdp("Runtime.enable");
await cdp("Network.enable");
await cdp("Page.enable");
await cdp("Emulation.setDeviceMetricsOverride", {
  width: 1440,
  height: 1000,
  deviceScaleFactor: 1,
  mobile: false,
});
await cdp("Page.navigate", { url: `http://127.0.0.1:${HTTP_PORT}/` });
await waitFor(
  () =>
    evaluate(
      `document.querySelector('#status').textContent.startsWith('Applied')`,
    ),
  "ready",
);
const edit = async (id, value) =>
    evaluate(
      `document.querySelector('#${id}').value=${JSON.stringify(value)};document.querySelector('#${id}').dispatchEvent(new Event('input',{bubbles:true}));true`,
    ),
  submit = () =>
    evaluate(`document.querySelector('#controls').requestSubmit();true`);
check(
  "default assumed vs model Kelly",
  await evaluate(
    `document.querySelector('#assumed-kelly').textContent==='20.0%'&&document.querySelector('#actual-kelly').textContent==='10.0%'`,
  ),
);
check(
  "default table24values and3paths",
  await evaluate(
    `document.querySelectorAll('#results td').length===24&&document.querySelectorAll('#path-drawing path').length===3`,
  ),
);
check(
  "default overbet warning",
  await evaluate(
    `document.querySelector('#mismatch').textContent.includes('negative expected log growth')`,
  ),
);
await shot("default");
const old = await evaluate(
  `document.querySelector('#your-growth').textContent`,
);
await edit("stake", "10");
check(
  "unapplied preserves",
  await evaluate(
    `document.querySelector('#your-growth').textContent===${JSON.stringify(old)}&&document.querySelector('#status').textContent.startsWith('Unapplied')`,
  ),
);
await submit();
check(
  "applied modelKelly positivegrowth",
  await evaluate(
    `parseFloat(document.querySelector('#your-growth').textContent)>0`,
  ),
);
const before = await evaluate(
  `document.querySelector('#your-growth').textContent`,
);
for (const [id, v] of [
  ["assumed", "9"],
  ["actual", "91"],
  ["payoff", ".49"],
  ["payoff", "3.1"],
  ["stake", "96"],
  ["seed", "0"],
  ["seed", "1.5"],
  ["seed", "4294967296"],
  ["stake", ""],
]) {
  await edit("assumed", "60");
  await edit("actual", "55");
  await edit("payoff", "1");
  await edit("stake", "10");
  await edit("seed", "2026");
  await edit(id, v);
  await submit();
  check(
    `invalid${id}${v}preserves`,
    await evaluate(
      `document.querySelector('#your-growth').textContent===${JSON.stringify(before)}&&document.querySelector('#status').textContent.startsWith('Not applied')`,
    ),
  );
}
await edit("stake", "0");
await edit("assumed", "10");
await edit("actual", "10");
await edit("payoff", ".5");
await edit("seed", "2026");
await submit();
check(
  "noedge allcash pathstable",
  await evaluate(
    `document.querySelector('#assumed-kelly').textContent==='0.0%'&&document.querySelector('#your-growth').textContent==='0.0000'&&[...document.querySelectorAll('#results tr:nth-child(3) td')].every(x=>x.textContent==='1.000×')`,
  ),
);
await shot("zero");
await edit("assumed", "90");
await edit("actual", "10");
await edit("payoff", "3");
await edit("stake", "95");
await edit("bets", "200");
await edit("seed", "4294967295");
await submit();
check(
  "extreme valid finite",
  await evaluate(
    `document.querySelector('#status').textContent.startsWith('Applied')&&!document.querySelector('#results').textContent.includes('NaN')&&!document.querySelector('#results').textContent.includes('Infinity')`,
  ),
);
await shot("extreme");
for (const [id, v] of [
  ["assumed", "60"],
  ["actual", "55"],
  ["payoff", "1"],
  ["stake", "30"],
  ["bets", "100"],
  ["seed", "2026"],
])
  await edit(id, v);
await submit();
for (const width of [320, 360, 390, 768]) {
  await cdp("Emulation.setDeviceMetricsOverride", {
    width,
    height: 900,
    deviceScaleFactor: 1,
    mobile: true,
  });
  await new Promise((r) => setTimeout(r, 150));
  check(
    `${width}px no page overflow`,
    await evaluate(`document.documentElement.scrollWidth<=innerWidth`),
  );
  check(
    `${width}px plot actualpixels`,
    await evaluate(
      `Math.abs(document.querySelector('#growth-chart').viewBox.baseVal.width-document.querySelector('#growth-chart').clientWidth)<1`,
    ),
  );
  await shot("mobile-" + width);
}
await cdp("Emulation.setDeviceMetricsOverride", {
  width: 1440,
  height: 1000,
  deviceScaleFactor: 1,
  mobile: false,
});
await evaluate(`document.querySelector('details').open=true;true`);
await shot("details");
check(
  "CSPconnectnone",
  await evaluate(
    `document.querySelector('meta[http-equiv="Content-Security-Policy"]').content.includes("connect-src 'none'")`,
  ),
);
check(
  "no storage",
  await evaluate(`localStorage.length===0&&sessionStorage.length===0`),
);
check("noexceptions", consoleErrors.length === 0, consoleErrors.join(";"));
const unexpected = requests.filter(
  (u) =>
    !u.startsWith(`http://127.0.0.1:${HTTP_PORT}/`) &&
    u !== "about:blank" &&
    !u.startsWith("data:"),
);
check("noofforigin", unexpected.length === 0, unexpected.join(";"));
writeFileSync(
  `${root}build/browser-result.json`,
  JSON.stringify(checks, null, 2),
);
const failed = checks.filter((c) => !c.ok);
console.log(`${checks.length} browser checks, ${failed.length} failed`);
clearTimeout(timeout);
ws.close();
await cleanup(failed.length ? 1 : 0);
