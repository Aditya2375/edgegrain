import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { run } from "../web/src/model.js";
import { input } from "./cases.mjs";
let n = 0,
  max = 0;
for (const line of execFileSync(
  process.env.JAVA || "java",
  ["-cp", "build/classes", "Dump"],
  { encoding: "utf8" },
)
  .trim()
  .split("\n")) {
  const [i, ...v] = line.split(",").map(Number),
    r = run(input(i)),
    flat = [r.assumedKelly, r.actualKelly];
  for (const s of r.strategies)
    flat.push(
      s.fraction,
      s.growth,
      s.meanTerminal,
      s.medianTerminal,
      s.belowInitial,
      s.halfDrawdownShare,
      s.firstDrawdown,
      ...s.firstLogPath,
    );
  assert.equal(flat.length, v.length);
  flat.forEach((x, k) => {
    const err = Math.abs(x - v[k]) / Math.max(1, Math.abs(v[k]));
    max = Math.max(max, err);
    assert.ok(err < 2e-12, `${i}/${k}/${err}`);
    n++;
  });
}
console.log(`${n} Java/JS values; max scaled difference ${max}`);
