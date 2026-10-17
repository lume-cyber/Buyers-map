import "./responsive.css";
import { useAccount } from './AuthContext';
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buyerColor, mapColors, mapPixelRatio } from './data/mapStyle';
import TrafficGlobe from "./components/TrafficGlobe";
import GraphicsBoundary from './components/GraphicsBoundary';
import { createAircraftMarker, getAircraftRotation } from "./components/aircraftMarker";
import { createVesselMarker } from "./components/vesselMarker";

import KPIBar from "./components/KPIBar";
import Sidebar from "./components/Sidebar";
import FloatingBuyerProfile from "./components/FloatingBuyerProfile";
import { sourcingConnections } from "./data/buyerResearch";
import BuyerEditor from "./components/BuyerEditor";
import { useBuyerDirectory } from "./hooks/useBuyerDirectory";
import { countries } from "./data/countries";
import { opportunityScores } from "./data/opportunityScores";
import { simulatedFlights, simulatedVessels } from "./data/simulatedTraffic";



const DEFAULT_COUNTRY = "Hover a country";
const EMPTY_BUYERS = [];
const RENDERER_CONFIG = { antialias: false, alpha: false };
const GLOBAL_VIEW = { lat: 20, lng: 0, altitude: 2.5 };
const CHATTOGRAM_PORT = { lat: 22.3569, lng: 91.7832 };


const BANGLADESH_HUB = {
  kind: "buyer",
  buyer: "Impress Fashion Ltd",
  city: "Dhaka",
  country: "Bangladesh",
  lat: 23.8103,
  lng: 90.4125,
  color: mapColors.hub,
  isHub: true,
};

function getCountryName(polygon) {
  const name = polygon.properties.name || polygon.properties.ADMIN || "Unknown";
  return ({ 'United States of America': 'USA', 'United Kingdom': 'UK', 'Türkiye': 'Turkey' })[name] || name;
}
const COUNTRY_OPTIONS = [...new Set(countries.map(getCountryName))].filter(name => name !== 'Antarctica').sort();

const polygonSideColor = () => 'rgba(0,0,0,0)';
const polygonStrokeColor = () => '#64748b';

// Traffic uses custom objects; buyer locations remain point markers.
function createTrafficMarker(vehicle) {
  return vehicle.kind === 'vessel' ? createVesselMarker() : createAircraftMarker();
}

function getTrafficRotation(vehicle) {
  return vehicle.kind === 'vessel' ? { z: 0 } : getAircraftRotation(vehicle);
}

function getPointColor(point) {
  return point.name ? "#ffffff" : point.color;
}

function getPointAltitude(point) {
  return point.name ? 0.005 : 0.02;
}

function getPointRadius(point) {
  return point.isHub ? 0.32 : point.selected ? 0.27 : 0.15;
}

function escapeLabel(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
}

function getPointLabel(point) {
  if (point.kind === 'sourcing') return `${escapeLabel(point.country)} · Disclosed sourcing market<br />Country anchor, not a factory address`;
  if (point.kind === "flight" || point.kind === "vessel") {
    return `${point.kind === "flight" ? "✈" : "🚢"} ${escapeLabel(point.name)}<br />${escapeLabel(point.route)}<br />Simulated traffic · Accelerated movement`;
  }
  return `
${point.name ? "🚢" : "🏢"}

${escapeLabel(point.name || point.buyer)}

📍 ${escapeLabel(point.city || "At Sea")}

🌎 ${escapeLabel(point.country || "International Waters")}
  `;
}

function getRouteEstimate(buyer) {
  if (!buyer || !Number.isFinite(buyer.lat) || !Number.isFinite(buyer.lng)) return null;
  const radians = value => value * Math.PI / 180;
  const dLat = radians(buyer.lat - CHATTOGRAM_PORT.lat);
  const dLng = radians(buyer.lng - CHATTOGRAM_PORT.lng);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(radians(CHATTOGRAM_PORT.lat)) * Math.cos(radians(buyer.lat)) * Math.sin(dLng / 2) ** 2;
  const distance = Math.round((6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))) / 100) * 100;
  const sailingDays = Math.max(4, Math.round(distance / 650));
  return {
    startLat: CHATTOGRAM_PORT.lat, startLng: CHATTOGRAM_PORT.lng,
    endLat: buyer.lat, endLng: buyer.lng,
    color: mapColors.export, buyer: buyer.buyer,
    distance, minimumDays: sailingDays + 4, maximumDays: sailingDays + 11,
  };
}

const getArcDashLength = route => route.kind === 'sourcing' ? 1 : 0.35;
const getArcDashGap = route => route.kind === 'sourcing' ? 0 : 0.12;
const getArcDashTime = route => route.kind === 'sourcing' ? 0 : 1800;

function getExportRouteLabel(route) {
  if (route.kind === 'sourcing') return `${escapeLabel(route.country)} → ${escapeLabel(route.scope)}<br />Disclosed sourcing relationship · Not a shipping route<br />${escapeLabel(route.source.period)} · Checked ${escapeLabel(route.source.checkedAt)}`;
  return `Estimated export route: Chattogram → ${escapeLabel(route.buyer)}<br />Direct map distance: ${route.distance.toLocaleString()} km<br />Illustrative transit range: ${route.minimumDays}–${route.maximumDays} days`;
}

function useGlobeRotation(globeRef, enabled) {
  useEffect(() => {
    const controls = globeRef.current?.controls();
    if (controls) { controls.autoRotate = enabled; controls.autoRotateSpeed = 0.15; }
  }, [globeRef, enabled]);
}

export default function App() {
  const account = useAccount();
  const canDelete = account?.role === 'super';
  const { records: buyerMarkers, status: directoryStatus, mutate } = useBuyerDirectory();
  const [editor, setEditor] = useState(null);
  const [notice, setNotice] = useState('');
  const globeRef = useRef(null);
  const containerRef = useRef(null);
  const trafficPanelRef = useRef(null);
  useEffect(() => {
    const closeOutside = event => {
      const panel = trafficPanelRef.current;
      if (panel?.open && !panel.contains(event.target)) panel.open = false;
    };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('focusin', closeOutside);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('focusin', closeOutside);
    };
  }, []);
  function closeTrafficPanel() {
    const panel = trafficPanelRef.current;
    if (!panel) return;
    panel.open = false;
    panel.querySelector('summary')?.focus({ preventScroll: true });
  }
  const [globeSize, setGlobeSize] = useState({ width: 1, height: 1 });
  const [buyersOpen, setBuyersOpen] = useState(false);
  useEffect(() => {
    const container = containerRef.current;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setGlobeSize({ width: Math.max(1, Math.floor(width)), height: Math.max(1, Math.floor(height)) });
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);
  const [showFlights, setShowFlights] = useState(true);
  const [showVessels, setShowVessels] = useState(true);
  const [showBuyerLayer, setShowBuyerLayer] = useState(true);
  const [showCountryLayer, setShowCountryLayer] = useState(true);
  const [paused, setPaused] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [simulationSpeed, setSimulationSpeed] = useState(1);
  const [lowGraphics, setLowGraphics] = useState(() => {
    try { return localStorage.getItem('buyer-low-graphics') !== 'false'; } catch { return true; }
  });
  function configureRenderer() {
    globeRef.current?.renderer().setPixelRatio(mapPixelRatio(globeSize.width, globeSize.height, lowGraphics, window.devicePixelRatio || 1));
    const controls = globeRef.current?.controls();
    if (controls) { controls.autoRotate = autoRotate; controls.autoRotateSpeed = 0.15; }
  }
  useEffect(() => {
    globeRef.current?.renderer().setPixelRatio(mapPixelRatio(globeSize.width, globeSize.height, lowGraphics, window.devicePixelRatio || 1));
  }, [lowGraphics, globeSize]);
  useEffect(() => {
    try { localStorage.setItem('buyer-low-graphics', String(lowGraphics)); } catch { /* Preference remains active for this visit. */ }
  }, [lowGraphics]);
  useEffect(() => {
    const update = () => {
      if (document.hidden) globeRef.current?.pauseAnimation();
      else globeRef.current?.resumeAnimation();
    };
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [lockedCountry, setLockedCountry] = useState(null);
  const [hoverCountry, setHoverCountry] = useState(null);
  const [autoRotate, setAutoRotate] = useState(() => !window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [selectedBuyer, setSelectedBuyer] = useState(null);
  const [showExportRoute, setShowExportRoute] = useState(true);
  const [showSourcing, setShowSourcing] = useState(false);
  const [presentationMode, setPresentationMode] = useState(false);
  const [sheetHeight, setSheetHeight] = useState(46);

  useEffect(() => {
    function syncFullscreen() {
      if (!document.fullscreenElement) setPresentationMode(false);
    }
    document.addEventListener('fullscreenchange', syncFullscreen);
    return () => document.removeEventListener('fullscreenchange', syncFullscreen);
  }, []);

  useGlobeRotation(globeRef, autoRotate);

  const country = selectedCountry ?? DEFAULT_COUNTRY;
  const buyers = selectedCountry
    ? buyerMarkers.filter(buyer => buyer.country === selectedCountry).map(buyer => buyer.buyer).sort((a, b) => a.localeCompare(b))
    : EMPTY_BUYERS;
  const currentBuyer = selectedBuyer?.id
    ? buyerMarkers.find(buyer => buyer.id === selectedBuyer.id) || null
    : selectedBuyer;
  const selectedId = currentBuyer?.id;
  const buyerPoints = useMemo(() => showBuyerLayer ? buyerMarkers.map((buyer) => ({ ...buyer, kind: 'buyer', selected: buyer.id === selectedId, color: buyer.id === selectedId ? mapColors.selected : buyerColor(buyer) })) : [], [buyerMarkers, selectedId, showBuyerLayer]);
  const buyerCountries = useMemo(() => new Set(buyerMarkers.map(buyer => buyer.country)), [buyerMarkers]);
  const sourcingBuyer = useMemo(() => currentBuyer ? ({ id: currentBuyer.id, buyer: currentBuyer.buyer, group: currentBuyer.group, lat: currentBuyer.lat, lng: currentBuyer.lng }) : null, [currentBuyer]);
  const sourcingRoutes = useMemo(() => showSourcing ? sourcingConnections(sourcingBuyer) : [], [showSourcing, sourcingBuyer]);
  const points = useMemo(() => [...buyerPoints, BANGLADESH_HUB, ...sourcingRoutes.map(route => ({kind:'sourcing', country:route.country, lat:route.startLat, lng:route.startLng, color:'#c084fc'}))], [buyerPoints, sourcingRoutes]);
  // Traffic ticks and directory refreshes must not recreate the arc or restart its dashes.
  const routeName = currentBuyer?.buyer;
  const routeLat = currentBuyer?.lat;
  const routeLng = currentBuyer?.lng;
  const routeEstimate = useMemo(() => getRouteEstimate({ buyer: routeName, lat: routeLat, lng: routeLng }), [routeName, routeLat, routeLng]);
  const exportRoutes = useMemo(() => showExportRoute && routeEstimate ? [routeEstimate] : [], [showExportRoute, routeEstimate]);
  const visibleRoutes = useMemo(() => [...exportRoutes, ...sourcingRoutes], [exportRoutes, sourcingRoutes]);

  function handleCountryHover(polygon) {
    if (lockedCountry) return;

    const name = polygon ? getCountryName(polygon) : null;
    setHoverCountry(name);
    setSelectedCountry(name);
  }

  function handleCountryClick(polygon) {
    if (!polygon) return;

    const name = getCountryName(polygon);
    const nextCountry = lockedCountry === name ? null : name;

    if (nextCountry) setBuyersOpen(true);
    setSelectedBuyer(null);
    setLockedCountry(nextCountry);
    setSelectedCountry(nextCountry);
  }

  function resetView() {
    globeRef.current?.pointOfView({ ...GLOBAL_VIEW }, 0);
    setSelectedCountry(null);
    setLockedCountry(null);
    setHoverCountry(null);
    setAutoRotate(!window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    setSelectedBuyer(null);
  }

  function selectSearchResult(result) {
    setAutoRotate(false);
    setSelectedCountry(result.country);
    setLockedCountry(result.country);
    setHoverCountry(result.country);
    setBuyersOpen(result.kind !== 'buyer');
    setSelectedBuyer(result.kind === "buyer" ? {
      ...result,
      buyer: result.buyer || result.label,
      country: result.country,
      city: result.city,
      lat: result.lat,
      lng: result.lng,
    } : null);
    // Missing HQ coordinates still open the country's buyer list.
    const location = Number.isFinite(result.lat) && Number.isFinite(result.lng)
      ? result : buyerMarkers.find((marker) => marker.country === result.country);
    if (location) {
      globeRef.current?.pointOfView({ lat: location.lat, lng: location.lng, altitude: result.kind === "buyer" && location === result ? 0.5 : 1.5 }, 1200);
    }
  }

  function searchBuyer(buyerName) {
    const marker = buyerMarkers.find((buyer) => buyer.buyer.toLowerCase() === buyerName.toLowerCase() && buyer.country === country);
    selectSearchResult(marker ? { ...marker, kind: "buyer" } : { kind: "buyer", buyer: buyerName, label: buyerName, country });
  }

  function handlePointClick(point) {
    if (point.kind !== "buyer") return;
    selectSearchResult({ ...point, kind: "buyer", label: point.buyer });
  }

  const getPolygonCapColor = useCallback(polygon => {
    const name = getCountryName(polygon);
    if (name === lockedCountry) return 'rgba(251,113,133,0.30)';
    if (name === hoverCountry) return 'rgba(255,255,255,0.18)';
    return showCountryLayer && buyerCountries.has(name) ? 'rgba(56,189,248,0.12)' : 'rgba(0,0,0,0)';
  }, [lockedCountry, hoverCountry, showCountryLayer, buyerCountries]);

  async function saveBuyer(change) {
    const added = await mutate(change);
    if (added) {
      selectSearchResult({ ...added, kind: 'buyer' });
      setNotice(`${added.buyer} was added to the shared directory.`);
    } else {
      setSelectedBuyer(null);
      setNotice('Buyer archived. Restore it from Activity & recovery.');
    }
  }

  async function togglePresentationMode() {
    if (!presentationMode) {
      setPresentationMode(true);
      setBuyersOpen(false);
      try { await document.documentElement.requestFullscreen?.(); } catch { /* Presentation layout still works without fullscreen permission. */ }
    } else {
      setPresentationMode(false);
      if (document.fullscreenElement) await document.exitFullscreen();
    }
  }

  function startSheetDrag(event) {
    const handle = event.currentTarget;
    handle.setPointerCapture(event.pointerId);
    const startY = event.clientY;
    const startHeight = sheetHeight;
    function move(moveEvent) {
      setSheetHeight(Math.min(85, Math.max(18, startHeight + ((startY - moveEvent.clientY) / window.innerHeight) * 100)));
    }
    function finish() {
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', finish);
      handle.removeEventListener('pointercancel', finish);
    }
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', finish);
    handle.addEventListener('pointercancel', finish);
  }

  return (
    <div className={`app${presentationMode ? ' presentation-mode' : ''}${lowGraphics ? ' low-graphics' : ''}`} style={{ '--sheet-height': `${sheetHeight}dvh` }}>
      <KPIBar buyersCount={buyerMarkers.length} countriesCount={new Set(buyerMarkers.map(buyer => buyer.country)).size} routesCount={exportRoutes.length} />
      {notice && <div className="directory-notice" role="status">{notice}<button type="button" aria-label="Dismiss notification" onClick={() => setNotice('')}>×</button></div>}
      {editor && <BuyerEditor mode={editor.mode} buyer={editor.buyer} countries={COUNTRY_OPTIONS} onSave={saveBuyer} onClose={() => setEditor(null)} />}

      <div className={`app-content ${buyersOpen ? "buyers-open" : ""}`}>
        <div className="globe-panel" ref={containerRef}>
          <div className="globe-canvas">
          <GraphicsBoundary><TrafficGlobe
            paused={paused}
            speed={simulationSpeed}
            showFlights={showFlights}
            showVessels={showVessels}
            lowGraphics={lowGraphics}
            rendererConfig={RENDERER_CONFIG}
            onGlobeReady={configureRenderer}
            showAtmosphere={!lowGraphics}
            pointResolution={lowGraphics ? 6 : 12}
            polygonCapCurvatureResolution={lowGraphics ? 8 : 5}
            polygonsTransitionDuration={0}
            ref={globeRef}
            width={globeSize.width}
            height={globeSize.height}
            globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
            backgroundImageUrl={lowGraphics ? null : '//unpkg.com/three-globe/example/img/night-sky.png'}
            backgroundColor="#020617"
            polygonsData={countries}
            polygonAltitude={0.01}
            polygonCapColor={getPolygonCapColor}
            polygonSideColor={polygonSideColor}
            polygonStrokeColor={polygonStrokeColor}
            onPolygonHover={handleCountryHover}
            onPolygonClick={handleCountryClick}
            pointsData={points}
            pointLat="lat"
            pointLng="lng"
            pointColor={getPointColor}
            pointAltitude={getPointAltitude}
            pointRadius={getPointRadius}
            pointLabel={getPointLabel}
            onPointClick={handlePointClick}
            pointsTransitionDuration={0}
            arcsData={visibleRoutes}
            arcStartLat="startLat"
            arcStartLng="startLng"
            arcEndLat="endLat"
            arcEndLng="endLng"
            arcColor="color"
            arcStartAltitude={0.025}
            arcEndAltitude={0.025}
            arcAltitude={null}
            arcAltitudeAutoScale={0.5}
            arcCurveResolution={lowGraphics ? 64 : 128}
            arcCircularResolution={lowGraphics ? 3 : 6}
            arcsTransitionDuration={0}
            arcStroke={0.45}
            arcDashLength={lowGraphics ? 1 : getArcDashLength}
            arcDashGap={lowGraphics ? 0 : getArcDashGap}
            arcDashAnimateTime={lowGraphics ? 0 : getArcDashTime}
            arcLabel={getExportRouteLabel}
            objectLat="lat"
            objectLng="lng"
            objectAltitude={0.012}
            objectFacesSurface={true}
            objectThreeObject={createTrafficMarker}
            objectRotation={getTrafficRotation}
            objectLabel={getPointLabel}
          /></GraphicsBoundary>
          </div>
          <button className="buyers-toggle" type="button" aria-expanded={buyersOpen} aria-controls="buyer-sidebar" onClick={() => setBuyersOpen((value) => !value)}>{buyersOpen ? "Hide buyers" : "Buyers & search"}</button>
          <details className="traffic-panel" ref={trafficPanelRef}
            onChange={closeTrafficPanel}
            onClick={event => { if (event.target.closest('button')) closeTrafficPanel(); }}
            onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); closeTrafficPanel(); } }}>
            <summary>Simulated traffic</summary>
            <label style={{ display: 'block', marginBottom: 12 }}><input type="checkbox" checked={lowGraphics} onChange={event => setLowGraphics(event.target.checked)} /> Low graphics (older PCs)</label>
            <label style={{ display: "block", marginBottom: 8, cursor: "pointer", color: "#67e8f9" }}>
              <input type="checkbox" checked={showFlights} onChange={(event) => setShowFlights(event.target.checked)} /> Aircraft ({lowGraphics ? 6 : simulatedFlights.length})
            </label>
            <label style={{ display: "block", marginBottom: 12, cursor: "pointer" }}>
              <input type="checkbox" checked={showVessels} onChange={(event) => setShowVessels(event.target.checked)} /> Vessels ({lowGraphics ? 6 : simulatedVessels.length})
            </label>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <button type="button" onClick={() => setPaused((value) => !value)} aria-pressed={paused} style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #64748b", background: "#1e293b", color: "white", cursor: "pointer" }}>{paused ? "Resume" : "Pause"}</button>
              <label>Speed <select value={simulationSpeed} onChange={(event) => setSimulationSpeed(Number(event.target.value))} style={{ background: "#1e293b", color: "white", padding: 5, borderRadius: 4 }}>
                <option value={1}>1×</option><option value={2}>2×</option><option value={4}>4×</option>
              </select></label>
            </div>
            <div style={{ color: "#94a3b8", fontSize: 11, marginTop: 10 }}>Illustrative routes · Accelerated motion</div>
          </details>
          <button
            type="button"
            className="reset-button"
            onClick={resetView}
            title="Return to the global view"
          >
            Reset View
          </button>
          <button type="button" className="add-buyer-button" onClick={() => setEditor({ mode: 'add' })}>+ Add buyer</button>
          <button type="button" className="presentation-button" onClick={togglePresentationMode}>{presentationMode ? 'Exit presentation' : 'Presentation'}</button>
          {currentBuyer && !presentationMode && <FloatingBuyerProfile
            key={currentBuyer.id || `${currentBuyer.buyer}|${currentBuyer.country}`}
            buyer={currentBuyer}
            onClose={() => setSelectedBuyer(null)}
            onDelete={canDelete ? buyer => setEditor({ mode: 'delete', buyer }) : undefined}
            showSourcing={showSourcing}
            onToggleSourcing={() => {
              if (!showSourcing) globeRef.current?.pointOfView({ lat: 25, lng: 65, altitude: 2.5 }, 900);
              setShowSourcing(value => !value);
            }}
          />}
          <details className="map-legend">
            <summary>Map colours &amp; layers</summary>
            <ul>{[[mapColors.buyer,'Directory buyer'],[mapColors.added,'User-added buyer'],[mapColors.selected,'Selected buyer / country'],[mapColors.hub,'Impress Fashion hub'],[mapColors.sourcing,'Sourcing connection'],[mapColors.export,'Illustrative export route']].map(([color,label]) => <li key={label}><span style={{ background: color }} />{label}</li>)}</ul>
            <p>Colours describe map roles, not verification or sales status. Light blue shading marks countries with listed buyers.</p>
            <label><input type="checkbox" checked={showBuyerLayer} onChange={event => setShowBuyerLayer(event.target.checked)} /> Buyer markers</label>
            <label><input type="checkbox" checked={showCountryLayer} onChange={event => setShowCountryLayer(event.target.checked)} /> Buyer-country shading</label>
            <label><input type="checkbox" checked={showExportRoute} onChange={event => setShowExportRoute(event.target.checked)} /> Export route</label>
            {sourcingBuyer && sourcingConnections(sourcingBuyer).length > 0 && <label><input type="checkbox" checked={showSourcing} onChange={event => setShowSourcing(event.target.checked)} /> Sourcing connections</label>}
            <label><input type="checkbox" checked={autoRotate} onChange={event => setAutoRotate(event.target.checked)} /> Rotate globe</label>
          </details>
          {routeEstimate && <aside className="route-summary" aria-label="Estimated export route">
            <div><strong>Chattogram → {currentBuyer.buyer}</strong><button type="button" onClick={() => setShowExportRoute(value => !value)}>{showExportRoute ? 'Hide route' : 'Show route'}</button></div>
            <span>{routeEstimate.distance.toLocaleString()} km direct map distance · {routeEstimate.minimumDays}–{routeEstimate.maximumDays} days illustrative transit</span>
          </aside>}
        </div>

        <Sidebar
          country={country}
          buyers={buyers}
          searchBuyer={searchBuyer}
          onSearchSelect={selectSearchResult}
          opportunityScore={opportunityScores[country]}
          records={buyerMarkers}
          onDeleteBuyer={canDelete ? buyer => setEditor({ mode: 'delete', buyer }) : undefined}
          onSheetDragStart={startSheetDrag}
          discoveryCountry={lockedCountry}
          onReviewDiscovery={buyer => setEditor({ mode: 'add', buyer })}
        />
      </div>
      {directoryStatus !== 'ready' && <div className="directory-status" role="status">{directoryStatus === 'loading' ? 'Loading shared buyer directory…' : 'Shared directory unavailable. Showing the last available list; changes require the server connection.'}</div>}
      <footer className="copyright-watermark">© 2026 Nasef Arafat. All rights reserved.</footer>
    </div>
  );
}
