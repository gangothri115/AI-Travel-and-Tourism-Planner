# AI Travel & Tourism — Workflow Update

## Intended product flow
1. Chat is the main entry point. The assistant gathers starting city, destination and duration.
2. The planning workspace is where users review/select attractions, weather and routes.
3. Users can add a place manually.
4. A generated itinerary groups selected attractions into days and provides meal/accommodation planning prompts.
5. Named trip snapshots are saved in browser storage and can be reopened from Profile.

## Updated files in this release
- `app/ai/chatbot.py` — travel-first workflow prompt; no generic itinerary dump in chat.
- `app/services/trip_parser.py` — requires origin, destination and days before auto-opening discovery.
- `static/js/chat.js` — safe basic Markdown rendering and session conversation persistence.
- `templates/chat.html` — clearer travel assistant onboarding.
- `static/js/planning.js` — saves named trip snapshots when generating an itinerary.
- `static/js/profile.js` — fixes event-handler scope and supports opening saved trip snapshots.
- `templates/profile.html` — cache-busted profile script.
- `templates/chat.html` — cache-busted chat script.

## Important limitations
- Trip history and selections are currently stored in browser localStorage, not MySQL/account cloud storage.
- Restaurant/hotel meal and accommodation text is planning guidance, not verified live inventory.
- The itinerary uses the selected places and simple day allocation; it is not yet an AI-optimized schedule using live opening hours, travel-time matrices, or bookings.
- External mapping, geocoding, weather and image providers can fail or have incomplete coverage.
- Gemini requires a valid `GEMINI_API_KEY` in `.env`.

## Install
Copy the ZIP contents into the project root, preserving folder structure. Activate the existing virtual environment and run `python app.py`.
