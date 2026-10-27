// Shared dashboard state (single source of truth for all four charts).
//
//   year        selected year, 2015..2024
//   mapMetric   "change" (since 2015) or "level" (carbon intensity)
//   group       "all" | "low" | "middle" | "high" (electricity use per person)
//   selected    Set of ISO3 codes clicked by the user (outlined / drawn in the line chart)
//   brushed     null (no brush) or Set of ISO3 codes inside the parallel-coordinates brush
//
// Charts never talk to each other. They read the state in update(ctx) and change it
// with State.set(...) / State.toggleCountry(...). Every change re-renders all charts.
const State = (() => {
  let state = {
    year: 2024,
    mapMetric: "change",
    group: "all",
    selected: new Set(["DEU", "GBR", "POL", "CHN", "IND"]),
    brushed: null,
  };
  const listeners = [];

  function get() { return state; }

  function set(patch) {
    state = { ...state, ...patch };
    listeners.forEach((fn) => fn(state));
  }

  function toggleCountry(iso) {
    const next = new Set(state.selected);
    if (next.has(iso)) next.delete(iso); else next.add(iso);
    set({ selected: next });
  }

  function clearSelection() { set({ selected: new Set(), brushed: null }); }

  function subscribe(fn) { listeners.push(fn); }

  return { get, set, toggleCountry, clearSelection, subscribe };
})();

if (typeof module !== "undefined") module.exports = State;
