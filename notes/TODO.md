# things to do

- make the sliders land on round numbers
  [x] make the default distribution 'normal'
[x] use Honeycomb colors
[x] make it display event count before and after sampling
- max sample rate should be 100,000 -> Pierre says 1000, but the point is to _show_ that very high sample rates warp the results.
- make it clear that the top graph is the value distribution of incoming events

- understand the code

[x] make graphs at the bottom (one per aggregation) that populates left-to-right as simulations run.
[x] each point on the scatterplot will represent an aggregated result for one simulation run.
  [x] plot both the real value, from the original generated data
  [x] and the value calculated from the sampled data
[x] then think about how to represent error bars.

[x] provide a graph of the distribution
- make the bimodal distribution like two normal distributions
- add a power law distribution
[x] make it sample randomly instead of every N. With every N, COUNT is always perfectly accurate.
- make it use the other method to calculate P99, the one Retriever probably uses
- make it use 90% CI -> or make this a slider

## Not for PoC:

- make a real project structure, with code in modules
- add tracing!!!
- make it use streaming instead of holding all events in memory
- make CI level a slider
- make it update as you slide? ... just the trapezoid section.
