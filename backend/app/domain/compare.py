from decimal import ROUND_HALF_UP, Decimal
from typing import Any, Literal

from pydantic import BaseModel

from .format import format_npr, format_storage, format_warranty, format_weight
from .models import CompareKey, CompareResult, CompareRow, Product, TextKey

DEFAULT_PRIORITIES: list[CompareKey] = ["price", "battery", "weight", "ram"]

SAME_LABEL: dict[CompareKey, str] = {
    "price": "same price",
    "ram": "same RAM",
    "storage": "same storage",
    "battery": "same battery life",
    "weight": "same weight",
    "warranty": "same warranty",
    "rating": "same rating",
}


def short_name(p: Product) -> str:
    return p.name if len(p.name) <= 22 else f"{p.brand} {p.name.split(' ')[0]}"


def join_list(items: list[str]) -> str:
    if len(items) <= 1:
        return items[0] if items else ""
    return f"{', '.join(items[:-1])} and {items[-1]}"


def _ratio(a: float, b: float) -> float:
    return a / b if b > 0 else 0.0


def _format_battery(v: float) -> str:
    return f"{int(v)} h" if v.is_integer() else f"{v} h"


def _format_battery_phrase(best: float, other: float) -> str:
    diff = best - other
    d_dec = Decimal(str(diff)).quantize(Decimal("0.1"), rounding=ROUND_HALF_UP)
    s = f"{d_dec:.1f}".rstrip("0").rstrip(".")
    return f"{s} h more battery"


class NumericAttrDef(BaseModel):
    key: CompareKey
    label: str
    better: Literal["lower", "higher"]
    verb: Literal["is", "has"]
    epsilon: float


NUMERIC_ATTR_DEFS: list[NumericAttrDef] = [
    NumericAttrDef(key="price", label="Price", better="lower", verb="is", epsilon=500.0),
    NumericAttrDef(key="ram", label="Memory", better="higher", verb="has", epsilon=1.0),
    NumericAttrDef(key="storage", label="Storage", better="higher", verb="has", epsilon=1.0),
    NumericAttrDef(key="battery", label="Battery", better="higher", verb="has", epsilon=0.5),
    NumericAttrDef(key="weight", label="Weight", better="lower", verb="is", epsilon=20.0),
    NumericAttrDef(key="warranty", label="Warranty", better="higher", verb="has", epsilon=1.0),
    NumericAttrDef(key="rating", label="Rating", better="higher", verb="is", epsilon=0.15),
]


def _get_numeric_val(p: Product, key: CompareKey) -> float | None:
    if key == "price":
        return float(p.price)
    if key == "ram":
        return float(p.specs.ramGB) if p.specs.ramGB is not None else None
    if key == "storage":
        return float(p.specs.storageGB) if p.specs.storageGB is not None else None
    if key == "battery":
        return float(p.specs.batteryHours) if p.specs.batteryHours is not None else None
    if key == "weight":
        return float(p.specs.weightGrams)
    if key == "warranty":
        return float(p.specs.warrantyMonths)
    if key == "rating":
        return float(p.rating)
    return None


def _format_numeric_val(val: float, key: CompareKey) -> str:
    if key == "price":
        return format_npr(val)
    if key == "ram":
        return f"{int(val)} GB"
    if key == "storage":
        return format_storage(int(val))
    if key == "battery":
        return _format_battery(val)
    if key == "weight":
        return format_weight(int(val))
    if key == "warranty":
        return format_warranty(int(val))
    if key == "rating":
        return f"{val:.1f} ★"
    return str(val)


def _phrase_numeric(key: CompareKey, best: float, other: float) -> str:
    if key == "price":
        return f"{format_npr(other - best)} cheaper"
    if key == "ram":
        return "double the RAM" if _ratio(best, other) >= 2 else f"{int(best - other)} GB more RAM"
    if key == "storage":
        return "double the storage" if _ratio(best, other) >= 2 else f"{format_storage(int(best - other))} more storage"
    if key == "battery":
        return _format_battery_phrase(best, other)
    if key == "weight":
        return f"{format_weight(int(other - best))} lighter"
    if key == "warranty":
        return f"{format_warranty(int(best - other))} longer warranty"
    if key == "rating":
        return f"better rated ({best:.1f} vs {other:.1f})"
    return ""


TEXT_ATTRS: list[tuple[TextKey, str]] = [
    ("cpu", "Processor"),
    ("gpu", "Graphics"),
    ("screen", "Display"),
    ("camera", "Camera"),
    ("ports", "Ports"),
    ("connectivity", "Connectivity"),
]


def compare_products(
    products: list[Product],
    priorities: list[CompareKey] | None = None,
    context: str | None = None,
) -> CompareResult:
    prios = priorities if priorities is not None else DEFAULT_PRIORITIES
    ids = [p.id for p in products]
    by_id = {p.id: p for p in products}
    rows: list[CompareRow] = []
    advantages: dict[str, list[dict[str, Any]]] = {pid: [] for pid in ids}
    scores: dict[str, float] = {pid: 0.0 for pid in ids}
    sames: list[CompareKey] = []

    def weight_of(k: CompareKey) -> float:
        if k not in prios:
            return 1.0
        i = prios.index(k)
        return 3.0 + (len(prios) - i) * 0.25

    categories: list[str] = []
    for p in products:
        if p.category not in categories:
            categories.append(p.category)
    is_cross_category = len(categories) > 1

    for attr in NUMERIC_ATTR_DEFS:
        vals = [_get_numeric_val(p, attr.key) for p in products]
        if all(v is None for v in vals):
            continue

        present = [v for v in vals if v is not None]
        best = min(present) if attr.better == "lower" else max(present)
        all_equal = len(present) == len(vals) and all(abs(v - best) < attr.epsilon for v in present)
        winners = (
            []
            if all_equal
            else [products[i].id for i, v in enumerate(vals) if v is not None and abs(v - best) < attr.epsilon]
        )

        use_kg = attr.key == "weight" and any(v >= 1000 for v in present)
        use_tb = attr.key == "storage" and any(v >= 1000 for v in present)
        row_values: dict[str, str] = {}
        for i, p in enumerate(products):
            val = vals[i]
            if val is None:
                row_values[p.id] = "—"
            elif attr.key == "weight":
                row_values[p.id] = format_weight(val, unit="kg" if use_kg else "g")
            elif attr.key == "storage":
                row_values[p.id] = format_storage(val, unit="TB" if use_tb else "GB")
            else:
                row_values[p.id] = _format_numeric_val(val, attr.key)

        rows.append(
            CompareRow(
                key=attr.key,
                label=attr.label,
                values=row_values,
                winners=winners,
                numeric=True,
            )
        )

        if all_equal:
            if attr.key in prios:
                sames.append(attr.key)
            continue

        losers = [v for i, v in enumerate(vals) if v is not None and ids[i] not in winners]
        if not losers:
            continue
        runner_up = min(losers) if attr.better == "lower" else max(losers)

        for w_id in winners:
            own = vals[ids.index(w_id)]
            assert own is not None
            text = _phrase_numeric(attr.key, own, runner_up)
            w = weight_of(attr.key)
            advantages[w_id].append(
                {
                    "key": attr.key,
                    "text": text,
                    "predicate": f"{attr.verb} {text}",
                    "weight": w,
                }
            )
            scores[w_id] += w

    for text_key, label in TEXT_ATTRS:
        t_vals = [getattr(p.specs, text_key, None) for p in products]
        if all(v is None for v in t_vals):
            continue
        rows.append(
            CompareRow(
                key=text_key,
                label=label,
                values={p.id: str(t_vals[i]) if t_vals[i] is not None else "—" for i, p in enumerate(products)},
                winners=[],
                numeric=False,
            )
        )

    for pid in ids:
        advantages[pid].sort(key=lambda a: float(a["weight"]), reverse=True)

    # --------------------------------------------------------------------------
    # VERDICT SCORING SCALE & DECISION RULES:
    #
    # 1. Point Scale:
    #    - Each numeric attribute won awards points based on priority:
    #      - Non-prioritized attribute: 1.0 point
    #      - Prioritized attribute (rank i in priorities of length N):
    #        weight = 3.0 + (N - i) * 0.25
    #        (e.g., for default [price, battery, weight]: price = 3.75, battery = 3.5, weight = 3.25)
    #    - Total score is cumulative sum of weighted attribute wins.
    #
    # 2. Ranking & Ties:
    #    - Products are ranked in descending order of total score.
    #    - If |score[top] - score[second]| < 0.5, declared a genuine tie (winner_id = None).
    #
    # 3. Cross-Category Guard:
    #    - Comparing across multiple categories invalidates ranking (winner_id = None).
    #
    # 4. Out-of-Stock (OOS) Winner & 2.0 Margin Rule:
    #    - When top-scoring product is out of stock (stock == 0):
    #      a. In-Stock Preference (margin <= 2.0):
    #         If runner-up is in stock (stock > 0) and margin <= 2.0 (e.g. 2.0, 1.0),
    #         in-stock runner-up is crowned winner (winner_id = second).
    #      b. Spec Superiority Maintained (margin > 2.0):
    #         If margin > 2.0, top product remains winner_id on specs, but verdict
    #         explicitly notes "(currently out of stock)".
    #      c. All Out of Stock:
    #         If all products are out of stock, highest scoring product wins with
    #         "(currently out of stock)".
    # --------------------------------------------------------------------------
    ranked = sorted(ids, key=lambda pid: scores[pid], reverse=True)
    top = ranked[0] if ranked else None
    second = ranked[1] if len(ranked) > 1 else None
    tie = not top or not second or abs(scores[top] - scores[second]) < 0.5

    winner_id: str | None = None
    preferred_in_stock = False

    if not is_cross_category and top:
        top_prod = by_id[top]
        second_prod = by_id[second] if second else None
        margin = scores[top] - scores[second] if second else 0.0

        if top_prod.stock == 0 and second_prod and second_prod.stock > 0 and margin <= 2.0:
            winner_id = second
            preferred_in_stock = True
        elif not tie:
            winner_id = top

    if len(products) < 2:
        verdict = "Add another product to compare."
    elif is_cross_category:
        verdict = (
            f"Comparing across different categories ({join_list(categories)}): "
            "products serve different purposes and cannot be directly ranked against each other."
        )
    elif not winner_id:
        a = by_id[ranked[0]]
        b = by_id[ranked[1]]

        def preds(prod_id: str) -> list[str]:
            return [str(x["predicate"]) for x in advantages[prod_id][:2]]

        def side(prod: Product) -> str:
            p_list = preds(prod.id)
            return f"the {short_name(prod)} {join_list(p_list)}" if p_list else f"the {short_name(prod)} matches it"

        verdict = f"It's a close call: {side(a)}, while {side(b)}."
    elif preferred_in_stock:
        top_prod = by_id[top]  # type: ignore[index]
        w_prod = by_id[winner_id]
        reasons = [str(x["text"]) for x in advantages[winner_id][:3]]
        reason_text = f": {', '.join(reasons)}" if reasons else ""
        verdict = (
            f"While the {short_name(top_prod)} scores slightly higher on specs, it is currently out of stock; "
            f"the in-stock {short_name(w_prod)} is the recommended pick{reason_text}."
        )
    else:
        w_prod = by_id[winner_id]
        reasons = [str(x["text"]) for x in advantages[winner_id][:3]]
        same_text = [SAME_LABEL[k] for k in sames[:1]]
        oos_suffix = " (currently out of stock)" if w_prod.stock == 0 else ""
        lead = (
            f"For {context}, the {short_name(w_prod)} is the better fit{oos_suffix}"
            if context
            else f"The {short_name(w_prod)} is the better all-round pick{oos_suffix}"
        )
        combined_reasons = reasons + same_text
        verdict = f"{lead}: {', '.join(combined_reasons)}."
        runner = by_id.get(second) if second else None
        counter: str | None = str(advantages[runner.id][0]["predicate"]) if runner and advantages[runner.id] else None
        if runner and counter:
            verdict += f" The {short_name(runner)} {counter}."

    return CompareResult(
        productIds=ids,
        rows=rows,
        advantages={pid: [str(a["text"]) for a in advantages[pid]] for pid in ids},
        predicates={pid: [str(a["predicate"]) for a in advantages[pid]] for pid in ids},
        scores=scores,
        winnerId=winner_id,
        verdict=verdict,
    )
