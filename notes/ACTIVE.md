# Active work

the goal is to help people understand what is happening in the app.
the app runs 50 simulations, and it calculates aggregations before and after sampling.
I need to show that in a chart.

We'll start with the P99 aggregation. It is most interesting.

The chart should be a scatter plot.

- the title is: P99 For Each Simulation, Before and After Sampling
- the x axis is simulation number, 1-50.
- the y axis is P99.
- for each simulation run, plot two points:
  - the true P99, in green
  - the sampled P99, in red

## Plan

### Phase 1: Add HTML Structure for P99 Scatter Plot

- [ ] Add a new chart container section below the existing distribution chart
- [ ] Include canvas element with ID "p99ScatterChart"
- [ ] Add appropriate CSS styling to match existing chart container

### Phase 2: Implement P99 Scatter Plot Function

- [ ] Create `drawP99ScatterPlot(results)` function in index.js
- [ ] Use Chart.js scatter plot type with two datasets:
  - Green points for true P99 values (one per simulation)
  - Red points for sampled P99 values (one per simulation)
- [ ] Configure chart with:
  - Title: "P99 For Each Simulation, Before and After Sampling"
  - X-axis: Simulation number (1 to numRuns)
  - Y-axis: P99 value
  - Appropriate colors and styling

### Phase 3: Integrate with Simulation Flow

- [ ] Add call to `drawP99ScatterPlot(results)` in the `updateDisplay()` function
- [ ] Ensure chart updates when parameters change
- [ ] Handle chart destruction/recreation properly
- [ ] Store chart instance globally for cleanup

### Phase 4: Data Preparation

- [ ] Extract sampled P99 data from `results.simulationResults.p99` array
- [ ] Calculate true P99 for each simulation from the original unsampled data
- [ ] Create data points for true P99 (one per simulation from unsampled data)
- [ ] Create data points for sampled P99 (one per simulation run)
- [ ] Format data for Chart.js scatter plot format

### Phase 5: Chart Configuration & Styling

- [ ] Configure responsive behavior
- [ ] Set up proper axis labels and ranges
- [ ] Add legend to distinguish true vs sampled values
- [ ] Ensure consistent styling with existing charts
- [ ] Add hover tooltips for data points

### Implementation Notes:

- The true P99 values need to be calculated from the original unsampled data for each simulation run
- Each simulation should generate its own dataset, then calculate both true P99 (from full data) and sampled P99 (from sampled data)
- True P99 values (green points) will vary per simulation since each uses different generated data
- Sampled P99 values (red points) will also vary per simulation and show sampling error
- X-axis values are simulation indices (1, 2, 3, ..., numRuns)
- Chart should be positioned below the distribution chart but above the metrics cards
- Use existing Chart.js infrastructure and styling patterns

### Data Structure Changes Needed:

- Current `runSimulations()` generates one dataset and samples it multiple times
- Need to modify to generate fresh data for each simulation run
- Store both true and sampled P99 for each run
