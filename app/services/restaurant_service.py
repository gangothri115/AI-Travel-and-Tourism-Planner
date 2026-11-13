"""Live restaurant search backed by Geoapify."""
from app.services.place_service import search_nearby

def search_restaurants(destination):
    return search_nearby(destination).get("restaurants", [])
