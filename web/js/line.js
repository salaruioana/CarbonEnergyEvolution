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
    this.out = document.createElement("pre");
    this.out.className = "stub";
    el.appendChild(this.out);
  },
  update(ctx) {
    const s = ctx.state;
    const names = [...s.selected].map((iso) => ctx.data.countries[iso].name);
    this.out.textContent =
      "Line chart (Plotly) - to do\n" +
      `lines: ${names.join(", ") || "none"}\n` +
      `median series: ${ctx.data.medianCi.length} years`;
  },
};
