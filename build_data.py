"""Build cleaned js/data.js from raw CSV files."""
import csv, json, urllib.parse, re
import os

os.chdir(os.path.dirname(os.path.abspath(__file__)))

def clean_name(name):
    if not name: return ''
    name = name.replace('‚', "'")  # U+201A single low-9 quote
    name = name.replace('‘', "'")  # U+2018 left single quote
    name = name.replace('’', "'")  # U+2019 right single quote
    name = name.replace('“', '"')  # U+201C left double quote
    name = name.replace('”', '"')  # U+201D right double quote
    name = name.replace('–', '-')  # en dash
    name = name.replace('—', '--') # em dash
    name = re.sub(r'\s+', ' ', name)
    return name.strip()

def clean_city(city, region):
    city = (city or '').strip()
    region = (region or '').strip()
    if not city:
        if region in ('Hong Kong', 'Macau', 'Singapore'):
            return region
        return region if region else 'Unknown'
    return city

def clean_cuisine(c):
    if not c: return 'Unknown'
    c = c.strip()
    MAP = {
        'creative': 'Creative', 'modern': 'Modern cuisine',
        'japanese': 'Japanese', 'french': 'French', 'italian': 'Italian',
    }
    return MAP.get(c, c)

def clean_price(p):
    if not p: return 'N/A'
    p = p.strip()
    return p if p in {'$','$$','$$$','$$$$','$$$$$','N/A'} else 'N/A'

def clean_url(url):
    if not url: return ''
    try: url = urllib.parse.unquote(url)
    except: pass
    return clean_name(url)  # also fix typographic quotes in URLs

def clean_region(r):
    if not r: return ''
    return r.strip().strip('"').strip()

def validate_coords(lat, lng):
    try:
        lat, lng = float(lat), float(lng)
        return -90 <= lat <= 90 and -180 <= lng <= 180
    except (ValueError, TypeError):
        return False

def read_and_clean(path, stars):
    restaurants = []
    with open(path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            name = clean_name(row.get('name', ''))
            city = clean_city(row.get('city', ''), row.get('region', ''))
            region = clean_region(row.get('region', ''))
            cuisine = clean_cuisine(row.get('cuisine', ''))
            price = clean_price(row.get('price', ''))
            url = clean_url(row.get('url', ''))
            year = int(row.get('year', 2019))
            lat = float(row.get('latitude', 0))
            lng = float(row.get('longitude', 0))

            if not validate_coords(lat, lng):
                print(f'  SKIPPED (bad coords): {name}')
                continue
            if not name:
                print(f'  SKIPPED (no name): row in {path}')
                continue

            restaurants.append({
                'n': name, 'y': year, 'la': lat, 'lo': lng,
                'c': city, 'r': region,
                'z': row.get('zipCode', '').strip(),
                'cu': cuisine, 'p': price, 'u': url, 's': stars
            })
    return restaurants

# ---- Main ----
files = [
    ('data/one-star-michelin-restaurants.csv', 1),
    ('data/two-stars-michelin-restaurants.csv', 2),
    ('data/three-stars-michelin-restaurants.csv', 3),
]

all_data = []
for path, stars in files:
    all_data.extend(read_and_clean(path, stars))

print(f'Total: {len(all_data)} restaurants')
print(f'  1-star: {sum(1 for r in all_data if r["s"]==1)}')
print(f'  2-star: {sum(1 for r in all_data if r["s"]==2)}')
print(f'  3-star: {sum(1 for r in all_data if r["s"]==3)}')

# Verify fixes
print()
print('=== Fixes applied ===')
for r in all_data:
    if r['c'] == 'Hong Kong' and r['n'] in ('Epure', 'Arbor'):
        print(f'  CITY: [{r["n"]}] empty -> "{r["c"]}"')
for r in all_data:
    if "'" in r['n'] and r['n'] in ("a'o'c", "Me'Mu"):
        print(f'  NAME: typographic quote -> [{r["n"]}]')
for r in all_data:
    decoded = urllib.parse.unquote(r['u'])
    if decoded != r['u']:
        pass  # Should already be decoded
urls_with_percent = sum(1 for r in all_data if '%' in r['u'])
print(f'  URL: {urls_with_percent} URLs still contain percent-encoding')

empty_cities = [r for r in all_data if not r['c']]
print(f'  Remaining empty cities: {len(empty_cities)}')

bad_prices = set(r['p'] for r in all_data if r['p'] not in {'$','$$','$$$','$$$$','$$$$$','N/A'})
print(f'  Invalid prices: {bad_prices if bad_prices else "none"}')

# Write data.js
json_str = json.dumps(all_data, ensure_ascii=False, separators=(',', ':'))

js = f'''/* Michelin Star Restaurants — Embedded Dataset ({len(all_data)} records, cleaned) */

var __RESTAURANTS__ = {json_str};

var CUISINE_GROUPS = {{
  'Japanese & Sushi': ['Japanese','Sushi','Teppanyaki','Japanese contemporary'],
  'Chinese': ['Chinese','Cantonese','Cantonese Roast Meats','Dim Sum','Shanghainese','Sichuan','Fujian','Hang Zhou','Taizhou','Noodles and congee','Hunanese and Sichuan','Sichuan-Huai Yang'],
  'French': ['French','Classic French','French contemporary','Creative French','Modern French'],
  'Italian': ['Italian','Italian contemporary'],
  'Modern & Creative': ['Contemporary','Creative','Modern cuisine','Innovative','Fusion','International'],
  'British & Irish': ['Modern British','Creative British','Traditional British','Gastropub'],
  'Korean': ['Korean','Korean contemporary','Temple cuisine'],
  'Thai & SE Asian': ['Thai','Thai Contemporary','Southern Thai','Peranakan','Street Food','Asian contemporary','Asian influences'],
  'Indian': ['Indian'],
  'American': ['American','Californian'],
  'Nordic': ['Scandinavian','Danish','Finnish'],
  'Seafood': ['Seafood'],
  'Mediterranean': ['Mediterranean','Mediterranean cuisine','European contemporary','Spanish','Greek','Moroccan','European'],
  'Other': ['Asian','Australian','Austrian','Barbecue','Meats and grills','Steakhouse','Market cuisine','Classic cuisine','Regional cuisine','Mexican','Taiwanese','Vegetarian','Swedish','German','Hungarian','Polish','Czech','Croatian']
}};

var NORMALIZE_MAP = {{
  'creative': 'Creative', 'modern': 'Modern cuisine',
  'japanese': 'Japanese', 'french': 'French', 'italian': 'Italian'
}};

function normalizeCuisine(c) {{
  return NORMALIZE_MAP[c] || c;
}}

function getCuisineGroup(cuisine) {{
  var c = normalizeCuisine(cuisine);
  var keys = Object.keys(CUISINE_GROUPS);
  for (var i = 0; i < keys.length; i++) {{
    var items = CUISINE_GROUPS[keys[i]];
    for (var j = 0; j < items.length; j++) {{
      if (items[j].toLowerCase() === c.toLowerCase()) return keys[i];
    }}
  }}
  return 'Other';
}}

var allRestaurants = __RESTAURANTS__.map(function(r) {{
  return {{
    name: r.n, year: r.y, lat: r.la, lng: r.lo,
    city: r.c, region: r.r, zipCode: r.z,
    cuisine: r.cu, price: r.p, url: r.u, stars: r.s,
    cuisineGroup: getCuisineGroup(r.cu)
  }};
}});
'''

with open('js/data.js', 'w', encoding='utf-8') as f:
    f.write(js)

print(f'\ndata.js written: {len(js):,} chars ({len(js)/1024:.1f} KB)')
