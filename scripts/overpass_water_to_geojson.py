"""Convert an Overpass `out geom` water query into display GeoJSON."""

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "scripts/water_bodies_overpass.json"
OUTPUT = ROOT / "public/data/water_bodies_viana.geojson"


def coordinates(geometry):
    return [[point["lon"], point["lat"]] for point in geometry or []]


def closed_polygon(geometry):
    points = coordinates(geometry)
    if len(points) < 4:
        return None
    if points[0] != points[-1]:
        points.append(points[0])
    return points


def feature(properties, ring, source_id):
    return {
        "type": "Feature",
        "properties": {
            "source": "OpenStreetMap",
            "osm_id": source_id,
            "name": properties.get("name"),
            "water": properties.get("water"),
            "natural": properties.get("natural"),
            "waterway": properties.get("waterway"),
            "landuse": properties.get("landuse"),
        },
        "geometry": {"type": "Polygon", "coordinates": [ring]},
    }


def main():
    payload = json.loads(SOURCE.read_text())
    features = []
    seen = set()

    for element in payload.get("elements", []):
        tags = element.get("tags", {})
        if element.get("type") == "way":
            ring = closed_polygon(element.get("geometry"))
            key = f"way/{element['id']}"
            if ring and key not in seen:
                features.append(feature(tags, ring, key))
                seen.add(key)
        elif element.get("type") == "relation":
            for member in element.get("members", []):
                if member.get("role") not in ("outer", ""):
                    continue
                ring = closed_polygon(member.get("geometry"))
                key = f"relation/{element['id']}/way/{member.get('ref')}"
                if ring and key not in seen:
                    features.append(feature(tags, ring, key))
                    seen.add(key)

    output = {
        "type": "FeatureCollection",
        "name": "water_bodies_viana",
        "metadata": {
            "source": "OpenStreetMap contributors via Overpass API",
            "query": "natural=water, waterway=riverbank, landuse=reservoir/basin",
        },
        "features": features,
    }
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(output, separators=(",", ":")))
    print(f"Wrote {len(features)} water polygons to {OUTPUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
