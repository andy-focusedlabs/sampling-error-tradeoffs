import { HONEYCOMB_COLORS } from "./constants.js";

// Custom plugin to draw vertical lines for average and P99
const verticalLinePlugin = {
  id: "verticalLines",
  afterDraw: (chart) => {
    if (chart.config.options.plugins.verticalLines) {
      const { ctx, chartArea, scales } = chart;
      const { average, p99 } = chart.config.options.plugins.verticalLines;

      ctx.save();

      // Draw average line
      if (average !== undefined) {
        const x = scales.x.getPixelForValue(average);
        ctx.strokeStyle = HONEYCOMB_COLORS.lime;
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(x, chartArea.top);
        ctx.lineTo(x, chartArea.bottom);
        ctx.stroke();

        // Draw average label
        ctx.fillStyle = HONEYCOMB_COLORS.lime;
        ctx.font = "11px Arial";
        ctx.fillText(`Avg: ${average.toFixed(1)}`, x + 5, chartArea.top + 15);
      }

      // Draw P99 line
      if (p99 !== undefined) {
        const x = scales.x.getPixelForValue(p99);
        ctx.strokeStyle = HONEYCOMB_COLORS.red500;
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(x, chartArea.top);
        ctx.lineTo(x, chartArea.bottom);
        ctx.stroke();

        // Draw P99 label
        ctx.fillStyle = HONEYCOMB_COLORS.red500;
        ctx.font = "11px Arial";
        ctx.fillText(`P99: ${p99.toFixed(1)}`, x + 5, chartArea.top + 30);
      }

      ctx.restore();
    }
  },
};

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

const distributionDisplayNames = {
  normal: "Normal distribution",
  exponential: "Exponential distribution",
  uniform: "Uniform distribution",
  lognormal: "Log-Normal distribution",
  bimodal: "Bimodal distribution",
};

function generateChartTitle(metricType, distributionType, volume, sampleRate) {
  const distributionName = distributionDisplayNames[distributionType] || distributionType;
  const formattedVolume = volume.toLocaleString();
  return `${distributionName}; ${formattedVolume} events sampled at 1:${sampleRate}`;
}

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
    title: "COUNT For Each Simulation, Before and After Sampling",
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
    title: "SUM For Each Simulation, Before and After Sampling",
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
    title: "AVERAGE For Each Simulation, Before and After Sampling",
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
    title: "P99 For Each Simulation, Before and After Sampling",
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

// Calculate error bar values for 95% confidence interval
function calculateErrorBars(trueValues, sampledValues) {
  if (trueValues.length !== sampledValues.length) {
    throw new Error("True and sampled value arrays must have the same length");
  }

  const differences = [];
  for (let i = 0; i < trueValues.length; i++) {
    differences.push(trueValues[i] - sampledValues[i]);
  }

  // Sort differences to calculate percentiles
  differences.sort((a, b) => a - b);

  const n = differences.length;
  const lowerIndex = Math.floor(n * 0.025); // 2.5th percentile
  const upperIndex = Math.floor(n * 0.975); // 97.5th percentile

  const lowerError = Math.abs(differences[lowerIndex]);
  const upperError = Math.abs(differences[upperIndex]);

  return {
    lower: lowerError,
    upper: upperError,
  };
}

// Generic scatter plot function for any metric
function drawMetricScatterPlot(metricType, results, yAxisMode = "full", distributionType = null, volume = null, sampleRate = null) {
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

  // Calculate error bars for the sampled data
  const errorBars = calculateErrorBars(results.scatterPlotData[trueDataKey], results.scatterPlotData[sampledDataKey]);

  // Create error bar data for each sampled point
  const errorBarData = [];
  for (let i = 0; i < numRuns; i++) {
    const sampledY = results.scatterPlotData[sampledDataKey][i];
    errorBarData.push({
      x: i + 1,
      y: sampledY,
      yMin: sampledY - errorBars.lower,
      yMax: sampledY + errorBars.upper,
    });
  }

  const chart = new Chart(ctx, {
    type: "scatter",
    data: {
      datasets: [
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
        // Error bar vertical lines
        {
          label: "Error Bars",
          data: errorBarData.flatMap((point) => [
            { x: point.x, y: point.yMin },
            { x: point.x, y: point.yMax },
            { x: null, y: null }, // Break line between error bars
          ]),
          borderColor: config.sampledColor + "80", // 50% opacity
          backgroundColor: "transparent",
          borderWidth: 1,
          pointRadius: 0,
          pointHoverRadius: 0,
          showLine: true,
          spanGaps: false,
          order: config.sampledOrder - 0.5,
          type: "line",
        },
        // Error bar horizontal caps
        {
          label: "",
          data: errorBarData.flatMap((point) => [
            { x: point.x - 0.1, y: point.yMin },
            { x: point.x + 0.1, y: point.yMin },
            { x: null, y: null },
            { x: point.x - 0.1, y: point.yMax },
            { x: point.x + 0.1, y: point.yMax },
            { x: null, y: null },
          ]),
          borderColor: config.sampledColor + "80", // 50% opacity
          backgroundColor: "transparent",
          borderWidth: 1,
          pointRadius: 0,
          pointHoverRadius: 0,
          showLine: true,
          spanGaps: false,
          order: config.sampledOrder - 0.5,
          type: "line",
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
          text:
            distributionType && volume && sampleRate
              ? generateChartTitle(metricType, distributionType, volume, sampleRate) +
                ` → 95% Confidence Interval: ±${((Math.max(errorBars.upper, errorBars.lower) / results.true[metricType]) * 100).toFixed(1)}%`
              : config.title,
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

    drawMetricScatterPlot("count", results, countYAxisMode, distributionType, volume, sampleRate);
    drawMetricScatterPlot("sum", results, sumYAxisMode, distributionType, volume, sampleRate);
    drawMetricScatterPlot("average", results, averageYAxisMode, distributionType, volume, sampleRate);
    drawMetricScatterPlot("p99", results, p99YAxisMode, distributionType, volume, sampleRate);

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
    const distributionType = document.getElementById("distribution").value;
    const volumeSlider = document.getElementById("volume").value;
    const volume = Math.round(Math.pow(10, parseFloat(volumeSlider)));
    const sampleRate = parseInt(document.getElementById("sampleRate").value);
    drawMetricScatterPlot("count", latestResults, yAxisMode, distributionType, volume, sampleRate);
  }
});

document.getElementById("sumYAxisToggle").addEventListener("change", () => {
  if (latestResults) {
    const yAxisMode = document.getElementById("sumYAxisToggle").value;
    const distributionType = document.getElementById("distribution").value;
    const volumeSlider = document.getElementById("volume").value;
    const volume = Math.round(Math.pow(10, parseFloat(volumeSlider)));
    const sampleRate = parseInt(document.getElementById("sampleRate").value);
    drawMetricScatterPlot("sum", latestResults, yAxisMode, distributionType, volume, sampleRate);
  }
});

document.getElementById("averageYAxisToggle").addEventListener("change", () => {
  if (latestResults) {
    const yAxisMode = document.getElementById("averageYAxisToggle").value;
    const distributionType = document.getElementById("distribution").value;
    const volumeSlider = document.getElementById("volume").value;
    const volume = Math.round(Math.pow(10, parseFloat(volumeSlider)));
    const sampleRate = parseInt(document.getElementById("sampleRate").value);
    drawMetricScatterPlot("average", latestResults, yAxisMode, distributionType, volume, sampleRate);
  }
});

document.getElementById("p99YAxisToggle").addEventListener("change", () => {
  if (latestResults) {
    const yAxisMode = document.getElementById("p99YAxisToggle").value;
    const distributionType = document.getElementById("distribution").value;
    const volumeSlider = document.getElementById("volume").value;
    const volume = Math.round(Math.pow(10, parseFloat(volumeSlider)));
    const sampleRate = parseInt(document.getElementById("sampleRate").value);
    drawMetricScatterPlot("p99", latestResults, yAxisMode, distributionType, volume, sampleRate);
  }
});

// Initial update
updateDisplay();
