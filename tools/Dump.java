import edgegrain.Engine;

public final class Dump {
  public static void main(String[] args) {
    for (int i = 0; i < 30; i++) {
      double a = .1 + (i % 9) * .1,
          p = .1 + ((i * 5 + 2) % 9) * .1,
          b = new double[] {.5, 1, 2, 3}[i % 4],
          f = new double[] {0, .05, .2, .5, .95}[i % 5];
      int n = new int[] {50, 100, 200}[i % 3];
      long seed = new long[] {1, 2026, 4294967295L}[i % 3];
      var r = Engine.run(new Engine.Input(a, p, b, f, n, seed));
      System.out.printf(
          java.util.Locale.ROOT, "%d,%.17g,%.17g", i, r.assumedKelly(), r.actualKelly());
      for (var s : r.strategies()) {
        for (double x :
            new double[] {
              s.fraction(),
              s.growth(),
              s.meanTerminal(),
              s.medianTerminal(),
              s.belowInitial(),
              s.halfDrawdownShare(),
              s.firstDrawdown()
            }) System.out.printf(java.util.Locale.ROOT, ",%.17g", x);
        for (double x : s.firstLogPath()) System.out.printf(java.util.Locale.ROOT, ",%.17g", x);
      }
      System.out.println();
    }
  }
}
