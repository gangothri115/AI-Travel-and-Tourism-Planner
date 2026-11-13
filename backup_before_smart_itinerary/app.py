from flask import Flask, render_template, request, jsonify
import requests

from app.routes.chat import chat_bp
from app.routes.favorite_routes import favorite_bp

from app.routes.place_routes import place_bp


app = Flask(__name__)


# -----------------------------------------
# REGISTER CHAT ROUTES
# -----------------------------------------

app.register_blueprint(chat_bp)
app.register_blueprint(
    favorite_bp
)
app.register_blueprint(place_bp)

@app.route("/itinerary")
def itinerary():
    return render_template("itinerary.html")


# -----------------------------------------
# HOME PAGE
# -----------------------------------------

@app.route("/profile")
def profile():
    return render_template("profile.html")


@app.route("/")
def home():

    return render_template("home.html")



# -----------------------------------------
# WEATHER API (Open-Meteo; no API key)
# -----------------------------------------

_GEOCODE_CACHE = {}

def geocode_india(place):
    """Resolve a place in India, preferring Open-Meteo and falling back to Nominatim."""
    key = str(place or "").strip().casefold()
    if not key:
        return None
    if key in _GEOCODE_CACHE:
        return _GEOCODE_CACHE[key]

    # Open-Meteo geocoder
    try:
        response = requests.get(
            "https://geocoding-api.open-meteo.com/v1/search",
            params={"name": place, "count": 10, "language": "en", "format": "json"},
            timeout=(2, 5),
            headers={"User-Agent": "AITravelTourismStudentProject/1.0"}
        )
        response.raise_for_status()
        results = response.json().get("results", [])
        india = [item for item in results if item.get("country_code") == "IN"]
        if india:
            result = india[0]
            _GEOCODE_CACHE[key] = result
            return result
    except requests.RequestException as error:
        print("OPEN-METEO GEOCODING ERROR:", error)

    # Nominatim fallback, explicitly restricted to India.
    try:
        response = requests.get(
            "https://nominatim.openstreetmap.org/search",
            params={"q": f"{place}, India", "format": "jsonv2", "limit": 5, "countrycodes": "in"},
            timeout=(2, 5),
            headers={"User-Agent": "AITravelTourismStudentProject/1.0 (educational project)"}
        )
        response.raise_for_status()
        results = response.json()
        if results:
            item = results[0]
            result = {
                "name": item.get("name") or place,
                "admin1": item.get("display_name", "").split(",")[-3].strip() if item.get("display_name") else "",
                "country": "India",
                "country_code": "IN",
                "latitude": float(item["lat"]),
                "longitude": float(item["lon"]),
            }
            _GEOCODE_CACHE[key] = result
            return result
    except (requests.RequestException, ValueError, KeyError) as error:
        print("NOMINATIM GEOCODING ERROR:", error)
    return None


@app.get("/api/weather")
def api_weather():
    destination = (request.args.get("destination") or "").strip()
    if not destination:
        return jsonify({"error": "Destination is required."}), 400
    try:
        place = geocode_india(destination)
        if not place:
            return jsonify({"error": "Could not find this destination. Try a nearby city name."}), 404
        response = requests.get(
            "https://api.open-meteo.com/v1/forecast",
            params={
                "latitude": place["latitude"], "longitude": place["longitude"],
                "current": "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m",
                "daily": "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
                "forecast_days": 7, "timezone": "auto"
            }, timeout=15
        )
        response.raise_for_status()
        data = response.json()
        data["location"] = {"name": place.get("name"), "admin1": place.get("admin1"), "country": place.get("country")}
        return jsonify(data)
    except requests.RequestException:
        return jsonify({"error": "Weather service is temporarily unavailable. Please try again."}), 502


# -----------------------------------------
# ROUTE API (OSRM public demo server)
# -----------------------------------------

@app.get("/api/routes")
def api_routes():
    """Build a road route with turn-by-turn instructions and optional attraction stops."""
    origin = (request.args.get("from") or "").strip()
    destination = (request.args.get("to") or "").strip()
    stops_raw = (request.args.get("stops") or "").strip()
    if not origin or not destination:
        return jsonify({"error": "Starting location and destination are required."}), 400

    stop_names = [part.strip() for part in stops_raw.split("|") if part.strip()]
    # Keep requests bounded; OSRM demo service is not intended for bulk routing.
    stop_names = stop_names[:8]
    names = [origin] + stop_names + [destination]

    try:
        locations = []
        for name in names:
            point = geocode_india(name)
            if not point:
                return jsonify({
                    "error": f"Could not locate '{name}'. Try a nearby city, town, or landmark name."
                }), 404
            locations.append(point)

        coords = ";".join(
            f"{point['longitude']},{point['latitude']}" for point in locations
        )
        response = requests.get(
            f"https://router.project-osrm.org/route/v1/driving/{coords}",
            params={
                "overview": "full",
                "geometries": "geojson",
                "steps": "true",
                "alternatives": "2" if len(locations) == 2 else "false",
                "continue_straight": "false",
            },
            timeout=(3, 12),
            headers={"User-Agent": "AITravelTourismStudentProject/1.0"}
        )
        response.raise_for_status()
        payload = response.json()
        if payload.get("code") != "Ok" or not payload.get("routes"):
            return jsonify({"error": "No mapped driving route was found for this journey."}), 404

        output_routes = []
        for route in payload["routes"][:3]:
            legs = []
            for index, leg in enumerate(route.get("legs", [])):
                steps = []
                for step in leg.get("steps", []):
                    maneuver = step.get("maneuver") or {}
                    instruction = maneuver.get("type", "Continue").replace("_", " ").title()
                    modifier = maneuver.get("modifier")
                    if modifier:
                        instruction += " " + modifier
                    road = (step.get("name") or "").strip()
                    if road:
                        instruction += f" onto {road}"
                    steps.append({
                        "instruction": instruction,
                        "distance_text": f"{step.get('distance', 0)/1000:.2f} km",
                        "duration_text": f"{step.get('duration', 0)/60:.0f} min",
                    })
                legs.append({
                    "from": names[index],
                    "to": names[index + 1],
                    "distance_km": round(leg.get("distance", 0)/1000, 1),
                    "duration_min": round(leg.get("duration", 0)/60),
                    "steps": steps,
                })
            output_routes.append({
                "distance_km": round(route["distance"]/1000, 1),
                "duration_min": round(route["duration"]/60),
                "distance_text": f"{route['distance']/1000:.1f} km",
                "duration_text": f"{route['duration']/3600:.1f} hours",
                "legs": legs,
            })

        return jsonify({
            "from": names[0], "to": names[-1], "stops": stop_names,
            "routes": output_routes,
            "notice": ""
        })
    except requests.RequestException as error:
        print("ROUTE SERVICE ERROR:", error)
        return jsonify({"error": "The public routing service is temporarily unavailable. Please retry shortly."}), 502




# -----------------------------------------
# NEARBY HOTELS & RESTAURANTS (OpenStreetMap)
# -----------------------------------------
_NEARBY_CACHE = {}

@app.get("/api/nearby")
def api_nearby():
    destination = (request.args.get("destination") or "").strip()
    if not destination:
        return jsonify({"error": "Destination is required."}), 400
    cache_key = destination.casefold()
    cached = _NEARBY_CACHE.get(cache_key)
    if cached:
        return jsonify(cached)
    place = geocode_india(destination)
    if not place:
        return jsonify({
            "hotels": [], "restaurants": [],
            "notice": "Could not locate the destination. Use the map search links below."
        })
    lat, lon = float(place["latitude"]), float(place["longitude"])
    query = f"""
    [out:json][timeout:12];
    (
      node(around:5000,{lat},{lon})[tourism~"^(hotel|guest_house|hostel|motel)$"];
      way(around:5000,{lat},{lon})[tourism~"^(hotel|guest_house|hostel|motel)$"];
      node(around:5000,{lat},{lon})[amenity~"^(hotel|restaurant|cafe)$"];
      way(around:5000,{lat},{lon})[amenity~"^(hotel|restaurant|cafe)$"];
    );
    out center tags 35;
    """
    endpoints = [
        "https://overpass-api.de/api/interpreter",
        "https://overpass.kumi.systems/api/interpreter",
    ]
    payload = None
    for endpoint in endpoints:
        try:
            response = requests.post(
                endpoint, data={"data": query}, timeout=(3, 14),
                headers={"User-Agent": "AITravelTourismStudentProject/1.0"}
            )
            response.raise_for_status()
            payload = response.json()
            break
        except (requests.RequestException, ValueError) as error:
            print("NEARBY SEARCH ERROR:", error)
    hotels, restaurants = [], []
    if payload:
        for element in payload.get("elements", []):
            tags = element.get("tags") or {}
            name = (tags.get("name") or tags.get("name:en") or "").strip()
            if not name:
                continue
            center = element.get("center") or {}
            item_lat = element.get("lat", center.get("lat"))
            item_lon = element.get("lon", center.get("lon"))
            if item_lat is None or item_lon is None:
                continue
            category = tags.get("tourism") or tags.get("amenity") or ""
            item = {
                "name": name,
                "category": category.replace("_", " ").title(),
                "latitude": float(item_lat),
                "longitude": float(item_lon),
                "distance_km": round((((float(item_lat)-lat)**2 + (float(item_lon)-lon)**2)**0.5)*111, 1),
                "website": tags.get("website") or tags.get("contact:website") or "",
                "phone": tags.get("phone") or tags.get("contact:phone") or "",
                "map_url": "https://www.google.com/maps/search/?api=1&query=" + requests.utils.quote(name + " " + destination),
                "source": "OpenStreetMap",
            }
            if category in ("hotel", "guest_house", "hostel", "motel"):
                hotels.append(item)
            elif category in ("restaurant", "cafe"):
                restaurants.append(item)
    hotels.sort(key=lambda x: x["distance_km"])
    restaurants.sort(key=lambda x: x["distance_km"])
    result = {
        "hotels": hotels[:12],
        "restaurants": restaurants[:12],
        "notice": "" if hotels or restaurants else "Live nearby listings are unavailable right now. Use the map search links to explore current options.",
        "source": "OpenStreetMap contributors",
    }
    _NEARBY_CACHE[cache_key] = result
    return jsonify(result)


# -----------------------------------------
# START SERVER
# -----------------------------------------

if __name__ == "__main__":

    app.run(debug=True)