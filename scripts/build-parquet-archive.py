"""Build a static, sharded file index from complete S3 metadata inventories.

No scientific bytes are read or published by this command. Input JSON objects
contain bucket, region, project, listing_complete, and files (key, size_bytes,
last_modified, etag), as recorded by the release inventory procedure.
"""

import argparse
from collections import defaultdict
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import re
from urllib.parse import quote


PROJECTS = ("ALL-Strat-v3.0.0", "ALL-Meso-v3.0.0", "meso21")
KEY = re.compile(
    r"project=([^/]+)/freq_mode=(\d+)/inv_mode=([^/]+)/product=([^/]+)/"
    r"year=(\d{4})/month=(\d{2})/([^/]+\.parquet)"
)


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, separators=(",", ":"), ensure_ascii=False) + "\n")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("inventory_dir", type=Path)
    parser.add_argument("--output", type=Path, default=Path("public/parquet/archive"))
    parser.add_argument("--snapshot", required=True)
    args = parser.parse_args()
    if not re.fullmatch(r"[A-Za-z0-9._-]+", args.snapshot):
        raise ValueError("Invalid snapshot identifier")
    groups = defaultdict(list)
    keys = set()
    input_hashes = {}
    for project in PROJECTS:
        path = args.inventory_dir / f"inventory-{project}.json"
        raw = path.read_bytes()
        inventory = json.loads(raw)
        if (inventory["bucket"], inventory["region"], inventory["project"],
                inventory["listing_complete"]) != ("odin-level2", "eu-north-1", project, True):
            raise ValueError(f"Incomplete or unexpected inventory: {path}")
        input_hashes[path.name] = hashlib.sha256(raw).hexdigest()
        for source in inventory["files"]:
            match = KEY.fullmatch(source["key"])
            if not match or match[1] != project or source["key"] in keys:
                raise ValueError(f"Unexpected or duplicate key: {source['key']}")
            keys.add(source["key"])
            year, month = int(match[5]), int(match[6])
            datetime(year, month, 1)
            if not isinstance(source["size_bytes"], int) or source["size_bytes"] <= 0:
                raise ValueError("Non-positive Parquet object size")
            datetime.fromisoformat(source["last_modified"])
            groups[(project, int(match[2]), match[3], match[4])].append({
                "url": "https://odin-smr.org/l2/" + quote(source["key"], safe="/=.-_"),
                "size_bytes": source["size_bytes"], "year": year, "month": month,
                "etag": source["etag"], "last_modified": source["last_modified"],
            })
    index = {
        "schema_version": 1, "snapshot_id": args.snapshot,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "description": "Existing Level 2 Parquet files, indexed by project, product and partition month. File listings do not establish scientific completeness or quality. ETags identify stored objects and are not scientific checksums.",
        "source_scope": "Complete object listings for the three projects used by the current Level 2 API: ALL-Strat-v3.0.0, ALL-Meso-v3.0.0 and meso21. Legacy/test projects, backups and the unfinished PostgreSQL migration are excluded.",
        "groups": [],
    }
    shard_hashes = {}
    for (project, freq, mode, product), files in sorted(groups.items()):
        group_id = "g-" + hashlib.sha256(f"{project}|{freq}|{mode}|{product}".encode()).hexdigest()[:16]
        files.sort(key=lambda item: (item["year"], item["month"], item["url"]))
        shard = {"schema_version": 1, "snapshot_id": args.snapshot,
                 "group_id": group_id, "files": files}
        target = args.output / args.snapshot / f"{group_id}.json"
        write_json(target, shard)
        shard_hashes[target.name] = hashlib.sha256(target.read_bytes()).hexdigest()
        index["groups"].append({
            "id": group_id, "project": project, "product": product, "level": "L2",
            "frequency_mode": freq, "inversion_mode": mode, "file_count": len(files),
            "size_bytes": sum(item["size_bytes"] for item in files),
            "index_url": f"/parquet/archive/{args.snapshot}/{group_id}.json",
        })
    write_json(args.output / "index.json", index)
    receipt = {"snapshot_id": args.snapshot, "generated_at": index["generated_at"],
               "file_count": len(keys), "group_count": len(groups),
               "size_bytes": sum(group["size_bytes"] for group in index["groups"]),
               "input_sha256": input_hashes, "shard_sha256": shard_hashes,
               "index_sha256": hashlib.sha256((args.output / "index.json").read_bytes()).hexdigest()}
    write_json(args.output / args.snapshot / "receipt.json", receipt)
    print(json.dumps({key: receipt[key] for key in ("snapshot_id", "file_count", "group_count", "size_bytes")}))


if __name__ == "__main__":
    main()
