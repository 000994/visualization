import sys, re
sys.stdout.reconfigure(encoding="utf-8")

with open("js/data.js", "r", encoding="utf-8") as f:
    data = f.read()

# Fix empty cities - replace all instances of both Épure and Arbor
# The pattern is: "c":"","r":"Hong Kong"
data = data.replace('"c":"","r":"Hong Kong"', '"c":"Hong Kong","r":"Hong Kong"')

with open("js/data.js", "w", encoding="utf-8") as f:
    f.write(data)

# Verify
m = re.search(r"var __RESTAURANTS__ = (\[.*?\]);", data, re.DOTALL)
import json
restaurants = json.loads(m.group(1))
empty = [r for r in restaurants if not r["c"]]
print(f"Empty cities: {len(empty)}")
for r in empty:
    print(f"  {repr(r['n'])} - Region: {r['r']}")
print("Done!")
