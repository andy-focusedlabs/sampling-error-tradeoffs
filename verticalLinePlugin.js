import { HONEYCOMB_COLORS } from "./constants.js";

// Custom plugin to draw vertical lines for average and P99
export const verticalLinePlugin = {
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