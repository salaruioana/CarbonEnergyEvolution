// CHART 2 - Scatter plot (Plotly).  Owner: Ioana Salaru
//
//   x       electricity use per person (kWh, log axis)      row.elecPc
//   y       carbon intensity (gCO2e per kWh)                row.ci
//   area    electricity generated (TWh)                     row.gen
//   colour  change in carbon intensity since 2015           row.ciChange  (same scale as map + parcoords)
//
// Interaction: click a point -> State.toggleCountry(iso); selected countries get a thick
// outline and a label; countries outside the parallel-coordinates brush fade out; zoom and
// pan come with Plotly (uirevision keeps the zoom when the state changes).
const ScatterChart = {
  MAX_BUBBLE_PX: 46,      // diameter of the biggest bubble
  CHANGE_LIMIT: 300,      // colour scale runs from -300 to +300 gCO2e/kWh (see colors.js)

  init(el, ctx) {
    this.el = el;
    const rows = ctx.data.rows;

    // Fixed axis ranges and bubble scale over ALL years, so nothing jumps when the year changes.
    const elecPc = rows.map((r) => r.elecPc).filter((v) => v > 0);
    this.xRange = [Math.log10(d3.min(elecPc)) - 0.1, Math.log10(d3.max(elecPc)) + 0.1];
    this.yMax = d3.max(rows, (r) => r.ci) * 1.05;
    this.maxGen = d3.max(rows, (r) => r.gen);

    // Plotly colourscale sampled from the shared D3 scale, so all views use identical colours.
    const L = this.CHANGE_LIMIT;
    this.colorscale = d3.range(0, 13).map((i) => {
      const t = i / 12;
      return [t, Colors.change(-L + 2 * L * t)];
    });

    Plotly.newPlot(el, [], this.layout(), {
      responsive: true,
      displaylogo: false,
      modeBarButtonsToRemove: ["select2d", "lasso2d", "autoScale2d"],
    });

    el.on("plotly_click", (ev) => {
      const point = ev.points && ev.points[0];
      if (point && point.customdata) State.toggleCountry(point.customdata[3]); // [3] = iso
    });
  },

  layout() {
    return {
      margin: { l: 64, r: 10, t: 8, b: 46 },
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(0,0,0,0)",
      font: { family: "system-ui, 'Segoe UI', Roboto, sans-serif", size: 12, color: "#1c2430" },
      showlegend: false,
      hovermode: "closest",
      uirevision: "keep",
      xaxis: {
        type: "log",
        range: this.xRange,
        tickvals: [10, 30, 100, 300, 1000, 3000, 10000, 30000],
        ticktext: ["10", "30", "100", "300", "1k", "3k", "10k", "30k"],
        title: { text: "Electricity use per person (kWh per year, log scale)", standoff: 6 },
        gridcolor: "#e6e9ee",
        zeroline: false,
      },
      yaxis: {
        range: [0, this.yMax],
        title: { text: "Carbon intensity (gCO\u2082e per kWh)", standoff: 6 },
        gridcolor: "#e6e9ee",
        zeroline: false,
      },
      annotations: [{
        xref: "paper", yref: "paper", x: 0.01, y: 0.99, xanchor: "left", yanchor: "top",
        showarrow: false, text: "Bubble area = electricity generated",
        font: { size: 11, color: "#5f6b7a" },
      }],
    };
  },

  update(ctx) {
    const rows = ctx.visibleRows().filter((r) => r.elecPc > 0 && r.ci != null);
    const name = (r) => ctx.data.countries[r.iso].name;
    const selected = (r) => ctx.isSelected(r.iso);
    const L = this.CHANGE_LIMIT;

    const trace = {
      type: "scatter",
      mode: "markers+text",
      x: rows.map((r) => r.elecPc),
      y: rows.map((r) => r.ci),
      text: rows.map((r) => (selected(r) ? name(r) : "")),
      textposition: "top center",
      textfont: { size: 11 },
      customdata: rows.map((r) => [name(r), r.ciChange, r.gen, r.iso]),
      hovertemplate:
        "<b>%{customdata[0]}</b><br>" +
        "Electricity per person: %{x:,.0f} kWh<br>" +
        "Carbon intensity: %{y:,.0f} gCO\u2082e/kWh<br>" +
        "Change since 2015: %{customdata[1]:+.0f}<br>" +
        "Generation: %{customdata[2]:,.0f} TWh<extra></extra>",
      marker: {
        size: rows.map((r) => r.gen),
        sizemode: "area",
        sizeref: (2 * this.maxGen) / (this.MAX_BUBBLE_PX ** 2),
        sizemin: 4,
        color: rows.map((r) => r.ciChange),
        colorscale: this.colorscale,
        cmin: -L,
        cmax: L,
        opacity: rows.map((r) => (selected(r) ? 1 : ctx.isBrushed(r.iso) ? 0.85 : 0.12)),
        line: {
          width: rows.map((r) => (selected(r) ? 3 : 0.6)),
          color: rows.map((r) => (selected(r) ? "#1c2430" : "#7b8594")),
        },
        colorbar: {
          title: { text: "Change since 2015<br>(gCO\u2082e per kWh)", side: "right" },
          thickness: 12,
          len: 0.9,
        },
      },
    };

    Plotly.react(this.el, [trace], this.layout());
  },
};
