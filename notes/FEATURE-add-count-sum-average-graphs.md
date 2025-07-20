# Feature: COUNT, SUM, AVERAGE Scatter Plot Implementation

## Overview

This feature successfully added COUNT, SUM, and AVERAGE scatter plots to complement the existing P99 scatter plot. All charts share the same functionality: showing true vs sampled values across multiple simulation runs with confidence intervals and Y-axis toggle controls.

## Final Implementation

### Architecture

The implementation uses a **configuration-driven generic function** approach:

1. **`metricConfigs` object**: Defines chart properties for each metric type
2. **`drawMetricScatterPlot(metricType, results, yAxisMode)`**: Generic function that renders any metric
3. **Enhanced data collection**: `runSimulations()` collects data for all metrics during each simulation
4. **Unified update flow**: All charts update together when parameters change

### Key Components

#### 1. Metric Configuration System

```javascript
const metricConfigs = {
  count: {
    title: "COUNT For Each Simulation, Before and After Sampling",
    yAxisLabel: "Count",
    trueLabel: "True COUNT",
    sampledLabel: "Sampled COUNT",
    formatValue: (value) => {
      if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
      if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
      return value.toFixed(0);
    },
  },
  // ... similar for sum, average, p99
};
```

**Benefits**:

- Centralized configuration for easy maintenance
- Metric-specific formatting (K/M notation for large numbers)
- Consistent styling across all charts
- Easy to extend for new metrics

#### 2. Generic Chart Function

```javascript
function drawMetricScatterPlot(metricType, results, yAxisMode = "full") {
  const config = metricConfigs[metricType];
  // Uses config to set title, colors, formatting, etc.
  // Dynamically accesses data: results.scatterPlotData[`true${MetricType}`]
}
```

**Features**:

- Dynamic data access using computed property names
- Configuration-driven chart properties
- Enhanced tooltips with formatted values
- Y-axis formatting using metric-specific functions

#### 3. Data Collection Enhancement

Extended `scatterPlotData` in `runSimulations()`:

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

**Important**: COUNT and SUM values are scaled by `sampleRate` to represent the "true" scaled values.

#### 4. HTML Structure

Each chart follows the same pattern:

```html
<div class="[metric]-scatter-chart">
  <div class="chart-header">
    <h3>[METRIC] For Each Simulation, Before and After Sampling</h3>
    <div class="chart-controls">
      <label for="[metric]YAxisToggle">Y-axis:</label>
      <select id="[metric]YAxisToggle">
        <option value="zoomed">Zoomed (auto-scale)</option>
        <option value="full" selected>Full scale (from 0)</option>
      </select>
    </div>
  </div>
  <div class="chart-container">
    <canvas id="[metric]ScatterChart"></canvas>
  </div>
</div>
```

## Implementation Phases (Completed)

### ✅ Phase 1: Generic Function Creation

- Created `drawMetricScatterPlot()` with metric configuration
- Updated data structures to collect all metrics
- Refactored P99 chart to use generic function
- **Result**: Backward compatible, P99 chart unchanged

### ✅ Phase 4: Enhanced Configuration (Done First)

- Added comprehensive metric configurations
- Implemented smart number formatting (K/M notation)
- Enhanced tooltips and axis formatting
- **Result**: Professional appearance with readable large numbers

### ✅ Phase 2 & 3: HTML Structure and Integration

- Added HTML for COUNT, SUM, AVERAGE charts
- Integrated all charts into `updateDisplay()`
- Added Y-axis toggle event listeners
- **Result**: Four fully functional scatter plots

## Technical Lessons Learned

### ✅ What Worked Well

1. **Configuration-Driven Approach**: The `metricConfigs` object made it easy to add new charts with consistent behavior but metric-specific formatting.

2. **Generic Function Design**: `drawMetricScatterPlot()` successfully abstracted all chart logic while maintaining flexibility.

3. **Chart.js Integration**: Using Chart.js `fill: "-1"` for confidence interval shading worked reliably across all metrics.

4. **Performance Optimization**: Y-axis toggles only redraw individual charts without re-running simulations.

5. **Data Structure Design**: Extending `scatterPlotData` with all metrics was straightforward and maintainable.

### ⚠️ Challenges and Warnings

#### 1. Chart Variable Management

**Problem**: Initially tried to use `window[config.chartVariable]` for chart destruction.
**Solution**: Used explicit switch statements to access global chart variables.
**Warning**: Chart.js chart instances must be properly destroyed before creating new ones to prevent memory leaks.

```javascript
// ❌ Didn't work reliably
const chartVariable = window[config.chartVariable];

// ✅ Works correctly
switch (config.chartVariable) {
  case "countScatterChart":
    chartVariable = countScatterChart;
    break;
  // ...
}
```

#### 2. Data Key Generation

**Challenge**: Dynamic property access for scatter plot data.
**Solution**: Used template literals with proper capitalization:

```javascript
const trueDataKey = `true${metricType.charAt(0).toUpperCase() + metricType.slice(1)}`;
```

**Warning**: Ensure consistent naming between data keys and metric types.

#### 3. Chart.js Global Object

**Issue**: IDE warnings about `Chart` not being found.
**Reality**: Chart.js is loaded via CDN and works correctly at runtime.
**Warning**: This is a TypeScript/IDE issue, not a runtime problem.

#### 4. Confidence Interval Visualization

**Success**: The existing confidence interval approach (two line datasets with `fill: "-1"`) worked perfectly for all metrics.
**Warning**: Don't try to reinvent this - the current approach is robust.

### 🚨 Critical Implementation Details

1. **Data Scaling**: COUNT and SUM values must be scaled by `sampleRate` in the scatter plot data:

   ```javascript
   scatterPlotData.sampledCount.push(sampledAgg.count * sampleRate);
   scatterPlotData.sampledSum.push(sampledAgg.sum * sampleRate);
   ```

2. **Chart Destruction**: Always destroy existing charts before creating new ones:

   ```javascript
   if (chartVariable) {
     chartVariable.destroy();
   }
   ```

3. **Event Listener Pattern**: Y-axis toggles should only redraw charts, not re-run simulations:
   ```javascript
   document.getElementById("countYAxisToggle").addEventListener("change", () => {
     if (latestResults) {
       const yAxisMode = document.getElementById("countYAxisToggle").value;
       drawMetricScatterPlot("count", latestResults, yAxisMode);
     }
   });
   ```

## User Value Delivered

### Before: Single P99 Chart

Users could only see how sampling affected P99 values.

### After: Comprehensive Metric Analysis

Users can now analyze sampling effects across **four key metrics simultaneously**:

- **COUNT**: Shows sampling accuracy for event counts (usually perfect)
- **SUM**: Reveals how totals are affected by sampling (usually very good)
- **AVERAGE**: Demonstrates mean value preservation (usually excellent)
- **P99**: Shows percentile accuracy under sampling (most variable)

### Real-World Impact

This helps users make informed decisions about sample rates by understanding:

- Which metrics are most/least affected by sampling
- How different distributions impact sampling accuracy
- What sample rates provide acceptable accuracy for their use case

## Future Extensions

The configuration-driven approach makes it easy to add new metrics:

1. Add metric to `metricConfigs` with appropriate formatting
2. Extend `scatterPlotData` in `runSimulations()`
3. Add HTML structure following the established pattern
4. Add event listener for Y-axis toggle

**Example**: Adding P95 would require minimal code changes thanks to the abstraction.

## Performance Notes

- **Chart Rendering**: Four charts render smoothly without performance issues
- **Memory Management**: Proper chart destruction prevents memory leaks
- **Simulation Efficiency**: Y-axis toggles don't trigger expensive re-simulations
- **Data Collection**: Collecting all metrics during simulation adds minimal overhead

## Conclusion

This implementation successfully demonstrates how to:

1. **Abstract existing functionality** into reusable components
2. **Maintain backward compatibility** while adding new features
3. **Use configuration-driven design** for maintainable code
4. **Handle Chart.js integration** properly with multiple charts
5. **Optimize performance** with selective chart updates

The result is a robust, maintainable system that provides significant user value while being easy to extend for future metrics.
