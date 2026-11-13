from pathlib import Path
import re
import shutil

path = Path("app/services/place_service.py")
source = path.read_text()

start = source.index("def geocode_india(destination):")
end = source.index("\ndef _geoapify_places(", start)

backup = path.with_suffix(".py.before_geocoding_fix")
shutil.copy2(path, backup)

replacement = '''
def geocode_india(destination):
    """Resolve Indian destinations, preferring the correct locality and state."""
    _require_key()
    destination = _clean(destination)
    if not destination:
        return None

    normalized = destination.casefold().strip()

    # Correct common spelling variations for Tirumala.
    if normalized in ("tirumala", "thirumala", "thirumalai"):
        queries = ["Tirumala, Tirupati, Andhra Pradesh, India"]
        expected_locality = "tirumala"
    else:
        queries = [f"{destination}, India"]
        expected_locality = normalized

    # Versioned cache prevents old incorrect coordinates being reused.
    cache_key = "geo:v2:" + normalized
    cached = _cache_get(cache_key)
    if cached:
        return cached

    candidates = []

    for query in queries:
        response = SESSION.get(
            f"{BASE}/v1/geocode/search",
            params={
                "text": query,
                "filter": "countrycode:in",
                "bias": "countrycode:in",
                "format": "json",
                "limit": 10,
                "apiKey": API_KEY,
            },
            timeout=(4, 12),
        )
        response.raise_for_status()

        results = response.json().get("results", [])
        for item in results:
            if str(item.get("country_code", "")).lower() != "in":
                continue

            state = (item.get("state") or "").casefold()
            formatted = (item.get("formatted") or "").casefold()
            name = (item.get("name") or "").casefold()
            county = (item.get("county") or "").casefold()
            city = (item.get("city") or "").casefold()

            score = float(item.get("rank", {}).get("confidence", 0) or 0)

            if normalized in ("tirumala", "thirumala", "thirumalai"):
                if "andhra pradesh" not in state:
                    continue
                score += 100
                if "tirumala" in name:
                    score += 100
                if "tirumala" in formatted:
                    score += 50
                if "tirupati" in county or "tirupati" in city:
                    score += 20

            candidates.append((score, item))

    if not candidates:
        return None

    candidates.sort(key=lambda pair: pair[0], reverse=True)
    item = candidates[0][1]

    location = {
        "name": item.get("name") or destination,
        "formatted": item.get("formatted") or destination,
        "latitude": float(item["lat"]),
        "longitude": float(item["lon"]),
        "country": "India",
        "country_code": "in",
        "state": item.get("state") or "",
        "city": item.get("city") or item.get("county") or item.get("name") or destination,
    }

    _cache_set(cache_key, location)
    print("GEOCODE SELECTED:", location)
    return location

'''

path.write_text(source[:start] + replacement + source[end:])
print("Geocoding function updated.")
print("Backup saved to:", backup)
