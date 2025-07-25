# Calculating Confidence Intervals

This document explains how confidence intervals are calculated for each metric in the sampling uncertainty tool.

## Overview

The tool now uses **theoretical confidence intervals** based on known probability distributions and statistical theory, rather than empirical bootstrap methods. This provides much more accurate bounds that properly account for the underlying distribution shape.

## Confidence Interval Methods by Metric

### 1. COUNT
**Method**: Empirical variance with systematic sampling considerations

```javascript
function calculateTheoreticalCountConfidenceInterval(sampledCounts, sampleRate, confidenceLevel = 0.95)
```

- **Rationale**: Systematic sampling gives nearly deterministic counts within each simulation
- **Calculation**: Uses empirical variance across simulations since count variation comes from different random datasets
- **Result**: Very tight confidence intervals since counts are consistent

### 2. SUM  
**Method**: Central Limit Theorem with known distribution variance

```javascript
function calculateTheoreticalSumConfidenceInterval(sampledSums, distributionType, sampleRate, confidenceLevel = 0.95)
```

- **Rationale**: SUM scales linearly with sample size and distribution variance
- **Calculation**: 
  - Uses theoretical variance: `Var[Sum] = m * σ²` where m is sample size
  - Accounts for scaling factor: `Var[ScaledSum] = (sampleRate²) * m * σ²`
- **Result**: Moderate intervals reflecting scaling uncertainty

### 3. AVERAGE
**Method**: Central Limit Theorem with theoretical variance of sample means

```javascript
function calculateTheoreticalAverageConfidenceInterval(sampledAverages, distributionType, sampleRate, confidenceLevel = 0.95)
```

- **Rationale**: Sample means have well-understood sampling distribution
- **Calculation**:
  - Theoretical variance: `Var[X̄] = σ²/n` where n is sample size per simulation
  - Combines empirical and theoretical standard errors for robustness
- **Result**: Tight intervals since sample means are stable

### 4. P99
**Method**: Order statistics theory with beta distributions

```javascript
function calculateTheoreticalP99ConfidenceInterval(sampledValues, distributionType, confidenceLevel = 0.95)
```

- **Rationale**: P99 is a quantile (order statistic) with complex sampling behavior
- **Calculation**:
  - Uses beta distribution for k-th order statistic: `Beta(k, n-k+1)`
  - Converts probability space to original scale using theoretical quantiles
  - Position: `k = Math.ceil(0.99 * n)` for P99
- **Result**: Wide intervals for heavy-tailed distributions, tight for bounded distributions

## Distribution Parameters

Each distribution has known theoretical parameters:

```javascript
function getDistributionParameters(distributionType) {
  switch(distributionType) {
    case "exponential":
      return { mean: 100, variance: 10000 };
    case "normal": 
      return { mean: 100, variance: 400 };
    case "uniform":
      return { mean: 100, variance: 3333.33 };
    case "lognormal":
      return { mean: Math.exp(4.5), variance: (Math.exp(1) - 1) * Math.exp(9) };
    case "bimodal":
      return { mean: 100, variance: 2708.33 };
  }
}
```

## Theoretical Quantile Functions

For P99 calculations, each distribution has an exact quantile function:

- **Exponential**: `Q(p) = -ln(1-p) * 100`
- **Normal**: `Q(p) = 100 + 20 * Φ⁻¹(p)`
- **Uniform**: `Q(p) = p * 200`
- **Log-normal**: `Q(p) = exp(4 + Φ⁻¹(p))`
- **Bimodal**: Mixture approximation

## Mathematical Helper Functions

The implementation includes several mathematical functions:

- `normalInverse(p)`: Inverse normal CDF using Beasley-Springer-Moro algorithm
- `betaInverse(p, α, β)`: Inverse beta CDF using Newton-Raphson method
- `incompleteBeta(x, α, β)`: Incomplete beta function with continued fractions
- `gamma(x)` and `logGamma(x)`: Gamma function approximations

## Usage in Code

All metrics now use the theoretical approach:

```javascript
sampled: {
  count: calculateConfidenceIntervals(results.count, 0.95, "count", distributionType, sampleRate),
  sum: calculateConfidenceIntervals(results.sum, 0.95, "sum", distributionType, sampleRate),
  average: calculateConfidenceIntervals(results.average, 0.95, "average", distributionType, sampleRate),
  p99: calculateConfidenceIntervals(results.p99, 0.95, "p99", distributionType, sampleRate),
}
```

## Interpretation

The confidence intervals answer: **"Given this distribution and sampling rate, what range likely contains the true metric value?"**

This is different from empirical intervals which show: "What range of sampled values would I typically see?"

## Benefits

1. **Distribution-aware**: Accounts for heavy tails, bounded support, etc.
2. **Mathematically rigorous**: Based on statistical theory
3. **Appropriate widths**: Reflects true uncertainty for each distribution
4. **Robust**: Automatic fallback to empirical method if theoretical fails

## Example Results

For exponential distribution with 10:1 sampling:
- **COUNT**: `[10.0K, 10.0K]` (deterministic)
- **SUM**: `[983.0K, 1.0M]` (moderate uncertainty)  
- **AVERAGE**: `[98.28, 100.08]` (stable means)
- **P99**: `[264.34, 758.86]` (heavy tail uncertainty)
