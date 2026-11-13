import re


def clean_location(value):
    """Remove trip attributes accidentally appended to a location."""
    value = re.sub(r"\s+", " ", str(value or "")).strip(" \t\r\n,.;:-")
    # Remove everything beginning with a trip attribute marker.
    value = re.split(
        r"\b(?:for\s+\d+\s+days?|budget|with\s+budget|"
        r"spend(?:ing)?\s+(?:of|limit)|"
        r"i\s+(?:prefer|want|will\s+travel)|"
        r"by\s+(?:car|bus|train|bike|flight)|"
        r"(?:car|bus|train|bike|flight)\s+travel|"
        r"\d[\d,]*(?:\.\d+)?\s*(?:rupees|rs\.?|inr)\b|"
        r"₹)",
        value,
        maxsplit=1,
        flags=re.IGNORECASE,
    )[0]
    # Common malformed order: "Delhi 20000 Budget Lets Plan 4 Days".
    value = re.sub(
        r"\s+\d[\d,]*(?:\.\d+)?\s*(?=budget\b).*$",
        "",
        value,
        flags=re.IGNORECASE,
    )
    value = re.sub(r"\s+\d[\d,]*\s*$", "", value)
    value = re.sub(r"\s+(?:lets?\s+)?plan\b.*$", "", value, flags=re.IGNORECASE)
    return re.sub(r"\s+", " ", value).strip(" \t\r\n,.;:-").title()


def _user_messages(conversation):
    return [
        str(m.get("content", "")).strip()
        for m in (conversation or [])
        if isinstance(m, dict)
        and m.get("role") == "user"
        and str(m.get("content", "")).strip()
    ]


def _latest_match(pattern, messages, flags=re.IGNORECASE):
    for message in reversed(messages):
        matches = list(re.finditer(pattern, message, flags))
        if matches:
            return matches[-1], message
    return None, None


def _parse_amount(text):
    value = float(text.replace(",", ""))
    return int(value)


def extract_trip_requirements(conversation):
    """Extract each trip field independently; latest explicit user value wins."""
    messages = _user_messages(conversation)
    trip = {
        "from_location": None,
        "destination": None,
        "days": None,
        "budget": None,
        "transport": None,
        "travellers": None,
    }

    # Explicit route: isolate the route before parsing other attributes.
    route_patterns = [
        r"\bfrom\s+(.+?)\s+\bto\s+(.+)",
        r"^\s*(?:please\s+)?(?:plan\s+(?:a\s+)?trip\s+)?"
        r"([A-Za-z][A-Za-z .'-]{1,60}?)\s+\bto\s+(.+)$",
    ]
    for message in reversed(messages):
        route_found = False
        for pattern in route_patterns:
            match = re.search(pattern, message, re.IGNORECASE)
            if not match:
                continue
            origin = clean_location(match.group(1))
            destination = clean_location(match.group(2))
            if origin and destination and origin.casefold() != destination.casefold():
                trip["from_location"] = origin
                trip["destination"] = destination
                route_found = True
                break
        if route_found:
            break

    # Destination-only corrections such as "change destination to Mysore".
    if messages:
        for message in reversed(messages):
            match = re.search(
                r"\b(?:change|set|make|update)\s+(?:the\s+)?destination\s+to\s+(.+)",
                message, re.IGNORECASE
            )
            if match:
                value = clean_location(match.group(1))
                if value:
                    trip["destination"] = value
                    break

    # Contextual short answers, based on the immediately preceding assistant prompt.
    for index in range(len(conversation or []) - 1, -1, -1):
        item = conversation[index]
        if not isinstance(item, dict) or item.get("role") != "user":
            continue
        answer = str(item.get("content", "")).strip()
        if not answer:
            continue
        previous_assistant = ""
        for previous in reversed((conversation or [])[:index]):
            if isinstance(previous, dict) and previous.get("role") == "assistant":
                previous_assistant = str(previous.get("content", "")).lower()
                break

        if not trip["from_location"] and any(
            phrase in previous_assistant for phrase in
            ("where are you travelling from", "where are you traveling from",
             "starting point", "starting location", "travelling from", "traveling from")
        ):
            if len(answer.split()) <= 5:
                trip["from_location"] = clean_location(answer)

        if not trip["destination"] and any(
            phrase in previous_assistant for phrase in
            ("where would you like to travel", "where would you like to go",
             "where do you want to travel", "your destination")
        ):
            if len(answer.split()) <= 6:
                trip["destination"] = clean_location(answer)

        asks_budget = any(term in previous_assistant for term in (
            "budget", "how much would you like to spend", "spending limit"
        ))
        asks_travellers = any(term in previous_assistant for term in (
            "traveller", "traveler", "number of people", "how many people"
        ))
        if not trip["budget"] and asks_budget and not asks_travellers:
            bare = re.fullmatch(r"\s*([0-9][0-9,]*)\s*", answer)
            if bare:
                trip["budget"] = _parse_amount(bare.group(1))
        if not trip["travellers"] and asks_travellers and not asks_budget:
            bare = re.fullmatch(r"\s*([0-9]+)\s*", answer)
            if bare:
                trip["travellers"] = int(bare.group(1))

    # Days: only a number explicitly attached to day/days.
    match, _ = _latest_match(r"\b([0-9]{1,2})\s*days?\b", messages)
    if match:
        trip["days"] = int(match.group(1))

    # Budget: currency or explicit budget wording; never bare numbers.
    budget_patterns = [
        r"(?:₹|rs\.?|inr)\s*([0-9][0-9,]*(?:\.[0-9]+)?)\s*(k|thousand|lakh|lakhs)?",
        r"\b(?:budget|spend(?:ing)?\s+limit)\s*(?:is|of|around|:)?\s*(?:₹|rs\.?|inr)?\s*([0-9][0-9,]*(?:\.[0-9]+)?)\s*(k|thousand|lakh|lakhs)?",
        r"\b([0-9][0-9,]*(?:\.[0-9]+)?)\s*(k|thousand|lakh|lakhs)\b",
        r"\b([0-9][0-9,]*)\s+budget\b",
        r"\b([0-9][0-9,]*)\s*(?:rupees|rs)\b",
    ]
    for message in reversed(messages):
        found = None
        for pattern in budget_patterns:
            matches = list(re.finditer(pattern, message, re.IGNORECASE))
            if matches:
                found = matches[-1]
                break
        if found:
            amount = _parse_amount(found.group(1))
            multiplier = (found.group(2) or "").lower() if found.lastindex and found.lastindex >= 2 else ""
            if multiplier in ("k", "thousand"):
                amount *= 1000
            elif multiplier in ("lakh", "lakhs"):
                amount *= 100000
            trip["budget"] = int(amount)
            break

    # Explicit transport; latest message wins.
    transport_options = {
        "private vehicle": "Private Vehicle", "car": "Car",
        "bike": "Bike", "motorcycle": "Bike", "bus": "Bus",
        "train": "Train", "flight": "Flight", "plane": "Flight",
    }
    for message in reversed(messages):
        lower = message.lower()
        found = next(
            ((key, value) for key, value in transport_options.items()
             if re.search(r"\b" + re.escape(key) + r"\b", lower)),
            None
        )
        if found:
            trip["transport"] = found[1]
            break

    # Traveller count must be explicitly labelled.
    for message in reversed(messages):
        match = re.search(
            r"\b([0-9]{1,2})\s*(?:people|persons|travellers|travelers|members)\b",
            message, re.IGNORECASE
        )
        if match:
            trip["travellers"] = int(match.group(1))
            break

    trip["ready"] = bool(
        trip["from_location"] and trip["destination"] and trip["days"]
    )
    return trip
