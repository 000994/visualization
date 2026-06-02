import json, re, sys
from collections import defaultdict

# 设置stdout编码
sys.stdout.reconfigure(encoding="utf-8")

with open("js/data.js", "r", encoding="utf-8") as f:
    data = f.read()

m = re.search(r"var __RESTAURANTS__ = (\[.*?\]);", data, re.DOTALL)
if not m:
    print("Cannot parse data")
    exit()

restaurants = json.loads(m.group(1))

# 1. 空城市
print("=== 空城市 ===")
for r in restaurants:
    if not r["c"]:
        print(f"  {repr(r['n'])} - Region: {r['r']}")

# 2. 相同名称+年份的重复项
print("\n=== 名称+年份重复（不同城市/位置）===")
by_key = defaultdict(list)
for r in restaurants:
    by_key[(r["n"], r["y"])].append(r)
for key, vals in sorted(by_key.items()):
    if len(vals) > 1:
        print(f"  {repr(key[0])} ({key[1]}):")
        for r2 in vals:
            print(f"    - City={r2['c']} Region={r2['r']} Lat={r2['la']} Lng={r2['lo']} Cuisine={r2['cu']} Stars={r2['s']} Price={r2['p']}")

# 3. 检查城市或名称中的编码问题
print("\n=== 检查编码问题 ===")
for r in restaurants:
    if "脡" in r["n"] or "é" in r["n"]:
        print(f"  名称: {repr(r['n'])} -> City: {r['c']}")
    if "脡" in r["c"] or "é" in r["c"] or "ö" in r["c"] or "ø" in r["c"] or "å" in r["c"]:
        print(f"  城市: {r['n']} -> {repr(r['c'])}")
    if "鈥" in r["n"] or "潞" in r["n"] or "铆" in r["n"]:
        print(f"  乱码名: {repr(r['n'])}")

print(f"\n总餐厅数: {len(restaurants)}")
