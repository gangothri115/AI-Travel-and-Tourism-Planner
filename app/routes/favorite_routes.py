from flask import Blueprint, render_template


# =========================================
# FAVORITES BLUEPRINT
# =========================================

favorite_bp = Blueprint(
    "favorite",
    __name__
)


# =========================================
# FAVORITES PAGE
# =========================================

@favorite_bp.route("/favorites")
def favorites_page():

    return render_template(
        "favorites.html"
    )