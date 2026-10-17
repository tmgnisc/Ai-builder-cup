import re
from typing import Literal

from .models import Product


def format_in_digits(val: int) -> str:
    s = str(abs(val))
    if len(s) <= 3:
        res = s
    else:
        last3 = s[-3:]
        rest = s[:-3]
        groups: list[str] = []
        while len(rest) > 2:
            groups.append(rest[-2:])
            rest = rest[:-2]
        if rest:
            groups.append(rest)
        groups.reverse()
        res = ",".join(groups) + "," + last3
    return f"-{res}" if val < 0 else res


def format_npr(amount: float, prefix: bool = True) -> str:
    """NPR with South-Asian digit grouping: 120000 -> 'NPR 1,20,000'."""
    rounded = int(round(amount))
    formatted = format_in_digits(rounded)
    return f"NPR {formatted}" if prefix else formatted


def format_weight(grams: int | float, unit: Literal["kg", "g"] | None = None) -> str:
    if unit == "kg" or (unit is None and grams >= 1000):
        val = f"{grams / 1000:.2f}".rstrip("0").rstrip(".")
        return f"{val} kg"
    return f"{int(round(grams))} g"


def format_storage(gb: int | float, unit: Literal["TB", "GB"] | None = None) -> str:
    if unit == "TB" or (unit is None and gb >= 1000):
        val = f"{gb / 1000:.1f}".rstrip("0").rstrip(".")
        return f"{val} TB"
    return f"{int(round(gb))} GB"


def format_warranty(months: int) -> str:
    if months == 0:
        return "None"
    if months % 12 == 0:
        return f"{months // 12} yr"
    return f"{months} mo"


def stock_level(stock: int) -> Literal["in", "low", "out"]:
    if stock == 0:
        return "out"
    if stock <= 3:
        return "low"
    return "in"


def stock_label(stock: int) -> str:
    level = stock_level(stock)
    if level == "out":
        return "Out of stock"
    if level == "low":
        return f"Only {stock} left"
    return "In stock"


def spec_rows(p: Product) -> list[dict[str, str]]:
    s = p.specs
    rows: list[dict[str, str]] = []
    if s.cpu:
        rows.append({"key": "cpu", "label": "Chip" if p.category == "phones" else "Processor", "value": s.cpu})
    if s.ramGB:
        rows.append({"key": "ram", "label": "Memory", "value": f"{s.ramGB} GB"})
    if s.storageGB:
        rows.append({"key": "storage", "label": "Storage", "value": format_storage(s.storageGB)})
    if s.gpu:
        rows.append({"key": "gpu", "label": "Graphics", "value": s.gpu})
    if s.screen:
        rows.append({"key": "screen", "label": "Display", "value": s.screen})
    if s.camera:
        rows.append({"key": "camera", "label": "Camera", "value": s.camera})
    if s.batteryHours is not None:
        rows.append({"key": "battery", "label": "Battery", "value": f"{s.batteryHours} h"})
    if s.anc is not None:
        rows.append({"key": "anc", "label": "Noise cancelling", "value": "Yes" if s.anc else "No"})
    if s.material:
        rows.append({"key": "material", "label": "Material", "value": s.material})
    if s.fit:
        rows.append({"key": "fit", "label": "Fit", "value": s.fit})
    if s.sizes:
        rows.append({"key": "sizes", "label": "Sizes", "value": ", ".join(s.sizes)})
    if s.colors:
        rows.append({"key": "colors", "label": "Colours", "value": ", ".join(c.name for c in s.colors)})
    rows.append({"key": "weight", "label": "Weight", "value": format_weight(s.weightGrams)})
    if s.ports:
        rows.append({"key": "ports", "label": "Ports", "value": s.ports})
    if s.connectivity:
        rows.append({"key": "connectivity", "label": "Connectivity", "value": s.connectivity})
    if p.category != "clothing":
        rows.append({"key": "warranty", "label": "Warranty", "value": format_warranty(s.warrantyMonths)})
    return rows


def key_specs(p: Product) -> list[dict[str, str]]:
    all_specs = spec_rows(p)
    pick_map: dict[str, list[str]] = {
        "laptops": ["ram", "battery", "weight"],
        "phones": ["storage", "battery", "screen"],
        "headphones": ["battery", "anc", "weight"],
        "accessories": ["ports", "connectivity", "weight"],
        "clothing": ["material", "fit", "sizes"],
    }
    wanted = pick_map.get(p.category, [])
    spec_dict = {row["key"]: row for row in all_specs}
    chosen: list[dict[str, str]] = [spec_dict[k] for k in wanted if k in spec_dict]
    for row in all_specs:
        if len(chosen) >= 3:
            break
        if row not in chosen:
            chosen.append(row)
    return chosen[:3]


def initials(brand: str, name: str) -> str:
    combined = f"{brand} {name}"
    words = [w for w in re.sub(r"[^A-Za-z0-9 ]", " ", combined).split() if w]
    first = words[0][0] if len(words) > 0 and words[0] else ""
    second = words[1][0] if len(words) > 1 and words[1] else ""
    return first + second
