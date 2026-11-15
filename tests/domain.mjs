import assert from "node:assert/strict";
import { run, growth, kelly, binomial } from "../web/src/model.js";
import { input } from "./cases.mjs";
let n = 0;
for (let i = 0; i < 30; i++) {
  const p = input(i),
    r = run(p),
    f = kelly(p.actual, p.payoff),
    mass = binomial(p.bets, p.actual);
  assert.ok(Math.abs(mass.reduce((a, b) => a + b, 0) - 1) < 2e-14);
  for (let j = 0; j <= 950; j++) {
    assert.ok(
      growth(p.actual, p.payoff, f) >=
        growth(p.actual, p.payoff, j / 1000) - 1e-14,
    );
    n++;
  }
  for (const s of r.strategies) {
    assert.ok(
      s.belowInitial >= 0 &&
        s.belowInitial <= 1 + 2e-14 &&
        s.meanTerminal > 0 &&
        s.medianTerminal > 0,
    );
    assert.ok(s.firstLogPath.every(Number.isFinite));
    if (s.fraction === 0) {
      assert.equal(s.meanTerminal, 1);
      assert.equal(s.firstDrawdown, 0);
      assert.equal(s.belowInitial, 0);
    }
    n += 5;
  }
}
for (const [key, values] of Object.entries({
  assumed: [NaN, 0, 1],
  actual: [Infinity, -1, 1],
  payoff: [0, 3.1],
  stake: [-0.1, 1],
  bets: [0, 51],
  seed: [0, 2 ** 32, 1.5],
}))
  for (const v of values) assert.throws(() => run({ ...input(1), [key]: v }));
console.log(`${n} domain / growth dominance checks`);
