import { run, growth } from "./model.js";
const $ = (id) => document.getElementById(id),
  NS = "http://www.w3.org/2000/svg",
  colors = ["#edcf87", "#b9edc5", "#f4b28b"];
let active = null;
const pct = (x) => `${(x * 100).toFixed(1)}%`,
  multiple = (x) =>
    x >= 1e5 || x < 0.001 ? `${x.toExponential(2)}×` : `${x.toFixed(3)}×`;
function s(tag, a = {}, t) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(a)) e.setAttribute(k, String(v));
  if (t !== undefined) e.textContent = t;
  return e;
}
function axes(id, series, xmax, xlabel, ylabel) {
  const svg = $(id),
    g = $(id === "growth-chart" ? "growth-drawing" : "path-drawing"),
    W = Math.max(280, svg.clientWidth),
    H = id === "growth-chart" ? 300 : 310,
    L = 58,
    R = 15,
    T = 27,
    B = H - 42;
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  g.replaceChildren();
  let lo = Math.min(0, ...series.flat()),
    hi = Math.max(0, ...series.flat());
  if (hi - lo < 0.01) {
    lo -= 0.01;
    hi += 0.01;
  }
  const pad = (hi - lo) * 0.08;
  lo -= pad;
  hi += pad;
  const x = (v) => L + ((W - L - R) * v) / xmax,
    y = (v) => B - ((B - T) * (v - lo)) / (hi - lo);
  for (let i = 0; i <= 4; i++) {
    const v = lo + ((hi - lo) * i) / 4;
    g.append(
      s("line", { x1: L, x2: W - R, y1: y(v), y2: y(v), stroke: "#405149" }),
      s(
        "text",
        { x: L - 8, y: y(v) + 4, "text-anchor": "end" },
        Math.abs(v) < 0.00001
          ? "0"
          : v.toFixed(id === "growth-chart" ? (hi - lo < 0.1 ? 3 : 2) : 1),
      ),
    );
  }
  const ticks = W < 500 ? 3 : 5;
  for (let i = 0; i <= ticks; i++) {
    const v = (xmax * i) / ticks;
    g.append(
      s(
        "text",
        {
          x: x(v),
          y: B + 23,
          "text-anchor": i === 0 ? "start" : i === ticks ? "end" : "middle",
        },
        id === "growth-chart" ? pct(v) : Math.round(v),
      ),
    );
  }
  g.append(
    s("line", {
      x1: L,
      x2: W - R,
      y1: y(0),
      y2: y(0),
      stroke: "#a5b3aa",
      "stroke-dasharray": "3 5",
    }),
    s("text", { x: L, y: 13 }, ylabel),
    s("text", { x: W - R, y: H - 2, "text-anchor": "end" }, xlabel),
  );
  return { g, W, x, y };
}
function charts(p, r) {
  const xmax = Math.min(
      0.95,
      Math.max(0.4, p.stake * 1.25, r.assumedKelly * 1.5, r.actualKelly * 1.5),
    ),
    curve = Array.from({ length: 151 }, (_, i) =>
      growth(p.actual, p.payoff, (xmax * i) / 150),
    );
  const a = axes(
    "growth-chart",
    [curve],
    xmax,
    "Fixed stake / %",
    "Log growth / nats per trial",
  );
  a.g.append(
    s("path", {
      d: curve
        .map((v, i) => `${i ? "L" : "M"}${a.x((xmax * i) / 150)},${a.y(v)}`)
        .join(" "),
      fill: "none",
      stroke: "#eaf0e9",
      "stroke-width": 2,
    }),
  );
  r.strategies.forEach((z, i) =>
    a.g.append(
      s("circle", {
        cx: a.x(z.fraction),
        cy: a.y(z.growth),
        r: i === 2 ? 4 : 5,
        fill: colors[i],
        stroke: "#14211c",
        "stroke-width": 1,
      }),
    ),
  );
  const b = axes(
    "path-chart",
    r.strategies.map((z) => z.firstLogPath.map((v) => v / Math.LN10)),
    p.bets,
    "Trial",
    "log10 wealth / start",
  );
  r.strategies.forEach((z, i) =>
    b.g.append(
      s("path", {
        d: z.firstLogPath
          .map((v, t) => `${t ? "L" : "M"}${b.x(t)},${b.y(v / Math.LN10)}`)
          .join(" "),
        fill: "none",
        stroke: colors[i],
        "stroke-width": i === 2 ? 2 : 1.6,
        ...(i === 2 ? { "stroke-dasharray": "6 4" } : {}),
      }),
    ),
  );
  $("growth-desc").textContent =
    `Model chance ${pct(p.actual)}, net payoff ${p.payoff}. Expected log growth by stake 0 to ${pct(xmax)}. Half assumed Kelly ${pct(r.strategies[0].fraction)}, full ${pct(r.assumedKelly)}, selected ${pct(p.stake)}. Analytical optimum ${pct(r.actualKelly)}. Numeric comparison table follows.`;
  $("path-desc").textContent =
    `First shared simulated path, ${p.bets} trials, seed ${p.seed}. Log10 wealth from initial 1. Half, full and custom stakes share every outcome. See table for terminal and drawdown values.`;
}
function render(p, r) {
  $("assumed-kelly").textContent = pct(r.assumedKelly);
  $("actual-kelly").textContent = pct(r.actualKelly);
  $("your-growth").textContent = r.strategies[2].growth.toFixed(4);
  $("edge-note").textContent =
    `Model edge per unit staked: ${(100 * (p.actual * p.payoff - (1 - p.actual))).toFixed(1)}%. No positive edge means zero Kelly stake.`;
  $("mismatch").textContent =
    `Assumed ${pct(p.assumed)} vs model ${pct(p.actual)}. ${r.assumedKelly > r.actualKelly + 1e-12 ? "The assumed full-Kelly stake exceeds the model-optimal stake. " : ""}${r.strategies[2].growth < 0 ? "Your selected stake has negative expected log growth in this model." : "Your selected stake does not guarantee a gain, even when model log growth is nonnegative."} The curve's optimum assumes the model chance is known.`;
  const rows = [
    ["Fraction staked each trial", (z) => pct(z.fraction)],
    ["Expected log growth / nats per trial", (z) => z.growth.toFixed(4)],
    ["Analytical mean terminal wealth", (z) => multiple(z.meanTerminal)],
    ["Analytical median terminal wealth", (z) => multiple(z.medianTerminal)],
    ["Analytical chance of finishing below start", (z) => pct(z.belowInitial)],
    [
      "128 paths with peak drawdown ≥50%",
      (z) => `${Math.round(z.halfDrawdownShare * 128)} / 128`,
    ],
    [
      "First path: terminal wealth",
      (z) => multiple(Math.exp(z.firstLogPath.at(-1))),
    ],
    ["First path: maximum peak drawdown", (z) => pct(z.firstDrawdown)],
  ];
  $("results").replaceChildren(
    ...rows.map(([title, fn]) => {
      const tr = document.createElement("tr"),
        th = document.createElement("th");
      th.scope = "row";
      th.textContent = title;
      tr.append(th);
      r.strategies.forEach((z) => {
        const td = document.createElement("td");
        td.textContent = fn(z);
        tr.append(td);
      });
      return tr;
    }),
  );
  charts(p, r);
}
function read() {
  for (const id of ["assumed", "actual", "payoff", "stake", "seed"])
    if ($(id).value.trim() === "")
      throw new Error("Complete every numeric field.");
  return {
    assumed: Number($("assumed").value) / 100,
    actual: Number($("actual").value) / 100,
    payoff: Number($("payoff").value),
    stake: Number($("stake").value) / 100,
    bets: Number($("bets").value),
    seed: Number($("seed").value),
  };
}
function apply(e) {
  e?.preventDefault();
  try {
    const p = read(),
      r = run(p);
    render(p, r);
    active = { p, r };
    $("status").className = "";
    $("status").textContent =
      `Applied. 128 shared paths × ${p.bets} trials, seed ${p.seed}. Analytical model uses ${pct(p.actual)} win chance.`;
  } catch (e) {
    $("status").className = "error";
    $("status").textContent =
      `Not applied. ${e.message} Previous results retained.`;
  }
}
$("controls").addEventListener("submit", apply);
for (const name of ["input", "change"])
  $("controls").addEventListener(name, () => {
    if (active) {
      $("status").className = "";
      $("status").textContent =
        "Unapplied changes. Charts and table still use the previous assumptions.";
    }
  });
window.addEventListener("resize", () => {
  if (active) charts(active.p, active.r);
});
apply();
