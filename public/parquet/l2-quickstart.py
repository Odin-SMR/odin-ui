"""A bounded, reproducible Odin-SMR L2 example. Run in a new working directory.

Install: python -m pip install duckdb==1.4.4
Run:     python l2-quickstart.py

This is an unscreened historical example, not a validated climatology. The
stored quality flag is null for all rows in this file. No quality criterion
is invented or applied. See the release dictionary and product validation.
"""

import hashlib
import json
from pathlib import Path
import platform
from urllib.parse import urlparse
from urllib.request import HTTPRedirectHandler, build_opener

import duckdb

RELEASE = "odin-parquet-examples-20261113"
PROJECT = "ALL-Strat-v3.0.0"
PRODUCT = "O3-501GHz-20to50km"
FREQUENCY_MODE = 1
INVERSION_MODE = "stnd"
SHA256 = "cffb359348a56bedc32e9164f74a9dfc65b9dbfe8858eb5b9477fd55a051d149"
SIZE_BYTES = 2145428
ROWS = 6188
URL = f"https://odin-smr.org/parquet/releases/{RELEASE}/files/{SHA256}.parquet"
SCHEMA_URL = f"https://odin-smr.org/parquet/releases/{RELEASE}/schema.md"
LOCAL_FILE = Path(f"{SHA256}.parquet")

# These SQL blocks are also displayed, unchanged, in the website quickstart.
SUMMARY_SQL = """
SELECT CAST(time AS DATE) AS utc_day,
       quality,
       count(*) AS vertical_rows,
       count(DISTINCT scan_id) AS scans,
       count(*) FILTER (WHERE quality IS NULL) AS unknown_quality_rows,
       count(*) FILTER (
         WHERE lat_1d IS NULL OR NOT isfinite(lat_1d)
            OR lat_1d NOT BETWEEN -90 AND 90
       ) AS missing_or_invalid_latitude_rows
FROM l2
GROUP BY utc_day, quality
ORDER BY utc_day, quality;
"""

REGION_SQL = """
-- Change the last filter to 'north_polar' or 'south_polar'.
WITH located AS (
  SELECT *, CASE
    WHEN lat_1d IS NULL OR NOT isfinite(lat_1d)
      OR lat_1d NOT BETWEEN -90 AND 90 THEN 'unknown'
    WHEN abs(lat_1d) <= 23.5 THEN 'tropics'
    WHEN lat_1d >= 60 THEN 'north_polar'
    WHEN lat_1d <= -60 THEN 'south_polar'
    ELSE 'midlatitudes'
  END AS region
  FROM l2
)
SELECT DISTINCT scan_id, time, lat_1d, lon_1d, quality
FROM located
WHERE region = 'tropics'
ORDER BY time, scan_id;
"""

AVERAGE_SQL = """
-- Demonstration only: finite values, no scientific quality screening.
-- First average within each scan and 5 km altitude bin.
WITH per_scan AS (
  SELECT scan_id, CAST(time AS DATE) AS utc_day, quality,
         floor(altitude / 5000) * 5 AS altitude_bin_start_km,
         avg(vmr * 1e6) AS scan_mean_ppmv
  FROM l2
  WHERE isfinite(vmr) AND isfinite(altitude)
    AND altitude >= 20000 AND altitude < 50000
    AND isfinite(lat_1d) AND abs(lat_1d) <= 23.5
  GROUP BY scan_id, utc_day, quality, altitude_bin_start_km
)
SELECT utc_day, quality, altitude_bin_start_km,
       avg(scan_mean_ppmv) AS mean_ppmv,
       count(*) AS contributing_scans
FROM per_scan
GROUP BY utc_day, quality, altitude_bin_start_km
ORDER BY utc_day, quality, altitude_bin_start_km;
"""


class HttpsRedirectsOnly(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        if urlparse(newurl).scheme != "https":
            raise ValueError("Refusing a redirect away from HTTPS")
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def verified_file():
    """Fetch exactly one 2.05 MiB file; verify even an existing local copy."""
    if LOCAL_FILE.exists():
        if LOCAL_FILE.stat().st_size != SIZE_BYTES:
            raise ValueError("Local file size differs; inspect it before retrying")
        payload = LOCAL_FILE.read_bytes()
    else:
        with build_opener(HttpsRedirectsOnly()).open(URL, timeout=30) as response:
            if response.status != 200:
                raise ValueError(f"Expected a complete file, got HTTP {response.status}")
            payload = response.read(SIZE_BYTES + 1)
    if len(payload) != SIZE_BYTES or hashlib.sha256(payload).hexdigest() != SHA256:
        raise ValueError("File size or SHA256 mismatch; analysis stopped")
    if not LOCAL_FILE.exists():
        with LOCAL_FILE.open("xb") as output:
            output.write(payload)
    return LOCAL_FILE


def main():
    path = verified_file()
    con = duckdb.connect()
    con.execute("SET TimeZone = 'UTC'")
    con.read_parquet(str(path), hive_partitioning=False).create_view("l2")
    if con.sql("SELECT count(*) FROM l2").fetchone()[0] != ROWS:
        raise ValueError("Unexpected row count")

    results = {}
    for name, sql in [("daily_counts", SUMMARY_SQL), ("tropical_scans", REGION_SQL),
                      ("illustrative_tropical_mean", AVERAGE_SQL)]:
        print(f"\n{name} (unscreened example)")
        relation = con.sql(sql)
        relation.show(max_rows=12)
        # Serialize dates/timestamps in DuckDB, avoiding extra Python timezone
        # packages. These fixed SQL strings are not external query input.
        query = sql.strip().removesuffix(";")
        json_rows = con.sql(f"SELECT to_json(result) FROM ({query}) result").fetchall()
        results[name] = {"columns": relation.columns,
                         "rows": [json.loads(row[0]) for row in json_rows]}

    receipt = {
        "release": RELEASE, "project": PROJECT, "product": PRODUCT,
        "frequency_mode": FREQUENCY_MODE, "inversion_mode": INVERSION_MODE,
        "url": URL, "schema_url": SCHEMA_URL, "sha256": SHA256,
        "size_bytes": SIZE_BYTES, "stored_rows": ROWS,
        "python": platform.python_version(), "duckdb": duckdb.__version__,
        "time_zone": "UTC", "quality_screening": "None; stored flags retained",
        "region_note": "Illustrative scan-reference latitude bands, not a vortex mask",
        "mean_note": "Unweighted per-scan means within 5 km bins; not a climatology",
        "queries": {"daily_counts": SUMMARY_SQL, "tropical_scans": REGION_SQL,
                    "illustrative_tropical_mean": AVERAGE_SQL},
        "results": results,
    }
    # UTC date grouping is illustrative: DuckDB 1.4.4 reads timezone-aware
    # nanosecond Parquet timestamps at microsecond precision. Keep source bytes.
    receipt["time_precision_note"] = "DuckDB 1.4.4 reads timestamp[ns, UTC] at microsecond precision"
    Path("l2-quickstart-provenance.json").write_text(
        json.dumps(receipt, indent=2, default=str, allow_nan=False) + "\n", encoding="utf-8"
    )
    con.close()
    print("\nSaved exact inputs, queries and results in l2-quickstart-provenance.json")


if __name__ == "__main__":
    main()
