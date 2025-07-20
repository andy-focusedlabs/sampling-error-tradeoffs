# Feature: Add COUNT, SUM, AVERAGE Graphs

There is a P99 graph, described in [FEATURE-add-p99-graph.md](FEATURE-add-p99-graph.md). We want to add COUNT, SUM, and AVERAGE graphs with the same features.

## Abstraction

How can we abstract the code that generates the P99 graph to something that can be used to generate the other graphs?

## Implementation Plan

### Phase 1: Create Generic Scatter Plot Function

**Goal**: Extract the P99-specific logic from `drawP99ScatterPlot()` into a reusable generic function.

**Tasks**:

1. **Create `drawMetricScatterPlot(metricType, results, yAxisMode)`**

   - Extract chart creation logic from `drawP99ScatterPlot()`
   - Make metric type configurable (count, sum, average, p99)
   - Use dynamic data access: `results.scatterPlotData[`true${metricType}`]` and `results.scatterPlotData[`sampled${metricType}`]`
   - Make chart title, axis labels, and canvas ID configurable

2. **Update data structure in `runSimulations()`**

   - Extend `scatterPlotData` object to include all metrics:
     ```javascript
     const scatterPlotData = {
       trueP99: [],
       sampledP99: [],
       trueCount: [],
       sampledCount: [],
       trueSum: [],
       sampledSum: [],
       trueAverage: [],
       sampledAverage: [],
     };
     ```
   - Store all metric values during simulation loop

3. **Refactor `drawP99ScatterPlot()` to use generic function**
   - Replace implementation with call to `drawMetricScatterPlot('p99', results, yAxisMode)`
   - Ensure backward compatibility

### Phase 2: Add HTML Structure for New Charts

**Goal**: Create UI elements for COUNT, SUM, and AVERAGE scatter plots.

**Tasks**:

1. **Add chart containers to `index.html`**

   - Create sections similar to `.p99-scatter-chart` for each metric
   - Include chart headers, controls (Y-axis toggle), and canvas elements
   - Use consistent naming: `countScatterChart`, `sumScatterChart`, `averageScatterChart`

2. **Add chart control variables**

   - Create global chart variables: `countScatterChart`, `sumScatterChart`, `averageScatterChart`
   - Initialize to null like `p99ScatterChart`

3. **Style new chart sections**
   - Ensure consistent styling with existing P99 chart
   - Consider layout arrangement (stacked vertically or in grid)

### Phase 3: Integrate New Charts into Update Flow

**Goal**: Make all charts update when parameters change.

**Tasks**:

1. **Update `updateDisplay()` function**

   - Add calls to draw all scatter plots after `runSimulations()`
   - Get Y-axis mode for each chart from respective toggle controls
   - Example:
     ```javascript
     drawMetricScatterPlot("count", results, document.getElementById("countYAxisToggle").value);
     drawMetricScatterPlot("sum", results, document.getElementById("sumYAxisToggle").value);
     drawMetricScatterPlot("average", results, document.getElementById("averageYAxisToggle").value);
     drawMetricScatterPlot("p99", results, document.getElementById("p99YAxisToggle").value);
     ```

2. **Add event listeners for new Y-axis toggles**
   - Create change handlers for each new toggle
   - Redraw only the specific chart when its toggle changes (performance optimization)

### Phase 4: Enhance Generic Function with Metric-Specific Features

**Goal**: Handle differences between metrics while maintaining code reuse.

**Tasks**:

1. **Create metric configuration object**

   ```javascript
   const metricConfigs = {
     count: {
       title: "COUNT For Each Simulation, Before and After Sampling",
       yAxisLabel: "Count",
       trueColor: "green",
       sampledColor: "red",
       canvasId: "countScatterChart",
     },
     sum: {
       title: "SUM For Each Simulation, Before and After Sampling",
       yAxisLabel: "Sum",
       trueColor: "green",
       sampledColor: "red",
       canvasId: "sumScatterChart",
     },
     // ... etc
   };
   ```

2. **Update generic function to use configuration**

   - Use config object to set chart title, colors, canvas ID
   - Handle metric-specific confidence interval calculation
   - Ensure proper data scaling and formatting

3. **Add metric-specific optimizations**
   - Consider different point sizes/shapes for different metrics
   - Handle large value ranges (especially for SUM)
   - Add appropriate number formatting for axis labels

### Phase 5: Testing and Refinement

**Goal**: Ensure all charts work correctly and provide value to users.

**Tasks**:

1. **Test with different parameter combinations**

   - Verify all charts update correctly when volume, sample rate, or distribution changes
   - Test Y-axis toggles for each chart
   - Ensure confidence intervals display properly for all metrics

2. **Performance optimization** (no, don't do this)

   - Ensure chart destruction/recreation works for all charts
   - Verify no memory leaks when switching parameters
   - Consider lazy loading or progressive rendering for multiple charts

3. **User experience improvements** (no, don't do this)
   - Add loading states for chart generation
   - Consider chart arrangement and scrolling behavior
   - Add tooltips or help text explaining what each chart shows

### Technical Considerations

**Data Flow Changes**:

- `runSimulations()` must collect data for all metrics during each simulation run
- Confidence interval calculation already supports all metrics via `calculateConfidenceIntervals()`
- Chart rendering becomes metric-agnostic with configuration-driven approach

**Code Reuse Strategy**:

- Maximum reuse of existing P99 implementation patterns
- Leverage existing confidence interval infrastructure
- Maintain consistent visual design across all charts

**Backward Compatibility**:

- Existing P99 chart functionality must remain unchanged
- No breaking changes to current API or user interface
- Gradual enhancement approach allows incremental testing

### Success Criteria

1. **Functional**: All four metrics (COUNT, SUM, AVERAGE, P99) have working scatter plots
2. **Consistent**: All charts have same features (confidence intervals, Y-axis toggle, proper styling)
3. **Performant**: Adding three new charts doesn't significantly slow down the application
4. **Maintainable**: Code is well-abstracted and easy to extend for future metrics
5. **User-friendly**: Charts provide clear value and are easy to understand and use
