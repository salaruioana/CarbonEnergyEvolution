// Shared colour scales: one quantity -> one scale, in every view.
//   change since 2015 (gCO2e/kWh)  diverging, centred on 0: blue = cleaner, orange = dirtier
//   carbon intensity level         sequential Viridis
//   missing value                  neutral grey
const Colors = (() => {
  const MISSING = "#c9ced6";

  // we use a diverging color scale to point out which had an improvement (blue) and which decayed (orange)
  const change = d3.scaleDiverging(d3.piecewise(d3.interpolateRgb, ["#0072B2", "#d4d4d4", "#D55E00"]))
    .domain([-300, 0, 300])
    .clamp(true);

  // we use a sequential colour scale, so the intensity of the color allows us to compare two values
  const level = d3.scaleSequential(d3.interpolateViridis)
    .domain([0, 1000])
    .clamp(true);

  // we can instantiate the appropriate color using the 2 methods. Ex:
  // Colors.forChange(-100); Colorts.forLevel(500)
  return {
    MISSING,
    change,
    level,
    forChange: (v) => (v == null ? MISSING : change(v)),
    forLevel: (v) => (v == null ? MISSING : level(v)),
  };
})();
