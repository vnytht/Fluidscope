"""Orient the local HydroRIVERS reaches downhill and restore downstream topology.

The source export retained geometry and IDs but omitted NEXT_DOWN. This deterministic
build step samples the bundled WGS84 DEM, orients each reach from high to low, and
matches its outlet to the next reach's inlet at HydroRIVERS confluence vertices.
"""

import json
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "src/data/rivers_by_basin.geojson"
DEM = ROOT / "GeoJSON/dem_viana.tif"
OUTPUT = ROOT / "src/data/rivers_flow_network.geojson"


def coordinate_key(coordinate, precision=6):
    return f"{coordinate[0]:.{precision}f},{coordinate[1]:.{precision}f}"


def main_line(geometry):
    if geometry["type"] == "LineString":
        return geometry["coordinates"]
    return max(geometry["coordinates"], key=len)


def sample_elevation(image, longitude, latitude, origin_x, origin_y, pixel_x, pixel_y):
    column = round((longitude - origin_x) / pixel_x)
    row = round((origin_y - latitude) / pixel_y)
    column = max(0, min(image.width - 1, column))
    row = max(0, min(image.height - 1, row))
    value = float(image.getpixel((column, row)))
    return None if value < -1000 else value


def endpoint_elevation(image, coordinates, start, transform):
    sample = coordinates[:4] if start else coordinates[-4:]
    values = [
        sample_elevation(image, lng, lat, *transform)
        for lng, lat in sample
    ]
    values = [value for value in values if value is not None]
    return sum(values) / len(values) if values else None


def reverse_geometry(geometry):
    if geometry["type"] == "LineString":
        geometry["coordinates"].reverse()
    else:
        geometry["coordinates"] = [list(reversed(line)) for line in reversed(geometry["coordinates"])]


def main():
    network = json.loads(SOURCE.read_text())
    image = Image.open(DEM)
    tiepoint = image.tag_v2[33922]
    pixel_scale = image.tag_v2[33550]
    transform = (tiepoint[3], tiepoint[4], pixel_scale[0], pixel_scale[1])

    for feature in network["features"]:
        coordinates = main_line(feature["geometry"])
        start_elevation = endpoint_elevation(image, coordinates, True, transform)
        end_elevation = endpoint_elevation(image, coordinates, False, transform)
        if start_elevation is not None and end_elevation is not None and start_elevation < end_elevation:
            reverse_geometry(feature["geometry"])
            start_elevation, end_elevation = end_elevation, start_elevation
        feature["properties"]["ELEV_UP_M"] = None if start_elevation is None else round(start_elevation, 1)
        feature["properties"]["ELEV_DN_M"] = None if end_elevation is None else round(end_elevation, 1)

    inlets = {}
    for feature in network["features"]:
        coordinates = main_line(feature["geometry"])
        inlets.setdefault(coordinate_key(coordinates[0]), []).append(feature)

    for feature in network["features"]:
        coordinates = main_line(feature["geometry"])
        candidates = [
            candidate
            for candidate in inlets.get(coordinate_key(coordinates[-1]), [])
            if candidate["properties"]["HYRIV_ID"] != feature["properties"]["HYRIV_ID"]
        ]
        candidates.sort(
            key=lambda candidate: (
                int(candidate["properties"].get("ORD_STRA") or 0),
                len(main_line(candidate["geometry"])),
            ),
            reverse=True,
        )
        feature["properties"]["NEXT_DOWN"] = (
            int(candidates[0]["properties"]["HYRIV_ID"]) if candidates else 0
        )

    network["name"] = "rivers_flow_network"
    network["metadata"] = {
        "method": "HydroRIVERS geometry oriented using dem_viana.tif endpoint elevations; NEXT_DOWN restored by shared confluence vertices",
        "source": "rivers_by_basin.geojson",
    }
    OUTPUT.write_text(json.dumps(network, separators=(",", ":")))

    linked = sum(feature["properties"]["NEXT_DOWN"] != 0 for feature in network["features"])
    reversed_count = sum(
        (feature["properties"]["ELEV_UP_M"] or 0) > (feature["properties"]["ELEV_DN_M"] or 0)
        for feature in network["features"]
    )
    print(f"Wrote {len(network['features'])} reaches; {linked} downstream links; {reversed_count} downhill-oriented reaches")


if __name__ == "__main__":
    main()
