// CHART 1 - Choropleth map (D3).  Owner: [Name 2]
//
// Draw: d3.geoNaturalEarth1 + d3.geoPath over ctx.data.geo (GeoJSON, feature.id = ISO3).
// Encode: fill = Colors.forChange(row.ciChange) when state.mapMetric === "change",
//         Colors.forLevel(row.ci) when "level". No row or no polygon -> Colors.MISSING.
//         Data for the selected year: ctx.rowsForYear(state.year).get(iso).
//         Countries not in the data (small states, 4 have no polygon) -> grey.
// Interact: click a country -> State.toggleCountry(iso); d3.zoom for zoom/pan;
//           tooltip with name, ci, ciChange; dim countries failing ctx.isVisible(iso) or
//           ctx.isBrushed(iso); thick outline for ctx.isSelected(iso); add a colour legend.
// init() runs once (build svg, projection, legend); update() runs on every state change.
const MapChart = {
  init(el, ctx) {
    this.el = el;
    this.out = document.createElement("pre");
    this.out.className = "stub";
    el.appendChild(this.out);
  },
  update(ctx) {
    const s = ctx.state;
    this.out.textContent =
      "Map (D3) - to do\n" +
      `year ${s.year} | colour: ${s.mapMetric} | group: ${s.group}\n` +
      `polygons: ${ctx.data.geo.features.length} | visible countries: ${ctx.visibleRows().length}\n` +
      `selected: ${[...s.selected].join(", ") || "none"}`;
  },
};
