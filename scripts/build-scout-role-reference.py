"""Build from dcaribou/transfermarkt-datasets' CC0 players.csv.gz release.

Usage: python scripts/build-scout-role-reference.py players.csv.gz src/data/scout-role-reference.json
Source: https://github.com/dcaribou/transfermarkt-datasets
"""
import csv
import gzip
import json
import re
import sys
import unicodedata
from pathlib import Path

ROLES = {
    "Centre-Back": "centreBack",
    "Left-Back": "leftBack",
    "Right-Back": "rightBack",
    "Defensive Midfield": "defensiveMidfield",
    "Central Midfield": "centralMidfield",
    "Attacking Midfield": "attackingMidfield",
    "Left Winger": "leftWinger",
    "Right Winger": "rightWinger",
    "Centre-Forward": "centreForward",
}

def normalize_name(value):
    value = unicodedata.normalize("NFKD", value).lower()
    value = "".join(c for c in value if not unicodedata.category(c).startswith("M"))
    return " ".join("".join(c if c.isalnum() else " " for c in value).split())

def main():
    source = Path(sys.argv[1])
    output = Path(sys.argv[2])
    roles = {}
    with gzip.open(source, "rt", encoding="utf-8", newline="") as rows:
        for row in csv.DictReader(rows):
            if not row["last_season"].isdigit() or int(row["last_season"]) < 2025:
                continue
            role = ROLES.get(row["sub_position"])
            birth = row["date_of_birth"][:10]
            if not role or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", birth):
                continue
            for name in {row["name"], f'{row["first_name"]} {row["last_name"]}'}:
                normalized = normalize_name(name)
                if not normalized:
                    continue
                key = f"{normalized}|{birth}"
                if key in roles and roles[key] != role:
                    roles[key] = None
                elif key not in roles:
                    roles[key] = role
    index = {key: role for key, role in sorted(roles.items()) if role}
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open("w", encoding="utf-8", newline="\n") as file:
        file.write("{\n")
        file.write(",\n".join(f"{json.dumps(k, ensure_ascii=False)}:{json.dumps(v)}" for k, v in index.items()))
        file.write("\n}\n")
    print(f"{len(index)} unambiguous name-and-birth-date matches")

if __name__ == "__main__":
    main()
