# Who decarbonised their electricity? 2015-2024

Interactive dashboard for the Visual Data Science course (OWID Energy dataset).

## Run

    pip install -r requirements.txt
    python scripts/preprocess.py     # data/raw/owid-energy-data.csv -> web/data/data.json
    python app.py --browser          # development: opens your browser
    python app.py                    # native window, same as the .exe
    build.bat                        # Windows only: builds dist/ElectricityDashboard.exe


## Structure

    data/raw/owid-energy-data.csv    original data file
    scripts/preprocess.py            filters countries, derives columns, writes data.json
    web/index.html, style.css        layout: control bar + 2x2 grid, no scrolling
    web/js/state.js                  shared state (year, metric, group, selected, brushed)
    web/js/colors.js                 shared colour scales
    web/js/main.js                   loads data, builds ctx, wires controls and charts
    web/js/map.js                    chart 1, D3        (stub)
    web/js/scatter.js                chart 2, Plotly    (done)
    web/js/parcoords.js              chart 3, D3        (done)
    web/js/line.js                   chart 4, Plotly    (stub)
    web/lib/                         d3 7.9.0, plotly.js 2.35.2 (bundled, runs offline)
    web/data/countries.geo.json      country polygons, feature.id = ISO3

## Chart contract

Every chart is an object with `init(el, ctx)` (once) and `update(ctx)` (on every state
change). Read what you need from `ctx` (state, data, helpers); change the dashboard only via
`State.set(...)` / `State.toggleCountry(iso)`. The header of each stub says which fields and
colours to use. Data fields are documented at the top of `scripts/preprocess.py`.

## Known data limits

- 157 countries with >= 1M people and complete data in 2015 and 2024.
- Bahrain, Hong Kong, Mauritius and Singapore have no polygon on the map (shown in other charts).
- `ciChange` exists only for years >= 2015 (change versus 2015).
