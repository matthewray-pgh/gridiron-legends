def get_era(season, eras):
    for era_name, start, end in eras:
        if start <= season <= end:
            return era_name
    return None


def safe_float(x):
    try:
        if x is None:
            return 0
        return float(x)
    except:
        return 0