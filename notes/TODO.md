# things to do

- make the sliders land on round numbers
  [x] make the default distribution 'normal'
- use Honeycomb colors
- make it display event count before and after sampling
- max sample rate should be 100,000

- understand the code

- make graphs at the bottom (one per aggregation) that populates left-to-right as simulations run.
- each point on the scatterplot will represent an aggregated result for one simulation run.
  - plot both the real value, from the original generated data
  - and the value calculated from the sampled data
- then think about how to represent error bars.

- provide a graph of the distribution
- make the bimodal distribution like two normal distributions
- add a power law distribution
- make it sample randomly instead of every N. With every N, COUNT is always perfectly accurate.
- make it use the other method to calculate P99, the one Retriever probably uses
- make it use 90% CI

## Not for PoC:

- make a real project structure, with code in modules
- make it use streaming instead of holding all events in memory
- make CI level a slider?
