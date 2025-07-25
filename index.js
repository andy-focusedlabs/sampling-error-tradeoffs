import { HONEYCOMB_COLORS } from "./constants.js";
import { verticalLinePlugin } from "./verticalLinePlugin.js";

// Register the custom plugin
Chart.register(verticalLinePlugin);

// Global variable to store latest results
let latestResults = null;

let updateTimer = null;
let isUpdating = false;

// Chart instances
let distributionChart = null;
let p99ScatterChart = null;
let countScatterChart = null;
let sumScatterChart = null;
let averageScatterChart = null;

// Distribution generators
const distributions = {
  exponential: () => -Math.log(Math.random()) * 100,
  normal: () => {
    // Box-Muller transform
    const u1 = Math.random();
    const u2 = Math.random();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return z0 * 20 + 100;
  },
  uniform: () => Math.random() * 200,
  lognormal: () => {
    const u1 = Math.random();
    const u2 = Math.random();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return Math.exp(z0 * 1 + 4);
  },
  bimodal: () => {
    return Math.random() < 0.5 ? Math.random() * 50 + 25 : Math.random() * 50 + 125;
  },
};

// Theoretical distribution functions for plotting
const theoreticalDistributions = {
  exponential: (x) => {
    const lambda = 1 / 100; // scale parameter
    return x >= 0 ? lambda * Math.exp(-lambda * x) : 0;
  },
  normal: (x) => {
    const mu = 100;
    const sigma = 20;
    return (1 / (sigma * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * Math.pow((x - mu) / sigma, 2));
  },
  uniform: (x) => {
    return x >= 0 && x <= 200 ? 1 / 200 : 0;
  },
  lognormal: (x) => {
    if (x <= 0) return 0;
    const mu = 4;
    const sigma = 1;
    return (1 / (x * sigma * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * Math.pow((Math.log(x) - mu) / sigma, 2));
  },
  bimodal: (x) => {
    // Mixture of two uniform distributions
    const pdf1 = x >= 25 && x <= 75 ? 1 / 50 : 0;
    const pdf2 = x >= 125 && x <= 175 ? 1 / 50 : 0;
    return 0.5 * pdf1 + 0.5 * pdf2;
  },
};

// Generate theoretical distribution data for plotting
function generateTheoreticalData(distributionType, numPoints = 200) {
  const theoreticalFunc = theoreticalDistributions[distributionType];
  const data = [];

  // Determine appropriate range for each distribution
  let minX, maxX;
  switch (distributionType) {
    case "exponential":
      minX = 0;
      maxX = 500;
      break;
    case "normal":
      minX = 20;
      maxX = 180;
      break;
    case "uniform":
      minX = 0;
      maxX = 200;
      break;
    case "lognormal":
      minX = 1;
      maxX = 300;
      break;
    case "bimodal":
      minX = 0;
      maxX = 200;
      break;
    default:
      minX = 0;
      maxX = 200;
  }

  const step = (maxX - minX) / numPoints;
  for (let i = 0; i <= numPoints; i++) {
    const x = minX + i * step;
    const y = theoreticalFunc(x);
    data.push({ x, y });
  }

  return data;
}

// Calculate theoretical average and P99 for a distribution
function calculateTheoreticalStats(distributionType, numSamples = 100000) {
  const generator = distributions[distributionType];
  const samples = [];

  for (let i = 0; i < numSamples; i++) {
    samples.push(Math.max(0, generator()));
  }

  const sum = samples.reduce((a, b) => a + b, 0);
  const average = sum / samples.length;

  // Calculate P99
  const sorted = samples.slice().sort((a, b) => a - b);
  const p99Index = Math.ceil(0.99 * sorted.length) - 1;
  const p99 = sorted[Math.max(0, Math.min(p99Index, sorted.length - 1))];

  return { average, p99 };
}

// Create or update the distribution chart
function updateDistributionChart(distributionType) {
  const ctx = document.getElementById("distributionChart").getContext("2d");
  const data = generateTheoreticalData(distributionType);

  // Calculate theoretical stats for markers
  const stats = calculateTheoreticalStats(distributionType);

  // Destroy existing chart if it exists
  if (distributionChart) {
    distributionChart.destroy();
  }

  // Get distribution name for title
  const distributionNames = {
    exponential: "Exponential Distribution (λ=1)",
    normal: "Normal Distribution (μ=100, σ=20)",
    uniform: "Uniform Distribution (0-200)",
    lognormal: "Log-Normal Distribution (μ=4, σ=1)",
    bimodal: "Bimodal Distribution",
  };

  distributionChart = new Chart(ctx, {
    type: "line",
    data: {
      datasets: [
        {
          label: "Probability Density",
          data: data,
          borderColor: HONEYCOMB_COLORS.pacific,
          backgroundColor: HONEYCOMB_COLORS.pacific + "1A", // 10% opacity
          fill: true,
          tension: 0.1,
          pointRadius: 0,
          pointHoverRadius: 3,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      aspectRatio: 2,
      plugins: {
        title: {
          display: true,
          text: distributionNames[distributionType] || "Distribution",
          font: {
            size: 14,
            weight: "bold",
          },
        },
        legend: {
          display: false,
        },
        verticalLines: {
          average: stats.average,
          p99: stats.p99,
        },
      },
      scales: {
        x: {
          type: "linear",
          title: {
            display: true,
            text: "Value",
          },
          grid: {
            color: HONEYCOMB_COLORS.gray300 + "40", // 25% opacity
          },
        },
        y: {
          title: {
            display: true,
            text: "Probability Density",
          },
          grid: {
            color: HONEYCOMB_COLORS.gray300 + "40", // 25% opacity
          },
          beginAtZero: true,
        },
      },
      interaction: {
        intersect: false,
        mode: "index",
      },
    },
  });
}

// Metric configuration for scatter plots
const metricConfigs = {
  count: {
    yAxisLabel: "Count",
    trueColor: HONEYCOMB_COLORS.lime,
    sampledColor: HONEYCOMB_COLORS.red500,
    canvasId: "countScatterChart",
    chartVariable: "countScatterChart",
    trueLabel: "True COUNT",
    sampledLabel: "Sampled COUNT",
    truePointStyle: "circle",
    sampledPointStyle: "rect",
    truePointRadius: 4,
    sampledPointRadius: 5,
    trueOrder: 1,
    sampledOrder: 2,
    formatValue: (value) => {
      if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
      if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
      return value.toFixed(0);
    },
  },
  sum: {
    yAxisLabel: "Sum",
    trueColor: HONEYCOMB_COLORS.lime,
    sampledColor: HONEYCOMB_COLORS.red500,
    canvasId: "sumScatterChart",
    chartVariable: "sumScatterChart",
    trueLabel: "True SUM",
    sampledLabel: "Sampled SUM",
    truePointStyle: "circle",
    sampledPointStyle: "rect",
    truePointRadius: 4,
    sampledPointRadius: 5,
    trueOrder: 1,
    sampledOrder: 2,
    formatValue: (value) => {
      if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
      if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
      return value.toFixed(0);
    },
  },
  average: {
    yAxisLabel: "Average",
    trueColor: HONEYCOMB_COLORS.lime,
    sampledColor: HONEYCOMB_COLORS.red500,
    canvasId: "averageScatterChart",
    chartVariable: "averageScatterChart",
    trueLabel: "True AVERAGE",
    sampledLabel: "Sampled AVERAGE",
    truePointStyle: "circle",
    sampledPointStyle: "rect",
    truePointRadius: 4,
    sampledPointRadius: 5,
    trueOrder: 1,
    sampledOrder: 2,
    formatValue: (value) => value.toFixed(2),
  },
  p99: {
    yAxisLabel: "P99 Value",
    trueColor: HONEYCOMB_COLORS.lime,
    sampledColor: HONEYCOMB_COLORS.red500,
    canvasId: "p99ScatterChart",
    chartVariable: "p99ScatterChart",
    trueLabel: "True P99",
    sampledLabel: "Sampled P99",
    truePointStyle: "circle",
    sampledPointStyle: "rect",
    truePointRadius: 4,
    sampledPointRadius: 5,
    trueOrder: 1,
    sampledOrder: 2,
    formatValue: (value) => value.toFixed(2),
  },
};

// Generic scatter plot function for any metric
function drawMetricScatterPlot(metricType, results, yAxisMode = "full") {
  const config = metricConfigs[metricType];
  if (!config) {
    throw new Error(`Unknown metric type: ${metricType}`);
  }

  const ctx = document.getElementById(config.canvasId).getContext("2d");

  // Destroy existing chart if it exists
  let chartVariable;
  switch (config.chartVariable) {
    case "countScatterChart":
      chartVariable = countScatterChart;
      break;
    case "sumScatterChart":
      chartVariable = sumScatterChart;
      break;
    case "averageScatterChart":
      chartVariable = averageScatterChart;
      break;
    case "p99ScatterChart":
      chartVariable = p99ScatterChart;
      break;
  }
  if (chartVariable) {
    chartVariable.destroy();
  }

  // Prepare data for scatter plot
  const trueDataKey = `true${metricType.charAt(0).toUpperCase() + metricType.slice(1)}`;
  const sampledDataKey = `sampled${metricType.charAt(0).toUpperCase() + metricType.slice(1)}`;

  const numRuns = results.scatterPlotData[trueDataKey].length;
  const trueData = [];
  const sampledData = [];

  for (let i = 0; i < numRuns; i++) {
    trueData.push({
      x: i + 1, // Simulation number (1-based)
      y: results.scatterPlotData[trueDataKey][i],
    });
    sampledData.push({
      x: i + 1, // Simulation number (1-based)
      y: results.scatterPlotData[sampledDataKey][i],
    });
  }

  // Add confidence interval background shading
  const ciLowerData = [];
  const ciUpperData = [];
  if (results.sampled && results.sampled[metricType]) {
    const ciLower = results.sampled[metricType].lower;
    const ciUpper = results.sampled[metricType].upper;

    // Create line datasets for upper and lower bounds
    for (let i = 0; i <= numRuns + 1; i++) {
      ciLowerData.push({ x: i, y: ciLower });
      ciUpperData.push({ x: i, y: ciUpper });
    }
  }

  const chart = new Chart(ctx, {
    type: "scatter",
    data: {
      datasets: [
        {
          label: "95% Confidence Interval",
          data: ciLowerData,
          backgroundColor: HONEYCOMB_COLORS.gray500 + "33", // 20% opacity
          borderColor: HONEYCOMB_COLORS.gray500 + "66", // 40% opacity
          borderWidth: 1,
          fill: false,
          pointRadius: 0,
          pointHoverRadius: 0,
          showLine: true,
          tension: 0,
          order: 3, // Draw behind other datasets
          type: "line",
        },
        {
          label: "", // Empty label so it doesn't show in legend
          data: ciUpperData,
          backgroundColor: HONEYCOMB_COLORS.gray500 + "33", // 20% opacity
          borderColor: HONEYCOMB_COLORS.gray500 + "66", // 40% opacity
          borderWidth: 1,
          fill: "-1", // Fill to the previous dataset (ciLowerData)
          pointRadius: 0,
          pointHoverRadius: 0,
          showLine: true,
          tension: 0,
          order: 3,
          type: "line",
          hidden: false, // Keep visible but hide from legend
        },
        {
          label: config.sampledLabel,
          data: sampledData,
          backgroundColor: config.sampledColor,
          borderColor: config.sampledColor,
          pointRadius: config.sampledPointRadius,
          pointHoverRadius: config.sampledPointRadius + 2,
          pointStyle: config.sampledPointStyle,
          order: config.sampledOrder,
        },
        {
          label: config.trueLabel,
          data: trueData,
          backgroundColor: config.trueColor,
          borderColor: config.trueColor,
          pointRadius: config.truePointRadius,
          pointHoverRadius: config.truePointRadius + 2,
          pointStyle: config.truePointStyle,
          order: config.trueOrder,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      aspectRatio: 2,
      plugins: {
        title: {
          display: true,
          text: config.title,
          font: {
            size: 14,
            weight: "bold",
          },
        },
        legend: {
          display: true,
          position: "top",
          filter: function (legendItem) {
            // Hide datasets with empty labels (the upper CI bound)
            return legendItem.text !== "";
          },
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              const label = context.dataset.label || "";
              const value = config.formatValue(context.parsed.y);
              return `${label}: ${value}`;
            },
          },
        },
      },
      scales: {
        x: {
          type: "linear",
          title: {
            display: true,
            text: "Simulation Number",
          },
          grid: {
            color: HONEYCOMB_COLORS.gray300 + "40", // 25% opacity
          },
          min: 0.5,
          max: numRuns + 0.5,
        },
        y: {
          title: {
            display: true,
            text: config.yAxisLabel,
          },
          grid: {
            color: HONEYCOMB_COLORS.gray300 + "40", // 25% opacity
          },
          beginAtZero: yAxisMode === "full",
          ticks: {
            callback: function (value) {
              return config.formatValue(value);
            },
          },
        },
      },
      interaction: {
        intersect: false,
        mode: "point",
      },
    },
  });

  // Store chart in global variable
  switch (config.chartVariable) {
    case "countScatterChart":
      countScatterChart = chart;
      break;
    case "sumScatterChart":
      sumScatterChart = chart;
      break;
    case "averageScatterChart":
      averageScatterChart = chart;
      break;
    case "p99ScatterChart":
      p99ScatterChart = chart;
      break;
  }
}

// Create or update the P99 scatter plot (refactored to use generic function)
function drawP99ScatterPlot(results, yAxisMode = "full") {
  drawMetricScatterPlot("p99", results, yAxisMode);
}

// Generate synthetic event data
// we should be able to use a streaming model instead, retaining only as much as we need to calculate the aggregations.
// For a perfect p99 though, we might need all of it? ... or all of it in the top 5% of expected values.
async function generateEvents(count, distributionType) {
  // Limit to prevent memory issues
  const maxEvents = 10000000; // 10M events max
  if (count > maxEvents) {
    throw new Error(`Event count ${count.toLocaleString()} exceeds maximum of ${maxEvents.toLocaleString()}`);
  }

  const generator = distributions[distributionType];
  const events = [];

  // Use batch processing for large datasets
  const batchSize = 100000;
  for (let batch = 0; batch < count; batch += batchSize) {
    const batchEnd = Math.min(batch + batchSize, count);
    for (let i = batch; i < batchEnd; i++) {
      events.push({
        id: i,
        value: Math.max(0, generator()), // Ensure non-negative values
      });
    }
    // Allow other operations if processing large dataset
    if (batch > 0 && batch % (batchSize * 10) === 0) {
      await new Promise((resolve) => setTimeout(resolve, 1));
    }
  }
  return events;
}

// Sample events using random sampling
// Each event has a 1/sampleRate probability of being included
function sampleEvents(events, sampleRate) {
  const sampled = [];
  const probability = 1 / sampleRate;

  for (let i = 0; i < events.length; i++) {
    if (Math.random() < probability) {
      sampled.push(events[i]);
    }
  }
  return sampled;
}

// Calculate P99 using nearest rank method
function calculateP99NearestRank(values) {
  if (values.length === 0) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  const rank = Math.ceil(0.99 * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(rank, sorted.length - 1))];
}

// Calculate aggregations
function calculateAggregations(events) {
  const values = events.map((e) => e.value);
  const sum = values.reduce((a, b) => a + b, 0);

  return {
    count: events.length,
    sum: sum,
    average: sum / events.length,
    p99: calculateP99NearestRank(values),
  };
}

// Mathematical helper functions for theoretical confidence intervals

// Approximate inverse normal CDF using Beasley-Springer-Moro algorithm
function normalInverse(p) {
  if (p <= 0 || p >= 1) {
    throw new Error("p must be between 0 and 1");
  }

  // Constants for the approximation
  const a = [0, -3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2, -3.066479806614716e1, 2.506628277459239];
  const b = [0, -5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
  const c = [0, -7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [0, 7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];

  let x, r;

  if (p < 0.02425) {
    // Lower tail
    const q = Math.sqrt(-2 * Math.log(p));
    x = (((((c[1] * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) * q + c[6]) / ((((d[1] * q + d[2]) * q + d[3]) * q + d[4]) * q + 1);
  } else if (p > 0.97575) {
    // Upper tail
    const q = Math.sqrt(-2 * Math.log(1 - p));
    x = -(((((c[1] * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) * q + c[6]) / ((((d[1] * q + d[2]) * q + d[3]) * q + d[4]) * q + 1);
  } else {
    // Central region
    const q = p - 0.5;
    r = q * q;
    x = ((((((a[1] * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * r + a[6]) * q) / (((((b[1] * r + b[2]) * r + b[3]) * r + b[4]) * r + b[5]) * r + 1);
  }

  return x;
}

// Approximate inverse beta CDF using Newton-Raphson method
function betaInverse(p, alpha, beta) {
  if (p <= 0) return 0;
  if (p >= 1) return 1;

  // Initial guess using normal approximation
  let x = 0.5;

  // Newton-Raphson iterations
  for (let i = 0; i < 20; i++) {
    const fx = incompleteBeta(x, alpha, beta) - p;
    const fpx = betaPDF(x, alpha, beta);

    if (Math.abs(fx) < 1e-10) break;
    if (fpx === 0) break;

    const newX = x - fx / fpx;
    if (newX <= 0 || newX >= 1) {
      // Bisection fallback
      if (fx > 0) {
        x = x / 2;
      } else {
        x = (x + 1) / 2;
      }
    } else {
      x = newX;
    }
  }

  return Math.max(0, Math.min(1, x));
}

// Beta probability density function
function betaPDF(x, alpha, beta) {
  if (x <= 0 || x >= 1) return 0;
  return (Math.pow(x, alpha - 1) * Math.pow(1 - x, beta - 1)) / betaFunction(alpha, beta);
}

// Beta function B(α, β) = Γ(α)Γ(β)/Γ(α+β)
function betaFunction(alpha, beta) {
  return Math.exp(logGamma(alpha) + logGamma(beta) - logGamma(alpha + beta));
}

// Log gamma function approximation
function logGamma(x) {
  if (x < 12) {
    return Math.log(Math.abs(gamma(x)));
  }

  // Stirling's approximation for large x
  const c = [1 / 12, -1 / 360, 1 / 1260, -1 / 1680, 1 / 1188];
  let z = 1 / (x * x);
  let sum = c[0];
  for (let i = 1; i < c.length; i++) {
    sum = sum * z + c[i];
  }
  return (x - 0.5) * Math.log(x) - x + 0.5 * Math.log(2 * Math.PI) + sum / x;
}

// Gamma function approximation
function gamma(x) {
  if (x < 0.5) {
    return Math.PI / (Math.sin(Math.PI * x) * gamma(1 - x));
  }

  x -= 1;
  const g = 7;
  const p = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012,
    9.9843695780195716e-6, 1.5056327351493116e-7,
  ];

  let a = p[0];
  for (let i = 1; i < p.length; i++) {
    a += p[i] / (x + i);
  }

  const t = x + g + 0.5;
  return Math.sqrt(2 * Math.PI) * Math.pow(t, x + 0.5) * Math.exp(-t) * a;
}

// Incomplete beta function I_x(α, β)
function incompleteBeta(x, alpha, beta) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;

  // Use continued fraction expansion
  const bt = Math.exp(logGamma(alpha + beta) - logGamma(alpha) - logGamma(beta) + alpha * Math.log(x) + beta * Math.log(1 - x));

  if (x < (alpha + 1) / (alpha + beta + 2)) {
    return (bt * betaContinuedFraction(x, alpha, beta)) / alpha;
  } else {
    return 1 - (bt * betaContinuedFraction(1 - x, beta, alpha)) / beta;
  }
}

// Continued fraction for incomplete beta function
function betaContinuedFraction(x, alpha, beta) {
  const maxIter = 100;
  const eps = 1e-15;

  let c = 1;
  let d = 1 - ((alpha + beta) * x) / (alpha + 1);
  if (Math.abs(d) < eps) d = eps;
  d = 1 / d;
  let h = d;

  for (let m = 1; m <= maxIter; m++) {
    const m2 = 2 * m;
    let aa = (m * (beta - m) * x) / ((alpha + m2 - 1) * (alpha + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < eps) d = eps;
    c = 1 + aa / c;
    if (Math.abs(c) < eps) c = eps;
    d = 1 / d;
    h *= d * c;

    aa = (-(alpha + m) * (alpha + beta + m) * x) / ((alpha + m2) * (alpha + m2 + 1));
    d = 1 + aa * d;
    if (Math.abs(d) < eps) d = eps;
    c = 1 + aa / c;
    if (Math.abs(c) < eps) c = eps;
    d = 1 / d;
    const del = d * c;
    h *= del;

    if (Math.abs(del - 1) < eps) break;
  }

  return h;
}

// Get theoretical distribution parameters (mean and variance)
function getDistributionParameters(distributionType) {
  switch (distributionType) {
    case "exponential":
      // Exponential with rate λ = 1/100: E[X] = 100, Var[X] = 100²
      return { mean: 100, variance: 10000 };

    case "normal":
      // Normal with μ=100, σ=20: E[X] = 100, Var[X] = 400
      return { mean: 100, variance: 400 };

    case "uniform":
      // Uniform [0, 200]: E[X] = 100, Var[X] = (200²)/12 = 3333.33
      return { mean: 100, variance: (200 * 200) / 12 };

    case "lognormal":
      // Lognormal with μ=4, σ=1: E[X] = exp(μ + σ²/2), Var[X] = (exp(σ²) - 1) * exp(2μ + σ²)
      const mu = 4;
      const sigma = 1;
      const lognormalMean = Math.exp(mu + (sigma * sigma) / 2);
      const lognormalVariance = (Math.exp(sigma * sigma) - 1) * Math.exp(2 * mu + sigma * sigma);
      return { mean: lognormalMean, variance: lognormalVariance };

    case "bimodal":
      // Mixture of two uniforms: 0.5 * Uniform(25, 75) + 0.5 * Uniform(125, 175)
      // E[X] = 0.5 * 50 + 0.5 * 150 = 100
      // Var[X] = 0.5 * (Var[U1] + (50-100)²) + 0.5 * (Var[U2] + (150-100)²)
      // where Var[U1] = Var[U2] = 50²/12
      const uniformVar = (50 * 50) / 12;
      const bimodalVariance = 0.5 * (uniformVar + 50 * 50) + 0.5 * (uniformVar + 50 * 50);
      return { mean: 100, variance: bimodalVariance };

    default:
      throw new Error(`Unknown distribution type: ${distributionType}`);
  }
}

// Calculate theoretical quantiles for known distributions
function getTheoreticalQuantile(distributionType, p) {
  switch (distributionType) {
    case "exponential":
      // Exponential with rate λ = 1/100: Q(p) = -ln(1-p) * 100
      return -Math.log(1 - p) * 100;

    case "normal":
      // Normal with μ=100, σ=20: Q(p) = μ + σ * Φ⁻¹(p)
      return 100 + 20 * normalInverse(p);

    case "uniform":
      // Uniform [0, 200]: Q(p) = p * 200
      return p * 200;

    case "lognormal":
      // Lognormal with μ=4, σ=1: Q(p) = exp(μ + σ * Φ⁻¹(p))
      return Math.exp(4 + 1 * normalInverse(p));

    case "bimodal":
      // For bimodal, we'll use numerical approximation
      // This is a mixture of two uniforms: 0.5 * Uniform(25, 75) + 0.5 * Uniform(125, 175)
      if (p < 0.5) {
        return 25 + p * 2 * 50; // First mode
      } else {
        return 125 + (p - 0.5) * 2 * 50; // Second mode
      }

    default:
      throw new Error(`Unknown distribution type: ${distributionType}`);
  }
}

// Calculate theoretical confidence interval for COUNT using known sample size
function calculateTheoreticalCountConfidenceInterval(sampledCounts, sampleRate, confidenceLevel = 0.95) {
  const n = sampledCounts.length;
  if (n === 0) return { lower: 0, upper: 0, mean: 0 };

  const mean = sampledCounts.reduce((a, b) => a + b, 0) / sampledCounts.length;

  // For systematic sampling, COUNT is deterministic within each simulation
  // The only variation comes from different random datasets across simulations
  // Since we generate fresh data each time, there's minimal variation in count
  const empiricalVariance = sampledCounts.reduce((sum, count) => sum + Math.pow(count - mean, 2), 0) / (n - 1);
  const stderr = Math.sqrt(empiricalVariance / n);

  const alpha = 1 - confidenceLevel;
  const z = normalInverse(1 - alpha / 2);

  return {
    lower: Math.max(0, mean - z * stderr),
    upper: mean + z * stderr,
    mean: mean,
  };
}

// Calculate theoretical confidence interval for SUM using Central Limit Theorem
function calculateTheoreticalSumConfidenceInterval(sampledSums, distributionType, sampleRate, confidenceLevel = 0.95) {
  const n = sampledSums.length;
  if (n === 0) return { lower: 0, upper: 0, mean: 0 };

  const distParams = getDistributionParameters(distributionType);
  const mean = sampledSums.reduce((a, b) => a + b, 0) / sampledSums.length;

  // For SUM of m samples from distribution with variance σ²:
  // Var[Sum] = m * σ²
  // After scaling up by sampleRate: Var[ScaledSum] = (sampleRate²) * m * σ²
  const samplesPerSimulation = sampledSums[0] / sampleRate / distParams.mean; // Approximate
  const theoreticalVariance = sampleRate * sampleRate * samplesPerSimulation * distParams.variance;

  // Standard error of the mean across simulations
  const stderr = Math.sqrt(theoreticalVariance / n);

  const alpha = 1 - confidenceLevel;
  const z = normalInverse(1 - alpha / 2);

  return {
    lower: mean - z * stderr,
    upper: mean + z * stderr,
    mean: mean,
  };
}

// Calculate theoretical confidence interval for AVERAGE using Central Limit Theorem
function calculateTheoreticalAverageConfidenceInterval(sampledAverages, distributionType, sampleRate, confidenceLevel = 0.95) {
  const n = sampledAverages.length;
  if (n === 0) return { lower: 0, upper: 0, mean: 0 };

  const distParams = getDistributionParameters(distributionType);
  const mean = sampledAverages.reduce((a, b) => a + b, 0) / sampledAverages.length;

  // AVERAGE is unbiased, so the main source of variation is sampling variation
  // Each simulation samples different events, leading to different averages
  // Use the theoretical variance of the sample mean

  // Estimate sample size per simulation (volume / sampleRate)
  // We can estimate this from the relationship between theoretical mean and observed variation
  const empiricalVariance = sampledAverages.reduce((sum, avg) => sum + Math.pow(avg - mean, 2), 0) / (n - 1);

  // The empirical variance should approximate the theoretical variance of sample means
  // For sample mean: Var[X̄] = σ²/m where m is sample size per simulation
  // So we can estimate: m ≈ σ²/empiricalVariance
  const estimatedSampleSize = Math.max(1, distParams.variance / Math.max(empiricalVariance, 1e-10));
  const theoreticalStderr = Math.sqrt(distParams.variance / estimatedSampleSize / n);

  // Use the more conservative of empirical or theoretical stderr
  const empiricalStderr = Math.sqrt(empiricalVariance / n);
  const stderr = Math.max(empiricalStderr, theoreticalStderr);

  const alpha = 1 - confidenceLevel;
  const z = normalInverse(1 - alpha / 2);

  return {
    lower: mean - z * stderr,
    upper: mean + z * stderr,
    mean: mean,
  };
}

// Calculate theoretical confidence interval for P99 using order statistics
function calculateTheoreticalP99ConfidenceInterval(sampledValues, distributionType, confidenceLevel = 0.95) {
  const n = sampledValues.length;
  if (n === 0) return { lower: 0, upper: 0, mean: 0 };

  // For P99, we're looking at the order statistic near the 99th percentile
  // The exact position depends on sample size
  const k = Math.max(1, Math.ceil(0.99 * n));

  // Calculate confidence interval using order statistics theory
  // The k-th order statistic has a beta distribution for its quantile
  const alpha = 1 - confidenceLevel;

  try {
    // Calculate the confidence interval in probability space
    const lowerP = betaInverse(alpha / 2, k, n - k + 1);
    const upperP = betaInverse(1 - alpha / 2, k, n - k + 1);

    // Convert back to the original scale using the theoretical quantile function
    const lower = getTheoreticalQuantile(distributionType, lowerP);
    const upper = getTheoreticalQuantile(distributionType, upperP);

    // Calculate mean of sampled values
    const mean = sampledValues.reduce((a, b) => a + b, 0) / sampledValues.length;

    return { lower, upper, mean };
  } catch (error) {
    console.warn("Theoretical CI calculation failed, falling back to empirical:", error);
    // Fallback to empirical method
    return calculateConfidenceIntervalsEmpirical(sampledValues, confidenceLevel);
  }
}

// Original empirical confidence interval calculation (renamed)
function calculateConfidenceIntervalsEmpirical(samples, confidenceLevel = 0.95) {
  const alpha = 1 - confidenceLevel;
  const lowerIndex = Math.floor((alpha / 2) * samples.length);
  const upperIndex = Math.ceil((1 - alpha / 2) * samples.length) - 1;

  const sorted = samples.slice().sort((a, b) => a - b);
  return {
    lower: sorted[lowerIndex] || 0,
    upper: sorted[upperIndex] || 0,
    mean: samples.reduce((a, b) => a + b, 0) / samples.length,
  };
}

// Updated confidence interval calculation that uses theoretical methods for all metrics
function calculateConfidenceIntervals(samples, confidenceLevel = 0.95, metricType = null, distributionType = null, sampleRate = null) {
  try {
    switch (metricType) {
      case "count":
        return calculateTheoreticalCountConfidenceInterval(samples, sampleRate, confidenceLevel);
      case "sum":
        return calculateTheoreticalSumConfidenceInterval(samples, distributionType, sampleRate, confidenceLevel);
      case "average":
        return calculateTheoreticalAverageConfidenceInterval(samples, distributionType, sampleRate, confidenceLevel);
      case "p99":
        return calculateTheoreticalP99ConfidenceInterval(samples, distributionType, confidenceLevel);
      default:
        return calculateConfidenceIntervalsEmpirical(samples, confidenceLevel);
    }
  } catch (error) {
    console.warn(`Theoretical CI calculation failed for ${metricType}, falling back to empirical:`, error);
    return calculateConfidenceIntervalsEmpirical(samples, confidenceLevel);
  }
}

// Run multiple simulations
async function runSimulations(volume, sampleRate, distributionType, numRuns = 50) {
  // Safety checks
  if (volume > 10000000) {
    throw new Error(`Volume ${volume.toLocaleString()} exceeds safe limit of 10M events`);
  }

  const results = {
    count: [],
    sum: [],
    average: [],
    p99: [],
  };

  // Store individual simulation data for scatter plot
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

  // Generate one true dataset for overall metrics
  const trueEvents = await generateEvents(volume, distributionType);
  const trueAgg = calculateAggregations(trueEvents);

  // Run multiple simulations with separate datasets for each
  for (let i = 0; i < numRuns; i++) {
    // Generate fresh data for this simulation
    const simulationEvents = await generateEvents(volume, distributionType);
    const simulationTrueAgg = calculateAggregations(simulationEvents);

    // Sample the simulation data
    const sampledEvents = sampleEvents(simulationEvents, sampleRate);
    const sampledAgg = calculateAggregations(sampledEvents);

    // Store data for scatter plot
    scatterPlotData.trueP99.push(simulationTrueAgg.p99);
    scatterPlotData.sampledP99.push(sampledAgg.p99);
    scatterPlotData.trueCount.push(simulationTrueAgg.count);
    scatterPlotData.sampledCount.push(sampledAgg.count * sampleRate);
    scatterPlotData.trueSum.push(simulationTrueAgg.sum);
    scatterPlotData.sampledSum.push(sampledAgg.sum * sampleRate);
    scatterPlotData.trueAverage.push(simulationTrueAgg.average);
    scatterPlotData.sampledAverage.push(sampledAgg.average);

    // Scale up count and sum for confidence intervals
    results.count.push(sampledAgg.count * sampleRate);
    results.sum.push(sampledAgg.sum * sampleRate);
    results.average.push(sampledAgg.average);
    results.p99.push(sampledAgg.p99);

    // Allow UI updates for long-running simulations
    if (i % 10 === 0 && numRuns > 20) {
      await new Promise((resolve) => setTimeout(resolve, 1));
    }
  }

  return {
    true: trueAgg,
    sampled: {
      count: calculateConfidenceIntervals(results.count, 0.95, "count", distributionType, sampleRate),
      sum: calculateConfidenceIntervals(results.sum, 0.95, "sum", distributionType, sampleRate),
      average: calculateConfidenceIntervals(results.average, 0.95, "average", distributionType, sampleRate),
      p99: calculateConfidenceIntervals(results.p99, 0.95, "p99", distributionType, sampleRate),
    },
    simulationResults: results,
    scatterPlotData: scatterPlotData,
    rawData: {
      trueEvents: trueEvents,
      sampleEvents: sampleEvents(trueEvents, sampleRate),
    },
  };
}

// Format number for display
function formatNumber(num, decimals = 2) {
  if (num > 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  } else if (num > 1000) {
    return (num / 1000).toFixed(1) + "K";
  } else {
    return num.toFixed(decimals);
  }
}

// Update explanation div with current values
function updateExplanation(volume, sampleRate, numRuns) {
  const explanationDiv = document.querySelector(".explanation");
  const sampledEvents = Math.ceil(volume / sampleRate);

  const percentageReduction = ((1 - 1 / sampleRate) * 100).toFixed(1);

  // Calculate trapezoid dimensions based on sample rate
  // Bottom width = top width / sample rate
  // We'll use percentages to create the trapezoid effect
  const reductionRatio = 1 / sampleRate;
  const bottomWidthPercent = reductionRatio * 100;

  // Calculate the x-coordinates for the bottom of the trapezoid
  // Center the narrower bottom part
  const sideMargin = (100 - bottomWidthPercent) / 2;
  const bottomLeftX = sideMargin + "%";
  const bottomRightX = 100 - sideMargin + "%";

  // Set CSS custom properties for the trapezoid shape
  explanationDiv.style.setProperty("--bottom-left-x", bottomLeftX);
  explanationDiv.style.setProperty("--bottom-right-x", bottomRightX);

  explanationDiv.innerHTML = `
    <p><span style="color: ${HONEYCOMB_COLORS.lime}; font-weight: bold;">${volume.toLocaleString()} events go in</span> to ${numRuns} simulations</p>
    <p>Sampled at a rate of 1:${sampleRate} -- Saving you ${percentageReduction}%</p>
    <p><span class="describe-sampled-events" style="font-weight: bold;">About ${sampledEvents.toLocaleString()} events come out</span></p>
    <p>Then we aggregate the sampled events.</p>
    <p>The following charts compare the results of aggregating <span class="describe-sampled-events">sampled events</span> (accounting for the sample rate) vs aggregating the <span class="describe-unsampled-events">full set of events</span>.</p>
  `;
}

// Update display
async function updateDisplay() {
  if (isUpdating) return;
  isUpdating = true;

  const container = document.querySelector(".container");
  container.classList.add("loading");

  try {
    // Get log scale volume (10^x)
    const volumeSlider = document.getElementById("volume").value;
    const volume = Math.round(Math.pow(10, parseFloat(volumeSlider)));
    const sampleRate = parseInt(document.getElementById("sampleRate").value);
    const distributionType = document.getElementById("distribution").value;

    // Update slider displays
    document.getElementById("volumeValue").textContent = volume.toLocaleString();
    document.getElementById("sampleRateValue").textContent = `1:${sampleRate}`;

    // Update distribution chart
    updateDistributionChart(distributionType);

    // Adjust number of runs based on volume for performance
    let numRuns;
    if (volume > 1000000) {
      numRuns = 10; // Fewer runs for very large datasets
    } else if (volume > 100000) {
      numRuns = 20;
    } else {
      numRuns = 50;
    }

    // Update explanation with current values
    updateExplanation(volume, sampleRate, numRuns);

    // Show current run count
    document.getElementById("runsDisplay").textContent = `Running ${numRuns} simulations...`;

    // Allow UI to update
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Run simulations
    const results = await runSimulations(volume, sampleRate, distributionType, numRuns);

    // Draw all scatter plots
    const p99YAxisMode = document.getElementById("p99YAxisToggle").value;
    const countYAxisMode = document.getElementById("countYAxisToggle").value;
    const sumYAxisMode = document.getElementById("sumYAxisToggle").value;
    const averageYAxisMode = document.getElementById("averageYAxisToggle").value;

    drawMetricScatterPlot("count", results, countYAxisMode);
    drawMetricScatterPlot("sum", results, sumYAxisMode);
    drawMetricScatterPlot("average", results, averageYAxisMode);
    drawMetricScatterPlot("p99", results, p99YAxisMode);

    // Store results for future reference
    latestResults = results;

    document.getElementById("runsDisplay").textContent = `Completed ${numRuns} simulations`;
  } catch (error) {
    console.error("Error updating display:", error);
    document.getElementById("runsDisplay").textContent = `Error: ${error.message}`;

    // Show user-friendly error message
    const errorTypes = {
      "exceeds safe limit": "Volume too large - maximum 10M events supported",
      "Maximum call stack": "Memory limit exceeded - try smaller volume",
      "out of memory": "Insufficient memory - reduce volume or sample rate",
    };

    const userMessage = Object.keys(errorTypes).find((key) => error.message.includes(key));
    if (userMessage) {
      document.getElementById("runsDisplay").textContent = errorTypes[userMessage];
    }
  } finally {
    container.classList.remove("loading");
    isUpdating = false;
  }
}

// Debounced update
function scheduleUpdate() {
  if (updateTimer) {
    clearTimeout(updateTimer);
  }
  updateTimer = setTimeout(updateDisplay, 100);
}

// Event listeners
document.getElementById("volume").addEventListener("input", scheduleUpdate);
document.getElementById("sampleRate").addEventListener("input", scheduleUpdate);
document.getElementById("distribution").addEventListener("change", scheduleUpdate);
// Y-axis toggle event listeners - only redraw charts, don't re-run simulations
document.getElementById("countYAxisToggle").addEventListener("change", () => {
  if (latestResults) {
    const yAxisMode = document.getElementById("countYAxisToggle").value;
    drawMetricScatterPlot("count", latestResults, yAxisMode);
  }
});

document.getElementById("sumYAxisToggle").addEventListener("change", () => {
  if (latestResults) {
    const yAxisMode = document.getElementById("sumYAxisToggle").value;
    drawMetricScatterPlot("sum", latestResults, yAxisMode);
  }
});

document.getElementById("averageYAxisToggle").addEventListener("change", () => {
  if (latestResults) {
    const yAxisMode = document.getElementById("averageYAxisToggle").value;
    drawMetricScatterPlot("average", latestResults, yAxisMode);
  }
});

document.getElementById("p99YAxisToggle").addEventListener("change", () => {
  if (latestResults) {
    const yAxisMode = document.getElementById("p99YAxisToggle").value;
    drawMetricScatterPlot("p99", latestResults, yAxisMode);
  }
});

// Initial update
updateDisplay();
