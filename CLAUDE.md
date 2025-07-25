# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Sampling uncertainty demo** - visualizes how sampling rates affect aggregation accuracy for COUNT, SUM, AVERAGE, and P99 metrics across different probability distributions. Models Honeycomb's Refinery trace sampling.

**IMPORTANT**: This is a **proof-of-concept** and will always remain so. Not intended for production use or significant expansion.

## Architecture

**Single-file structure** with no build system:
- `index.html` - Main page with Chart.js CDN
- `index.js` - All logic (~1275 lines)  
- `styles.css` - Honeycomb brand styling

**Key components:**
- **Data Generation**: 5 distributions (exponential, normal, uniform, lognormal, bimodal), max 10M events
- **Sampling**: Random sampling with probability 1/sampleRate
- **Statistics**: P99 via nearest-rank, mixed theoretical/empirical confidence intervals
- **Visualization**: Chart.js scatter plots with confidence interval shading

## Development

### Local Development
```bash
./run
```

### Deployment
**GitHub Pages**: Auto-deploys to https://jessitron.github.io/sampling-error-tradeoffs/ on push to main branch.

## Key Implementation Details

**Performance limits**: 10M events max, adaptive simulations (10-50 runs), batch processing, debounced updates.

**Statistical accuracy disclaimer**: "This was coded with a LOT of AI assistance. We haven't checked the math. In particular, I don't trust the confidence interval calculations."

**Critical functions:**
- `updateDisplay()` (`index.js:1152`) - Main orchestration
- `runSimulations()` (`index.js:1028`) - Core simulation engine
- `drawMetricScatterPlot()` (`index.js:366`) - Chart rendering
- `generateEvents()` (`index.js:572`) - Data generation

**Adding new distributions**: Extend `distributions` object (line 84), `theoreticalDistributions` (line 107), HTML options.

**Adding new metrics**: Extend `calculateAggregations()` (line 625), `metricConfigs` (line 287), HTML charts.