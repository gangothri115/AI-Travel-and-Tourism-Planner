import importlib.util
from pathlib import Path

parser_path = Path(__file__).parents[1] / "app" / "services" / "trip_parser.py"
spec = importlib.util.spec_from_file_location("trip_parser", parser_path)
parser = importlib.util.module_from_spec(spec)
spec.loader.exec_module(parser)

def test_full_trip_request():
    result = parser.extract_trip_requirements([{
        "role": "user",
        "content": "plan trip from Hyderabad to Mysore for 5 days, budget ₹30,000, I prefer car, 5 people"
    }])
    assert result["from_location"] == "Hyderabad"
    assert result["destination"] == "Mysore"
    assert result["days"] == 5
    assert result["budget"] == 30000
    assert result["transport"] == "Car"
    assert result["travellers"] == 5
    assert result["ready"] is True

def test_days_are_not_budget():
    result = parser.extract_trip_requirements([{
        "role": "user",
        "content": "Hyderabad to Araku for 5 days"
    }])
    assert result["days"] == 5
    assert result["budget"] is None

def test_later_route_correction_wins():
    result = parser.extract_trip_requirements([
        {"role": "user", "content": "Plan a trip from Palamaner to Ooty for 5 days"},
        {"role": "assistant", "content": "Sure."},
        {"role": "user", "content": "Actually plan from Hyderabad to Mysore for 3 days"}
    ])
    assert result["from_location"] == "Hyderabad"
    assert result["destination"] == "Mysore"
    assert result["days"] == 3
