# Breaking the Code into Modules

## Current Structure

The code is currently in a single file, `index.js`. This makes it hard to navigate and understand.

This does make it very easy to deploy, however. No compilation required, just serve the file

This app is (and always will be) a proof of concept. I don't need to optimize for loading performance, so there is no need to minimize bundle size. However, further development will be easier with a modular structure.

It is NOT yet time to consider which modules to make.

## Step 1: Make Modularity Possible

What build tools should we add to the project to make modularity possible? We want transparency and simplicity, not performance.

Please list options here:

**1. Native ES Modules (No Build Tool)**

- Use `<script type="module">` in HTML
- Import/export syntax works directly in modern browsers
- Zero configuration, maximum transparency
- Simply split `index.js` into modules and import them

**2. Vite** nfw

**3. Parcel** no

**4. esbuild (standalone)**

- Minimal setup, very fast
- Can bundle or just transform modules
- Single command: `esbuild index.js --bundle --outfile=dist/index.js`
- Excellent for proof-of-concept work

**5. Rollup** no

**Recommendation (approved) **: Start with **Native ES Modules** - split your code into modules and use browser-native imports. If you need a build step later, add **Vite** for its simplicity and transparency.

## Step 2: Break out one module

Let's break out a "constants" module that has the colors in it.
This will prove out the process of creating a module and importing it.

## Step 3: Plan all the modules

We can create modules for

- the vertical line chart plugin

What other modules make sense to you?

Based on analysis of the ~1275 line index.js file, here are logical modules:

### 1. **Chart Visualization Module** (`charts.js`)
- `verticalLinePlugin` - Custom Chart.js plugin for drawing vertical lines
- `metricConfigs` - Configuration objects for different metric scatter plots  
- `drawMetricScatterPlot()` - Generic scatter plot rendering function
- `updateDistributionChart()` - Distribution chart creation/update
- Chart instance variables

### 2. **Distribution Module** (`distributions.js`)
- `distributions` object - Random number generators for each distribution
- `theoreticalDistributions` object - Theoretical PDF functions
- `generateTheoreticalData()` - Creates theoretical distribution data for plotting
- `calculateTheoreticalStats()` - Calculates theoretical average and P99

### 3. **Statistical Functions Module** (`statistics.js`)
- `calculateP99NearestRank()` - P99 calculation using nearest rank
- `calculateAggregations()` - Calculates count, sum, average, P99 for events
- Mathematical helpers (normalInverse, betaInverse, etc.)

### 4. **Confidence Intervals Module** (`confidence-intervals.js`)
- All theoretical and empirical confidence interval calculation methods
- `calculateTheoreticalCountConfidenceInterval()`, `calculateTheoreticalSumConfidenceInterval()`, etc.

### 5. **Data Generation Module** (`data-generation.js`)
- `generateEvents()` - Generates synthetic event data with batch processing
- `sampleEvents()` - Random sampling implementation

### 6. **Simulation Engine Module** (`simulation.js`)
- `runSimulations()` - Main simulation runner that coordinates everything
- Simulation results data structures and aggregation

### 7. **UI Controller Module** (`ui-controller.js`)
- `updateDisplay()` - Main orchestration function
- `scheduleUpdate()` - Debounced update handler
- `updateExplanation()` - Updates explanation text and styling
- Event listeners and global state management

### 8. **Utilities Module** (`utils.js`)
- `formatNumber()` - Number formatting for display
- Other helper functions
