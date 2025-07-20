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
        ctx.strokeStyle = "#28a745";
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(x, chartArea.top);
        ctx.lineTo(x, chartArea.bottom);
        ctx.stroke();

        // Draw average label
        ctx.fillStyle = "#28a745";
        ctx.font = "11px Arial";
        ctx.fillText(`Avg: ${average.toFixed(1)}`, x + 5, chartArea.top + 15);
      }

      // Draw P99 line
      if (p99 !== undefined) {
        const x = scales.x.getPixelForValue(p99);
        ctx.strokeStyle = "#dc3545";
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(x, chartArea.top);
        ctx.lineTo(x, chartArea.bottom);
        ctx.stroke();

        // Draw P99 label
        ctx.fillStyle = "#dc3545";
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
          borderColor: "#007acc",
          backgroundColor: "rgba(0, 122, 204, 0.1)",
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
            color: "rgba(0, 0, 0, 0.1)",
          },
        },
        y: {
          title: {
            display: true,
            text: "Probability Density",
          },
          grid: {
            color: "rgba(0, 0, 0, 0.1)",
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

// Create or update the P99 scatter plot
function drawP99ScatterPlot(results, yAxisMode = "full") {
  const ctx = document.getElementById("p99ScatterChart").getContext("2d");

  // Destroy existing chart if it exists
  if (p99ScatterChart) {
    p99ScatterChart.destroy();
  }

  // Prepare data for scatter plot
  const numRuns = results.scatterPlotData.trueP99.length;
  const trueP99Data = [];
  const sampledP99Data = [];

  for (let i = 0; i < numRuns; i++) {
    trueP99Data.push({
      x: i + 1, // Simulation number (1-based)
      y: results.scatterPlotData.trueP99[i],
    });
    sampledP99Data.push({
      x: i + 1, // Simulation number (1-based)
      y: results.scatterPlotData.sampledP99[i],
    });
  }

  p99ScatterChart = new Chart(ctx, {
    type: "scatter",
    data: {
      datasets: [
        {
          label: "True P99",
          data: trueP99Data,
          backgroundColor: "#28a745",
          borderColor: "#28a745",
          pointRadius: 4,
          pointHoverRadius: 6,
        },
        {
          label: "Sampled P99",
          data: sampledP99Data,
          backgroundColor: "#dc3545",
          borderColor: "#dc3545",
          pointRadius: 5,
          pointHoverRadius: 7,
          pointStyle: "rect",
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
          text: "P99 For Each Simulation, Before and After Sampling",
          font: {
            size: 14,
            weight: "bold",
          },
        },
        legend: {
          display: true,
          position: "top",
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
            color: "rgba(0, 0, 0, 0.1)",
          },
          min: 0.5,
          max: numRuns + 0.5,
        },
        y: {
          title: {
            display: true,
            text: "P99 Value",
          },
          grid: {
            color: "rgba(0, 0, 0, 0.1)",
          },
          beginAtZero: yAxisMode === "full",
        },
      },
      interaction: {
        intersect: false,
        mode: "point",
      },
    },
  });
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

// Sample events using systematic sampling
// Since events are generated randomly, this is equivalent to random... except that it is more precise.
// Perhaps randomly sampling is more accurate to how Refinery does this, but
function sampleEvents(events, sampleRate) {
  const sampled = [];
  for (let i = 0; i < events.length; i += sampleRate) {
    sampled.push(events[i]);
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

// Calculate confidence intervals
function calculateConfidenceIntervals(samples, confidenceLevel = 0.95) {
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
      count: calculateConfidenceIntervals(results.count),
      sum: calculateConfidenceIntervals(results.sum),
      average: calculateConfidenceIntervals(results.average),
      p99: calculateConfidenceIntervals(results.p99),
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

    // Show current run count
    document.getElementById("simulationRuns").textContent = numRuns.toString();
    document.getElementById("runsDisplay").textContent = `Running ${numRuns} simulations...`;

    // Allow UI to update
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Run simulations
    const results = await runSimulations(volume, sampleRate, distributionType, numRuns);

    // Draw P99 scatter plot
    const yAxisMode = document.getElementById("p99YAxisToggle").value;
    drawP99ScatterPlot(results, yAxisMode);

    // Update statistics summary
    document.getElementById("totalEvents").textContent = volume.toLocaleString();
    document.getElementById("sampledEvents").textContent = Math.ceil(volume / sampleRate).toLocaleString();
    document.getElementById("samplingRatio").textContent = `${(100 / sampleRate).toFixed(1)}%`;
    document.getElementById("theoreticalError").textContent = `±${(100 / Math.sqrt(volume / sampleRate)).toFixed(2)}%`;

    // Update metric displays
    document.getElementById("trueCount").textContent = formatNumber(results.true.count);
    document.getElementById("sampledCount").textContent = formatNumber(results.sampled.count.mean);
    document.getElementById("countError").textContent = `${(((results.sampled.count.mean - results.true.count) / results.true.count) * 100).toFixed(1)}%`;
    document.getElementById("countCI").textContent = `95% CI: [${formatNumber(results.sampled.count.lower)}, ${formatNumber(results.sampled.count.upper)}]`;

    document.getElementById("trueSum").textContent = formatNumber(results.true.sum);
    document.getElementById("sampledSum").textContent = formatNumber(results.sampled.sum.mean);
    document.getElementById("sumError").textContent = `${(((results.sampled.sum.mean - results.true.sum) / results.true.sum) * 100).toFixed(1)}%`;
    document.getElementById("sumCI").textContent = `95% CI: [${formatNumber(results.sampled.sum.lower)}, ${formatNumber(results.sampled.sum.upper)}]`;

    document.getElementById("trueAvg").textContent = formatNumber(results.true.average);
    document.getElementById("sampledAvg").textContent = formatNumber(results.sampled.average.mean);
    document.getElementById("avgError").textContent = `${(((results.sampled.average.mean - results.true.average) / results.true.average) * 100).toFixed(1)}%`;
    document.getElementById("avgCI").textContent = `95% CI: [${formatNumber(results.sampled.average.lower)}, ${formatNumber(results.sampled.average.upper)}]`;

    document.getElementById("trueP99").textContent = formatNumber(results.true.p99);
    document.getElementById("sampledP99").textContent = formatNumber(results.sampled.p99.mean);
    document.getElementById("p99Error").textContent = `${(((results.sampled.p99.mean - results.true.p99) / results.true.p99) * 100).toFixed(1)}%`;
    document.getElementById("p99CI").textContent = `95% CI: [${formatNumber(results.sampled.p99.lower)}, ${formatNumber(results.sampled.p99.upper)}]`;

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
document.getElementById("p99YAxisToggle").addEventListener("change", () => {
  // Only redraw the scatter plot, don't re-run simulations
  if (latestResults) {
    const yAxisMode = document.getElementById("p99YAxisToggle").value;
    drawP99ScatterPlot(latestResults, yAxisMode);
  }
});

// Initial update
updateDisplay();
