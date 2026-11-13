from flask import Blueprint, render_template, request, jsonify

from app.ai.chatbot import chat_with_ai
from app.services.trip_parser import extract_trip_requirements


# Create chatbot blueprint
chat_bp = Blueprint(
    "chat",
    __name__
)


# -----------------------------------------
# CHAT PAGE
# -----------------------------------------

@chat_bp.route("/chat")
def chat_page():

    return render_template("chat.html")


# -----------------------------------------
# PLANNING PAGE
# -----------------------------------------

@chat_bp.route("/planning")
def planning_page():

    return render_template("planning.html")


# -----------------------------------------
# AI CHAT API
# -----------------------------------------

@chat_bp.route("/api/chat", methods=["POST"])
def chat_api():

    try:

        data = request.get_json()

        user_message = data.get(
            "message",
            ""
        ).strip()

        conversation = data.get(
            "conversation",
            []
        )


        # -----------------------------------------
        # CHECK EMPTY MESSAGE
        # -----------------------------------------

        if not user_message:

            return jsonify({
                "success": False,
                "error": "Please enter a message."
            }), 400


        # -----------------------------------------
        # SEND MESSAGE TO AI
        # -----------------------------------------

        reply = chat_with_ai(
            user_message,
            conversation
        )


        # -----------------------------------------
        # EXTRACT TRIP REQUIREMENTS
        # -----------------------------------------

        trip_requirements = extract_trip_requirements(
            conversation + [
                {
                    "role": "user",
                    "content": user_message
                },
                {
                    "role": "assistant",
                    "content": reply
                }
            ]
        )


        # -----------------------------------------
        # RETURN AI RESPONSE + TRIP DATA
        # -----------------------------------------

        return jsonify({

    "success": True,

    "reply": reply,

    "trip_requirements":
        trip_requirements,

    "trip_ready":
        trip_requirements.get(
            "ready",
            False
        )

})
   


    except Exception as e:

        print("AI ERROR:", e)

        return jsonify({

            "success": False,

            "error":
                "Sorry, something went wrong while contacting the AI."

        }), 500