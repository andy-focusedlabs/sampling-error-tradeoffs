// Global variable to store latest results
let latestResults = null;

// Update plot when metric selection changes
function updatePlotMetric() {
  if (latestResults) {
    const selectedMetric = document.getElementById("plotMetric").value;
    drawSimulationPlot(latestResults.simulationResults, latestResults.true, selectedMetric);
  }
}

let updateTimer = null;
let isUpdating = false;

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

// Generate synthetic event data
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

  // Generate one true dataset
  const trueEvents = await generateEvents(volume, distributionType);
  const trueAgg = calculateAggregations(trueEvents);

  // Run multiple sampling simulations
  for (let i = 0; i < numRuns; i++) {
    const sampledEvents = sampleEvents(trueEvents, sampleRate);
    const sampledAgg = calculateAggregations(sampledEvents);

    // Scale up count and sum
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
    rawData: {
      trueEvents: trueEvents,
      sampleEvents: sampleEvents(trueEvents, sampleRate),
    },
  };
}

// Draw simulation results plot
function drawSimulationPlot(simulationResults, trueValues, selectedMetric = "count") {
  const canvas = document.getElementById("simulationPlot");
  const ctx = canvas.getContext("2d");

  // Set canvas size
  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;

  const width = canvas.width;
  const height = canvas.height;
  const margin = { top: 20, right: 20, bottom: 40, left: 80 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;

  // Clear canvas
  ctx.clearRect(0, 0, width, height);

  const results = simulationResults[selectedMetric];
  const trueValue = trueValues[selectedMetric];
  const ci = calculateConfidenceIntervals(results);

  if (results.length === 0) return;

  // Calculate scales
  const minValue = Math.min(trueValue, ci.lower, ...results);
  const maxValue = Math.max(trueValue, ci.upper, ...results);
  const valueRange = maxValue - minValue;
  const padding = valueRange * 0.1;

  const yMin = minValue - padding;
  const yMax = maxValue + padding;

  // Scale functions
  const xScale = (runNumber) => margin.left + (runNumber / (results.length - 1)) * plotWidth;
  const yScale = (value) => margin.top + plotHeight - ((value - yMin) / (yMax - yMin)) * plotHeight;

  // Draw axes
  ctx.strokeStyle = "#333";
  ctx.lineWidth = 1;
  ctx.beginPath();
  // Y-axis
  ctx.moveTo(margin.left, margin.top);
  ctx.lineTo(margin.left, margin.top + plotHeight);
  // X-axis
  ctx.moveTo(margin.left, margin.top + plotHeight);
  ctx.lineTo(margin.left + plotWidth, margin.top + plotHeight);
  ctx.stroke();

  // Draw confidence interval band
  ctx.fillStyle = "rgba(220, 53, 69, 0.1)";
  ctx.beginPath();
  ctx.moveTo(margin.left, yScale(ci.lower));
  ctx.lineTo(margin.left + plotWidth, yScale(ci.lower));
  ctx.lineTo(margin.left + plotWidth, yScale(ci.upper));
  ctx.lineTo(margin.left, yScale(ci.upper));
  ctx.closePath();
  ctx.fill();

  // Draw confidence interval lines
  ctx.strokeStyle = "rgba(220, 53, 69, 0.5)";
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(margin.left, yScale(ci.lower));
  ctx.lineTo(margin.left + plotWidth, yScale(ci.lower));
  ctx.moveTo(margin.left, yScale(ci.upper));
  ctx.lineTo(margin.left + plotWidth, yScale(ci.upper));
  ctx.stroke();
  ctx.setLineDash([]);

  // Draw true value line
  ctx.strokeStyle = "#28a745";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(margin.left, yScale(trueValue));
  ctx.lineTo(margin.left + plotWidth, yScale(trueValue));
  ctx.stroke();

  // Draw simulation points
  ctx.fillStyle = "#dc3545";
  results.forEach((value, i) => {
    const x = xScale(i);
    const y = yScale(value);

    ctx.beginPath();
    ctx.arc(x, y, 3, 0, 2 * Math.PI);
    ctx.fill();
  });

  // Draw sample mean line
  ctx.strokeStyle = "#007acc";
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 5]);
  ctx.beginPath();
  ctx.moveTo(margin.left, yScale(ci.mean));
  ctx.lineTo(margin.left + plotWidth, yScale(ci.mean));
  ctx.stroke();
  ctx.setLineDash([]);

  // Add labels
  ctx.fillStyle = "#333";
  ctx.font = "12px Arial";
  ctx.textAlign = "center";
  ctx.fillText("Simulation Run Number", margin.left + plotWidth / 2, height - 10);

  ctx.save();
  ctx.translate(15, margin.top + plotHeight / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = "center";
  ctx.fillText(`${selectedMetric.toUpperCase()} Value`, 0, 0);
  ctx.restore();

  // Add legend
  const legendY = margin.top + 10;
  ctx.textAlign = "left";
  ctx.font = "11px Arial";

  // True value
  ctx.strokeStyle = "#28a745";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(margin.left + 10, legendY);
  ctx.lineTo(margin.left + 30, legendY);
  ctx.stroke();
  ctx.fillStyle = "#28a745";
  ctx.fillText("True Value", margin.left + 35, legendY + 4);

  // Sample mean
  ctx.strokeStyle = "#007acc";
  ctx.setLineDash([10, 5]);
  ctx.beginPath();
  ctx.moveTo(margin.left + 120, legendY);
  ctx.lineTo(margin.left + 140, legendY);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = "#007acc";
  ctx.fillText("Sample Mean", margin.left + 145, legendY + 4);

  // CI band
  ctx.fillStyle = "rgba(220, 53, 69, 0.3)";
  ctx.fillRect(margin.left + 240, legendY - 3, 20, 6);
  ctx.fillStyle = "#dc3545";
  ctx.fillText("95% CI", margin.left + 265, legendY + 4);

  // Sample points
  ctx.fillStyle = "#dc3545";
  ctx.beginPath();
  ctx.arc(margin.left + 350, legendY, 3, 0, 2 * Math.PI);
  ctx.fill();
  ctx.fillText("Samples", margin.left + 360, legendY + 4);
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

    // Store results for plot metric switching
    latestResults = results;

    // Draw simulation plot
    const selectedMetric = document.getElementById("plotMetric").value;
    drawSimulationPlot(results.simulationResults, results.true, selectedMetric);

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
document.getElementById("plotMetric").addEventListener("change", updatePlotMetric);

// Initial update
updateDisplay();
