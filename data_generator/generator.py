import nfl_data_py as nfl
import pandas as pd
import json
from bisect import bisect_left, bisect_right
from collections import defaultdict

from config import ERAS, POSITION_MAP
from utils import get_era, safe_float

OUTPUT_FILE = "outputs/nfl_era_players.json"


# =========================================================
# OFFENSIVE SCORING
# =========================================================

def qb_score(row):
    return (
        safe_float(row.get("passing_yards")) * 0.05 +
        safe_float(row.get("passing_tds")) * 6 -
        safe_float(row.get("interceptions")) * 2 +
        safe_float(row.get("rushing_yards")) * 0.1 +
        safe_float(row.get("rushing_tds")) * 6
    )


def rb_score(row):
    return (
        safe_float(row.get("rushing_yards")) * 0.1 +
        safe_float(row.get("rushing_tds")) * 6 +
        safe_float(row.get("receptions")) * 0.5 +
        safe_float(row.get("receiving_yards")) * 0.05 +
        safe_float(row.get("receiving_tds")) * 6
    )


def wr_score(row):
    return (
        safe_float(row.get("receptions")) * 0.5 +
        safe_float(row.get("receiving_yards")) * 0.1 +
        safe_float(row.get("receiving_tds")) * 6
    )


# =========================================================
# DEFENSIVE SCORING
# =========================================================

def edge_score(row):
    return (
        safe_float(row.get("sacks")) * 8.0 +
        safe_float(row.get("tfl")) * 1.5 +
        safe_float(row.get("qb_hits")) * 1.0 +
        safe_float(row.get("forced_fumbles")) * 4.0
    )


def lb_score(row):
    return (
        safe_float(row.get("tackles")) * 0.8 +
        safe_float(row.get("sacks")) * 6.5 +
        safe_float(row.get("tfl")) * 2.0 +
        safe_float(row.get("interceptions")) * 10.0 +
        safe_float(row.get("forced_fumbles")) * 4.5
    )


def cb_score(row):
    return (
        safe_float(row.get("interceptions")) * 14.0 +
        safe_float(row.get("passes_defended")) * 3.0 +
        safe_float(row.get("forced_fumbles")) * 4.0 +
        safe_float(row.get("tackles")) * 0.4 +
        safe_float(row.get("touchdowns")) * 6.0
    )

def safety_score(row):
    return (
        safe_float(row.get("interceptions")) * 12.0 +
        safe_float(row.get("passes_defended")) * 2.0 +
        safe_float(row.get("tackles")) * 0.9 +
        safe_float(row.get("forced_fumbles")) * 4.0 +
        safe_float(row.get("touchdowns")) * 6.0
    )

def dl_score(row):
    return (
        safe_float(row.get("sacks")) * 7.5 +
        safe_float(row.get("tfl")) * 2.0 +
        safe_float(row.get("forced_fumbles")) * 4.0
    )


# =========================================================
# DISPATCHER
# =========================================================

def compute_score(position, row):
    if position == "QB":
        return qb_score(row)
    if position == "RB":
        return rb_score(row)
    if position in ["WR", "TE"]:
        return wr_score(row)

    if position == "EDGE":
        return edge_score(row)
    if position == "LB":
        return lb_score(row)
    if position == "DL":
        return dl_score(row)

    if position == "CB":
        return cb_score(row)
    if position == "S":
        return safety_score(row)

    return 0


# =========================================================
# LOAD DATA
# =========================================================

def load_data():
    frames = []
    url = "https://github.com/nflverse/nflverse-data/releases/download/player_stats/player_stats_{}.parquet"
    for year in range(1999, 2026):
        try:
            df = pd.read_parquet(url.format(year), engine="auto")
            frames.append(df)
            print(f"  ✓ {year} ({len(df)} rows)")
        except Exception as e:
            print(f"  ✗ {year} skipped: {e}")
    if not frames:
        raise RuntimeError("No data loaded — check network/URL availability.")
    return pd.concat(frames, ignore_index=True)


# =========================================================
# NORMALIZE
# =========================================================

def normalize(df):
    df = df.copy()

    df["position"] = df["position"].map(POSITION_MAP).fillna(df["position"])
    df["era"] = df["season"].apply(lambda x: get_era(x, ERAS))

    return df


# =========================================================
# BUILD RECORDS
# =========================================================

def build_records(df):
    records = {}

    for _, row in df.iterrows():

        player_id = str(row.get("player_id", row.get("player_name"))).lower().replace(" ", "_")
        team = row.get("recent_team", "UNK")
        era = row.get("era")
        position = row.get("position")
        season = row.get("season")

        if not era or not position:
            continue

        key = f"{player_id}_{team}_{era}"

        score = compute_score(position, row)

        record = {
            "id": key,
            "playerId": player_id,
            "name": row.get("player_name"),
            "team": team,
            "era": era,
            "position": position,
            "bestSeason": int(season),
            "_rawScore": score,

            "stats": {
                # OFFENSE
                "passingYards": safe_float(row.get("passing_yards")),
                "passingTD": safe_float(row.get("passing_tds")),
                "interceptions": safe_float(row.get("interceptions")),
                "rushingYards": safe_float(row.get("rushing_yards")),
                "rushingTD": safe_float(row.get("rushing_tds")),
                "receptions": safe_float(row.get("receptions")),
                "receivingYards": safe_float(row.get("receiving_yards")),
                "receivingTD": safe_float(row.get("receiving_tds")),

                # DEFENSE
                "sacks": safe_float(row.get("sacks")),
                "tfl": safe_float(row.get("tfl")),
                "qbHits": safe_float(row.get("qb_hits")),
                "forcedFumbles": safe_float(row.get("forced_fumbles")),
                "passesDefended": safe_float(row.get("passes_defended")),
                "defTD": safe_float(row.get("touchdowns")),
            },

            "ratings": {
                "overall": 0
            },

            "awards": []
        }

        # KEEP BEST SEASON PER PLAYER/TEAM/ERA
        if key not in records or score > records[key]["_rawScore"]:
            records[key] = record

    unique_records = list(records.values())
    return apply_percentile_overalls(unique_records)


def apply_percentile_overalls(records):
    scores_by_position = defaultdict(list)

    for record in records:
        scores_by_position[record["position"]].append(record["_rawScore"])

    sorted_scores_by_position = {
        position: sorted(scores)
        for position, scores in scores_by_position.items()
    }

    for record in records:
        position = record["position"]
        raw_score = record["_rawScore"]
        sorted_scores = sorted_scores_by_position[position]
        total = len(sorted_scores)

        if total <= 1:
            percentile = 1.0
        else:
            left = bisect_left(sorted_scores, raw_score)
            right = bisect_right(sorted_scores, raw_score)
            mid_rank = (left + right - 1) / 2
            percentile = mid_rank / (total - 1)

        overall = 40 + (percentile * 59)
        record["ratings"]["overall"] = round(min(99, max(40, overall)), 1)
        del record["_rawScore"]

    return records


# =========================================================
# EXPORT
# =========================================================

def export_json(data):
    with open(OUTPUT_FILE, "w") as f:
        json.dump({"records": data}, f, indent=2)


# =========================================================
# MAIN
# =========================================================

def main():
    print("Loading NFL data...")
    df = load_data()

    print("Normalizing...")
    df = normalize(df)

    print("Building records...")
    records = build_records(df)

    print(f"Exporting {len(records)} records...")
    export_json(records)

    print("Done → outputs/nfl_era_players.json")


if __name__ == "__main__":
    main()