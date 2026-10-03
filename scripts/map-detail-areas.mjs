import geography from "../app/map/world-land.json" with { type: "json" };

// [south, west, north, east]. Keep the metropolitan context, but derive the
// minimum coverage from the same municipal boundaries shown by the map.
const surroundings = {
  haikou: [19.725, 109.7, 20.225, 110.9],
  elmhurst: [41.675, -88.23, 42.135, -87.6],
  "los-angeles": [33.64, -118.775, 34.52, -117.875],
  providence: [41.45, -71.65, 42.15, -71.15],
  berkeley: [37.55, -122.65, 38.2, -121.85],
};

export const cityDetailAreas = Object.fromEntries(Object.keys(surroundings).map(id => {
  const [left, top, right, bottom] = geography.closeup.cities[id].bounds;
  const longitude = x => (x - 500) / 140 * 180 / Math.PI;
  const latitude = y => (2 * Math.atan(Math.exp((270 - y) / 140)) - Math.PI / 2) * 180 / Math.PI;
  const bounds = [latitude(bottom) - .025, longitude(left) - .025, latitude(top) + .025, longitude(right) + .025];
  return [id, bounds.map((value, index) => (index < 2 ? Math.floor(value * 1000) : Math.ceil(value * 1000)) / 1000)];
}));

export const detailAreas = Object.fromEntries(Object.entries(surroundings).map(([id, bounds]) => [id,
  bounds.map((value, index) => (index < 2 ? Math.min : Math.max)(value, cityDetailAreas[id][index])),
]));
