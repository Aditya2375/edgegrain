# edgegrain

[Open the live lab](https://aditya2375.github.io/edgegrain/)

A Java-first Kelly sizing lab for a hypothetical repeated binary bet. Change an assumed win chance, a separate model win chance and net payoff. Compare half assumed Kelly, full assumed Kelly and a custom fixed stake on shared seeded paths.

## What it does

- Derives the no-borrowing, no-short-bet Kelly fraction from the assumed chance. A nonpositive edge gives zero stake.
- Shows expected log growth under the model chance, with the model-optimal fraction shown separately.
- Runs 128 shared pseudo-random paths and plots the first path without selecting for performance. All strategies see the same outcomes.
- Calculates finite-horizon mean, median and below-start probability analytically from the binary model, separately from simulated peak-drawdown counts.
- Uses log wealth for paths and a labelled log10 vertical axis. Wealth starts at one hypothetical unit.

There are no real bets, accounts, market data, runtime packages, external assets, uploads, tracking or saved assumptions. Log-optimal is not low-risk, best on every path, or a recommendation. An incorrect assumed edge can overbet even a favorable model. The normal usage is to explore a mathematical model, not choose a real stake or portfolio allocation.

## Run

Java 21+, Node 22+, Chrome for browser checks, Python 3.12 for the optional independent reference. No install step is needed for the Java engine or browser app.

```sh
javac -d build/classes src/edgegrain/*.java tests/edgegrain/*.java tools/*.java
java -cp build/classes edgegrain.TestRunner
node tests/parity.mjs
node tests/domain.mjs
node tools/build-web.mjs
node tests/browser-smoke.mjs
python3 -m pip install --only-binary=:all: numpy==2.2.6 scipy==1.15.3
python3 tests/reference.py
python3 -m http.server 8000 --directory docs
```

Open the printed local URL. NumPy/SciPy are test-only: SciPy's binomial PMF/quantile and bounded scalar optimizer provide independent analytical checks, while a Python multiplicative-wealth reference checks the log-space paths and drawdown counts. See [NUMERICS.md](NUMERICS.md) for the exact model, finite domain, probability conventions and limitations.

## Files

- `src/edgegrain/`: Java reference engine.
- `web/src/`: model port and semantic SVG/table UI.
- `index.html`, `styles.css`: original interface, system fonts.
- `tests/`, `tools/`: deterministic/independent/browser checks and builder.
- `docs/`: exact four-asset deployable copy.

## License

Original code and documentation are **MIT OR Apache-2.0**, at your choice. See [LICENSE-MIT](LICENSE-MIT) and [LICENSE-APACHE](LICENSE-APACHE). Linked research remains its authors' work. No third-party papers, datasets, fonts, images or runtime code are bundled.
