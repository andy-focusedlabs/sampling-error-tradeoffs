# Sampling Error Tradeoffs Illustrated

This is an interactive web-based simulation that demonstrates how sampling affects aggregation accuracy in data analysis.

Inputs:

- Event volume (100 to 10M)
- Sample rate (1:N)
- Data distribution (exponential, normal, uniform, log-normal, bimodal)

When you change the input, it runs 50 simulations.

Outputs:

- True vs sampled values for COUNT, SUM, AVERAGE, and P99 with confidence intervals
- a graph at the bottom that is supposed to show the results for each simulation run (sampled value, true value, and confidence interval) but doesn't
