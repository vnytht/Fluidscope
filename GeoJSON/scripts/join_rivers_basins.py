"""
Tag every river segment with the level-12 basin it falls inside.

WHAT THIS SCRIPT DOES
----------------------
1. Reads rivers_viana.geojson (521 river segments) and
   watershed_viana_district_lev12.geojson (53 basins).
2. Makes sure both are in the same coordinate system (WGS84 lat/lon).
3. Does a "spatial join": for each river segment, finds which basin polygon
   it sits inside, and copies that basin's HYBAS_ID onto the segment.
   - A river segment usually sits neatly inside exactly one basin.
   - Occasionally a segment touches more than one basin (e.g. it runs right
     along a basin edge). When that happens, we pick the basin it overlaps
     with the most, so every segment still ends up tagged with exactly one
     HYBAS_ID.
4. Cross-checks the result against HYBAS_L12 — the level-12 basin ID that
   HydroSHEDS already stamped onto each river segment when they built
   HydroRIVERS. If our spatial join mostly agrees with their own labeling,
   that's a good sign the join worked correctly.
5. Saves the result as rivers_by_basin.geojson, ready to filter rivers by
   basin in QGIS.
"""
import sys

import pandas as pd

RIVERS_IN = "rivers_viana.geojson"
BASINS_IN = "watershed_viana_district_lev12.geojson"
OUTPUT_GEOJSON = "rivers_by_basin.geojson"

try:
    import geopandas as gpd
except ImportError:
    print(
        "geopandas isn't installed yet.\n"
        "Install it first, then run this script again:\n\n"
        "    pip install geopandas shapely\n"
    )
    sys.exit(1)

print(f"Step 1: Reading {RIVERS_IN} and {BASINS_IN} ...")
rivers = gpd.read_file(RIVERS_IN)
basins = gpd.read_file(BASINS_IN)
print(f"  -> {len(rivers)} river segments, {len(basins)} basins.")

print("Step 2: Checking both layers are in WGS84 lat/lon (EPSG:4326) ...")
for name, gdf in [("rivers", rivers), ("basins", basins)]:
    if gdf.crs is None:
        print(f"  -> {name}: no CRS found, assuming EPSG:4326.")
    elif gdf.crs.to_epsg() != 4326:
        print(f"  -> {name}: reprojecting from {gdf.crs} to EPSG:4326.")
    else:
        print(f"  -> {name}: already EPSG:4326.")
rivers = rivers if rivers.crs and rivers.crs.to_epsg() == 4326 else rivers.set_crs(epsg=4326, allow_override=rivers.crs is None).to_crs(epsg=4326)
basins = basins if basins.crs and basins.crs.to_epsg() == 4326 else basins.set_crs(epsg=4326, allow_override=basins.crs is None).to_crs(epsg=4326)

rivers = rivers.reset_index(drop=True)
rivers["_seg_id"] = rivers.index

print("Step 3: Spatial join — finding which basin each river segment intersects ...")
basins_slim = basins[["HYBAS_ID", "geometry"]]
joined = gpd.sjoin(rivers, basins_slim, how="left", predicate="intersects")
n_multi = joined["_seg_id"].duplicated().sum()
print(f"  -> {len(joined)} matches for {len(rivers)} segments "
      f"({n_multi} segment(s) touched more than one basin and need resolving).")

print("Step 4: For segments touching more than one basin, keeping the basin with the most overlap ...")
def pick_best_basin(group):
    if len(group) == 1:
        return group.iloc[0]["HYBAS_ID"]
    seg_geom = group.iloc[0].geometry
    best_id, best_len = None, -1
    for _, row in group.iterrows():
        if pd.isna(row["HYBAS_ID"]):
            continue
        basin_geom = basins.loc[basins["HYBAS_ID"] == row["HYBAS_ID"], "geometry"].iloc[0]
        overlap_len = seg_geom.intersection(basin_geom).length
        if overlap_len > best_len:
            best_len, best_id = overlap_len, row["HYBAS_ID"]
    return best_id

resolved = joined.groupby("_seg_id", group_keys=False).apply(pick_best_basin, include_groups=False)
rivers["HYBAS_ID"] = rivers["_seg_id"].map(resolved)

n_unmatched = rivers["HYBAS_ID"].isna().sum()
if n_unmatched:
    print(f"  -> Note: {n_unmatched} segment(s) didn't fall inside any basin "
          f"(likely right on the bounding-box edge) and are left unlabeled.")
else:
    print("  -> Every segment matched to a basin.")

print("Step 5: Cross-checking against HydroRIVERS' own HYBAS_L12 field ...")
if "HYBAS_L12" in rivers.columns:
    comparable = rivers.dropna(subset=["HYBAS_ID"])
    agree = (comparable["HYBAS_ID"] == comparable["HYBAS_L12"]).sum()
    print(f"  -> {agree} of {len(comparable)} segments ({agree/len(comparable):.0%}) "
          f"agree with HydroRIVERS' own basin label. A high percentage is a good sign.")
else:
    print("  -> HYBAS_L12 not present, skipping cross-check.")

rivers = rivers.drop(columns=["_seg_id"])

print(f"Step 6: Saving to {OUTPUT_GEOJSON} ...")
rivers.to_file(OUTPUT_GEOJSON, driver="GeoJSON")

print("\nDone!")
print(f"Result: {len(rivers)} river segments saved to {OUTPUT_GEOJSON}, each tagged with HYBAS_ID.")
