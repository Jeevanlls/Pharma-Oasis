"""Build a public review snapshot from explicitly supplied read-only source exports.

Usage: python3 script/build-commercial-review.py APP_JSON WEB_JSON OUTPUT_GZ AUDIT_JSON
APP_JSON contains selected, non-archived inventory rows. WEB_JSON contains only
brands, brandEans, products and categories. No database credentials are needed.
"""
import collections
import gzip
import hashlib
import json
import pathlib
import re
import sys


def norm(value):
    return re.sub(r"[^a-z0-9]", "", (value or "").lower())


def barcode(value):
    value = re.sub(r"\s+", "", value or "")
    return value if re.fullmatch(r"(?:[0-9]{8}|[0-9]{12,14})", value) else None


def build(app, web):
    aliases = {"valupak": 96, "warrior": 99, "maxdry": 32, "nanny": 29,
               "byphassse": 57, "pgtips": 33, "lipton": 33}
    brands = [{"id": int(b["id"]), "name": {31: "Myprotein", 30: "Myvitamins"}.get(int(b["id"]), b["name"]),
               "isActive": True, "isDirectDistributor": False} for b in web["brands"]]
    by_name = {norm(b["name"]): b["id"] for b in brands} | aliases
    approved = {b["id"] for b in brands}
    pm_eans = collections.defaultdict(set)
    for row in web["brandEans"]:
        if barcode(row["ean"]):
            pm_eans[barcode(row["ean"])].add(int(row["brand_id"]))
    web_eans = collections.defaultdict(list)
    for row in web["products"]:
        if barcode(row["ean"]):
            web_eans[barcode(row["ean"])].append(row)
    categories = {norm(c["name"]): {"id": int(c["id"]), "name": c["name"]} for c in web["categories"]}
    audit = {"brandDifferences": [], "temporaryReferences": [], "duplicateEans": [], "excluded": []}
    products, used_eans = [], set()
    for row in sorted(app, key=lambda p: int(p["id"])):
        ean = barcode(row["ean"])
        pm_ids = pm_eans.get(ean, set())
        app_brand = by_name.get(norm(row["brand"]))
        # Commercial grouping follows an unambiguous PM EAN first. Other app
        # products enter through the verified brand name or explicit aliases.
        brand_id = next(iter(pm_ids)) if len(pm_ids) == 1 else app_brand
        if brand_id not in approved:
            audit["excluded"].append({"id": row["id"], "ean": ean, "reason": "No unambiguous commercial brand"})
            continue
        if ean and ean in used_eans:
            audit["duplicateEans"].append({"id": row["id"], "ean": ean})
            continue
        if ean:
            used_eans.add(ean)
        else:
            audit["temporaryReferences"].append({"id": row["id"], "reference": row["ean"]})
        if pm_ids and app_brand != brand_id:
            audit["brandDifferences"].append({"ean": ean, "appBrand": row["brand"], "commercialBrandId": brand_id})
        matches = sorted(web_eans.get(ean, []), key=lambda p: (not (p["is_active"] is True or p["is_active"] == "t"), int(p["id"])))
        existing = matches[0] if matches else None
        image = next((p["image_url"] for p in matches if p["image_url"]), None)
        # Previously approved website photos are retained by EAN. App image_url
        # includes web pages, example.com placeholders and unverified external
        # links, so those await the future photo-review workflow.
        category_name = (row["category"] or "").strip() or "Uncategorised"
        category_key = norm(category_name)
        if category_key not in categories:
            ident = -1 - int.from_bytes(hashlib.sha256(category_key.encode()).digest()[:4], "big") % 1_000_000_000
            categories[category_key] = {"id": ident, "name": category_name}
        products.append({
            "id": int(existing["id"]) if existing else -int(row["id"]),
            "productName": row["name"], "ean": ean,
            "sku": existing["sku"] if existing else (row["ean"] or f"APP-{row['id']}"),
            "imageUrl": image, "brandId": brand_id,
            "categoryId": categories[category_key]["id"],
            "packSize": row["pack_size"] or (existing["pack_size"] if existing else None),
            "caseSize": str(row["case_size"]) if row["case_size"] else (existing["case_size"] if existing else None),
            "slug": existing["slug"] if existing else None,
            "productType": row["status"], "isActive": True,
        })
    products.sort(key=lambda p: (p["productName"].casefold(), p["id"]))
    for b in brands:
        b["productCount"] = sum(p["brandId"] == b["id"] for p in products)
        b["imageCount"] = sum(p["brandId"] == b["id"] and bool(p["imageUrl"]) for p in products)
    brands.sort(key=lambda b: b["name"].casefold())
    used_categories = {p["categoryId"] for p in products}
    categories = sorted((c for c in categories.values() if c["id"] in used_categories), key=lambda c: c["name"].casefold())
    assert len({p["id"] for p in products}) == len(products), "ID collision"
    assert len({c["id"] for c in categories}) == len(categories), "Category collision"
    counts = {"products": len(products), "brands": len(brands), "brandsWithProducts": sum(b["productCount"] > 0 for b in brands),
              "withImages": sum(bool(p["imageUrl"]) for p in products), "temporaryReferences": len(audit["temporaryReferences"])}
    counts["withoutImages"] = counts["products"] - counts["withImages"]
    result = {"capturedAt": "2026-09-30", "source": "Active app products in the verified Price Manager commercial range; review snapshot",
              "stats": counts, "brands": brands, "categories": categories, "products": products}
    audit["counts"] = counts
    return result, audit


if __name__ == "__main__":
    app_path, web_path, out_path, audit_path = map(pathlib.Path, sys.argv[1:])
    result, audit = build(json.loads(app_path.read_text()), json.loads(web_path.read_text()))
    payload = json.dumps(result, ensure_ascii=False, separators=(",", ":")).encode()
    out_path.write_bytes(gzip.compress(payload, mtime=0))
    audit_path.write_text(json.dumps(audit, indent=2))
    print(json.dumps({**result["stats"], "rawBytes": len(payload), "compressedBytes": out_path.stat().st_size,
                      "excluded": len(audit["excluded"]), "duplicateEans": len(audit["duplicateEans"]),
                      "campaignBrands": [b for b in result["brands"] if b["id"] in [30,31,41,44,28,36]],
                      "brandsWithoutAppMatches": [b["name"] for b in result["brands"] if not b["productCount"]]}, indent=2))
