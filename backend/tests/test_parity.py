import json
from pathlib import Path
from typing import Any

import pytest

from app.domain.catalog import search_products
from app.domain.compare import compare_products
from app.domain.models import CompareKey, Product, ProductQuery

FIXTURES_DIR = Path(__file__).parent / "fixtures"


@pytest.fixture(scope="module")
def catalog_products() -> list[Product]:
    with open(FIXTURES_DIR / "catalog.json", "r", encoding="utf-8") as f:
        data = json.load(f)
    return [Product.model_validate(p) for p in data]


@pytest.fixture(scope="module")
def query_fixtures() -> list[dict[str, Any]]:
    with open(FIXTURES_DIR / "queries.json", "r", encoding="utf-8") as f:
        data: list[dict[str, Any]] = json.load(f)
        return data


@pytest.fixture(scope="module")
def comparison_fixtures() -> list[dict[str, Any]]:
    with open(FIXTURES_DIR / "comparisons.json", "r", encoding="utf-8") as f:
        data: list[dict[str, Any]] = json.load(f)
        return data


def test_parity_query_fixtures_count(query_fixtures: list[dict[str, Any]]) -> None:
    assert len(query_fixtures) >= 25


def test_parity_comparison_fixtures_count(comparison_fixtures: list[dict[str, Any]]) -> None:
    assert len(comparison_fixtures) >= 5


def test_parity_catalog_queries(query_fixtures: list[dict[str, Any]], catalog_products: list[Product]) -> None:
    for case in query_fixtures:
        query_dict = case["query"]
        expected_result = case["result"]

        query = ProductQuery.model_validate(query_dict)
        actual_result = search_products(query, catalog_products)

        assert actual_result.total == expected_result["total"], (
            f"Total mismatch for query {query_dict}: expected {expected_result['total']}, got {actual_result.total}"
        )

        expected_ids = [p["id"] for p in expected_result["products"]]
        actual_ids = [p.id for p in actual_result.products]
        assert actual_ids == expected_ids, (
            f"Product ID sequence mismatch for query {query_dict}:\nExpected: {expected_ids}\nActual:   {actual_ids}"
        )


def test_parity_product_comparisons(comparison_fixtures: list[dict[str, Any]], catalog_products: list[Product]) -> None:
    by_id = {p.id: p for p in catalog_products}

    for case in comparison_fixtures:
        name = case.get("name", "unknown")
        product_ids = case["productIds"]
        options = case.get("options", {})
        expected = case["result"]

        prods = [by_id[pid] for pid in product_ids]
        priorities: list[CompareKey] | None = options.get("priorities")
        context: str | None = options.get("context")

        actual = compare_products(prods, priorities=priorities, context=context)

        assert actual.productIds == expected["productIds"], f"[{name}] productIds mismatch"
        assert actual.winnerId == expected["winnerId"], f"[{name}] winnerId mismatch"
        assert actual.verdict == expected["verdict"], (
            f"[{name}] verdict mismatch:\nExpected: {expected['verdict']}\nActual:   {actual.verdict}"
        )
        assert actual.advantages == expected["advantages"], f"[{name}] advantages mismatch"
        assert actual.predicates == expected["predicates"], f"[{name}] predicates mismatch"

        for exp_row in expected["rows"]:
            act_row = next((r for r in actual.rows if r.key == exp_row["key"]), None)
            assert act_row is not None, f"[{name}] Missing row {exp_row['key']}"
            assert act_row.winners == exp_row["winners"], (
                f"[{name}] Row {exp_row['key']} winners mismatch:\n"
                f"Expected: {exp_row['winners']}\nActual:   {act_row.winners}"
            )
            assert act_row.values == exp_row["values"], (
                f"[{name}] Row {exp_row['key']} values mismatch:\n"
                f"Expected: {exp_row['values']}\nActual:   {act_row.values}"
            )
