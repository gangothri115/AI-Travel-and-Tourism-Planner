import os

from dotenv import load_dotenv
from google import genai
from google.genai import types


# =====================================================
# LOAD ENVIRONMENT VARIABLES
# =====================================================

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

MODEL_NAME = "gemini-3.5-flash-lite"


# =====================================================
# INITIALIZE GEMINI CLIENT
# =====================================================

if not GEMINI_API_KEY:
    raise ValueError(
        "GEMINI_API_KEY is missing. "
        "Please check your .env file."
    )

client = genai.Client(
    api_key=GEMINI_API_KEY
)


# =====================================================
# AI ASSISTANT INSTRUCTIONS
# =====================================================

SYSTEM_PROMPT = """
You are the conversational AI travel planner for an India-only travel website.
Your primary job is to help users plan trips, not to dump a generic itinerary
inside chat.

NORMAL CHAT:
- Respond naturally to greetings and unrelated questions.
- Do not force travel planning unless the user asks for it.

TRIP WORKFLOW:
- When the user expresses intent to plan a trip, switch into trip-intake mode.
- Understand facts across the entire conversation; never ask again for facts already given.
- Collect: starting city, destination, number of days/dates, number of travellers,
  budget (or flexible), transport preference, interests, food preference,
  accommodation preference, pace/accessibility needs.
- Ask one concise combined question listing only missing essential facts.
- Essential to open discovery: starting city, destination, and trip duration.
  Budget, transport, travellers and preferences may remain flexible if user says so.
- Do not invent user selections, booking confirmations, live prices, weather or availability.
- Once essential details are known, summarize them in a compact confirmation and tell
  the user the discovery workspace is ready. Do not write a long day-by-day plan in chat.
- The website will show selectable attractions, weather, route options and trip controls.
- The user chooses places and routes; do not imply that they have selected something
  until the website records that choice.
- When a user asks for a plan after selecting places, explain that the Plan My Trip
  action creates a day-by-day itinerary from those saved selections.

RECOMMENDATION QUALITY:
- India only.
- Consider travel time, season, weather, budget, interests, traveller count and pace.
- Group nearby attractions on the same day; avoid zig-zag travel.
- Recommend meal and accommodation areas near that day's stops, but clearly mark
  suggestions as unverified unless live provider data is actually available.
- Prefer a few useful recommendations over long generic lists.

STYLE:
- Friendly, concise, natural and easy to understand.
- Use clean Markdown headings, bullets and bold text.
- Never print raw JSON or code unless asked.
- Never claim that a booking or reservation has been made.
"""


# =====================================================
# CONVERT CONVERSATION INTO GEMINI FORMAT
# =====================================================

def prepare_conversation(conversation):
    """
    Convert previous chat messages into Gemini format.
    """

    contents = []

    if not isinstance(conversation, list):
        return contents

    for message in conversation:

        if not isinstance(message, dict):
            continue

        role = message.get("role")
        text = message.get("content", "")

        if not isinstance(text, str):
            continue

        text = text.strip()

        if not text:
            continue

        # Gemini uses "model" instead of "assistant".
        if role == "assistant":
            gemini_role = "model"

        elif role == "user":
            gemini_role = "user"

        else:
            continue

        contents.append(
            types.Content(
                role=gemini_role,
                parts=[
                    types.Part.from_text(text=text)
                ]
            )
        )

    return contents


# =====================================================
# CHAT WITH AI
# =====================================================

def chat_with_ai(user_message, conversation=None):
    """
    Generate a natural response to the user's message.

    Supports normal conversations as well as travel planning.
    """

    if not isinstance(user_message, str):
        return "Please send me a message. 😊"

    user_message = user_message.strip()

    if not user_message:
        return "I'm listening! 😊 What would you like to talk about?"

    if conversation is None:
        conversation = []

    try:

        # Prepare previous messages so the AI understands context.
        contents = prepare_conversation(conversation)

        # Add the current user message.
        contents.append(
            types.Content(
                role="user",
                parts=[
                    types.Part.from_text(
                        text=user_message
                    )
                ]
            )
        )

        # Generate the response.
        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                temperature=0.7,
                max_output_tokens=800
            )
        )

        # Extract the response safely.
        reply = response.text

        if reply and reply.strip():
            return reply.strip()

        return (
            "I'm here! 😊 Could you please try saying "
            "that another way?"
        )

    except Exception as error:

        print("GEMINI CHAT ERROR:", repr(error))

        return (
            "Sorry, I'm having trouble responding right now. 😕 "
            "Please try again in a moment."
        )