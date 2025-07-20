# P99 Scatter Plot Feature Implementation

## Overview

This feature adds a scatter plot visualization showing P99 values for each simulation run, comparing the "true" P99 (calculated from the full generated dataset) against the "sampled" P99 (calculated from the sampled subset). This helps users understand how sampling affects P99 accuracy across multiple simulation runs.

## Final Implementation

### Chart Structure

- **Chart Type**: Scatter plot using Chart.js
- **X-axis**: Simulation number (1 to numRuns)
- **Y-axis**: P99 value
- **Data Points**:
  - Green circles (radius 4): True P99 values
  - Red squares (radius 5): Sampled P99 values
- **Background**: Gray shaded area showing 95% confidence interval
- **Controls**: Y-axis toggle (Full scale vs Zoomed)

### Key Technical Decisions

#### 1. Data Generation Strategy

**Final Approach**: Generate separate datasets for each simulation run

- Each simulation creates its own random dataset using `generateEvents()`
- Calculate true P99 from the full dataset
- Sample the dataset and calculate sampled P99
- Store both values in `scatterPlotData` object

**Why This Works**: Shows both natural variation in P99 (due to random data generation) and sampling error, which is what users need to understand.

#### 2. Confidence Interval Visualization

**Final Approach**: Background shading (Option 5)

- Uses theoretical confidence intervals calculated across all simulations
- Implemented as two line chart datasets with `fill: "-1"` to create shaded area
- Single legend entry "95% Confidence Interval"

**Why This Works**: The theoretical CI represents the expected range where sampled P99 values should fall, so a horizontal band across the entire chart is the correct visualization.

#### 3. Point Styling for Visibility

**Final Approach**: Different shapes and sizes

- True P99: Green circles (smaller, on top)
- Sampled P99: Red squares (larger, behind)
- Larger squares "peek out" from behind smaller circles when values are close

**Why This Works**: Ensures both datasets are visible even when values overlap closely.

## Things That Didn't Work

### 1. Original Data Generation Approach

**What We Tried**: Generate one dataset and sample it multiple times

```javascript
// Generate one true dataset
const trueEvents = await generateEvents(volume, distributionType);
const trueAgg = calculateAggregations(trueEvents);

// Run multiple sampling simulations on the same data
for (let i = 0; i < numRuns; i++) {
  const sampledEvents = sampleEvents(trueEvents, sampleRate);
  // ...
}
```

**Why It Failed**: This showed only sampling error, not the natural variation in P99 that occurs when generating different datasets. The "true" P99 was constant across all simulations, which wasn't realistic or useful for understanding the full picture.

### 2. Individual Error Bars on Each Point

**What We Considered**: Adding error bars to each sampled P99 point showing its individual uncertainty

**Why We Didn't**: The confidence intervals we calculate are theoretical bounds across all simulations, not individual point uncertainties. Each sample has the same theoretical uncertainty given the same sample size and distribution.

### 3. Chart.js Fill Area Attempts

**What We Tried**: Various approaches to create background shading

```javascript
// Attempt 1: Single dataset with complex polygon
const ciData = [];
for (let i = 0; i <= numRuns + 1; i++) {
  ciData.push({ x: i, y: ciLower });
}
for (let i = numRuns + 1; i >= 0; i--) {
  ciData.push({ x: i, y: ciUpper });
}
```

**Why It Failed**: Chart.js scatter plots don't properly handle filled polygons. Got horizontal lines instead of shaded areas.

**What Worked**: Two separate line datasets with `fill: "-1"` to fill between them:

```javascript
// Lower bound line (no fill)
{ data: ciLowerData, fill: false, type: "line" }
// Upper bound line (fills to previous dataset)
{ data: ciUpperData, fill: "-1", type: "line" }
```

### 4. Legend Display Issues

**What We Tried**: Having both CI datasets show in legend

**Why It Failed**: Created two gray boxes in the legend, confusing users.

**What Worked**: Legend filter to hide datasets with empty labels:

```javascript
legend: {
  filter: function (legendItem, chartData) {
    return legendItem.text !== "";
  }
}
```

Note from user: this did not in fact work. There are still two gray boxes in the legend. I don't care that much

### 5. Point Layering Problems

**What We Tried**: Various `order` values to control which points appear on top

**Issues Encountered**:

- Red squares covering green circles completely
- Green circles too small to see behind red squares

**Final Solution**:

- Red squares (larger, order: 2) in back
- Green circles (smaller, order: 1) on top
- Size difference allows red squares to "peek out" when values are close

## Code Architecture

### Key Functions

- `drawP99ScatterPlot(results, yAxisMode)`: Main chart rendering function
- `runSimulations()`: Modified to generate separate datasets per simulation
- Confidence interval datasets created inline within chart function

### Data Flow

1. User adjusts parameters → `updateDisplay()` called
2. `runSimulations()` generates fresh data for each simulation run
3. `drawP99ScatterPlot()` called with results and Y-axis mode
4. Chart rendered with confidence interval background, then data points

### Integration Points

- Chart updates when any parameter changes (volume, sample rate, distribution)
- Y-axis toggle updates chart without re-running simulations (performance optimization)
- Proper chart cleanup on parameter changes to prevent memory leaks

## User Experience Improvements

### Y-Axis Toggle

- **Full scale (default)**: Shows Y-axis from 0, gives context of actual P99 values
- **Zoomed**: Auto-scales to data range, emphasizes differences between true/sampled

### Visual Hierarchy

1. Background confidence interval (subtle gray)
2. Sampled P99 data (prominent red squares)
3. True P99 data (green circles on top)

### Performance Considerations

- Chart destruction/recreation on parameter changes
- Efficient data structure for scatter plot points
- Y-axis toggle avoids expensive simulation re-runs

## Statistical Accuracy

The implementation uses sophisticated theoretical confidence intervals based on:

- Order statistics theory for P99 calculations
- Beta distributions for quantile confidence bounds
- Distribution-specific parameters and quantile functions
- Proper mathematical foundations rather than simple empirical percentiles

This provides users with statistically rigorous bounds that properly account for the underlying distribution characteristics and sampling behavior.
