from pathlib import Path
import pandas as pd

# Locate the original dataset relative to this script
ROOT = Path(__file__).resolve().parent
CSV_PATH = ROOT / "data" / "raw" / "owid-energy-data.csv"

SHARES = [
    "coal_share_elec",
    "gas_share_elec",
    "oil_share_elec",
    "nuclear_share_elec",
    "hydro_share_elec",
    "solar_share_elec",
    "wind_share_elec",
]

AGGREGATES = [
    "fossil_share_elec",
    "renewables_share_elec",
]

TOLERANCE = 2  # Percentage points allowed around 100%


def main():
    if not CSV_PATH.exists():
        print(f"Dataset not found: {CSV_PATH}")
        print("Check that this script is in the project root.")
        return

    df = pd.read_csv(CSV_PATH)

    # Keep individual countries, excluding OWID aggregates
    df = df[
        df["iso_code"].notna()
        & ~df["iso_code"].astype(str).str.startswith("OWID")
    ].copy()

    columns = SHARES + AGGREGATES
    missing_columns = [col for col in columns if col not in df.columns]

    if missing_columns:
        print("Missing expected columns:", missing_columns)
        return

    # Restrict the diagnostic to 2000–2024
    df = df[df["year"].between(2000, 2024)].copy()

    # 1. Missing values in each source share
    print("\n=== 1. MISSING VALUES ===")
    print(df[SHARES].isna().sum().sort_values(ascending=False))
    print(
        "\nRows with at least one missing source:",
        int(df[SHARES].isna().any(axis=1).sum()),
        "of", len(df),
    )

    # 2. Sum the seven source shares as they appear in the CSV
    # min_count=7 ensures the total is NaN if any of the seven is missing
    df["sum_complete"] = df[SHARES].sum(axis=1, min_count=len(SHARES))

    # Also calculate the sum of whatever values are available
    df["sum_available"] = df[SHARES].sum(axis=1, min_count=1)

    complete = df["sum_complete"].notna()
    missing = df[SHARES].isna().any(axis=1)

    print("\n=== 2. SUM OF SEVEN SOURCE SHARES ===")
    print("Rows with all seven values present:", int(complete.sum()))

    if complete.any():
        totals = df.loc[complete, "sum_complete"]
        print(totals.describe().round(2))
        print(
            "Complete rows summing to approximately 100%:",
            int((totals.sub(100).abs() <= TOLERANCE).sum()),
            "of", int(complete.sum()),
        )

    print("\n=== 3. ROWS WITH MISSING VALUES ===")
    print("Rows with missing values:", int(missing.sum()))

    if missing.any():
        missing_rows = df.loc[missing].copy()
        print(
            "Available sum — median:",
            round(missing_rows["sum_available"].median(), 2),
        )
        print(
            "Available sum — minimum:",
            round(missing_rows["sum_available"].min(), 2),
        )
        print(
            "Available sum — maximum:",
            round(missing_rows["sum_available"].max(), 2),
        )

        print("\nExamples of rows with missing shares:")
        cols = ["country", "year"] + SHARES + [
            "sum_available", "fossil_share_elec", "renewables_share_elec"
        ]
        print(missing_rows[cols].head(20).to_string(index=False))

    # 4. Diagnostic only: what happens if missing shares are assumed to be zero?
    df["sum_if_missing_zero"] = df[SHARES].fillna(0).sum(axis=1)

    print("\n=== 4. IF MISSING VALUES WERE ZERO ===")
    totals_zero = df["sum_if_missing_zero"]

    print(
        "Rows summing to approximately 100%:",
        int((totals_zero.sub(100).abs() <= TOLERANCE).sum()),
        "of", len(df),
    )

    print("\nDistribution of sums after filling missing values with zero:")
    print(totals_zero.describe().round(2))

    # 5. Compare the seven shares with broad indicators where available
    # This is only a consistency check, not proof that missing values mean zero.
    print("\n=== 5. COMPARISON WITH AGGREGATE INDICATORS ===")
    df["fossil_plus_renewables"] = (
        df["fossil_share_elec"] + df["renewables_share_elec"]
    )

    valid = df[
        df["fossil_share_elec"].notna()
        & df["renewables_share_elec"].notna()
    ]

    print("Rows with both aggregate indicators:", len(valid))

    if not valid.empty:
        print(
            "Fossil + renewables — median:",
            round(valid["fossil_plus_renewables"].median(), 2),
        )
        print(
            "Fossil + renewables — min/max:",
            round(valid["fossil_plus_renewables"].min(), 2),
            "/",
            round(valid["fossil_plus_renewables"].max(), 2),
        )

    print("\nDiagnostic complete. No files were modified.")


    # 6. Inspect informative missing-value cases
    print("\n=== 6. INFORMATIVE MISSING-VALUE CASES ===")

    informative = df[
        df[SHARES].isna().any(axis=1)
        & df[SHARES].notna().any(axis=1)
    ].copy()

    informative["missing_sources"] = informative[SHARES].isna().sum(axis=1)

    cols = [
        "country", "year", "missing_sources",
        *SHARES, "sum_available",
        "fossil_share_elec", "renewables_share_elec",
    ]

    print("Rows with some, but not all, source shares missing:", len(informative))

    print("\nExamples with the highest available sums:")
    print(
        informative.sort_values("sum_available", ascending=False)[cols]
        .head(25)
        .to_string(index=False)
    )

    print("\nMissing values by source among informative rows:")
    print(informative[SHARES].isna().sum().sort_values(ascending=False))


if __name__ == "__main__":
    main()