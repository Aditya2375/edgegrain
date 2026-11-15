# Numerical contract

## A deliberately small model

One independent binary bet repeated 50, 100 or 200 times. Model win probability p and assumed win probability a are each finite in [0.1,0.9]. Net win b is finite in [0.5,3]. A win multiplies wealth by 1 + b*f; a loss multiplies it by 1 - f. The winning stake is returned in addition to the net profit b*f. Unstaked wealth stays idle, earning zero. Initial wealth is one hypothetical unit, continuously divisible. No loans, short bets, fees, minimum stakes, rounding to chips, deposits, withdrawals, correlations, changing chance, estimation, backtest or real portfolio. Custom f is finite in [0,0.95]. The cap excludes all-in and leverage, not large losses. Seed is a nonzero unsigned32 integer (1 through 4,294,967,295).

Assumed chance determines the full and half-Kelly stakes, model chance determines the growth curve, outcomes and analytical probabilities. The model chance is not an estimate of reality or a statement that the user's assumed edge is correct.

## Growth and the optimum

Expected natural-log growth per trial: g(f) = p*ln(1+b*f) + (1-p)*ln(1-f). Use log1p for both terms. Differentiate to get the unconstrained optimum (p*b - (1-p))/b. Over nonnegative stakes without borrowing, choose max(0, that expression). With the supported chance/payoff range it is at most 0.8666666666666667, so it is below the custom95% cap. Half assumed Kelly is exactly half the assumed optimum, including zero when no positive assumed edge. The model-optimal display uses p, not a. Neither expression is rounded before use.

g is the expected increment of log wealth. Expected terminal log wealth is n*g, but exp(n*g) is a geometric expectation, not generally a median or arithmetic mean. We do not substitute it for the model's discrete median. A finite path can disagree with the growth ordering. Fractional stakes are not guaranteed to have a lower maximum drawdown on every path, and a correct Kelly stake can have severe drawdowns. A negative model g is labelled without changing or silently capping the custom stake.

## Analytical finite-horizon quantities

With n trials, win count W is binomial(n,p). Terminal wealth for w wins is (1+b*f)^w * (1-f)^(n-w), computed via exp(w*ln(1+b*f)+(n-w)*ln(1-f)). This is nondecreasing in w (constant at f=0).

Binomial masses use forward Bernoulli convolution, updating descending win counts: new[k] = old[k]*(1-p) + old[k-1]*p, initially mass[0]=1. This avoids factorial overflow and tail-ratio start underflow on the bounded domain. No mass renormalization or approximate normal distribution is used. Standard double rounding remains. Independent SciPy binomial PMF/PPF tests use a different implementation.

Mean terminal wealth = (1+f*(p*b-(1-p)))^n. Median is the first terminal wealth whose cumulative probability is at least0.5 (the lower generalized-inverse median). With f=0 this is1, not zero. Below-start probability sums masses whose terminal log wealth is < -1e-12. The small log tolerance treats theoretical break-even count roundoff as a tie, not as a loss. Thus this is a numerically tolerance-aware version of strictly below1, not a generic interval probability routine.

Arithmetic means can be dominated by rare high outcomes; they are not a typical path or a forecast. Mean and median/probabilities do not depend on the seed. No confidence bands, risk guarantee or empirical validation of p.

## Simulation and drawdown

xorshift32: from nonzero unsigned32 seed, apply x ^= x <<13; x ^= x >>>17; x ^= x <<5, keeping32bit bits. Uniform is unsigned(x)/4,294,967,296 in [0,1); a win is uniform < p. The generator is not cryptographic, and finite pseudo-random output is only an approximation to IID trials. Probabilities not on its32bit grid have an effective per-draw rounding of less than1/2^32. Analytical calculations use the input p, not a rounded grid probability.

Generate128 paths in path-major, then trial-major order; each strategy shares the same boolean outcomes. No outcome selection/cherry-picking. First path is index0, includes initiallogwealth0 at trial0. Accumulate log multipliers and track the running log peak including the start. Peak drawdown = 1-exp(logwealth-logpeak), evaluated as -expm1(logwealth-logpeak). Maximum ranges in [0,1] after floating rounding. Count a path with max drawdown >=0.5-1e-12. The displayed count/128 is a simulation frequency with no claimed confidence interval; it is not an exact model probability, and not a chance of permanent ruin. Below-start probability is terminal; maximum drawdown is path-dependent. They answer different questions.

Paths never reach zero mathematically on the supported f<1 domain, but wealth can become tiny. Drawdown display can round to100%; double arithmetic may itself round a sufficiently near-one drawdown to1. That is not an all-in event. Supported horizon/parameters keep displayed wealth exponentials finite and positive. Huge/tiny wealth uses scientific notation with a wealth multiple sign, not currency.

## Charts, state and precision

Growth curve:151 equally spaced stakes from0 to min(0.95,max(0.4,1.25*custom,1.5*assumedKelly,1.5*modelKelly)). This zoom always includes the displayed stakes and model optimum, not the whole unconstrained stake range. Markers use exact evaluated strategy growth, not a sampled-curve lookup. The white polyline is an illustration of the smooth expression. Horizontal dotted line is zero log growth. Curves use model p.

Path plot: log10(wealth/initialwealth), derived from accumulated natural logs divided byln10. Zero means1x, +1 means10x, -1 means0.1x. Axis bounds include all three complete first paths and zero with8% padding. Table supplies numeric terminal outcomes/summary. Coincident zero stakes/identical stakes cause coincident lines and markers, not missing data.

All fields read and validated together before candidate results replace applied state. Pending/invalid edits preserve prior charts/table with visible status. Resize uses applied state only. No application storage, upload, export, network request or runtime dependency. Browser/device form history and memory are not secure-erased.

Java/JS comparison scales absolute difference by max(1,abs(reference)), tolerance2e-12. Independent terminal quantities use scaled tolerance2e-11, growth optimality1e-12, first-logpath absolute1e-10 and simulated count exact. These are numerical tests, not proof of market validity. Displaypercentages round0.1percentagepoint, growth4decimals, wealth3decimals or3significantdigits. Nearzero growth may display -0.0000/0.0000, exactzero computed separately; do not infer a guaranteed return. Probabilities rounded100.0% can be less than1.

## Sources

- [J. L. Kelly (1956), A New Interpretation of Information Rate](http://stat.wharton.upenn.edu/~steele/Resources/FTSResources/KellyBreiman/Kelly56.pdf): repeated multiplicative wealth, expected logarithm versus expected wealth. The paper uses logbase2 in parts; this implementation uses natural logs consistently.
- [Busseti, Ryu & Boyd, Risk-Constrained Kelly Gambling](https://stanford.edu/~boyd/papers/pdf/kelly.pdf): IID wealth, two-outcome optimum and fractional-Kelly/drawdown distinction. No risk-constrained optimizer is implemented here.
- [Hsieh & Barmish, On Kelly Betting: Some Limitations](https://arxiv.org/html/1710.01787v1): peak-to-trough drawdown and limitations. Their multiasset/general-return work is not claimed by this binary lab.
- [NIST Engineering Statistics Handbook, Binomial Distribution](https://itl.nist.gov/div898/handbook/eda/section3/eda366i.htm): fixed independent binary-trial distribution/PMF/CDF.
- [Rotando & Thorp, The Kelly Criterion and the Stock Market](https://edwardothorp.com/wp-content/uploads/2016/11/TheKellyCriterionAndTheStockMarket.pdf): log versus expected wealth distinction; no stock-market extension is used.
- [SciPy binom documentation](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.binom.html): independent test-only PMF/quantile source.

Formulas implemented originally. No papers, source code, figures or datasets copied into application. General references do not establish personal suitability or probability knowledge.
