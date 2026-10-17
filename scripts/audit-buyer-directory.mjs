import assert from 'node:assert/strict';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { buyerDirectory as records, deferredBuyers, reviewedAt } from '../src/data/buyerDirectory.js';
import { buyersData } from '../src/data/buyers.js';
import { buyerMarkers } from '../src/data/buyerMarkers.js';
import { searchBuyers } from '../src/data/buyerSearch.js';

const countries = [...new Set(records.map(record => record.country))];
const world = JSON.parse(readFileSync(new URL('../node_modules/world-atlas/countries-110m.json', import.meta.url)));
const mapNames = new Set(world.objects.countries.geometries.map(item => ({ 'United States of America': 'USA', 'United Kingdom': 'UK' })[item.properties.name] || item.properties.name));
assert.equal(new Set(records.map(record => record.id)).size, records.length, 'Duplicate identities');
assert.equal(buyerMarkers.length, records.length);
assert.equal(Object.values(buyersData).flat().length, records.length);
for (const record of records) {
  assert.ok(mapNames.has(record.country), 'Unknown map country: ' + record.country);
  assert.ok(Number.isFinite(record.lat) && Math.abs(record.lat) <= 90);
  assert.ok(Number.isFinite(record.lng) && Math.abs(record.lng) <= 180);
  assert.ok(searchBuyers(record.buyer).some(entry => entry.kind === 'buyer' && entry.buyer === record.buyer), 'Missing search record: ' + record.buyer);
  assert.ok(buyersData[record.country].includes(record.buyer));
  for (const source of record.sources) assert.equal(new URL(source.url).protocol, 'https:');
  if (record.sources.length) assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(record.reviewedAt), 'Missing source review date');
}
for (const [buyer, country] of [['Primark','Ireland'], ['Adidas','Germany'], ['Puma','Germany'], ['Familia','Russia']]) {
  assert.equal(records.find(record => record.buyer === buyer)?.country, country);
}
assert.ok(searchBuyers('United States').some(record => record.country === 'USA'));
assert.ok(searchBuyers('Lojas Renner').some(record => record.buyer === 'Renner'));

const checked = records.filter(record => record.sources.length);
const sources = [...new Map(checked.flatMap(record => record.sources).map(source => [source.url, source])).values()];
const report = `# Worldwide apparel and textile buyer directory

Research snapshot: ${reviewedAt}

## Result and scope

The directory contains **${records.length} brand/company records across ${countries.length} country groupings**. **${checked.length} records have portfolio sources checked**; ${records.length - checked.length} inherited records remain explicitly marked **Needs source review**. This is a prospect-discovery directory, not an exhaustive worldwide buyer census, a list of confirmed customers, or evidence of current orders. Apparel, sportswear, denim, children's clothing and home textiles are included. Department stores and marketplaces are relevant channels but are not equivalent to direct importers.

Brands sharing a group are separate searchable records, not independent purchasing organizations. A portfolio source supports identity, category or group affiliation; it does not verify every location or establish supplier onboarding availability. Review date is the date checked, not a claim that each source was published recently. Undated corporate pages and the explicitly dated 2023 Hallenstein statement have different freshness limits.

## Geographic and identity treatment

Primark is grouped under Ireland; Adidas and Puma under Germany. Brazil's repeated Renner, Marisa and Riachuelo names are consolidated with searchable aliases. Reserved is consolidated with LPP (Reserved). The Global pseudo-country is removed. Country labels are consistent between map, sidebar and search. Hong Kong-based Giordano is grouped under China for the map and retains Hong Kong as its city. FILA (China) denotes ANTA's regional portfolio, not worldwide ownership of FILA. Van Heusen (India) denotes the regional operation in Aditya Birla Lifestyle Brands' portfolio.

Coordinates are illustrative group/regional city anchors for checked entries. They are not verified buying-office addresses. Legacy city coordinates remain unverified; missing cities use a clearly labelled country anchor. Brands at the same group location may overlap; search and the sidebar provide access to every record.

## Research findings and limitations

Expansion prioritizes previously thin coverage in India, Turkey, the UAE, Malaysia, Thailand, Indonesia, China, South Korea and Chile, plus home-textile specialists. Parent portfolios help identify shared procurement relationships. Kontoor's current portfolio includes Wrangler, Lee and Helly Hansen; PVH's checked entries are Calvin Klein and Tommy Hilfiger. The cited sources should be consulted before treating subsidiaries, licensees or retail banners as direct purchasing leads.

No contact names, order quantities, buying budgets or revenue estimates have been invented. Financial enrichment for newly sourced entries requires an explicit identity mapping; unavailable financials remain unavailable. Existing name searches no longer accept arbitrary first matches. The app's pre-existing opportunity scores are outside this research and should not be interpreted as findings from it.

## Country coverage

| Country grouping | Records | Portfolio checked |
|---|---:|---:|
${countries.map(country => '| ' + country + ' | ' + records.filter(record => record.country === country).length + ' | ' + checked.filter(record => record.country === country).length + ' |').join('\n')}

## Source inventory

These official company sources support the listed portfolio entries. Sources are embedded in each checked buyer card and the JSON export. Repeated use of a source reflects shared group affiliation, not independent verification of buying offices.

${sources.map(source => '- [' + source.publisher + ' — ' + source.title + '](' + source.url + '): ' + checked.filter(record => record.sources.some(item => item.url === source.url)).map(record => record.buyer).join(', ') + '.').join('\n')}

## Deferred legacy names

These names are preserved in the original source snapshots but excluded from the active directory pending review or consolidation. Exclusion is not a claim that a business has closed.

${Object.entries(deferredBuyers).map(([name,reason]) => '- **' + name + '**: ' + reason).join('\n')}

## Remaining validation work

The ${records.length - checked.length} legacy records still require current official sources, operating-status checks and category confirmation. Before outreach, confirm the contracting entity, territory, buying-office address, product fit and official supplier application route. Broad geographic coverage is not uniform country coverage; Africa and Latin America in particular remain selective. Source-based group relationships should not be extrapolated into confirmed Bangladesh sourcing or live purchasing demand.

## Reproducibility

The canonical directory feeds all map markers, country lists and search results. The original two datasets remain in legacyBuyers.js and legacyBuyerMarkers.js for audit. Run node scripts/audit-buyer-directory.mjs to validate uniqueness, geographic bounds, map-country compatibility, search coverage and key corrections, and refresh this report and JSON export. Build the application separately for deployment.
`;
mkdirSync(new URL('../research/', import.meta.url), { recursive: true });
writeFileSync(new URL('../research/worldwide-apparel-textile-buyers.md', import.meta.url), report);
writeFileSync(new URL('../research/worldwide-apparel-textile-buyers.json', import.meta.url), JSON.stringify({ reviewedAt, records }, null, 2) + '\n');
console.log(JSON.stringify({ records: records.length, countries: countries.length, portfolioChecked: checked.length, needsReview: records.length - checked.length, officialSources: sources.length, validation: 'passed' }, null, 2));
