import pytest

from app.domain.catalog import (
    get_all_products,
    get_brands,
    get_product,
    text_score,
    tokenize,
)
from app.domain.chaos import ChaosConfig, resolve_chaos, roll_failure, simulate_latency
from app.domain.compare import compare_products, join_list, short_name
from app.domain.delivery import delivery_for
from app.domain.format import (
    format_in_digits,
    format_npr,
    format_storage,
    format_warranty,
    format_weight,
    initials,
    key_specs,
    spec_rows,
    stock_label,
    stock_level,
)


def test_format_in_digits() -> None:
    assert format_in_digits(0) == "0"
    assert format_in_digits(50) == "50"
    assert format_in_digits(500) == "500"
    assert format_in_digits(1000) == "1,000"
    assert format_in_digits(5499) == "5,499"
    assert format_in_digits(104500) == "1,04,500"
    assert format_in_digits(120000) == "1,20,000"
    assert format_in_digits(1000000) == "10,00,000"
    assert format_in_digits(-120000) == "-1,20,000"


def test_format_npr() -> None:
    assert format_npr(120000) == "NPR 1,20,000"
    assert format_npr(120000, prefix=False) == "1,20,000"
    assert format_npr(5499) == "NPR 5,499"


def test_format_weight() -> None:
    assert format_weight(500) == "500 g"
    assert format_weight(1000) == "1 kg"
    assert format_weight(1320) == "1.32 kg"
    assert format_weight(1460) == "1.46 kg"
    assert format_weight(2500) == "2.5 kg"


def test_format_storage() -> None:
    assert format_storage(256) == "256 GB"
    assert format_storage(512) == "512 GB"
    assert format_storage(1000) == "1 TB"
    assert format_storage(1024) == "1 TB"
    assert format_storage(2048) == "2 TB"


def test_format_warranty() -> None:
    assert format_warranty(0) == "None"
    assert format_warranty(12) == "1 yr"
    assert format_warranty(24) == "2 yr"
    assert format_warranty(6) == "6 mo"
    assert format_warranty(18) == "18 mo"


def test_stock_level_and_label() -> None:
    assert stock_level(0) == "out"
    assert stock_level(2) == "low"
    assert stock_level(3) == "low"
    assert stock_level(4) == "in"

    assert stock_label(0) == "Out of stock"
    assert stock_label(2) == "Only 2 left"
    assert stock_label(10) == "In stock"


def test_initials() -> None:
    assert initials("Lenovo", "IdeaPad Slim 5") == "LI"
    assert initials("Acer", "Swift Go 14") == "AS"
    assert initials("Apple", "") == "A"


def test_spec_rows_and_key_specs() -> None:
    products = get_all_products()
    laptop = next(p for p in products if p.category == "laptops")
    specs = spec_rows(laptop)
    assert any(s["key"] == "cpu" for s in specs)
    assert any(s["key"] == "ram" for s in specs)

    k_specs = key_specs(laptop)
    assert len(k_specs) == 3
    assert [s["key"] for s in k_specs] == ["ram", "battery", "weight"]


def test_delivery_for() -> None:
    ktm = delivery_for("Kathmandu")
    assert ktm.zone == "valley"
    assert ktm.days == "1–2 days"
    assert ktm.fee == 100
    assert ktm.freeOver == 5000

    patan = delivery_for("patan")
    assert patan.city == "Patan"
    assert patan.zone == "valley"

    pokhara = delivery_for("pokhara")
    assert pokhara.zone == "outside"
    assert pokhara.days == "3–5 days"
    assert pokhara.fee == 250
    assert pokhara.freeOver == 50000


def test_tokenize() -> None:
    tokens = tokenize("I need a laptop with 16GB RAM for Docker.")
    assert "laptop" in tokens
    assert "docker." in tokens
    assert "a" not in tokens
    assert "for" not in tokens
    assert tokenize("") == []
    assert tokenize(None) == []


def test_catalog_helpers() -> None:
    products = get_all_products()
    assert len(products) >= 28

    brands = get_brands("laptops")
    assert "Lenovo" in brands
    assert "Acer" in brands

    all_brands = get_brands()
    assert len(all_brands) > len(brands)

    p = get_product("lenovo-ideapad-slim-5-14")
    assert p is not None
    assert p.name == "IdeaPad Slim 5 14"
    assert get_product("nonexistent") is None

    score = text_score(p, ["ideapad", "ryzen"])
    assert score == 2
    assert text_score(p, []) == 1


@pytest.mark.asyncio
async def test_chaos_module() -> None:
    cfg = resolve_chaos(chaos_param=0.5, latency_param=0)
    assert cfg.failure_rate == 0.5
    assert cfg.latency_min == 0
    assert cfg.latency_max == 0

    took = await simulate_latency(cfg)
    assert took == 0

    no_fail = ChaosConfig(latency_min=0, latency_max=0, failure_rate=0.0)
    assert roll_failure(no_fail, mutation=False) is None
    assert roll_failure(no_fail, mutation=True) is None

    always_fail = ChaosConfig(latency_min=0, latency_max=0, failure_rate=1.0)
    assert roll_failure(always_fail, mutation=False) == "transient"
    outcomes = {roll_failure(always_fail, mutation=True) for _ in range(50)}
    assert "transient" in outcomes
    assert "silent" in outcomes


def test_compare_helpers() -> None:
    assert join_list([]) == ""
    assert join_list(["item1"]) == "item1"
    assert join_list(["item1", "item2"]) == "item1 and item2"
    assert join_list(["a", "b", "c"]) == "a, b and c"

    products = get_all_products()
    p1 = products[0]
    assert short_name(p1) is not None

    single_res = compare_products([p1])
    assert single_res.verdict == "Add another product to compare."


def test_compare_boundary_margin_exactly_2() -> None:
    from app.domain.models import Product, ProductSpecs

    p1 = Product(
        id="oos-1",
        name="Laptop 1",
        brand="BrandX",
        category="laptops",
        price=100000,
        rating=4.5,
        reviewCount=10,
        blurb="Test laptop 1",
        palette=("#000000", "#ffffff"),
        stock=0,
        tags=["laptop"],
        specs=ProductSpecs(ramGB=32, warrantyMonths=24, storageGB=512, batteryHours=10, weightGrams=1400, screen='14"', cpu="i7"),
    )
    p2 = Product(
        id="in-2",
        name="Laptop 2",
        brand="BrandX",
        category="laptops",
        price=100000,
        rating=4.5,
        reviewCount=10,
        blurb="Test laptop 2",
        palette=("#000000", "#ffffff"),
        stock=5,
        tags=["laptop"],
        specs=ProductSpecs(ramGB=16, warrantyMonths=12, storageGB=512, batteryHours=10, weightGrams=1400, screen='14"', cpu="i7"),
    )
    # p1 wins ram (1.0 pt) and warranty (1.0 pt) with priorities=[] -> score 2.0 vs 0.0, margin = 2.0
    r = compare_products([p1, p2], priorities=[])
    assert r.scores["oos-1"] == 2.0
    assert r.scores["in-2"] == 0.0
    assert r.winnerId == "in-2"
    assert "currently out of stock; the in-stock Laptop 2 is the recommended pick" in r.verdict


def test_compare_boundary_margin_just_over_2() -> None:
    from app.domain.models import Product, ProductSpecs

    p1 = Product(
        id="oos-1",
        name="Laptop 1",
        brand="BrandX",
        category="laptops",
        price=100000,
        rating=4.5,
        reviewCount=10,
        blurb="Test laptop 1",
        palette=("#000000", "#ffffff"),
        stock=0,
        tags=["laptop"],
        specs=ProductSpecs(ramGB=32, warrantyMonths=24, storageGB=1000, batteryHours=10, weightGrams=1400, screen='14"', cpu="i7"),
    )
    p2 = Product(
        id="in-2",
        name="Laptop 2",
        brand="BrandX",
        category="laptops",
        price=100000,
        rating=4.5,
        reviewCount=10,
        blurb="Test laptop 2",
        palette=("#000000", "#ffffff"),
        stock=5,
        tags=["laptop"],
        specs=ProductSpecs(ramGB=16, warrantyMonths=12, storageGB=512, batteryHours=10, weightGrams=1400, screen='14"', cpu="i7"),
    )
    # p1 wins ram (1 pt) + warranty (1 pt) + storage (1 pt) = 3.0 pts vs 0.0 pts. Margin = 3.0 > 2.0
    r = compare_products([p1, p2], priorities=[])
    assert r.scores["oos-1"] == 3.0
    assert r.scores["in-2"] == 0.0
    assert r.winnerId == "oos-1"
    assert "(currently out of stock)" in r.verdict


def test_compare_3_to_4_products_and_storage_normalization() -> None:
    from app.domain.models import Product, ProductSpecs

    def make_laptop(pid: str, **kwargs: object) -> Product:
        specs_dict = dict(ramGB=16, storageGB=512, batteryHours=10, weightGrams=1400, warrantyMonths=12, screen='14"', cpu="i7")
        if "specs" in kwargs:
            specs_dict.update(kwargs.pop("specs"))  # type: ignore[arg-type]
        d = dict(
            id=pid,
            name=f"Laptop {pid}",
            brand="BrandX",
            category="laptops",
            price=100000,
            rating=4.5,
            reviewCount=10,
            blurb=f"Blurb {pid}",
            palette=("#000000", "#ffffff"),
            stock=5,
            tags=["laptop"],
            specs=ProductSpecs(**specs_dict),
        )
        d.update(kwargs)
        return Product(**d)

    p1 = make_laptop("l1", price=80000)
    p2 = make_laptop("l2", price=90000, specs=dict(batteryHours=15))
    p3 = make_laptop("l3", price=100000, specs=dict(weightGrams=1100))
    p4 = make_laptop("l4", price=110000, specs=dict(ramGB=32, storageGB=1000))

    r = compare_products([p1, p2, p3, p4])
    assert len(r.productIds) == 4
    assert r.productIds == ["l1", "l2", "l3", "l4"]

    # Storage row normalizes to TB since p4 has 1000 GB
    storage_row = next(row for row in r.rows if row.key == "storage")
    assert storage_row.values["l1"] == "0.5 TB"
    assert storage_row.values["l4"] == "1 TB"


def test_compare_all_out_of_stock() -> None:
    from app.domain.models import Product, ProductSpecs

    p1 = Product(
        id="oos-1",
        name="Laptop 1",
        brand="BrandX",
        category="laptops",
        price=80000,
        rating=4.5,
        reviewCount=10,
        blurb="Test laptop 1",
        palette=("#000000", "#ffffff"),
        stock=0,
        tags=["laptop"],
        specs=ProductSpecs(ramGB=16, warrantyMonths=12, storageGB=512, batteryHours=10, weightGrams=1400, screen='14"', cpu="i7"),
    )
    p2 = Product(
        id="oos-2",
        name="Laptop 2",
        brand="BrandX",
        category="laptops",
        price=100000,
        rating=4.5,
        reviewCount=10,
        blurb="Test laptop 2",
        palette=("#000000", "#ffffff"),
        stock=0,
        tags=["laptop"],
        specs=ProductSpecs(ramGB=16, warrantyMonths=12, storageGB=512, batteryHours=10, weightGrams=1400, screen='14"', cpu="i7"),
    )
    r = compare_products([p1, p2])
    assert r.winnerId == "oos-1"
    assert "(currently out of stock)" in r.verdict
