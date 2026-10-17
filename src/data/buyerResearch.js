const checkedAt = '2026-09-13';
const source = (title, url, period = 'Undated page') => ({ title, url, period, checkedAt });
const hmSupply = source('H&M Group — supply chain', 'https://hmgroup.com/sustainability/leading-the-change/supply-chain/', 'January 2026 figures');
const hmStandards = source('H&M Group — supplier assessment', 'https://hmgroup.com/sustainability/standards-and-policies/sustainable-impact-partnership-program/');
const padiniReport = source('Padini Integrated Annual Report 2025, pp. 43 and 67–68', 'https://corporate.padini.com/wp-content/uploads/Integrated-Annual-Report-2025.pdf', 'Year ended 30 June 2025');
const lppRules = source('LPP — suppliers', 'https://www.lpp.com/en/sustainable-development/people/suppliers/');
const lcPortal = source('LC Waikiki — supplier portal', 'https://supplierportal.lcwaikiki.com/');

const packs = {
  'H&M Group': {
    scope: 'H&M Group; not a brand-specific factory allocation',
    countries: ['China', 'Bangladesh'],
    footprintNote: 'The group identifies these as its largest clothing-production markets. This is a partial footprint.',
    footprintSource: hmSupply,
    onboarding: { status: 'Requirements published; open application route not verified', requirements: ['Supplier sustainability minimum requirements are assessed before starting a business relationship.'], source: hmStandards },
  },
  'Padini Holdings': {
    scope: 'Padini Holdings group; not a brand-specific factory allocation',
    countries: ['China', 'India', 'Malaysia', 'Thailand', 'Bangladesh'],
    footprintNote: 'The 2025 report identifies third-party manufacturing in these countries.', footprintSource: padiniReport,
    onboarding: { status: 'Requirements published; open application route not verified', requirements: ['Supplier code addresses quality, labour, worker safety and environmental practices.', 'The sourcing team conducts periodic factory visits.'], source: padiniReport },
  },
  LPP: {
    scope: 'LPP group', countries: [],
    onboarding: { status: 'Requirements published; open application route not verified', requirements: ['Suppliers must follow the LPP Code of Conduct.', 'Working conditions are checked through company and independent audits.'], source: lppRules },
  },
  'LC Waikiki': {
    scope: 'LC Waikiki', countries: [],
    onboarding: { status: 'Official supplier registration available', requirements: ['Use the commercial-product supplier registration route for merchandise sold in stores.', 'Registration is an application; acceptance and current purchasing demand are not confirmed.'], source: lcPortal, applicationUrl: lcPortal.url },
  },
};

export function researchFor(buyer) {
  if (!buyer || buyer.id?.startsWith('custom-')) return null;
  return packs[buyer.group] || packs[buyer.buyer] || null;
}

// Country anchors indicate disclosed sourcing markets, never exact factory locations.
const locations = { China:[35,104], Bangladesh:[23.7,90.3], India:[22,79], Malaysia:[4,102], Thailand:[15,101] };
export function sourcingConnections(buyer) {
  const research = researchFor(buyer);
  if (!research || !Number.isFinite(buyer.lat) || !Number.isFinite(buyer.lng)) return [];
  return research.countries.map(country => ({
    kind:'sourcing', country, scope:research.scope, source:research.footprintSource,
    startLat:locations[country][0], startLng:locations[country][1], endLat:buyer.lat, endLng:buyer.lng,
    color:['#c084fc','#818cf8'],
  }));
}

export const productChoices = ['Shirts', 'Ladies blouses', 'Dresses', 'Kids shirts', 'Kids dresses', 'Apparel', 'Menswear', 'Womenswear', 'Kidswear', 'Babywear', 'Knitwear', 'Woven garments', 'Denim', 'Sportswear', 'Underwear', 'Home textiles'];
export const defaultCapabilities = {
  products: ['Shirts', 'Ladies blouses', 'Dresses', 'Kids shirts', 'Kids dresses'],
  capacity: '1500000', moq: '5000', certifications: 'Accord, BSCI, GOTS, BCI, WRAP, CTPAT',
};
const categoryRules = {
  Shirts: /\bshirts?\b/i, 'Ladies blouses': /\bblouses?\b/i, Dresses: /\bdresses\b/i,
  'Kids shirts': /(?:kids?|children).*shirts?/i, 'Kids dresses': /(?:kids?|children).*dresses/i,
  Apparel: /\bapparel\b|\bclothing\b|\bfashion\b/i,
  Menswear: /\bmenswear\b/i, Womenswear: /\bwomenswear\b/i,
  Kidswear: /\bkidswear\b|children/i, Babywear: /\bbabywear\b|\bbaby\b/i,
  Knitwear: /\bknitwear\b/i, 'Woven garments': /\bwoven\b/i,
  Denim: /\bdenim\b|\bjeans\b/i, Sportswear: /\bsportswear\b/i,
  Underwear: /\bunderwear\b/i, 'Home textiles': /\bhome textiles\b/i,
};

export function productFit(buyer, capabilities) {
  const evidence = buyer.sources?.length ? buyer.categories || '' : '';
  const selected = Array.isArray(capabilities.products) ? capabilities.products : [];
  const matches = selected.filter(product => categoryRules[product]?.test(evidence));
  const broadOverlap = selected.length > 0 && /\bapparel\b|\bclothing\b|\bwomenswear\b|\bkidswear\b|\bmenswear\b/i.test(evidence);
  return { matches, unknown: selected.filter(product => !matches.includes(product)), broadOverlap, hasEvidence: Boolean(evidence) };
}
