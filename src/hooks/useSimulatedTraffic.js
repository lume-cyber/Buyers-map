import { useEffect, useState } from 'react';
import { positionAt, simulatedFlights, simulatedVessels } from '../data/simulatedTraffic';

export function useSimulatedTraffic(paused, speed, interval = 50, showFlights = true, showVessels = true, lowGraphics = false) {
  const [clock] = useState(() => ({ elapsed: 0 }));
  const [vehicles] = useState(() => ({
    flights: simulatedFlights.map(vehicle => positionAt(vehicle, 0)),
    vessels: simulatedVessels.map(vehicle => positionAt(vehicle, 0)),
  }));
  const [traffic, setTraffic] = useState(vehicles);
  useEffect(() => {
    if (paused) return;
    let previous = performance.now();
    let timer;
    const update = () => {
      const now = performance.now();
      const delta = Math.min((now - previous) / 1000, 0.2);
      previous = now;
      if (document.hidden) return;
      clock.elapsed += delta * speed;
      // Preserve object identity so Three.js moves existing meshes instead of replacing them.
      if (showFlights) vehicles.flights.forEach((vehicle, index) => { if (!lowGraphics || index % 3 === 0) Object.assign(vehicle, positionAt(simulatedFlights[index], clock.elapsed)); });
      if (showVessels) vehicles.vessels.forEach((vehicle, index) => { if (!lowGraphics || index % 2 === 0) Object.assign(vehicle, positionAt(simulatedVessels[index], clock.elapsed)); });
      setTraffic({ flights: [...vehicles.flights], vessels: [...vehicles.vessels] });
    };
    const visibility = () => {
      clearInterval(timer);
      if (!document.hidden) { previous = performance.now(); timer = setInterval(update, interval); }
    };
    visibility();
    document.addEventListener('visibilitychange', visibility);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', visibility); };
  }, [paused, speed, interval, clock, vehicles, showFlights, showVessels, lowGraphics]);
  return traffic;
}
