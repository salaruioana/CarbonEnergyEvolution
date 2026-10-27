// CHART 3 - Parallel coordinates (D3).  Owner: Ioana Salaru
//
// One line per country, one vertical axis per variable. Line colour = change in carbon
// intensity since 2015 (same scale as map + scatter plot).
//
// Interaction
//   brush an axis       drag on an axis; brushes on several axes are combined (AND).
//                       The matching countries go to State.brushed, so the scatter plot dims the rest.
//   click a line        State.toggleCountry(iso)  (selected lines are thick, outlined and labelled)
//   hover a line        tooltip
//
// How the pieces fit together
//   init()    runs once: tooltip div, fixed axis domains.
//   build()   creates the svg, axes and brushes. Runs again only when the panel size changes.
//   update()  runs on every state change: syncs the brushes with State, then draw()s the lines.
//   Brushes live in build() and are never recreated by update(), so dragging is never interrupted.
//   this.extents keeps the active brushes in DATA units, so they survive resizes and year changes.
const ParCoordsChart = {
  AXES: [
    { key: "ci",        title: "Carbon intensity",       unit: "gCO\u2082e per kWh" },
    { key: "fossil",    title: "Fossil share",           unit: "% of electricity" },
    { key: "coal",      title: "Coal share",             unit: "% of electricity" },
    { key: "solarWind", title: "Solar + wind",           unit: "% of electricity" },
    { key: "elecPc",    title: "Electricity per person", unit: "kWh, log scale", log: true },
    { key: "ciChange",  title: "Change since 2015",      unit: "gCO\u2082e per kWh" },
  ],
  MARGIN: { top: 46, right: 124, bottom: 14, left: 58 },

  init(el, ctx) {
    this.el = el;
    this.extents = {};      // axis key -> [low, high] in data units (active brushes)
    this.W = 0;
    this.H = 0;

    this.tip = d3.select(el).append("div")
      .style("position", "absolute").style("display", "none").style("pointer-events", "none")
      .style("z-index", 2).style("padding", "4px 8px").style("background", "#fff")
      .style("border", "1px solid #d5d9df").style("border-radius", "3px")
      .style("font-size", "12px").style("white-space", "nowrap");

    // Fixed domains over ALL years, so the axes do not move when the year changes.
    const rows = ctx.data.rows;
    const pos = rows.map((r) => r.elecPc).filter((v) => v > 0);
    this.domains = {
      ci: [0, d3.max(rows, (r) => r.ci)],
      fossil: [0, 100],
      coal: [0, 100],
      solarWind: [0, Math.ceil(d3.max(rows, (r) => r.solarWind) / 10) * 10],
      elecPc: [d3.min(pos) * 0.9, d3.max(pos) * 1.1],
      ciChange: d3.extent(rows, (r) => r.ciChange).map((v, i) => v + (i ? 10 : -10)),
    };
  },

  // ---- layout: svg, axes, brushes (runs on init and on resize) ------------------------
  build(W, H) {
    const m = this.MARGIN;
    const w = Math.max(W - m.left - m.right, 100);
    const h = Math.max(H - m.top - m.bottom, 60);
    this.W = W;
    this.H = H;

    d3.select(this.el).select("svg").remove();
    const svg = d3.select(this.el).insert("svg", ":first-child")
      .attr("width", W).attr("height", H).style("display", "block");
    const g = svg.append("g").attr("transform", `translate(${m.left},${m.top})`);

    this.x = d3.scalePoint().domain(this.AXES.map((a) => a.key)).range([0, w]);
    this.y = {};
    this.AXES.forEach((a) => {
      this.y[a.key] = (a.log ? d3.scaleLog() : d3.scaleLinear())
        .domain(this.domains[a.key]).range([h, 0]);
    });
    this.line = d3.line().defined((d) => d[1] != null);

    this.gLines = g.append("g");
    this.gSel = g.append("g");

    this.brushes = {};
    this.brushG = {};
    const gAxes = g.append("g");
    this.AXES.forEach((a) => {
      const ax = gAxes.append("g").attr("transform", `translate(${this.x(a.key)},0)`);
      const axis = d3.axisLeft(this.y[a.key]);
      ax.call(a.log ? axis.ticks(4, "~s") : axis.ticks(5));
      ax.append("text").attr("y", -28).attr("text-anchor", "middle")
        .attr("fill", "#1c2430").style("font-weight", 600).text(a.title);
      ax.append("text").attr("y", -14).attr("text-anchor", "middle")
        .attr("fill", "#5f6b7a").style("font-size", "11px").text(a.unit);

      const brush = d3.brushY().extent([[-9, 0], [9, h]])
        .on("brush end", (event) => this.onBrush(event, a.key));
      this.brushes[a.key] = brush;
      this.brushG[a.key] = ax.append("g").attr("class", "brush").call(brush);
      this.brushG[a.key].select(".selection")
        .attr("fill", "#0072B2").attr("fill-opacity", 0.15).attr("stroke", "#0072B2");
    });
    this.moveBrushes();      // re-apply stored brushes after a rebuild
  },

  // Put the visual brushes where this.extents says (programmatic: onBrush ignores these events).
  moveBrushes() {
    this.AXES.forEach((a) => {
      const e = this.extents[a.key];
      const sel = e ? [this.y[a.key](e[1]), this.y[a.key](e[0])] : null;
      this.brushG[a.key].call(this.brushes[a.key].move, sel);
    });
  },

  // User dragged a brush on axis `key`.
  onBrush(event, key) {
    if (!event.sourceEvent) return;               // programmatic move, not the user
    const s = event.selection;
    if (s) {
      const scale = this.y[key];
      this.extents[key] = [scale.invert(s[1]), scale.invert(s[0])];
    } else {
      delete this.extents[key];
    }
    State.set({ brushed: this.brushedSet(this.ctx.visibleRows()) });
  },

  // ISO codes that pass every active brush (null when there is no brush).
  brushedSet(rows) {
    const keys = Object.keys(this.extents);
    if (!keys.length) return null;
    return new Set(rows
      .filter((r) => keys.every((k) => r[k] != null && r[k] >= this.extents[k][0] && r[k] <= this.extents[k][1]))
      .map((r) => r.iso));
  },

  // ---- every state change -----------------------------------------------------------------
  update(ctx) {
    this.ctx = ctx;
    const W = this.el.clientWidth;
    const H = this.el.clientHeight;
    if (!W || !H) return;
    if (W !== this.W || H !== this.H) this.build(W, H);

    const hasBrush = Object.keys(this.extents).length > 0;
    if (hasBrush && ctx.state.brushed === null) {
      // cleared from outside (Clear selection, group filter): remove the visual brushes too
      this.extents = {};
      this.moveBrushes();
    } else if (hasBrush) {
      // year changed while brushing: recompute who passes, publish if it changed
      const set = this.brushedSet(ctx.visibleRows());
      const old = ctx.state.brushed;
      if (set.size !== old.size || [...set].some((iso) => !old.has(iso))) {
        State.set({ brushed: set });          // triggers a new update with consistent state
        return;
      }
    }
    this.draw(ctx);
  },

  draw(ctx) {
    const { x, y, line } = this;
    const first = this.AXES.map((a) => a.key);
    const path = (row) => line(first.map((k) => [x(k), row[k] == null ? null : y[k](row[k])]));
    const colour = (row) => Colors.forChange(row.ciChange);
    const click = (event, d) => State.toggleCountry(d.iso);
    const show = (event, d) => {
      const [px, py] = d3.pointer(event, this.el);
      this.tip.style("display", "block").style("left", `${px + 14}px`).style("top", `${py + 14}px`)
        .text(`${ctx.data.countries[d.iso].name}: ${d3.format(",.0f")(d.ci)} gCO\u2082e/kWh, ` +
              `${d3.format("+,.0f")(d.ciChange)} since 2015`);
    };
    const hide = () => this.tip.style("display", "none");

    // all lines (faded when outside the brush; faded lines do not react to the mouse)
    const rows = ctx.visibleRows().sort((a, b) => ctx.isBrushed(a.iso) - ctx.isBrushed(b.iso));
    this.gLines.selectAll("path").data(rows, (d) => d.iso).join("path")
      .attr("d", path)
      .attr("fill", "none")
      .attr("stroke", colour)
      .attr("stroke-width", 1.5)
      .attr("stroke-opacity", (d) => (ctx.isBrushed(d.iso) ? 0.6 : 0.07))
      .attr("pointer-events", (d) => (ctx.isBrushed(d.iso) ? "stroke" : "none"))
      .style("cursor", "pointer")
      .on("click", click).on("mousemove", show).on("mouseleave", hide)
      .order();

    // selected countries: dark outline + coloured line + label at the right end
    const chosen = rows.filter((r) => ctx.isSelected(r.iso));
    const groups = this.gSel.selectAll("g.sel").data(chosen, (d) => d.iso).join((enter) => {
      const gg = enter.append("g").attr("class", "sel").style("cursor", "pointer");
      gg.append("path").attr("class", "outline");
      gg.append("path").attr("class", "fill");
      gg.append("text");
      return gg;
    });
    groups.on("click", click).on("mousemove", show).on("mouseleave", hide);
    groups.select("path.outline").attr("d", path).attr("fill", "none")
      .attr("stroke", "#1c2430").attr("stroke-width", 5.5).attr("stroke-linejoin", "round");
    groups.select("path.fill").attr("d", path).attr("fill", "none")
      .attr("stroke", colour).attr("stroke-width", 3).attr("stroke-linejoin", "round");
    // labels sit at the right end of each line; push them apart so they never overlap
    const labelY = new Map();
    let last = -Infinity;
    chosen.filter((d) => d.ciChange != null)
      .sort((a, b) => y.ciChange(a.ciChange) - y.ciChange(b.ciChange))
      .forEach((d) => {
        last = Math.max(y.ciChange(d.ciChange), last + 14);
        labelY.set(d.iso, last);
      });
    const label = (iso) => {
      const n = ctx.data.countries[iso].name;
      return n.length > 17 ? n.slice(0, 16) + "\u2026" : n;
    };
    groups.select("text")
      .attr("x", x("ciChange") + 8)
      .attr("y", (d) => labelY.get(d.iso) ?? 0)
      .attr("dy", "0.32em")
      .attr("fill", "#1c2430").attr("font-size", 12)
      .attr("stroke", "#fff").attr("stroke-width", 3).style("paint-order", "stroke")
      .text((d) => label(d.iso));
  },
};
