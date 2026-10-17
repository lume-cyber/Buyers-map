// Illustrative routes, not navigation data. Coordinates are [latitude, longitude].
const airRoutes = [
  ['Dhaka – Dubai', [[23.8,90.4],[25.3,55.4]]],
  ['Dubai – London', [[25.3,55.4],[41,30],[51.5,-0.5]]],
  ['London – New York', [[51.5,-0.5],[55,-35],[40.7,-74]]],
  ['Singapore – Tokyo', [[1.3,103.8],[22,121],[35.7,139.8]]],
  ['Tokyo – Los Angeles', [[35.7,139.8],[48,175],[45,-150],[34,-118.4]]],
  ['Singapore – Sydney', [[1.3,103.8],[-15,125],[-33.9,151.2]]],
];
const seaRoutes = [
  ['Bay of Bengal', [[20,90],[15,87],[8,85],[5,82]]],
  ['Arabian Sea', [[7,75],[10,65],[17,60],[23,60]]],
  ['North Atlantic', [[47,-10],[43,-25],[37,-45],[32,-65]]],
  ['Pacific Ocean', [[30,145],[32,170],[32,-170],[30,-145],[30,-125]]],
  ['South China Sea', [[5,108],[10,112],[16,115],[20,118]]],
  ['Indian Ocean', [[-12,55],[-15,70],[-18,85],[-22,100]]],
];
const radians = (value) => value * Math.PI / 180;
const wrap = (value) => ((value + 180) % 360 + 360) % 360 - 180;

function createTraffic(routes, kind, perRoute, duration) {
  return routes.flatMap(([route, waypoints], index) => Array.from({length: perRoute}, (_, offset) => ({
    id: `${kind}-${index}-${offset}`, kind, route, waypoints,
    name: `${kind === 'flight' ? 'Demo Flight' : 'Demo Vessel'} ${index * perRoute + offset + 1}`,
    duration: duration + index * 5, phase: offset / perRoute + index * 0.07,
    color: kind === 'flight' ? '#67e8f9' : '#ffffff',
  })));
}
export const simulatedFlights = createTraffic(airRoutes, 'flight', 3, 45);
export const simulatedVessels = createTraffic(seaRoutes, 'vessel', 2, 65);

export function positionAt(vehicle, elapsed) {
  // Ping-pong at route ends: no teleporting from arrival back to departure.
  const cycle = ((elapsed / vehicle.duration + vehicle.phase) % 2 + 2) % 2;
  const reverse = cycle >= 1;
  const progress = reverse ? 2 - cycle : cycle;
  const segment = progress * (vehicle.waypoints.length - 1);
  const index = Math.min(Math.floor(segment), vehicle.waypoints.length - 2);
  const fraction = segment - index;
  const [lat1, lng1] = vehicle.waypoints[index];
  const [lat2, lng2] = vehicle.waypoints[index + 1];
  const deltaLng = wrap(lng2 - lng1);
  const lat = lat1 + (lat2 - lat1) * fraction;
  const lng = wrap(lng1 + deltaLng * fraction);
  const heading = (Math.atan2(deltaLng * Math.cos(radians(lat)), lat2 - lat1) * 180 / Math.PI + (reverse ? 180 : 0) + 360) % 360;
  return { ...vehicle, lat, lng, heading };
}
