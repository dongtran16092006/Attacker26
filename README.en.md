# DeciFin

**See the consequences before you spend.**

Expense trackers tell you what you already spent. DeciFin tells you what happens
if you pick this option: how much emergency runway is left, how far your goals
slip, and what that installment plan is really charging you.

[Tiếng Việt](./README.md) · [Architecture](./docs/ARCHITECTURE.md) · [Algorithm spec](./docs/ALGORITHM.md)

---

## The problem

Young adults in Vietnam reach digital banking early but lack tools to quantify
the consequences of a decision. Weighing a laptop purchase, a course, or an
installment plan, they only see the immediate cost.

A concrete case: an installment plan advertised at "1% per month". Buyers hear
12% per year.

![How flat rates hide the real cost of borrowing](./docs/images/rate-reveal.png)

The effective rate is **21.46% per year**. The gap stays between 1.74x and 1.82x
across every common term and flat rate, so this is a systematic property of flat
rate quoting rather than an outlier.

## How it works

You declare income, expenses, assets, debts and goals. You enter a decision you
are weighing along with the options. DeciFin simulates each option and reports
total cash out, present value of the cost, remaining emergency runway, debt
burden, and how far each goal moves.

![Five processing layers shared by all four decision families](./docs/images/engine-pipeline.png)

Four decision families are in scope: large purchases, installment plans,
allocation between goals, and savings plan adjustments. All four are structurally
identical in mathematical terms, so they share one engine.

### Sample output

Someone earning 12M VND per month, 6.5M essential expenses, 25M liquid assets,
considering a 25M device:

| Option | Cash out | Present value | Runway left | Score | Verdict |
|---|---:|---:|---:|---:|---|
| Delay 4 months | 25,335,004 | 24,917,116 | 2.2 months | 72.9 | Safe |
| 12-month installment | 27,400,000 | 26,804,948 | 2.4 months | 64.5 | Proceed with caution |
| Pay in full now | 25,000,000 | 25,000,000 | 0.0 months | 35.0 | Not recommended |

Paying in full costs the least cash and zero interest, yet ranks last because it
drains the emergency fund to zero. One small shock and the user has to borrow at
a worse rate. That trade-off is invisible to an expense tracker.

## Running it

Nothing to install. No build step.

```bash
git clone https://github.com/<account>/decifin.git
cd decifin
npm start          # opens http://localhost:5173
```

`npm start` runs a 40-line static server written in Node. It downloads nothing.
A server is needed only because browsers block ES modules over `file://`.

Run the test suite:

```bash
npm test           # 51 tests via the built-in node:test runner
```

Only requirement: Node 20 or newer.

## Architecture

![Engine fully decoupled from the interface](./docs/images/architecture.png)

Three choices worth explaining:

**Zero dependencies.** The project has none. For a financial tool running on a
user's machine, every dependency is supply chain risk. Charts are hand-drawn SVG
in 90 lines.

**No server, no database.** Income, debt and asset figures are sensitive personal
data. During product validation the safest handling is to collect nothing. The
profile lives in that browser's `localStorage`. There is no network call anywhere
in the source.

**String-template rendering.** Every screen builder is a pure function from state
to HTML string, so it is testable in Node without a DOM shim. That is why the
test suite covers the interface layer too.

Details in [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md).

## Algorithm

Four core computations, full formulas in [docs/ALGORITHM.md](./docs/ALGORITHM.md):

- **Flat rate to effective APR** via bisection, solving `P = Σ M/(1+i)^t`.
  Bisection over Newton because it always converges.
- **Present value** of a spending stream discounted at the opportunity rate, so
  paying now and paying over time compare fairly.
- **Time to goal**, derived from the future value identity of an annuity with an
  initial balance.
- **Financial safety score** from 0 to 100 across five weighted components, plus
  a hard gate that overrides the result when an option breaches an absolute
  constraint.

The hard gate exists because weighted scores can be propped up by secondary
components: an option that drains the emergency fund but adds no debt still
scores above 60.

## Assumption transparency

The app has a dedicated screen listing every model parameter with its provenance,
explicitly marking which ones the team set without verification. Hiding them would
make users trust the output more than it deserves.

DeciFin is not financial advice, investment advice, or a recommendation to buy or
sell any financial product. The final decision belongs to the user.

## Layout

```
src/engine/     financial algorithms, no DOM knowledge
src/ui/         six screens, SVG charts, state management
test/           51 tests running on node:test
tools/          static server, diagram generator, preview generator
docs/           architecture, algorithm spec, all-screens preview
```

`docs/preview.html` is generated from the same view functions the app uses, so it
never drifts from the product.

## Status

MVP under validation with real users. Bank data connectivity and user accounts
are both later-stage work.

## Team

Team **5 đích 1 hướng**, Attacker 2026.

## License

[MIT](./LICENSE)
