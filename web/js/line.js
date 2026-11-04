// CHART 4 - Line chart (Plotly).  Owner: [Name 2]
//
// Draw: Plotly.react(el, traces, layout) inside update().
// Traces: one line per country in state.selected (rows: ctx.data.byIso.get(iso), years 2000-2024,
//         x = year, y = ci, name = country name, direct label at the last point),
//         plus a grey line for the median of all countries: ctx.data.medianCi
//         (array of {year, ci}).
// Interact: hover tooltip, zoom/pan from Plotly; a vertical marker at state.year;
//           clicking a legend entry/line may call State.toggleCountry(iso).
// With no selection show only the median line plus a hint ("Click countries on the map").
const LineChart = {
  init(el, ctx) {
    this.el = el;
    el.innerHTML = ""; // clear stub

    // Initialize an empty Plotly chart
    Plotly.newPlot(this.el, [], this.layout(), {
      responsive: true,
      displaylogo: false,
      modeBarButtonsToRemove: ["select2d", "lasso2d", "autoScale2d"],
    });

    // Toggle country selection when a line is clicked
    this.el.on("plotly_click", (ev) => {
      const point = ev.points && ev.points[0];
      if (point && point.customdata) State.toggleCountry(point.customdata);
    });
  },

  layout(annotations = [], shapes = []) {
    return {
      margin: { l: 50, r: 110, t: 20, b: 40 }, // wider right margin for direct labels
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(0,0,0,0)",
      font: { family: "system-ui, 'Segoe UI', Roboto, sans-serif", size: 12, color: "#1c2430" },
      showlegend: false, // using direct labeling instead
      hovermode: "closest",
      uirevision: "keep",
      xaxis: {
        range: [2000, 2024],
        tickmode: "linear",
        dtick: 4,
        gridcolor: "#e6e9ee",
        zeroline: false,
      },
      yaxis: {
        title: { text: "Carbon intensity (gCO\u2082e/kWh)", standoff: 6 },
        gridcolor: "#e6e9ee",
        zeroline: false,
        rangemode: "tozero"
      },
      annotations: annotations,
      shapes: shapes
    };
  },

  update(ctx) {
    const s = ctx.state;
    const traces = [];
    const annotations = [];
    
    // 1. Global Median Line
    const median = ctx.data.medianCi;
    traces.push({
      x: median.map(d => d.year),
      y: median.map(d => d.ci),
      type: "scatter",
      mode: "lines",
      line: { color: "#a0aab7", width: 3, dash: "dot" },
      name: "Global Median",
      hovertemplate: "<b>Global Median</b><br>%{x}: %{y:.0f} gCO\u2082e/kWh<extra></extra>",
      customdata: median.map(() => null) 
    });

    // 2. Selected Countries Lines
    if (s.selected.size === 0) {
      // Show hint if no country is selected
      annotations.push({
        xref: "paper", yref: "paper", x: 0.5, y: 0.5,
        text: "Click countries on the map or scatter plot to compare trends",
        showarrow: false,
        font: { size: 13, color: "#5f6b7a" }
      });
    }


    s.selected.forEach(iso => {
      const rows = ctx.data.byIso.get(iso);
      if (!rows || rows.length === 0) return;

      const name = ctx.data.countries[iso].name;
      const lastRow = rows[rows.length - 1];

      const lineColor = Colors.forChange(lastRow.ciChange);

      traces.push({
        x: rows.map(r => r.year),
        y: rows.map(r => r.ci),
        type: "scatter",
        mode: "lines",
        line: { width: 3, color: lineColor },
        name: name,
        hovertemplate: `<b>${name}</b><br>%{x}: %{y:.0f} gCO\u2082e/kWh<extra></extra>`,
        customdata: rows.map(() => iso) // pass ISO code for click events
      });

      annotations.push({
        x: lastRow.year,
        y: lastRow.ci,
        text: name,
        xanchor: "left",
        yanchor: "middle",
        showarrow: false,
        font: { size: 11, color: lineColor, weight: 600 },
        xshift: 6
      });
    });

    // 3. Vertical Markers (Current Year Slider & 2015 Paris Agreement)
    const shapes = [
      {
        type: "line",
        x0: s.year, x1: s.year,
        y0: 0, y1: 1, yref: "paper",
        line: { color: "#1c2430", width: 1, dash: "dash" }
      },
      {
        type: "line",
        x0: 2015, x1: 2015,
        y0: 0, y1: 1, yref: "paper",
        line: { color: "#0072B2", width: 1.5 }
      }
    ];

    annotations.push({
      x: 2015,
      y: 1,
      yref: "paper",
      text: "Paris Agreement",
      xanchor: "left",
      yanchor: "top",
      showarrow: false,
      font: { size: 10, color: "#0072B2" },
      xshift: 5
    });

    // Re-render chart efficiently
    Plotly.react(this.el, traces, this.layout(annotations, shapes));
  }
};
