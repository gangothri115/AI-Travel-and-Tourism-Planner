from flask import Blueprint, jsonify, request

from app.services.place_service import (
    search_places,
    get_place_details
)


place_bp = Blueprint(
    "places",
    __name__,
    url_prefix="/api/places"
)


@place_bp.get("")
def places_search():
    destination = request.args.get(
        "destination",
        ""
    ).strip()

    if not destination:
        return jsonify({
            "success": False,
            "error": "Please provide a destination."
        }), 400

    try:
        result = search_places(destination)

        return jsonify({
            "success": True,
            **result
        })

    except Exception as error:
        print("PLACE SEARCH ERROR:", error)

        return jsonify({
            "success": False,
            "error": "Place providers are temporarily busy."
        }), 502


@place_bp.get("/detail")
def place_detail():
    place_id = request.args.get(
        "id",
        ""
    ).strip()

    if not place_id:
        return jsonify({
            "success": False,
            "error": "A place ID is required."
        }), 400

    try:
        place = get_place_details(place_id)

        return jsonify({
            "success": True,
            "place": place
        })

    except LookupError as error:
        return jsonify({
            "success": False,
            "error": str(error)
        }), 404

    except Exception as error:
        print("PLACE DETAIL ERROR:", error)

        return jsonify({
            "success": False,
            "error": (
                "Place details could not be loaded right now. "
                "Please try again."
            )
        }), 502
    