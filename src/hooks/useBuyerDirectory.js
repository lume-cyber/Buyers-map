import { useCallback, useEffect, useRef, useState } from 'react';
import { csrfToken } from '../auth-client';

const endpoint = `${import.meta.env.BASE_URL}api/buyers.php`;
async function request(change) {
  const response = await fetch(endpoint, {
    method: change ? 'POST' : 'GET', cache: 'no-store',
    headers: change ? { 'Content-Type': 'application/json', 'X-Buyer-Request': '1', 'X-CSRF-Token': csrfToken() } : {},
    body: change ? JSON.stringify(change) : undefined,
    signal: AbortSignal.timeout(15000),
  });
  let payload;
  try { payload = await response.json(); }
  catch { throw new Error('Shared buyer storage is not available. The site needs its PHP service running.'); }
  if (response.status === 401) window.dispatchEvent(new Event('session-expired'));
  if (!response.ok) throw new Error(payload.error || 'The change could not be saved.');
  if (!Array.isArray(payload.buyers) || !Number.isInteger(payload.revision)) throw new Error('Invalid directory response.');
  return payload;
}

export function useBuyerDirectory() {
  const [records, setRecords] = useState([]);
  const [status, setStatus] = useState('loading');
  const revision = useRef(0);
  const alive = useRef(true);
  const apply = useCallback(payload => {
    if (!alive.current) return;
    if (payload.revision >= revision.current) {
      revision.current = payload.revision;
      setRecords(payload.buyers);
    }
    setStatus('ready');
  }, []);
  useEffect(() => {
    alive.current = true;
    let fetching = false;
    async function refresh() {
      if (fetching || document.hidden) return;
      fetching = true;
      try { apply(await request()); }
      catch { if (alive.current) setStatus('offline'); }
      finally { fetching = false; }
    }
    refresh();
    const timer = setInterval(refresh, 30000);
    window.addEventListener('focus', refresh);
    window.addEventListener('buyer-directory-changed', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      alive.current = false; clearInterval(timer);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('buyer-directory-changed', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [apply]);
  const mutate = useCallback(async change => {
    const payload = await request(change);
    apply(payload);
    return payload.buyer;
  }, [apply]);
  return { records, status, mutate };
}
