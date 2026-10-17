import { buyerMarkers } from './buyerMarkers.js';

export const normalizeSearch = (value) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

function buildEntries(records) {
const entries = [];
const seen = new Set();
function add(entry) {
  const id = `${entry.kind}:${entry.country}:${normalizeSearch(entry.label)}`;
  if (seen.has(id)) return;
  seen.add(id);
  entries.push({ ...entry, id: entry.id || id, searchId: id, searchable: normalizeSearch(`${entry.label} ${entry.country} ${entry.city || ''} ${entry.group || ''} ${entry.categories || ''} ${(entry.aliases || []).join(' ')}`) });
}
for (const marker of records) {
  add({ kind: 'buyer', label: marker.buyer, ...marker });
  if (marker.city) add({ kind: 'city', label: marker.city, ...marker });
}
for (const country of new Set(records.map((buyer) => buyer.country))) {
  const marker = records.find((buyer) => buyer.country === country);
  const aliases = ({ USA: ['United States', 'US', 'United States of America'], UK: ['United Kingdom', 'Britain'], Turkey: ['Türkiye'], China: ['Hong Kong'] })[country] || [];
  add({ kind: 'country', label: country, country, aliases, lat: marker?.lat, lng: marker?.lng });
}
return entries;
}

export function searchBuyers(query, records = buyerMarkers) {
  const normalized = normalizeSearch(query);
  if (!normalized) return [];
  const tokens = normalized.split(' ');
  return buildEntries(records).filter((entry) => tokens.every((token) => entry.searchable.includes(token)))
    .sort((a, b) => {
      const rank = (entry) => normalizeSearch(entry.label) === normalized ? 0 : normalizeSearch(entry.label).startsWith(normalized) ? 1 : 2;
      return rank(a) - rank(b) || a.label.localeCompare(b.label);
    });
}
