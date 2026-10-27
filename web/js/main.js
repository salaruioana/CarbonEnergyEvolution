// Loads the data, builds the shared context and wires controls and charts together.
(async function main() {
  const errorBox = document.getElementById("error");
  const showError = (msg) => { errorBox.textContent = msg; errorBox.hidden = false; };
  const json = (r) => {
    if (!r.ok) throw new Error(`${r.url} -> HTTP ${r.status}`);
    return r.json();
  };

  let dataset, geo;
  try {
    [dataset, geo] = await Promise.all([
      fetch("data/data.json").then(json),
      fetch("data/countries.geo.json").then(json),
    ]);
  } catch (err) {
    showError("Could not load the data. Start the dashboard with app.py " +
              "(or python app.py --browser), not by opening index.html directly. " + err.message);
    return;
  }

  // data indexes 
  // to improve performance, we create two different indexes for the 2 most used querying criterias
  // the map and the scatter plot need countries for each year
  // the bar plot needs each countrie's history along the years
  const byYear = new Map();   // year -> Map(iso -> row)
  const byIso = new Map();    // iso  -> rows sorted by year
  for (const row of dataset.rows) {
    if (!byYear.has(row.year)) byYear.set(row.year, new Map());
    byYear.get(row.year).set(row.iso, row);
    if (!byIso.has(row.iso)) byIso.set(row.iso, []);
    byIso.get(row.iso).push(row);
  }
  // if a.year is smaller, it is placed before b
  for (const rows of byIso.values()) rows.sort((a, b) => a.year - b.year);

  //const medianCi = dataset.meta.years.map((year) => ({
  //  year,
  //  ci: d3.median([...byYear.get(year).values()], (r) => r.ci),
  //}));
  const medianCi = [];

  // for each year,  we compute the median carbon index
  for (const year of dataset.meta.years) {
    const countries = byYear.get(year);
    const rows = Array.from(countries.values());

    const median = d3.median(rows, (row) => row.ci);

    medianCi.push({
      year: year,
      ci: median
    });
  }

  // the data object that all the plots are based on
  const data = {
    meta: dataset.meta,
    countries: dataset.countries,   // iso -> {name, group}
    rows: dataset.rows,
    byYear, byIso, medianCi, geo,
  };

  // context handed to every chart - combines the data object with the applied "filters"
  // each plot is given the data and selection functionality applied to it
  // this way, all graphics 
  // function context() {
  //   const state = State.get();
  //   const isVisible = (iso) => state.group === "all" || data.countries[iso].group === state.group;
  //   return {
  //     state,
  //     data,
  //     colors: Colors,
  //     isVisible,                                            // passes the group filter
  //     isBrushed: (iso) => state.brushed === null || state.brushed.has(iso),
  //     isSelected: (iso) => state.selected.has(iso),
  //     rowsForYear: (year) => data.byYear.get(year),         // Map iso -> row
  //     visibleRows: () => [...data.byYear.get(state.year).values()].filter((r) => isVisible(r.iso)),
  //   };
  // }
  
function context() {
  // state contains the current selection in the dashboard
  const state = State.get();

  function isVisible(iso) {
    // each country is visible if the filter is "all" or the country's group is the same as the selected one
    return state.group === "all" ||
           data.countries[iso].group === state.group;
  }

  function isBrushed(iso) {
    // each country is brushed if there is no brushed filter or if the country belongs to the brushed selection
    return state.brushed === null ||
           state.brushed.has(iso);
  }

  function isSelected(iso) {
    return state.selected.has(iso);
  }

  function rowsForYear(year) {
    return data.byYear.get(year);
  }

  function visibleRows() {
    const countriesForYear = data.byYear.get(state.year);
    const rows = Array.from(countriesForYear.values());

    return rows.filter(function(row) {
      return isVisible(row.iso);
    });
  }

  return {
    state: state,
    data: data,
    colors: Colors,
    isVisible: isVisible,
    isBrushed: isBrushed,
    isSelected: isSelected,
    rowsForYear: rowsForYear,
    visibleRows: visibleRows
  };
}


  // charts - initialization and actualization
  // we associate to each chart its html container name
  const charts = [
    [MapChart, "map"],
    [ScatterChart, "scatter"],
    [ParCoordsChart, "parcoords"],
    [LineChart, "line"],
  ];
  // update is a method of each chart object
  const render = () => { const ctx = context(); charts.forEach(([c]) => c.update(ctx)); };
  charts.forEach(([c, id]) => c.init(document.getElementById(id), context()));
  // when the State object changes, call the function render()
  // ex: state.js changes its state and notifies the listeners; amongst them there is render - the function then gets called and updates the charts accoridng to state
  State.subscribe(render);

  // debounce mechanism - before resizing the window, we wait for a bit for the size to be stable
  // the purpose is to avoid useless operations
  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(render, 150);
  });

  // controls 
  const yearOut = document.getElementById("year-out");
  yearInput.addEventListener("input", () => {
    yearOut.textContent = yearInput.value;
    // + converts the string value to a number
    State.set({ year: +yearInput.value });
  });
  // we add event listeners for buttons on the dashboard
  // we change the state, not the charts directly. The rendering mechanism makes sure the charts get updated to 
  document.getElementById("metric").addEventListener("change", (e) => State.set({ mapMetric: e.target.value }));
  document.getElementById("group").addEventListener("change", (e) => State.set({ group: e.target.value, brushed: null }));
  document.getElementById("clear").addEventListener("click", () => State.clearSelection());

  const isoByLabel = new Map();
  const list = document.getElementById("country-list");
  // it creates a dictionary with all the iso codes and the names of the countries and adds them as options in the countries list
  Object.entries(data.countries)
    // alphabetic sort
    .sort((a, b) => a[1].name.localeCompare(b[1].name))
    // iso - entry[0]; c - entry[1]
    .forEach(([iso, c]) => {
      isoByLabel.set(c.name.toLowerCase(), iso);
      const opt = document.createElement("option");
      opt.value = c.name;
      list.appendChild(opt);
    });
  // updates the state of the values inserted in the search field
  const search = document.getElementById("search");
  search.addEventListener("change", () => {
    const iso = isoByLabel.get(search.value.trim().toLowerCase());
    if (iso && !State.get().selected.has(iso)) State.toggleCountry(iso);
    search.value = "";
  });

  render();
})();
