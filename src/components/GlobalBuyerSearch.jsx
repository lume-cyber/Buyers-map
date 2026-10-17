import { useId, useState } from 'react';
import { searchBuyers } from '../data/buyerSearch';

export default function GlobalBuyerSearch({ onSelect, records }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const id = useId();
  const matches = searchBuyers(query, records);
  const results = matches.slice(0, 12);
  function choose(result) {
    onSelect(result);
    setQuery(result.label);
    setOpen(false);
    setActive(-1);
  }
  return (
    <div className="global-search" onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
    }}>
      <label htmlFor={id}>Search all buyers and markets</label>
      <input id={id} type="search" role="combobox" autoComplete="off"
        placeholder="Buyer, country, or city…" value={query}
        aria-expanded={open && Boolean(query.trim())} aria-controls={`${id}-results`}
        aria-autocomplete="list" aria-activedescendant={active >= 0 && open ? `${id}-${active}` : undefined}
        onFocus={() => setOpen(true)}
        onChange={(event) => { setQuery(event.target.value); setOpen(true); setActive(-1); }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') { setOpen(false); setActive(-1); }
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault(); setOpen(true);
            setActive((value) => Math.max(0, Math.min(results.length - 1, value + (event.key === 'ArrowDown' ? 1 : -1))));
          }
          if (event.key === 'Enter' && open && results.length) { event.preventDefault(); choose(results[Math.max(0, active)]); }
        }} />
      {open && query.trim() && <>
        <div role="status" className="search-count">{matches.length ? `${matches.length} matches${matches.length > 12 ? ' · showing first 12; refine your search' : ''}` : 'No matches. Try another buyer, city, or country.'}</div>
        <ul id={`${id}-results`} role="listbox" aria-label="Global search results">
          {results.map((result, index) => <li key={result.searchId} id={`${id}-${index}`} role="option" aria-selected={active === index}
            onPointerDown={(event) => event.preventDefault()} onClick={() => choose(result)}>
            <strong>{result.label}</strong>
            <span>{result.kind === 'buyer' ? 'Buyer' : result.kind === 'city' ? 'City' : 'Country'} · {[result.city, result.country].filter(Boolean).join(', ')}</span>
            {result.kind === 'buyer' && !Number.isFinite(result.lat) && <small>Country details available · HQ location not mapped</small>}
          </li>)}
        </ul>
      </>}
    </div>
  );
}
