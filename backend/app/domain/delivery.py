import re
from typing import Literal

from .models import DeliveryInfo

VALLEY_CITIES: frozenset[str] = frozenset(["kathmandu", "lalitpur", "patan", "bhaktapur", "kirtipur"])

DELIVERY_RULES: dict[Literal["valley", "outside"], dict[str, int | str]] = {
    "valley": {"days": "1–2 days", "fee": 100, "freeOver": 5000},
    "outside": {"days": "3–5 days", "fee": 250, "freeOver": 50000},
}


def title_case_city(city: str) -> str:
    """Capitalizes first letter of each word to match JS `replace(/\\b\\w/g, c => c.toUpperCase())`."""
    return re.sub(r"\b\w", lambda m: m.group(0).upper(), city.strip())


def delivery_for(city: str) -> DeliveryInfo:
    cleaned = city.strip().lower()
    zone: Literal["valley", "outside"] = "valley" if cleaned in VALLEY_CITIES else "outside"
    rules = DELIVERY_RULES[zone]
    return DeliveryInfo(
        city=title_case_city(city),
        zone=zone,
        days=str(rules["days"]),
        fee=int(rules["fee"]),
        freeOver=int(rules["freeOver"]),
    )
