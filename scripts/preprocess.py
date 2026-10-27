"""
Reads data/raw/owid-energy-data.csv and writes web/data/data.json.

data.json contract (shared by all four charts):
{
  "meta":      {"years": [2000..2024], "baseYear": 2015, "sliderYears": [2015..2024],
                "groups": ["low", "middle", "high"]},
  "countries": {"DEU": {"name": "Germany", "group": "high"}, ...},
  "rows":      [{"iso": "DEU", "year": 2024, "ci": 336.1, "ciChange": -167.2, ...}, ...]
}
Row fields (null = missing):
  iso, year, pop, gen (TWh), demand (TWh), elecPc (kWh/person),
  ci (gCO2e/kWh), ghg (Mt CO2e), fossil, renew, coal, gas, oil, nuclear,
  hydro, solar, wind (all shares, %), solarWind (%), ciChange (ci minus ci in
  the base year 2015, only for years >= 2015)
"""
import json
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "data" / "raw" / "owid-energy-data.csv"
OUT = ROOT / "web" / "data" / "data.json"

START, END, BASE = 2000, 2024, 2015
MIN_POP = 1_000_000
CORE = ["population", "electricity_generation", "carbon_intensity_elec",
        "renewables_share_elec", "fossil_share_elec"]
SHARES = ["coal_share_elec", "gas_share_elec", "oil_share_elec", "nuclear_share_elec",
          "hydro_share_elec", "solar_share_elec", "wind_share_elec"]

df = pd.read_csv(SRC)

# 1) countries only: drop aggregates (no ISO code, or OWID_* codes)
c = df[df.iso_code.notna() & ~df.iso_code.astype(str).str.startswith("OWID")].copy()

# 2) keep countries >= 1M people with complete core data in BASE and END
a = c[c.year == BASE].set_index("iso_code")
b = c[c.year == END].set_index("iso_code")
# keeps the iso codes of the countries with complete data for 2015-2024 - otherwise we can't compare them
ok = a[CORE].dropna().index.intersection(b[CORE].dropna().index)
# amongst those, keeps the countries with a population above 1 mil in 2024
ok = [i for i in ok if b.loc[i, "population"] >= MIN_POP]
# we keep countries data between 2000-2024 with complete data between 2015-2024
d = c[c.iso_code.isin(ok) & c.year.between(START, END)].copy()

# 3) authors mention that some missing values should be treated as 0 and it is reasonable to do the same for the rest, as well
# The total might not sum up exactly to 100% for some of those cases - this is a limitation of the dataset.
d[SHARES] = d[SHARES].fillna(0)
# we save this column separately to ilustrate green energy resources
d["solar_wind"] = d.solar_share_elec + d.wind_share_elec

# 4) change in carbon intensity vs. the base year (only for years >= BASE)
base_ci = d[d.year == BASE].set_index("iso_code").carbon_intensity_elec
# we save this column separately to ilustrate how each country has evolved - the smaller the value, the better
d["ci_change"] = d.carbon_intensity_elec - d.iso_code.map(base_ci)
# our study is focused on the results after the Paris Agreement (2015), so previous values will not be considered
d.loc[d.year < BASE, "ci_change"] = None

# 5) electricity-use group = tertiles of electricity per person in the last year
# Integer arithmetic on ranks (not pd.qcut) so the groups are identical on every machine.
pc = d[d.year == END].set_index("iso_code").per_capita_electricity
order = pc.rank(method="first").astype(int) - 1            # 0 .. n-1
groups = ((order * 3) // len(pc)).map({0: "low", 1: "middle", 2: "high"})
countries = {
    iso: {"name": b.loc[iso, "country"], "group": groups[iso]} for iso in ok
}

# 6) export
# the raw csv has 130 columns, and we don't use all of them
# we create a reduced json, with simple column names, easy to manage
rename = {
    "iso_code": "iso", "year": "year", "population": "pop",
    "electricity_generation": "gen", "electricity_demand": "demand",
    "per_capita_electricity": "elecPc", "carbon_intensity_elec": "ci",
    "greenhouse_gas_emissions": "ghg", "fossil_share_elec": "fossil",
    "renewables_share_elec": "renew", "coal_share_elec": "coal",
    "gas_share_elec": "gas", "oil_share_elec": "oil", "nuclear_share_elec": "nuclear",
    "hydro_share_elec": "hydro", "solar_share_elec": "solar", "wind_share_elec": "wind",
    "solar_wind": "solarWind", "ci_change": "ciChange",
}
out = d[list(rename)].rename(columns=rename).round(2)
# replacing pandas NaN/ Python None to JSON null
out = out.astype(object).where(out.notna(), None)

payload = {
    # general information
    "meta": {
        "years": list(range(START, END + 1)),
        "baseYear": BASE,
        "sliderYears": list(range(BASE, END + 1)),
        "groups": ["low", "middle", "high"],
    },
    # previously defined dictionary with key: ISO code, and value {Country name, Group} 
    "countries": countries,
    "rows": out.to_dict(orient="records"),
}
OUT.write_text(json.dumps(payload, allow_nan=False, separators=(",", ":")), encoding="utf-8")

print(f"Countries: {len(countries)} | rows: {len(out)} | file: {OUT.stat().st_size / 1024:.0f} KB")
print("Groups:", pd.Series({k: v["group"] for k, v in countries.items()}).value_counts().to_dict())
print("Min electricity per person (log axis needs > 0):", d.per_capita_electricity.min())
print("Rows with missing values per field:")
missing = out.isna().sum()
print(missing[missing > 0].to_string() if (missing > 0).any() else "none")
