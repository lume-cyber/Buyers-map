import { useEffect, useRef, useState } from 'react';
import Globe from 'react-globe.gl';
import GraphicsBoundary from './GraphicsBoundary';
const rendererConfig = { antialias: false, alpha: false };
export default function LoginPage({ onLogin, error, checking, onRetry }) {
  const globe = useRef(null);
  const [size, setSize] = useState(() => ({ width: window.innerWidth, height: window.innerHeight }));
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const resize = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    const visibility = () => document.hidden ? globe.current?.pauseAnimation() : globe.current?.resumeAnimation();
    window.addEventListener('resize', resize); document.addEventListener('visibilitychange', visibility);
    return () => { window.removeEventListener('resize', resize); document.removeEventListener('visibilitychange', visibility); };
  }, []);
  return <main className="login-page">
    <div className="login-globe" aria-hidden="true"><GraphicsBoundary background><Globe ref={globe} width={size.width} height={size.height} rendererConfig={rendererConfig}
      globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg" backgroundColor="#020617" showAtmosphere={false} enablePointerInteraction={false}
      onGlobeReady={() => { globe.current.renderer().setPixelRatio(1); globe.current.pointOfView({ lat: 20, lng: 60, altitude: 2.1 }); const controls = globe.current.controls(); controls.autoRotate = !window.matchMedia('(prefers-reduced-motion: reduce)').matches; controls.autoRotateSpeed = 0.35; controls.enableZoom = false; }} /></GraphicsBoundary></div>
    <form className="login-card" onSubmit={async event => {
      event.preventDefault(); if (busy || checking) return;
      const fields = Object.fromEntries(new FormData(event.currentTarget));
      setBusy(true); try { await onLogin(fields); } finally { setBusy(false); }
    }}>
      <img src={`${import.meta.env.BASE_URL}impress-logo.png`} alt="Impress Fashion Ltd" />
      <p>IMPRESS FASHION LTD</p><h1>Buyer Intelligence</h1><p>Sign in to explore your buyer network.</p>
      <label>User ID<input name="id" required autoComplete="username" autoCapitalize="none" spellCheck={false} maxLength={64} disabled={busy || checking} /></label>
      <label>Password<input name="password" type="password" required autoComplete="current-password" maxLength={256} disabled={busy || checking} /></label>
      {error && <p role="alert">{error}</p>}
      <button type="submit" disabled={busy || checking}>{checking ? 'Checking session…' : busy ? 'Signing in…' : 'Sign in'}</button>
      {error && <button type="button" onClick={onRetry} disabled={busy || checking}>Retry connection</button>}
    </form>
  </main>;
}
