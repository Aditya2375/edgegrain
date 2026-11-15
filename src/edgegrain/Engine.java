package edgegrain;

public final class Engine {
  private Engine() {}

  public record Input(
      double assumed, double actual, double payoff, double stake, int bets, long seed) {}

  public record Strategy(
      double fraction,
      double growth,
      double meanTerminal,
      double medianTerminal,
      double belowInitial,
      double halfDrawdownShare,
      double firstDrawdown,
      double[] firstLogPath) {}

  public record Result(double assumedKelly, double actualKelly, Strategy[] strategies) {}

  public static double kelly(double p, double b) {
    return Math.max(0, (p * b - (1 - p)) / b);
  }

  public static double growth(double p, double b, double f) {
    return p * Math.log1p(b * f) + (1 - p) * Math.log1p(-f);
  }

  public static double[] binomial(int n, double p) {
    double[] mass = new double[n + 1];
    mass[0] = 1;
    for (int t = 0; t < n; t++)
      for (int k = t + 1; k >= 0; k--)
        mass[k] = (k <= t ? mass[k] * (1 - p) : 0) + (k > 0 ? mass[k - 1] * p : 0);
    return mass;
  }

  public static Result run(Input in) {
    if (in == null
        || !Double.isFinite(in.assumed)
        || in.assumed < .1
        || in.assumed > .9
        || !Double.isFinite(in.actual)
        || in.actual < .1
        || in.actual > .9
        || !Double.isFinite(in.payoff)
        || in.payoff < .5
        || in.payoff > 3
        || !Double.isFinite(in.stake)
        || in.stake < 0
        || in.stake > .95
        || (in.bets != 50 && in.bets != 100 && in.bets != 200)
        || in.seed < 1
        || in.seed > 4294967295L) throw new IllegalArgumentException("Unsupported assumptions");
    double ak = kelly(in.assumed, in.payoff), tk = kelly(in.actual, in.payoff);
    double[] fs = {ak / 2, ak, in.stake}, mass = binomial(in.bets, in.actual);
    Strategy[] out = new Strategy[3];
    boolean[][] wins = new boolean[128][in.bets];
    int state = (int) in.seed;
    for (int j = 0; j < 128; j++)
      for (int t = 0; t < in.bets; t++) {
        state ^= state << 13;
        state ^= state >>> 17;
        state ^= state << 5;
        wins[j][t] = Integer.toUnsignedLong(state) / 4294967296.0 < in.actual;
      }
    for (int j = 0; j < 3; j++) {
      double f = fs[j],
          up = Math.log1p(in.payoff * f),
          dn = Math.log1p(-f),
          below = 0,
          cum = 0,
          med = 0;
      boolean found = false;
      for (int w = 0; w <= in.bets; w++) {
        double log = w * up + (in.bets - w) * dn;
        if (log < -1e-12) below += mass[w];
        cum += mass[w];
        if (!found && cum >= .5) {
          med = Math.exp(log);
          found = true;
        }
      }
      int halves = 0;
      double firstDD = 0;
      double[] path = new double[in.bets + 1];
      for (int k = 0; k < 128; k++) {
        double value = 0, peak = 0, maxDD = 0;
        for (int t = 0; t < in.bets; t++) {
          value += wins[k][t] ? up : dn;
          peak = Math.max(peak, value);
          maxDD = Math.max(maxDD, -Math.expm1(value - peak));
          if (k == 0) path[t + 1] = value;
        }
        if (maxDD >= .5 - 1e-12) halves++;
        if (k == 0) firstDD = maxDD;
      }
      out[j] =
          new Strategy(
              f,
              growth(in.actual, in.payoff, f),
              Math.pow(1 + f * (in.actual * in.payoff - (1 - in.actual)), in.bets),
              med,
              below,
              halves / 128.0,
              firstDD,
              path);
    }
    return new Result(ak, tk, out);
  }
}
