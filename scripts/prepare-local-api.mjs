import { cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { feature } from 'topojson-client';
import { geoCentroid } from 'd3-geo';
import { buyerDirectory } from '../src/data/buyerDirectory.js';
import './setup-local-auth.mjs';
const root = new URL('../', import.meta.url);
const api = new URL('.local-api/', root);
mkdirSync(api, { recursive: true });
for (const name of ['auth-core.php', 'auth.php', 'users.php', 'buyers.php', 'discover.php', 'activity-core.php', 'activity.php']) cpSync(new URL(`server/${name}`, root), new URL(name, api));
cpSync(new URL('server/private/.htaccess', root), new URL('private/.htaccess', api));
writeFileSync(new URL('private/seed.php', api), '<?php exit; ?>\n' + JSON.stringify(buyerDirectory), { mode: 0o600 });
const world = JSON.parse(readFileSync(new URL('node_modules/world-atlas/countries-110m.json', root)));
const anchors = Object.fromEntries(feature(world, world.objects.countries).features.filter(item => item.properties.name !== 'Antarctica').map(item => {
  const name = ({ 'United States of America': 'USA', 'United Kingdom': 'UK', 'Türkiye': 'Turkey' })[item.properties.name] || item.properties.name;
  const [lng, lat] = geoCentroid(item);
  return [name, { lat, lng }];
}));
writeFileSync(new URL('countries.json', api), JSON.stringify(anchors));
console.log('Local service prepared. Run PHP on 127.0.0.1:8173 with .local-api as its document root, then npm run dev.');
