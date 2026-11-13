"""Live hotel search backed by Geoapify."""
from app.services.place_service import search_nearby

def search_hotels(destination):
    return search_nearby(destination).get("hotels", [])
