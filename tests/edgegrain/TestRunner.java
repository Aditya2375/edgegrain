package edgegrain;

public final class TestRunner {
  static int checks;

  static void ck(boolean b) {
    checks++;
    if (!b) throw new AssertionError("check" + checks);
  }

  static void near(double a, double b, double tol) {
    ck(Math.abs(a - b) <= tol);
  }

  public static void main(String[] args) {
    near(Engine.kelly(.55, 1), .1, 1e-15);
    near(Engine.kelly(.4, 1), 0, 0);
    near(Engine.growth(.55, 1, 0), 0, 0);
    for (int pi = 1; pi <= 9; pi++)
      for (double b : new double[] {.5, 1, 2, 3})
        for (int n : new int[] {50, 100, 200}) {
          double p = pi / 10.;
          var r = Engine.run(new Engine.Input(.6, p, b, .3, n, 2026));
          double[] m = Engine.binomial(n, p);
          double sum = 0, mean = 0;
          for (int w = 0; w <= n; w++) {
            sum += m[w];
            mean += w * m[w];
            ck(m[w] >= 0);
          }
          near(sum, 1, 2e-14);
          near(mean, n * p, 5e-12);
          double f = Engine.kelly(p, b);
          for (int j = 0; j <= 950; j++)
            ck(Engine.growth(p, b, f) >= Engine.growth(p, b, j / 1000.) - 1e-14);
          for (var s : r.strategies()) {
            ck(Double.isFinite(s.growth()) && s.meanTerminal() > 0 && s.medianTerminal() > 0);
            ck(s.belowInitial() >= 0 && s.belowInitial() <= 1 + 2e-14);
            ck(s.halfDrawdownShare() >= 0 && s.halfDrawdownShare() <= 1);
            ck(s.firstDrawdown() >= 0 && s.firstDrawdown() < 1.00000000000001);
            ck(s.firstLogPath()[0] == 0);
            for (double v : s.firstLogPath()) ck(Double.isFinite(v));
          }
        }
    var a = Engine.run(new Engine.Input(.4, .5, 1, 0, 50, 1));
    for (var s : a.strategies()) {
      near(s.meanTerminal(), 1, 0);
      near(s.medianTerminal(), 1, 0);
      near(s.belowInitial(), 0, 0);
      near(s.firstDrawdown(), 0, 0);
    }
    for (double v : new double[] {Double.NaN, 0, .99}) {
      try {
        Engine.run(new Engine.Input(v, .55, 1, .1, 100, 1));
        throw new AssertionError();
      } catch (IllegalArgumentException e) {
        checks++;
      }
    }
    System.out.println(checks + " Java checks passed");
  }
}
