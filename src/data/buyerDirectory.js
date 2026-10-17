import { buyersData as legacyBuyers } from './legacyBuyers.js';
import { buyerMarkers as legacyMarkers } from './legacyBuyerMarkers.js';
import { regionalBuyers } from './regionalBuyers.js';

// Source checks establish sector/portfolio relevance, not an active purchase requirement.
// Coordinates are illustrative city or country anchors, never verified buying-office addresses.
export const reviewedAt = '2026-09-12';
const groups = [
  ['H&M Group','Sweden','Stockholm',59.33,18.07,'apparel and home textiles','https://hmgroup.com/brands/','Our brands','H&M|COS|Weekday|Monki|& Other Stories|ARKET'],
  ['LPP','Poland','Gdańsk',54.35,18.65,'apparel','https://www.lpp.com/en/brands/','LPP brands','Reserved|Cropp|House|Mohito|Sinsay'],
  ['Bestseller','Denmark','Brande',55.94,9.13,'apparel','https://bestseller.com/brands','Our brands','Bestseller|Jack & Jones|Vero Moda|Only|NAME IT|OBJECT|JJXX|JDY|ONLY & SONS|PIECES|Y.A.S.'],
  ['Fast Retailing','Japan','Tokyo',35.68,139.69,'apparel','https://www.fastretailing.com/employment/en/about/brands.html','Our brands','Uniqlo|GU|PLST'],
  ['PVH','USA','New York',40.71,-74.01,'apparel','https://www.pvh.com/brands','Our brands','PVH Corp.|Calvin Klein|Tommy Hilfiger'],
  ['Kontoor Brands','USA','Greensboro',36.07,-79.79,'denim and outdoor apparel','https://www.kontoorbrands.com/brands','Our brands','Kontoor Brands|Wrangler|Lee|Helly Hansen'],
  ['Landmark Group','United Arab Emirates','Dubai',25.20,55.27,'apparel and home textiles','https://www.landmarkgroup.com/themes/lmg/images/media/Media-Sustainable-EN.pdf','Landmark Group media release','Landmark Group|Centrepoint|Babyshop|Splash|Max Fashion|Home Centre|Home Box|Styli'],
  ['Truworths International','South Africa','Cape Town',-33.92,18.42,'apparel','https://www.truworths.co.za/occ-public/html/group-at-a-glance.html','Group at a glance','Truworths|Identity'],
  ['Mr Price Group','South Africa','Durban',-29.86,31.02,'apparel and home textiles','https://mrpricegroup.com/','Mr Price Group','Mr Price Group'],
  ['Trent','India','Mumbai',19.08,72.88,'apparel','https://trentlimited.com/pages/fashion-lifestyle','Fashion and lifestyle','Westside|Zudio|Samoh'],
  ['Reliance Retail','India','Mumbai',19.08,72.88,'apparel','https://relianceretail.com/our-business.html','Our businesses','Reliance Retail|Trends|AJIO'],
  ['Aditya Birla Lifestyle Brands','India','Bengaluru',12.97,77.59,'apparel','https://www.adityabirla.com/businesses/companies/aditya-birla-lifestyle-brands-limited/','Aditya Birla Lifestyle Brands Limited','Louis Philippe|Van Heusen (India)|Allen Solly|Peter England'],
  ['Shimamura','Japan','Saitama',35.86,139.65,'apparel and home textiles','https://www.shimamura.gr.jp/en/company/profile/','Company profile','Shimamura|Avail|Birthday'],
  ['LC Waikiki','Turkey','Istanbul',41.01,28.98,'apparel','https://corporate.lcwaikiki.com/en-US/about-us','About us','LC Waikiki'],
  ['DeFacto','Turkey','Istanbul',41.01,28.98,'apparel','https://kurumsal.defacto.com/en/hakkimizda/','About us','DeFacto'],
  ['Koton','Turkey','Istanbul',41.01,28.98,'apparel','https://kurumsal.koton.com.tr/en/about-us/general-information/','General information','Koton'],
  ['Cotton On Group','Australia','Geelong',-38.15,144.36,'apparel','https://cottonon.com/AU/privacy-policy.html','Privacy policy and group brands','Cotton On|Cotton On Body|Cotton On Kids|Factorie|Supré'],
  ['Hallenstein Glasson Holdings','New Zealand','Auckland',-36.85,174.76,'apparel','https://www.hallensteinglasson.co.nz/content/reports/SlaveryStatement-2023.pdf','Modern Slavery Statement 2023','Hallensteins|Glassons'],
  ['Falabella Retail','Chile','Santiago',-33.45,-70.67,'apparel and home textiles','https://www.falabella.com/falabella-cl/page/falabella-retail','Falabella Retail','Falabella'],
  ['Ripley','Chile','Santiago',-33.45,-70.67,'apparel and home textiles','https://inversionistas.ripley.com/Spanish/Inicio/','Investor relations','Ripley'],
  ['JYSK','Denmark','Aarhus',56.16,10.20,'home textiles','https://www.jysk.com/about-us','About JYSK','JYSK'],
  ['Nitori','Japan','Sapporo',43.06,141.35,'home textiles','https://www.nitori.co.jp/division/homefurnishing/index.html','Home furnishing business','Nitori'],
  ['Dunelm','UK','Leicester',52.64,-1.14,'home textiles','https://www.dunelm.com/info/about-us','About us','Dunelm'],
  ['Padini Holdings','Malaysia','Shah Alam',3.07,101.52,'apparel','https://corporate.padini.com/about-us/who-we-are/','Who we are','Padini|Padini Authentics|PDI|SEED|P&Co|Miki|Brands Outlet'],
  ['Central Retail','Thailand','Bangkok',13.76,100.50,'apparel and home textiles','https://www.centralretail.com/en/what-we-do/our-businesses','Our businesses','Central Retail|Central Department Store|Robinson'],
  ['Mitra Adiperkasa','Indonesia','Jakarta',-6.21,106.85,'apparel retail operator','https://www.map.co.id/id/brands/','Brands','Mitra Adiperkasa (MAP)'],
  ['ANTA Sports','China','Xiamen',24.48,118.09,'sportswear','https://ir.anta.com/en/brand.php','Brands','ANTA|FILA (China)'],
  ['Giordano','China','Hong Kong',22.32,114.17,'apparel','https://corp.giordano.com.hk/en/','Corporate website','Giordano'],
  ['E-Land World','South Korea','Seoul',37.57,126.98,'apparel','https://www.eland.com/%EC%9D%B4%EB%9E%9C%EB%93%9C%EC%9B%94%EB%93%9C_ESG%EB%B3%B4%EA%B3%A0%EC%84%9C_%EC%98%81%EB%AC%B8.pdf','E-Land World ESG report','SPAO|WHO.A.U|MIXXO'],
  ['Primark','Ireland','Dublin',53.35,-6.26,'apparel and home textiles','https://careers.primark.com/en/dublin-head-office','Dublin head office','Primark'],
  ['adidas','Germany','Herzogenaurach',49.57,10.88,'sportswear','https://www.adidas-group.com/en/about/headquarters','Headquarters','Adidas'],
  ['PUMA','Germany','Herzogenaurach',49.57,10.88,'sportswear','https://about.puma.com/en/centraleurope','Central Europe','Puma'],
];
const key = name => name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const aliases = {
  'El Corte Ingles': 'El Corte Inglés',
  'LPP (Reserved)': 'Reserved', 'Marks & Spencer (M&S)': 'Marks & Spencer',
  'Lojas Renner': 'Renner', 'Lojas Marisa': 'Marisa', 'Lojas Riachuelo': 'Riachuelo',
  'The Warehouse Group (NZ)': 'The Warehouse Group', 'Lululemon Athletica': 'Lululemon',
};
export const deferredBuyers = {
  'HBC (Hudson’s Bay Company)': 'Operating status requires review.',
  "HBC (Hudson's Bay Company)": 'Operating status requires review.',
  "Hudson's Bay": 'Operating status requires review.',
  'Esprit': 'Operating structure requires review.',
  'Sears': 'US operating status requires review; Sears Mexico is a separate record.',
  'Casa Harmosa': 'Apparel/textile relevance and identity require confirmation.',
  'Deichmann Romania': 'Footwear specialist outside current apparel/textile scope.',
  'Befree Romania': 'Country assignment requires confirmation.',
  'LC Waikiki Romania': 'Consolidated into LC Waikiki.',
  'LC Waikiki Russia': 'Consolidated into LC Waikiki.',
  'Familia Romania': 'Country assignment requires confirmation.',
};
const countryFixes = { Adidas: 'Germany', Puma: 'Germany', Primark: 'Ireland', Decathlon: 'France', Intersport: 'Switzerland', Pepco: 'Poland', Familia: 'Russia' };
const normalizeCountry = country => ({ 'United Kingdom': 'UK', 'United States of America': 'USA' })[country] || country;
const anchors = { Switzerland: [46.95,7.45], Belgium:[50.85,4.35] };
const records = new Map();
const legacyEntries = Object.entries(legacyBuyers).map(([country, names]) => [country, [...names]]);
for (const marker of legacyMarkers) {
  let entry = legacyEntries.find(([country]) => country === marker.country);
  if (!entry) { entry = [marker.country, []]; legacyEntries.push(entry); }
  if (!entry[1].includes(marker.buyer)) entry[1].push(marker.buyer);
}
for (const [oldCountry,names] of legacyEntries) {
  for (const oldName of names) {
    if (deferredBuyers[oldName]) continue;
    const buyer = aliases[oldName] || oldName;
    const country = countryFixes[buyer] || normalizeCountry(oldCountry);
    if (country === 'Global') continue;
    const marker = legacyMarkers.find(item => (aliases[item.buyer] || item.buyer) === buyer && normalizeCountry(item.country) === country);
    const fallback = legacyMarkers.find(item => normalizeCountry(item.country) === country);
    const coords = marker || fallback;
    const [lat,lng] = coords ? [coords.lat,coords.lng] : anchors[country] || [];
    if (!Number.isFinite(lat)) continue;
    const id = key(buyer);
    const previous = records.get(id);
    records.set(id, { id,buyer,country,city: marker?.city || '',lat,lng,color:'#00bfff',
      locationBasis: marker ? 'Legacy city location — unverified' : 'Country anchor — not an office',
      reviewStatus:'Needs source review',categories:'apparel / textiles — scope to confirm',
      group:null,sources:[],aliases:[...(previous?.aliases || []),oldName] });
  }
}
for (const [group,country,city,lat,lng,categories,url,title,names] of groups) {
  for (const buyer of names.split('|')) {
    const id = key(buyer);
    const previous = records.get(id);
    records.set(id, { id,buyer,country,city,lat,lng,color:'#00ffff',group,categories,
      locationBasis:'Illustrative group / regional city anchor; not a buying-office address',
      reviewStatus:'Portfolio source checked',reviewedAt,
      sources:[{url,title,publisher:group}], aliases:previous?.aliases || [],
      recordType:buyer === 'AJIO' ? 'Marketplace' : buyer === group ? 'Company / group' : 'Brand / retail operation',
    });
  }
}
for (const record of regionalBuyers) records.set(record.id, record);
export const buyerDirectory = [...records.values()].sort((a,b) => a.country.localeCompare(b.country) || a.buyer.localeCompare(b.buyer));
