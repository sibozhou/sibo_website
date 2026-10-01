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
