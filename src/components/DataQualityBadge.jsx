function getBadge(record) {
  if (record.id?.startsWith('custom-')) return { label: 'User added', tone: 'user', detail: 'This record has not been independently verified.' };
  if (!record.sources?.length) return { label: 'Needs review', tone: 'review', detail: 'No current portfolio source is attached.' };
  if (!record.reviewedAt) return { label: 'Source checked', tone: 'checked', detail: 'A supporting source is attached.' };

  const reviewed = new Date(`${record.reviewedAt}T00:00:00Z`);
  const age = Date.now() - reviewed.getTime();
  if (Number.isFinite(age) && age > 548 * 24 * 60 * 60 * 1000) {
    return { label: 'Stale', tone: 'stale', detail: `Last checked ${record.reviewedAt}; review again before outreach.` };
  }
  return { label: 'Recently reviewed', tone: 'recent', detail: `Portfolio source checked ${record.reviewedAt}.` };
}

export default function DataQualityBadge({ record, compact = false }) {
  const badge = getBadge(record);
  return <span className={`quality-badge quality-${badge.tone}${compact ? ' quality-compact' : ''}`} title={badge.detail}>
    <span aria-hidden="true" className="quality-dot" />{badge.label}
  </span>;
}
