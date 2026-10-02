# Personal map

All geography is bundled locally. The map makes no third-party requests and needs no API key.

## Sources

- Countries, states/provinces, coastlines and lakes: [Natural Earth 1:10m](https://www.naturalearthdata.com/downloads/10m-cultural-vectors/), [public domain](https://www.naturalearthdata.com/about/terms-of-use/). This means a **1:10 million map scale**, not 10-meter ground accuracy. Global outlines are simplified for overview rendering; selected regions and nearby lakes retain more detail. Natural Earth's default de facto boundary convention is preserved.
- Elmhurst, Los Angeles, Providence and Berkeley municipal boundaries: [U.S. Census TIGERweb Incorporated Places](https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Places_CouSub_ConCity_SubMCD/MapServer/4), January 1, 2026 vintage. GEOIDs: `1723620`, `0644000`, `4459000`, `0606000` respectively.
- Haikou municipal boundary: [OpenStreetMap relation 2784613](https://www.openstreetmap.org/relation/2784613), retrieved October 1, 2026 through a single, identified, cached Nominatim request following its [usage policy](https://operations.osmfoundation.org/policies/nominatim/). The derived Haikou geometry in `world-land.json` is © OpenStreetMap contributors, licensed under [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/). Visible attribution links to [OpenStreetMap copyright](https://www.openstreetmap.org/copyright). The rest of the asset is derived from the public-domain sources above.

These are administrative polygons, not urban footprints. Municipal limits can include water and uninhabited land. Different sources, scales and vintages may not align perfectly. This is a personal context map, not a legal boundary reference. Markers are approximate city centers, not home or school addresses.

## Generation

`world-land.json` contains projected SVG paths and framing bounds. `projection.ts` uses [Equal Earth](https://github.com/d3/d3-geo/blob/main/src/projection/equalEarth.js), shared by all boundaries and markers. Country framing uses the largest landmass (the contiguous U.S.); state/province and city controls make small municipal outlines readable.

Put these files in a temporary source directory:

- `countries.geojson`: [ne_10m_admin_0_countries](https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_10m_admin_0_countries.geojson)
- `states.geojson`: [ne_10m_admin_1_states_provinces](https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_10m_admin_1_states_provinces.geojson)
- `lakes.geojson`: [ne_10m_lakes](https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_10m_lakes.geojson)
- `us-cities.geojson`: TIGERweb layer 4 query with `outSR=4326`, `f=geojson`, `outFields=BASENAME,STATE,GEOID,NAME`, and `where=(STATE='06' AND BASENAME IN ('Los Angeles','Berkeley')) OR (STATE='17' AND BASENAME='Elmhurst') OR (STATE='44' AND BASENAME='Providence')`.
- `haikou-osm.json`: cached Nominatim result for `Haikou, Hainan, China`, with `format=jsonv2&polygon_geojson=1&limit=1`. It must be the city administrative relation above, not a point or a district. Do not add public Nominatim calls to the website.

Run `node scripts/generate-world-map.mjs /path/to/source-directory app/map/world-land.json`. No source download occurs during a build. Country is soft slate, state/province sage, and city clay; matching controls act as the legend and focus each polygon.
