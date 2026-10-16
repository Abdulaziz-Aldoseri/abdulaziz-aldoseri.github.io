"""Extract the evaluated results that the two flagship case pages display.

Reads only the reviewed ``outputs/`` (plus two processed calibration inputs)
of each case folder and writes compact JSON files (``src/data/`` for published
pages, ``src/drafts/`` for held drafts). The pages
never solve anything in the browser: every number they show is a value from
these files, which are in turn copied column-for-column from the case outputs.

Usage (from the repository root)::

    python scripts/build_case_data.py [--cases PATH_TO_materials/projects]
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CASES = ROOT.parents[2] / "projects"


def r(value: float, digits: int = 2) -> float:
    return round(float(value), digits)


class CaseReader:
    """Reads case files and records every path read, for the trace block."""

    def __init__(self, case: Path):
        self.case = case
        self.files: list[str] = []

    def _path(self, rel: str) -> Path:
        if rel not in self.files:
            self.files.append(rel)
        return self.case / rel

    def csv(self, rel: str, **kwargs) -> pd.DataFrame:
        return pd.read_csv(self._path(rel), **kwargs)

    def json(self, rel: str):
        return json.loads(self._path(rel).read_text(encoding="utf-8"))


def pct(numerator: float, denominator: float) -> float:
    """Share of monthly contract volume, in percent, one decimal place."""
    return round(100.0 * max(float(numerator), 0.0) / float(denominator), 1)


# ---------------------------------------------------------------------------
# Export routing under route-disruption risk
# ---------------------------------------------------------------------------

def export_case(case: Path) -> dict:
    read = CaseReader(case)
    grid = read.csv("outputs/probability_grid.csv", dtype={"spot_cap_share": str})
    joint = read.csv("outputs/joint_grid.csv")
    rule = read.csv("outputs/decision_rule.csv", dtype={"spot_cap_share": str})
    policy = read.csv("outputs/policy_comparison.csv")
    coast = read.csv("outputs/coast_split.csv")
    gulf = read.csv("outputs/gulf_exit_extension.csv")
    caps = read.csv("outputs/gulf_exit_caps.csv", dtype={"spot_cap_share": str})
    dependence = read.csv("outputs/joint_dependence.csv")
    sensitivity = read.csv("outputs/sensitivity.csv", dtype={"value": str})
    voi = read.json("outputs/value_of_information.json")
    calibration = read.json("data/processed/scenario_calibration.json")
    metadata = read.json("outputs/run_metadata.json")

    def plan_metrics(row) -> dict:
        demand = row["RP_demand_t_month"]
        return {
            "hedgePct": pct(row["RP_hedge_total_t_month"], demand),
            "redSeaPct": pct(row["RP_red_sea_option_t_month"], demand),
            "gulfPct": pct(row["RP_gulf_extra_t_month"], demand),
            "redSeaShare": r(row["RP_red_sea_share_of_hedge"], 2),
            "expected": r(row["RP_expected_musd"]),
            "expectedNoHedge": r(row["cheapest_expected_musd"]),
            "open": r(row["RP_open_musd"]),
            "openNoHedge": r(row["cheapest_open_musd"]),
            "closed": r(row["RP_closed_musd"]),
            "closedNoHedge": r(row["cheapest_closed_musd"]),
            "saving": r(row["hedge_saving_vs_cheapest_musd"]),
        }

    westbound = []
    for _, row in grid.iterrows():
        westbound.append({
            "spotCap": row["spot_cap_share"],
            "closedShare": float(row["closed_all_year_share"]),
            "pOpen": r(row["p_open_full_year"], 2),
            "pClosedAllYear": r(row["p_closed_all_year"], 3),
            **plan_metrics(row),
        })

    both = []
    for _, row in joint.iterrows():
        item = {
            "pNotOpen": r(row["p_west_not_open"], 2),
            "pGulfExit": r(row["p_gulf_exit"], 2),
            **plan_metrics(row),
        }
        if pd.notna(row["RP_cost_GULF_EXIT_musd"]):
            item["gulfExit"] = r(row["RP_cost_GULF_EXIT_musd"])
            item["gulfExitNoHedge"] = r(row["cheapest_cost_GULF_EXIT_musd"])
            item["bothClosed"] = r(row["RP_cost_PROLONGED+GULF_EXIT_musd"])
            item["bothClosedNoHedge"] = r(row["cheapest_cost_PROLONGED+GULF_EXIT_musd"])
        both.append(item)

    coast_rows = {
        row["condition"]: {
            "hedgePct": r(row["hedge_total_pct_of_volume"], 1),
            "redSeaPct": r(row["red_sea_pct_of_volume"], 1),
            "gulfPct": r(row["gulf_pct_of_volume"], 1),
            "redSeaShare": r(row["red_sea_share_of_hedge"], 2),
            "expectedSaving": r(row["expected_saving_musd"]),
            "openPremium": r(row["open_year_premium_musd"]),
            "closedSaving": r(row["closed_year_saving_musd"]),
        }
        for _, row in coast.iterrows()
    }

    regions = {}
    for _, row in sensitivity[sensitivity["parameter"] == "region_split_variant"].iterrows():
        regions[row["value"]] = {
            "hedgePct": pct(row["RP_hedge_total_t_month"], row["RP_demand_t_month"]),
            "redSeaShare": r(row["RP_red_sea_share_of_hedge"], 2),
            "expectedSaving": r(row["hedge_saving_vs_cheapest_musd"]),
            "closedSaving": r(row["cheapest_closed_musd"] - row["RP_closed_musd"]),
        }

    gulf_rows = [
        {
            "variant": row["variant"],
            "plan": row["plan"],
            "penalty": r(row["penalty_usd_per_t"], 0),
            "open": r(row["open_cost_musd"]),
            "gulfExit": r(row["gulf_exit_cost_musd"]),
            "penaltyShare": r(row["gulf_exit_penalty_share"], 3),
            "shortfallKt": r(row["gulf_exit_shortfall_t_month_avg"] / 1000, 0),
            "bothClosed": r(row["both_cost_musd"]),
        }
        for _, row in gulf.iterrows()
    ]

    cap_rows = [
        {
            "inlandKt": r(row["inland_cap_exporter_t_month"] / 1000, 0),
            "spotCap": row["spot_cap_share"],
            "gulfExit": r(row["gulf_exit_cost_musd"]),
            "shortfallKt": r(row["gulf_exit_shortfall_t_month_avg"] / 1000, 0),
        }
        for _, row in caps[caps["plan"] == "stochastic_optimum"].iterrows()
    ]

    return {
        "trace": {
            "case": "materials/projects/export-logistics",
            "files": read.files,
        },
        "assumptions": metadata["assumptions"],
        "derived": metadata["derived"],
        "volume": {
            "annualT": int(voi["annual_volume_t"]),
            "monthlyDemandT": r(grid["RP_demand_t_month"].iloc[0], 0),
        },
        "decisionRule": [
            {
                "spotCap": row["spot_cap_share"],
                "closedShare": float(row["closed_all_year_share"]),
                "thresholdOpen": r(row["break_even_p_open_full_year_hedge_total"], 3),
            }
            for _, row in rule.iterrows()
        ],
        "westbound": westbound,
        "joint": both,
        "policies": {
            row["policy"]: {
                "label": row["label"],
                "expected": r(row["expected_cost_musd"]),
                "open": r(row["cost_open_musd"]),
                "partial": r(row["cost_partial_musd"]),
                "closed": r(row["cost_prolonged_musd"]),
            }
            for _, row in policy.iterrows()
        },
        "coastSplit": coast_rows,
        "regionSplit": regions,
        "gulfExit": gulf_rows,
        "gulfExitCaps": cap_rows,
        "dependence": [
            {
                "pNotOpen": r(row["p_west_not_open"], 2),
                "pGulfExit": r(row["p_gulf_exit"], 2),
                "dependence": r(row["dependence"], 2),
                "pBothClosedAllYear": r(row["p_both_closed_prolonged"], 4),
                "expected": r(row["RP_expected_musd"]),
            }
            for _, row in dependence.iterrows()
        ],
        "valueOfInformation": {"evpi": r(voi["EVPI_musd"]), "vss": r(voi["VSS_musd"])},
        "severity": {
            "westbound": calibration["severity_alternatives"],
            "gulfExit": calibration["hormuz"]["severity"],
            "gulfExitMonths": calibration["hormuz"]["duration_months"],
            "dataEnd": calibration["data_last_full_month"],
        },
    }


# ---------------------------------------------------------------------------
# Summer peak, Central (Riyadh) operating area
# ---------------------------------------------------------------------------

def summer_case(case: Path) -> dict:
    read = CaseReader(case)
    curve = read.csv("outputs/reliability_curve.csv")
    calibration = read.csv("outputs/calibration_comparison.csv")
    loso = read.csv("outputs/dr_threshold_loso.csv")
    sensitivity = read.csv("outputs/sensitivity.csv", dtype={"value": str})
    basics = read.json("outputs/case_basics.json")
    width = read.json("outputs/battery_break_even_width.json")
    metadata = read.json("outputs/run_metadata.json")

    def portfolio(row) -> dict:
        marginal = row["marginal_usd_per_mwh_avoided"]
        return {
            "eueLimitPct": float(f"{row['eue_limit_share_pct']:.4g}"),
            "peakerMw": r(row["peaker_mw"], 1),
            "drMw": r(row["dr_mw"], 1),
            "batteryMw": r(row["battery_mw"], 1),
            "batteryHours": r(row["battery_duration_h"], 2),
            "cost": r(row["cost_musd_yr"], 1),
            "eueMwh": r(row["eue_mwh"], 1),
            "worstSummerMwh": r(row["worst_summer_unserved_mwh"], 0),
            "worstSummerHours": r(row["worst_summer_unserved_hours"], 0),
            "maxShortfallMw": r(row["max_shortfall_mw"], 0),
            "normalSummersMwh": r(row["normal_summers_unserved_mwh"], 1),
            "marginalUsdPerMwh": None if pd.isna(marginal) else int(marginal),
        }

    full = [portfolio(row) for _, row in curve[curve["portfolio"] == "full"].iterrows()]
    peakers = [portfolio(row) for _, row in curve[curve["portfolio"] == "peakers"].iterrows()]

    calib = {}
    for _, row in calibration.iterrows():
        key = f"{row['calibration']}|{row['portfolio']}|{row['eue_limit_share_pct']:g}"
        calib[key] = {
            "peakerMw": r(row["peaker_mw"], 1),
            "drMw": r(row["dr_mw"], 1),
            "batteryMw": r(row["battery_mw"], 1),
            "batteryHours": r(row["battery_duration_h"], 2),
            "cost": r(row["cost_musd_yr"], 1),
        }

    sens = {}
    for _, row in sensitivity.iterrows():
        key = row["parameter"] if row["parameter"] == "reference" else f"{row['parameter']}={row['value']}"
        sens[key] = {
            "peakerMw": r(row["peaker_mw"], 1),
            "drMw": r(row["dr_mw"], 1),
            "batteryMw": r(row["battery_mw"], 1),
            "batteryHours": r(row["battery_duration_h"], 2),
            "cost": r(row["cost_musd_yr"], 1),
        }

    return {
        "trace": {
            "case": "materials/projects/summer-peak",
            "files": read.files,
        },
        "assumptions": metadata["reference_config"],
        "referenceDrThresholdC": metadata["reference_dr_threshold_c"],
        "basics": {
            "area": basics["area"],
            "targetSummer": basics["target_summer"],
            "worstDayGapMw": r(basics["worst_day"]["gap_mw"], 0),
            "worstDayWidthH": r(basics["worst_day"]["width_h"], 1),
            "worstDayDate": basics["worst_day"]["date"],
            "eueLimitMwh": r(basics["eue_limit_mwh"], 1),
            "drCapMw": r(basics["dr_cap_mw"], 1),
            "peakerUsdKwYr": r(basics["unit_costs"]["peaker_usd_kw_yr"], 0),
            "drUsdKwYr": r(basics["unit_costs"]["dr_capacity_usd_kw_yr"], 0),
            "batteryBreakEvenH": r(width["ATB Moderate"], 1),
        },
        "curve": full,
        "peakersOnly": peakers,
        "calibration": calib,
        "outOfSample": {
            "costMin": r(loso["cost_all4_with_trained_threshold_musd"].min(), 1),
            "costMax": r(loso["cost_all4_with_trained_threshold_musd"].max(), 1),
            "thresholds": sorted({r(v, 1) for v in loso["threshold_trained_c"]}),
        },
        "sensitivity": sens,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--cases", type=Path, default=DEFAULT_CASES)
    args = parser.parse_args()
    targets = {ROOT / "src/data/export-routing.json": export_case(args.cases / "export-logistics")}

    # The summer-peak case is a held draft that is being rebuilt on open data.
    # Its data stay under src/drafts (never imported by a page), and the file is
    # only regenerated when the case's reliability outputs exist.
    summer = args.cases / "summer-peak"
    if (summer / "outputs/reliability_curve.csv").exists():
        targets[ROOT / "src/drafts/summer-peak/summer-peak.json"] = summer_case(summer)
    else:
        print("summer-peak outputs not present (rebuild in progress); draft data left unchanged")

    for path, payload in targets.items():
        with path.open("w", encoding="utf-8", newline="\n") as handle:
            handle.write(json.dumps(payload, indent=1, ensure_ascii=False) + "\n")
        print(f"wrote {path.relative_to(ROOT)} ({path.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
