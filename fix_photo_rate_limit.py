from pathlib import Path
import shutil

path = Path("app/services/place_service.py")
source = path.read_text()

shutil.copy2(path, "app/services/place_service.py.before_rate_limit_fix")

# Only one contextual Commons search per attraction.
old_queries = '''    queries = [
        f'"{clean_name}" "{destination}" India',
        f'"{clean_name}" India',
        f'{clean_name} {destination} Andhra Pradesh India',
    ]'''

new_queries = '''    queries = [
        f'"{clean_name}" "{destination}" India',
    ]'''

if old_queries not in source:
    raise SystemExit("Could not find Commons query block. No changes made.")

source = source.replace(old_queries, new_queries, 1)

# Limit photo requests to one worker.
old_pool = 'with ThreadPoolExecutor(max_workers=5) as pool:'
new_pool = 'with ThreadPoolExecutor(max_workers=1) as pool:'

if old_pool not in source:
    raise SystemExit("Could not find photo worker setting.")

source = source.replace(old_pool, new_pool, 1)

# Limit initial photo enrichment to the first 18 visible attractions.
old_targets = 'targets = places[:40]'
new_targets = 'targets = places[:18]'

if old_targets not in source:
    raise SystemExit("Could not find photo target limit.")

source = source.replace(old_targets, new_targets, 1)

# Pause between Commons requests.
old_loop = '    for query in queries:\n        try:\n            response = SESSION.get('
new_loop = '    for query in queries:\n        try:\n            time.sleep(1.5)\n            response = SESSION.get('

if old_loop not in source:
    raise SystemExit("Could not find Commons request loop.")

source = source.replace(old_loop, new_loop, 1)

path.write_text(source)
print("SUCCESS: Wikimedia request rate reduced.")
