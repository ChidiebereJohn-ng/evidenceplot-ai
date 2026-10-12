"""
EvidencePlot AI — Vetted Deterministic Python Scientific Engine (Pyodide)
Executed strictly inside a browser Web Worker. Never executes arbitrary user or AI code.
"""

import json
import math
import numpy as np
import pandas as pd
from scipy import stats


def get_runtime_versions():
    return {
        "engine": "Python/Pyodide (scipy.stats)",
        "numpy": np.__version__,
        "pandas": pd.__version__,
        "scipy": stats.__name__ and __import__("scipy").__version__,
    }


def compute_group_descriptives(values):
    n_valid = len(values)
    if n_valid == 0:
        return {
            "mean": None,
            "sd": None,
            "median": None,
            "iqr": None,
            "min": None,
            "max": None,
        }
    arr = np.asarray(values, dtype=np.float64)
    mean_val = float(np.mean(arr))
    sd_val = float(np.std(arr, ddof=1)) if n_valid >= 2 else None
    median_val = float(np.median(arr))
    q75, q25 = np.percentile(arr, [75, 25], method="linear")
    iqr_val = float(q75 - q25)
    return {
        "mean": mean_val,
        "sd": sd_val,
        "median": median_val,
        "iqr": iqr_val,
        "min": float(np.min(arr)),
        "max": float(np.max(arr)),
    }


def run_welch_two_group(group_a_vals, group_b_vals):
    """
    Computes Welch's independent two-sample t-test with Group B minus Group A sign convention.
    Matches SciPy 1.17.0 reference_outputs.json to machine precision.
    """
    a = np.asarray(group_a_vals, dtype=np.float64)
    b = np.asarray(group_b_vals, dtype=np.float64)
    n_a = int(a.size)
    n_b = int(b.size)
    mean_a = float(np.mean(a))
    mean_b = float(np.mean(b))
    var_a = float(np.var(a, ddof=1))
    var_b = float(np.var(b, ddof=1))

    diff_b_minus_a = float(mean_b - mean_a)
    se = math.sqrt(var_a / n_a + var_b / n_b)

    # ttest_ind(b, a, equal_var=False) gives t in B minus A direction
    res = stats.ttest_ind(b, a, equal_var=False)
    t_stat = float(res.statistic)
    p_val = float(res.pvalue)

    num = (var_a / n_a + var_b / n_b) ** 2
    den = ((var_a / n_a) ** 2) / (n_a - 1) + ((var_b / n_b) ** 2) / (n_b - 1)
    df = float(num / den)

    t_crit = float(stats.t.ppf(0.975, df))
    ci_low = float(diff_b_minus_a - t_crit * se)
    ci_high = float(diff_b_minus_a + t_crit * se)

    return {
        "n_a": n_a,
        "n_b": n_b,
        "mean_a": mean_a,
        "mean_b": mean_b,
        "sd_a": math.sqrt(var_a),
        "sd_b": math.sqrt(var_b),
        "difference_b_minus_a": diff_b_minus_a,
        "se_difference": se,
        "t_b_minus_a": t_stat,
        "df": df,
        "p_two_sided": p_val,
        "ci95_low": ci_low,
        "ci95_high": ci_high,
    }


def run_pearson_correlation(x_vals, y_vals):
    x = np.asarray(x_vals, dtype=np.float64)
    y = np.asarray(y_vals, dtype=np.float64)
    res = stats.pearsonr(x, y)
    return {
        "n": int(x.size),
        "r": float(res.statistic),
        "p_two_sided": float(res.pvalue),
    }
