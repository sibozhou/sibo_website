// Equal Earth projection, fitted to a 1000 × 540 drawing area.
export function projectLocation(longitude: number, latitude: number) {
  const radians = Math.PI / 180;
  const theta = Math.asin(Math.sqrt(3) / 2 * Math.sin(latitude * radians));
  const squared = theta * theta;
  const sixth = squared ** 3;
  const x = longitude * radians * Math.cos(theta) / (Math.sqrt(3) / 2 * (1.340264 - 3 * .081106 * squared + sixth * (7 * .000893 + 9 * .003796 * squared)));
  const y = theta * (1.340264 - .081106 * squared + sixth * (.000893 + .003796 * squared));
  return { x: 500 + 170 * x, y: 270 - 170 * y };
}

// Mercator close-ups: north is up and meridians remain vertical at every zoom.
export function projectDetailLocation(longitude: number, latitude: number) {
  const radians = Math.PI / 180;
  const clamped = Math.max(-85.05112878, Math.min(85.05112878, latitude));
  return {
    x: 500 + 140 * longitude * radians,
    y: 270 - 140 * Math.log(Math.tan(Math.PI / 4 + clamped * radians / 2)),
  };
}

// Preserve the geographic point under the cursor when leaving the overview.
export function detailFromOverview(point: { x: number; y: number }) {
  const pole = Math.PI / 3;
  const limit = pole * (1.340264 - .081106 * pole ** 2 + pole ** 6 * (.000893 + .003796 * pole ** 2));
  const y = Math.max(-limit, Math.min(limit, (270 - point.y) / 170));
  let theta = y / 1.340264;
  for (let iteration = 0; iteration < 12; iteration++) {
    const squared = theta * theta, sixth = squared ** 3;
    const delta = (theta * (1.340264 - .081106 * squared + sixth * (.000893 + .003796 * squared)) - y) / (1.340264 - 3 * .081106 * squared + sixth * (7 * .000893 + 9 * .003796 * squared));
    theta -= delta;
    if (Math.abs(delta) < 1e-12) break;
  }
  const squared = theta * theta;
  const longitude = (point.x - 500) / 170 * (Math.sqrt(3) / 2) * (1.340264 - 3 * .081106 * squared + squared ** 3 * (7 * .000893 + 9 * .003796 * squared)) / Math.cos(theta);
  const latitude = Math.asin(Math.max(-1, Math.min(1, Math.sin(theta) / (Math.sqrt(3) / 2))));
  return projectDetailLocation(longitude * 180 / Math.PI, latitude * 180 / Math.PI);
}
