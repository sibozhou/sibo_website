# World map

The self-hosted land silhouettes use [Natural Earth 1:110m land data](https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_110m_land.geojson), which is [public domain](https://www.naturalearthdata.com/about/terms-of-use/). No country boundaries, map service, or access token are used.

`world-land.json` contains pre-projected paths. `projection.ts` uses the Equal Earth projection and the same coordinate system for city markers. The projection formula is described in [D3's Equal Earth implementation](https://github.com/d3/d3-geo/blob/main/src/projection/equalEarth.js).

To regenerate the paths, download the GeoJSON above and run `node scripts/generate-world-map.mjs /path/to/ne_110m_land.geojson`. Its output replaces `world-land.json`. City coordinates are approximate city centers, not street addresses.
