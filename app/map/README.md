# Personal map

All geography is bundled locally. The map makes no third-party requests and needs no API key.

Mouse/trackpad wheel input zooms around the pointer; left-button dragging pans the map. The wheel listener is non-passive and attached only to the map canvas, so scrolling outside the map is unchanged. Pointer capture keeps a drag active outside the canvas and is released on pointer-up/cancel. Pin buttons do not start a drag. Touch input retains native page scrolling; the existing zoom and boundary buttons remain available on every device. Direct gestures have no delayed CSS easing; preset views retain their existing transitions. `world view` resets both pan and zoom.

## Sources

- Countries, states/provinces, coastlines and lakes: [Natural Earth 1:10m](https://www.naturalearthdata.com/downloads/10m-cultural-vectors/), [public domain](https://www.naturalearthdata.com/about/terms-of-use/). This means a **1:10 million map scale**, not 10-meter ground accuracy. The U.S. outline is dissolved from the same state polygons used for its divisions, rather than a separate country polygon. Global context is simplified; shared edges retain the finest detail required by any referring layer.
- China uses Natural Earth's [China-POV country geography](https://www.naturalearthdata.com/blog/admin-0-countries-point-of-views/) in all three language versions. The highlighted extent includes Taiwan and the separate Hong Kong/Macau features. [China maritime indicators](https://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-admin-0-boundary-lines/) are nine open line segments, not a filled sea polygon. They represent disputed claims, identified in the visible map note. This is not a certified Chinese government standard map or an exact reproduction of a current official ten-dash map. Other countries retain the default de facto source.
- Elmhurst, Los Angeles, Providence and Berkeley municipal boundaries: [U.S. Census TIGERweb Incorporated Places](https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Places_CouSub_ConCity_SubMCD/MapServer/4), January 1, 2026 vintage. GEOIDs: `1723620`, `0644000`, `4459000`, `0606000` respectively.
- Haikou municipal boundary: [OpenStreetMap relation 2784613](https://www.openstreetmap.org/relation/2784613), retrieved October 1, 2026 through a single, identified, cached Nominatim request following its [usage policy](https://operations.osmfoundation.org/policies/nominatim/). The derived Haikou geometry in `world-land.json` is © OpenStreetMap contributors, licensed under [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/). Visible attribution links to [OpenStreetMap copyright](https://www.openstreetmap.org/copyright). The rest of the asset is derived from the public-domain sources above.

These are administrative polygons, not urban footprints. Municipal limits can include water and uninhabited land. Shared source edges are kept coincident, but a city boundary is not necessarily a land coastline: municipal water limits and genuine differences between sources/vintages are preserved, not clipped or snapped to a coarser coastline. This is a personal context map, not a legal boundary reference. Markers are approximate city centers, not home or school addresses.

## Generation

`world-land.json` contains projected SVG paths and framing bounds. The world overview uses [Equal Earth](https://github.com/d3/d3-geo/blob/main/src/projection/equalEarth.js); `closeup` uses north-up [Mercator](https://github.com/d3/d3-geo/blob/main/src/projection/mercator.js) so close-up meridians are vertical, without rotation or perspective tilt. Mercator latitudes are clamped at ±85.05112878° to avoid infinite pole coordinates. Each view uses the same projection for all boundaries, lakes, markers and framing bounds. U.S. country framing uses the contiguous landmass; China's country view also includes Taiwan and the maritime indicators. State/province and city controls make small municipal outlines readable.

The generator uses build-only TopoJSON tools to identify shared country/state/city arcs before projection. Each arc is projected, simplified and rounded once, using the finest tolerance/precision needed by any of its layers; reversed references reuse those same coordinates. State divisions are an internal-border mesh, not separately simplified closed outlines. The world backdrop draws China and the U.S. directly from their country paths, avoiding both duplicate geometry and even-odd cancellation where POV areas overlap other source countries. No TopoJSON library is shipped to the browser. Regression tests check coincident world/country paths, every selected region edge, and a city/country/state shared-coast fixture in both projections.

Put these files in a temporary source directory:

- `countries.geojson`: [ne_10m_admin_0_countries](https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_10m_admin_0_countries.geojson)
- `countries-china-pov.geojson`: [ne_10m_admin_0_countries_chn](https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_10m_admin_0_countries_chn.geojson)
- `china-maritime.geojson`: [ne_10m_admin_0_boundary_lines_maritime_indicator_chn](https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_10m_admin_0_boundary_lines_maritime_indicator_chn.geojson)
- `states.geojson`: [ne_10m_admin_1_states_provinces](https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_10m_admin_1_states_provinces.geojson)
- `lakes.geojson`: [ne_10m_lakes](https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_10m_lakes.geojson)
- `us-cities.geojson`: TIGERweb layer 4 query with `outSR=4326`, `f=geojson`, `outFields=BASENAME,STATE,GEOID,NAME`, and `where=(STATE='06' AND BASENAME IN ('Los Angeles','Berkeley')) OR (STATE='17' AND BASENAME='Elmhurst') OR (STATE='44' AND BASENAME='Providence')`.
- `haikou-osm.json`: cached Nominatim result for `Haikou, Hainan, China`, with `format=jsonv2&polygon_geojson=1&limit=1`. It must be the city administrative relation above, not a point or a district. Do not add public Nominatim calls to the website.

Run `node scripts/generate-world-map.mjs /path/to/source-directory app/map/world-land.json`. No source download occurs during a build. Country is soft slate, state/province sage, and city clay; matching controls act as the legend and focus each polygon.

## Zoom details

The world overview stays uncluttered. Zooming reveals city names and airport codes from Natural Earth, then major roads and railways in the China/contiguous-U.S. context. Closer views use finer OpenStreetMap extracts around the five places: main and arterial roads, railways, stations, airport runways, and nearby towns/neighbourhoods. Fine routes replace regional routes inside the extract's projected coverage rectangle; regional routes remain outside, without drawing both datasets on top of one another. This is curated local coverage, not a complete global street atlas or a navigation service. Natural Earth's transport geometry is regional context, not street-level accuracy.

Detail files in `public/map-details/` are lazy-loaded from the website's own origin. They require no external map API, account, key or runtime Overpass requests. Repeated zooms reuse the downloads; switching places cannot display a late response from the previous place. The boundary asset and its shared topology are unchanged by the detail generator. Every detail coordinate uses the same north-up Mercator projection as the close-up boundaries. SVG routes remain geographically aligned; labels stay screen-sized and are placed without overlapping one another or the five pin buttons. Smaller screens have a lower label limit. Native scrolling outside the map and existing wheel/pan controls are unchanged. Large municipalities allow additional zoom to reach the urban detail; country/state/city preset framing is unchanged.

Sources:

- Natural Earth `ne_10m_populated_places`, `ne_10m_airports`, `ne_10m_roads`, and `ne_10m_railroads`, public domain. Source-provided English, simplified/traditional Chinese names are used where available; local names remain when no translation is supplied. Airport labels use IATA codes.
- © OpenStreetMap contributors, [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/). The five city detail files are derived OSM databases under that license. Each records its source timestamp. The download script requests small regional extracts sequentially through [Overpass](https://wiki.openstreetmap.org/wiki/Overpass_API#Public_Overpass_API_instances), caches each completed response, and stops on service errors instead of retrying aggressively. Retain the visible OpenStreetMap attribution when redistributing these assets.

To regenerate, run these manually with Node 22.13+; neither command is part of the website build:

```sh
node scripts/download-map-details.mjs /path/to/source-directory
node scripts/generate-map-details.mjs /path/to/source-directory public/map-details
```

The downloader caches `ne-{populated_places,airports,roads,railroads}.geojson` and `osm-{haikou,elmhurst,los-angeles,providence,berkeley}.json`. Keep these large raw sources outside the repository. After an Overpass timeout, wait before resuming; successful cached extracts are not downloaded again. The generator produces only compact projected paths and selected labels, with no third-party JavaScript or map SDK.
