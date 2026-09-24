[out:json][timeout:90];
(
  way["natural"="water"](41.35,-9.15,42.05,-8.25);
  relation["natural"="water"](41.35,-9.15,42.05,-8.25);
  way["waterway"="riverbank"](41.35,-9.15,42.05,-8.25);
  relation["waterway"="riverbank"](41.35,-9.15,42.05,-8.25);
  way["landuse"="reservoir"](41.35,-9.15,42.05,-8.25);
  relation["landuse"="reservoir"](41.35,-9.15,42.05,-8.25);
  way["landuse"="basin"](41.35,-9.15,42.05,-8.25);
);
out tags geom;
