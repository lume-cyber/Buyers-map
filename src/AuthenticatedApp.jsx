import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
const App = lazy(() => import('./App'));
import { AuthContext } from './AuthContext';
import { authRequest } from './auth-client';
import LoginPage from './components/LoginPage';
import UserManagement from './components/UserManagement';
import ActivityHistory from './components/ActivityHistory';
import './auth.css';
export default function AuthenticatedApp() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState('');
  const [manage, setManage] = useState(false);
  const [history, setHistory] = useState(false);
  const check = useCallback(async () => {
    setChecking(true); setError('');
    try { const data = await authRequest('auth.php'); setUser(data.user); }
    catch (failure) { setUser(null); setError(failure.message); }
    finally { setChecking(false); }
  }, []);
  useEffect(() => {
    const timer = setTimeout(check, 0);
    const expire = () => { setUser(null); setManage(false); check(); };
    window.addEventListener('session-expired', expire);
    return () => { clearTimeout(timer); window.removeEventListener('session-expired', expire); };
  }, [check]);
  if (!user) return <LoginPage checking={checking} error={error} onRetry={check} onLogin={async fields => {
    setError('');
    try { await authRequest('auth.php'); const data = await authRequest('auth.php', { action: 'login', ...fields }); setUser(data.user); }
    catch (failure) { setError(failure.message); }
  }} />;
  return <AuthContext.Provider value={user}><div className="authenticated-shell">
    <div className="account-bar"><span>{user.name} · {user.role === 'super' ? 'Super user' : user.role === 'admin' ? 'Admin' : 'General user'}</span>
      {user.role !== 'general' && <button onClick={() => setManage(true)}>Manage users</button>}
      {user.role === 'super' && <button onClick={() => setHistory(true)}>Activity &amp; recovery</button>}
      <button onClick={async () => { try { await authRequest('auth.php', { action: 'logout' }); setUser(null); setManage(false); await check(); } catch (failure) { setError(failure.message); } }}>Sign out</button>
      {error && <span role="alert">{error}</span>}
    </div><Suspense fallback={<p role="status">Loading buyer workspace…</p>}><App key={user.id} /></Suspense>{manage && <UserManagement onClose={() => setManage(false)} />}{history && user.role === 'super' && <ActivityHistory onClose={() => setHistory(false)} />}
  </div></AuthContext.Provider>;
}
