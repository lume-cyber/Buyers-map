import { useEffect, useState } from 'react';

const cache = new Map();
const normalize = value => String(value || '').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
function host(value) { try { return new URL(value).hostname.replace(/^www\./, ''); } catch { return ''; } }

export default function DiscoveredBuyers({ country, records, onReview }) {
  const [state, setState] = useState({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      const saved = cache.get(country);
      if (saved && saved.expires * 1000 > Date.now()) { setState({ status: 'ready', ...saved }); return; }
      setState({ status: 'loading' });
      const timeout = setTimeout(() => controller.abort(), 25000);
      try {
        const response = await fetch(`${import.meta.env.BASE_URL}api/discover.php?country=${encodeURIComponent(country)}`, { signal: controller.signal });
        const data = await response.json();
        if (!response.ok || !Array.isArray(data.results)) throw new Error(data.error || 'Discovery is unavailable.');
        cache.set(country, data);
        setState({ status: 'ready', ...data });
      } catch {
        setState({ status: 'error' });
      } finally { clearTimeout(timeout); }
    }, 450);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [country, attempt]);
  const names = new Set(records.map(record => normalize(record.buyer)));
  const sites = new Set(records.map(record => host(record.website)).filter(Boolean));
  const results = (state.results || []).filter(result => !names.has(normalize(result.buyer)) && !sites.has(host(result.website)));
  return <section className="discovered-buyers" aria-label={`Discovered buyers in ${country}`}>
    <h2>Discovered buyers · {country}</h2>
    <p>Free Wikidata discovery · Limited coverage, not a complete web search. Country association does not confirm current buying activity.</p>
    {state.status === 'loading' && <p role="status">Searching for additional apparel and textile prospects…</p>}
    {state.status === 'error' && <div role="status"><p>Discovery is temporarily unavailable. The PHP service and an internet connection are required.</p><button type="button" onClick={() => setAttempt(value => value + 1)}>Try again</button></div>}
    {state.status === 'ready' && <>
      <small>Checked {new Date(state.checkedAt).toLocaleDateString()} · Cached for 24 hours</small>
      {!results.length && <p>No additional prospects found in this source.</p>}
      {results.map(result => <article key={result.id}>
        <strong>{result.buyer}</strong><span className="discovery-badge">Unverified prospect</span>
        <p>{result.description}</p>
        <div><a href={result.website} target="_blank" rel="noreferrer">Website ↗</a> · <a href={result.source} target="_blank" rel="noreferrer">Source ↗</a></div>
        <button type="button" onClick={() => onReview({ ...result, notes: `Discovered via ${result.source}\n${result.description}\nUnverified prospect; review purchasing relevance before outreach.` })}>Review &amp; add</button>
      </article>)}
    </>}
  </section>;
}
