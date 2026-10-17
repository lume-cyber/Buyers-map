import { useEffect, useRef, useState } from 'react';
import { authRequest } from '../auth-client';
export default function ActivityHistory({ onClose }) {
  const dialog = useRef(null);
  const [data, setData] = useState(null);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { const element = dialog.current; element.showModal(); return () => element.close(); }, []);
  useEffect(() => {
    let active = true;
    authRequest(`activity.php?offset=${offset}`).then(value => { if (active) setData(value); }).catch(failure => { if (active) setError(failure.message); });
    return () => { active = false; };
  }, [offset]);
  async function restore(buyer) {
    if (!window.confirm(`Restore ${buyer.buyer} to the active map and buyer list?`)) return;
    setBusy(true); setError('');
    try {
      await authRequest('buyers.php', { action: 'restore', id: buyer.id });
      window.dispatchEvent(new Event('buyer-directory-changed'));
      setData(await authRequest(`activity.php?offset=${offset}`));
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  return <dialog ref={dialog} className="buyer-editor activity-history" aria-labelledby="activity-title" onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}>
    <div className="buyer-editor-heading"><h2 id="activity-title">Activity &amp; recovery</h2><button disabled={busy} onClick={onClose} aria-label="Close activity history">×</button></div>
    <p>History starts when this feature is enabled. Earlier permanent deletions cannot be restored here.</p>
    {error && <p role="alert">{error}</p>}
    {!data ? <p role="status">Loading history…</p> : <>
      <h3>Archived buyers ({data.archived.length})</h3>
      {!data.archived.length && <p>No archived buyers.</p>}
      {data.archived.map(item => <article key={item.buyer.id}><strong>{item.buyer.buyer}</strong><p>{item.buyer.country} · Archived by {item.by} · {new Date(item.at).toLocaleString()}</p><button disabled={busy} onClick={() => restore(item.buyer)}>Restore buyer</button></article>)}
      <h3>Activity ({data.total})</h3>
      {!data.events.length && <p>No activity recorded yet.</p>}
      {data.events.map(event => <article key={event.id}><strong>{event.action} · {event.label}</strong><p>{event.actorName} ({event.actor}) · {new Date(event.at).toLocaleString()}</p>{Object.keys(event.changes).length > 0 && <details><summary>View changes</summary><pre>{JSON.stringify(event.changes, null, 2)}</pre></details>}</article>)}
      <div className="buyer-editor-actions"><button disabled={busy || offset === 0} onClick={() => setOffset(value => Math.max(0, value - 50))}>Newer</button><button disabled={busy || offset + 50 >= data.total} onClick={() => setOffset(value => value + 50)}>Older</button></div>
    </>}
  </dialog>;
}
