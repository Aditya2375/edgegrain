export const kelly = (p, b) => Math.max(0, (p * b - (1 - p)) / b);
export const growth = (p, b, f) =>
  p * Math.log1p(b * f) + (1 - p) * Math.log1p(-f);
export function binomial(n, p) {
  const m = Array(n + 1).fill(0);
  m[0] = 1;
  for (let t = 0; t < n; t++)
    for (let k = t + 1; k >= 0; k--)
      m[k] = (k <= t ? m[k] * (1 - p) : 0) + (k > 0 ? m[k - 1] * p : 0);
  return m;
}
export function run({ assumed, actual, payoff, stake, bets, seed }) {
  if (
    ![assumed, actual].every(
      (p) => Number.isFinite(p) && p >= 0.1 && p <= 0.9,
    ) ||
    !Number.isFinite(payoff) ||
    payoff < 0.5 ||
    payoff > 3 ||
    !Number.isFinite(stake) ||
    stake < 0 ||
    stake > 0.95 ||
    ![50, 100, 200].includes(bets) ||
    !Number.isInteger(seed) ||
    seed < 1 ||
    seed > 4294967295
  )
    throw new Error(
      "Check probabilities (10-90%), net payoff (0.5-3), stake (0-95%), listed trials and whole-number seed.",
    );
  const assumedKelly = kelly(assumed, payoff),
    actualKelly = kelly(actual, payoff),
    fs = [assumedKelly / 2, assumedKelly, stake],
    mass = binomial(bets, actual);
  let state = seed | 0;
  const wins = Array.from({ length: 128 }, () =>
    Array.from({ length: bets }, () => {
      state ^= state << 13;
      state ^= state >>> 17;
      state ^= state << 5;
      return (state >>> 0) / 4294967296 < actual;
    }),
  );
  const strategies = fs.map((fraction) => {
    const up = Math.log1p(payoff * fraction),
      dn = Math.log1p(-fraction);
    let belowInitial = 0,
      cum = 0,
      medianTerminal = 0,
      found = false;
    for (let w = 0; w <= bets; w++) {
      const l = w * up + (bets - w) * dn;
      if (l < -1e-12) belowInitial += mass[w];
      cum += mass[w];
      if (!found && cum >= 0.5) {
        medianTerminal = Math.exp(l);
        found = true;
      }
    }
    let halves = 0,
      firstDrawdown = 0;
    const firstLogPath = Array(bets + 1).fill(0);
    for (let k = 0; k < 128; k++) {
      let value = 0,
        peak = 0,
        maxDD = 0;
      for (let t = 0; t < bets; t++) {
        value += wins[k][t] ? up : dn;
        peak = Math.max(peak, value);
        maxDD = Math.max(maxDD, -Math.expm1(value - peak));
        if (k === 0) firstLogPath[t + 1] = value;
      }
      if (maxDD >= 0.5 - 1e-12) halves++;
      if (k === 0) firstDrawdown = maxDD;
    }
    return {
      fraction,
      growth: growth(actual, payoff, fraction),
      meanTerminal: Math.pow(
        1 + fraction * (actual * payoff - (1 - actual)),
        bets,
      ),
      medianTerminal,
      belowInitial,
      halfDrawdownShare: halves / 128,
      firstDrawdown,
      firstLogPath,
    };
  });
  return { assumedKelly, actualKelly, strategies };
}
