"""@bruin
name: pier.route_memory
type: python
@bruin"""
import json
from collections import Counter
from pathlib import Path

root = Path(__file__).resolve().parents[2]
source = root / "rounds.ndjson"
counts = Counter()
choices = Counter()
last = None
if source.exists():
    for line in source.read_text().splitlines():
        record = json.loads(line)
        if record["route"] in ("market", "quay"):
            counts[record["route"]] += 1
            last = record
            if set(record.get("open", [])) == {"market", "quay"}:
                choices[record["route"]] += 1
tmp = root / "route-memory.tmp"
tmp.write_text(json.dumps({"totals": dict(counts), "choices": dict(choices), "last": last}))
tmp.replace(root / "route-memory.json")
