import { forwardRef, useMemo } from 'react';
import Globe from 'react-globe.gl';
import { useSimulatedTraffic } from '../hooks/useSimulatedTraffic';

// Animation updates stay inside the canvas, leaving the dashboard and forms alone.
export default forwardRef(function TrafficGlobe({ paused, speed, showFlights, showVessels, lowGraphics, ...props }, ref) {
  const { flights, vessels } = useSimulatedTraffic(paused || (!showFlights && !showVessels), speed, lowGraphics ? 150 : 50, showFlights, showVessels, lowGraphics);
  const objects = useMemo(() => [
    ...(showFlights ? flights.filter((_, index) => !lowGraphics || index % 3 === 0) : []),
    ...(showVessels ? vessels.filter((_, index) => !lowGraphics || index % 2 === 0) : []),
  ], [flights, vessels, showFlights, showVessels, lowGraphics]);
  return <Globe {...props} ref={ref} objectsData={objects} />;
});
