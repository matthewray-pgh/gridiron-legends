# Each entry: (era label, first season inclusive, last season inclusive)
ERAS = [
    # ("Legends (pre-2000)", 1970, 2000),
    ("2000-2005",          2001, 2005),
    ("2006-2010",          2006, 2010),
    ("2011-2015",          2011, 2015),
    ("2016-2020",          2016, 2020),
    ("2021-2025",          2021, 2025),
]

POSITION_MAP = {
    # offense
    "QB": "QB",
    "RB": "RB",
    "HB": "RB",
    "FB": "RB",
    "WR": "WR",
    "TE": "TE",

    # defense
    "DE": "EDGE",
    "EDGE": "EDGE",
    "OLB": "EDGE",

    "DT": "DL",
    "NT": "DL",
    "DL": "DL",

    "ILB": "LB",
    "MLB": "LB",
    "LB": "LB",

    "CB": "CB",
    "FS": "S",
    "SS": "S",
    "S": "S",

    # special teams
    "K": "K",
    "P": "P"
}