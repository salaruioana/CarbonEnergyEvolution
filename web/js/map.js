// CHART 1 - Choropleth map (D3).
const MapChart = {
  init(el, ctx) {
    this.el = el;
    el.innerHTML = ""; // clear stub

    const width = el.clientWidth || 800;
    const height = el.clientHeight || 500;

    // create tooltip
    this.tooltip = d3.select("body").append("div")
      .attr("class", "tooltip")
      .style("position", "absolute")
      .style("visibility", "hidden")
      .style("background", "white")
      .style("border", "1px solid #ccc")
      .style("padding", "8px")
      .style("border-radius", "4px")
      .style("pointer-events", "none")
      .style("font-family", "sans-serif")
      .style("font-size", "12px")
      .style("z-index", "1000");

    this.svg = d3.select(el).append("svg")
      .attr("width", "100%")
      .attr("height", "100%")
      .attr("viewBox", `0 0 ${width} ${height}`);

    this.mapGroup = this.svg.append("g");

    // zoom and pan
    const zoom = d3.zoom()
      .scaleExtent([1, 8])
      .on("zoom", (e) => this.mapGroup.attr("transform", e.transform));
    this.svg.call(zoom);

    // geographic projection and path generator
    this.projection = d3.geoNaturalEarth1()
      .fitSize([width, height], ctx.data.geo);
    this.path = d3.geoPath().projection(this.projection);

    // draw country polygons
    this.paths = this.mapGroup.selectAll("path")
      .data(ctx.data.geo.features)
      .join("path")
      .attr("d", this.path)
      .attr("cursor", "pointer")
      .on("click", (e, d) => {
        const iso = d.id;
        // toggle only if country exists in dataset
        if (ctx.data.countries[iso]) State.toggleCountry(iso);
      })
      .on("mouseover", () => this.tooltip.style("visibility", "visible"))
      .on("mousemove", (e, d) => {
        const iso = d.id;
        const s = ctx.state;
        const row = ctx.rowsForYear(s.year)?.get(iso);
        const countryName = ctx.data.countries[iso]?.name || iso;

        let html = `<strong>${countryName}</strong><br>`;
        if (row) {
          html += `Carbon Intensity: ${row.ci.toFixed(1)} gCO2e/kWh<br>`;
          if (row.ciChange !== undefined) {
             const sign = row.ciChange > 0 ? "+" : "";
             html += `Change (since 2015): ${sign}${row.ciChange.toFixed(1)}`;
          }
        } else {
          html += "No data";
        }

        this.tooltip.html(html)
          .style("top", (e.pageY + 10) + "px")
          .style("left", (e.pageX + 10) + "px");
      })
      .on("mouseout", () => this.tooltip.style("visibility", "hidden"));
  },

  update(ctx) {
    const s = ctx.state;
    const yearData = ctx.rowsForYear(s.year);

    this.paths
      .attr("fill", d => {
        const row = yearData?.get(d.id);
        if (!row) return ctx.colors.MISSING;
        return s.mapMetric === "change" ? ctx.colors.forChange(row.ciChange) : ctx.colors.forLevel(row.ci);
      })
      .attr("opacity", d => {
        const iso = d.id;
        const hasData = yearData?.has(iso);
        if (!hasData) return 1; 
        
        // brush and group filter check
        const isVisible = ctx.isVisible(iso) && ctx.isBrushed(iso);
        return isVisible ? 1 : 0.15; // dim filtered countries
      })
      .attr("stroke", d => ctx.isSelected(d.id) ? "#000" : "#fff")
      .attr("stroke-width", d => ctx.isSelected(d.id) ? 1.5 : 0.5);

    // raise selected countries to the top
    this.paths.filter(d => ctx.isSelected(d.id)).raise();

    const legendBar = document.getElementById("legend-bar");
    const legendMin = document.getElementById("legend-min");
    const legendMid = document.getElementById("legend-mid");
    const legendMax = document.getElementById("legend-max");
    
    if (legendBar && legendMin && legendMid && legendMax) {
        if (s.mapMetric === "change") {
          legendBar.style.background = "linear-gradient(to right, #0072B2, #d4d4d4, #D55E00)";
          legendMin.textContent = "-300 (Cleaner)";
          legendMid.textContent = "0";
          legendMax.textContent = "+300 (Dirtier)";
        } else {
          legendBar.style.background = "linear-gradient(to right, #440154, #3b528b, #21918c, #5ec962, #fde725)";
          legendMin.textContent = "0 (Clean)";
          legendMid.textContent = "500";
          legendMax.textContent = "1000+ (Dirty)";
        }
    }
  }
};