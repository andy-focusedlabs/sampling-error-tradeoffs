# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **sampling uncertainty demo** - an interactive web application that visualizes how sampling rates affect aggregation accuracy in data analysis. The project demonstrates the tradeoffs between computational efficiency (lower sample rates) and statistical precision (higher accuracy), specifically modeling how Honeycomb's Refinery samples traces.

**IMPORTANT**: This is a **proof-of-concept project** and will always remain so. It is not intended for production use or significant expansion beyond its current educational purpose.

**Key Purpose**: Help users understand when sampling becomes problematic for different aggregation metrics (COUNT, SUM, AVERAGE, P99) across various probability distributions.

## Architecture

### Single-File Structure
- **Current State**: Monolithic structure with all code in `index.html`, `index.js`, and `styles.css`
- **Deliberate Choice**: Optimized for deployment simplicity (no build step required)
- **Future Consideration**: Notes indicate potential modularization but emphasize this is a proof-of-concept that prioritizes transparency over performance

### Core Components

#### Data Generation (`index.js:84-104`)
- **Distributions**: `exponential`, `normal`, `uniform`, `lognormal`, `bimodal`
- **Memory Management**: Batch processing for large datasets, maximum 10M events
- **Performance Scaling**: Adaptive simulation runs (10-50) based on dataset size

#### Sampling Strategy (`index.js:603-615`)
- **Method**: Random sampling with probability 1/sampleRate  
- **Not Systematic**: Despite comments mentioning systematic sampling, implementation uses random sampling

#### Statistical Calculations
- **P99**: Nearest-rank method (`index.js:617-623`)
- **Confidence Intervals**: Mixed theoretical/empirical approach with fallbacks (`index.js:994-1026`)
- **Aggregations**: COUNT (scaled), SUM (scaled), AVERAGE (unscaled), P99

#### Visualization (`index.js:366-565`)
- **Charts**: Chart.js-based scatter plots for each metric
- **Features**: Confidence interval shading, theoretical distribution overlay, responsive Y-axis scaling
- **Color Scheme**: Honeycomb brand colors defined in `HONEYCOMB_COLORS` constant

## Development Commands

**No build system currently exists** - this is a static web application.

### Local Development
```bash
# Serve locally (any static server)
python -m http.server 8000
# OR
npx serve
```

### Deployment
**GitHub Pages**: The app is deployed automatically to GitHub Pages at: https://jessitron.github.io/sampling-error-tradeoffs/

Simply push changes to the main branch - GitHub Pages handles deployment automatically with no build step required. This aligns with the proof-of-concept nature of the project.

## Key Implementation Details

### Performance Constraints
- **Volume Limit**: 10M events maximum to prevent browser crashes
- **Memory Optimization**: Batch processing with yield points for large datasets  
- **Adaptive Simulations**: Fewer runs for larger volumes (10-50 range)
- **Debounced Updates**: 100ms delay on parameter changes

### Statistical Accuracy Notes
From the disclaimer: "This was coded with a LOT of AI assistance. We haven't checked the math. In particular, I don't trust the confidence interval calculations. The simulations and aggregations seem right."

### Critical Functions for Modification

#### Adding New Distributions
- Extend `distributions` object (`index.js:84`)
- Add to `theoreticalDistributions` for plotting (`index.js:107`)
- Update HTML select options

#### Adding New Metrics  
- Extend `calculateAggregations()` (`index.js:625`)
- Add to `metricConfigs` object (`index.js:287`)
- Create corresponding chart elements in HTML

#### Modifying Sampling Strategy
- Replace `sampleEvents()` function (`index.js:603`)
- Update confidence interval calculations accordingly

## Entry Points for Understanding Code

1. **`updateDisplay()`** (`index.js:1152`): Main orchestration function
2. **`runSimulations()`** (`index.js:1028`): Core simulation engine  
3. **`drawMetricScatterPlot()`** (`index.js:366`): Generic chart rendering
4. **`generateEvents()`** (`index.js:572`): Data generation with memory management

## File Structure Context

```
/
├── index.html          # Main page with embedded Chart.js
├── index.js           # All JavaScript logic (~1275 lines)
├── styles.css         # Styling with Honeycomb branding
├── README.md          # Comprehensive documentation
└── notes/             # Development notes and feature plans
    ├── STRUCTURE-break-into-modules.md  # Modularization considerations
    ├── TODO.md         # Task tracking
    └── [other planning docs]
```

## Browser Compatibility
- **Minimum**: ES6 support (async/await, arrow functions)
- **Canvas**: HTML5 Canvas API required
- **Performance**: Recommended 4GB+ RAM for large datasets
- **CDN Dependency**: Chart.js loaded from cdn.jsdelivr.net