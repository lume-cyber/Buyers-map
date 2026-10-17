import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { pbkdf2Sync, randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { feature } from 'topojson-client';
import { geoCentroid } from 'd3-geo';
import { buyerDirectory } from '../src/data/buyerDirectory.js';

const root = new URL('../', import.meta.url);
const api = new URL('dist/api/', root);
const privateLocal = new URL('deployment/.private/', root);
mkdirSync(api, { recursive: true });
mkdirSync(privateLocal, { recursive: true, mode: 0o700 });
cpSync(new URL('server/', root), api, { recursive: true });
const config = new URL('config.php', privateLocal);
if (!existsSync(config)) {
  const password = randomBytes(24).toString('base64url');
  const salt = randomBytes(24).toString('hex');
  const hash = pbkdf2Sync(password, salt, 600000, 32, 'sha256').toString('hex');
  writeFileSync(config, `<?php\nreturn ['salt' => '${salt}', 'passwordHash' => '${hash}'];\n`, { mode: 0o600 });
  writeFileSync(new URL('deletion-password.txt', privateLocal), `Buyer Globe deletion password\n\n${password}\n\nKeep this file private. Do not upload it to your website.\nThe deployment ZIP contains only its salted password hash.\n`, { mode: 0o600 });
}
cpSync(config, new URL('private/config.php', api));
writeFileSync(new URL('private/seed.php', api), '<?php exit; ?>\n' + JSON.stringify(buyerDirectory), { mode: 0o600 });
const world = JSON.parse(readFileSync(new URL('node_modules/world-atlas/countries-110m.json', root)));
const anchors = Object.fromEntries(feature(world, world.objects.countries).features.filter(item => item.properties.name !== 'Antarctica').map(item => {
  const name = ({ 'United States of America': 'USA', 'United Kingdom': 'UK', 'Türkiye': 'Turkey' })[item.properties.name] || item.properties.name;
  const [lng, lat] = geoCentroid(item);
  return [name, { lat, lng }];
}));
writeFileSync(new URL('countries.json', api), JSON.stringify(anchors));
console.log('Prepared shared PHP service with ' + buyerDirectory.length + ' seed buyers and ' + Object.keys(anchors).length + ' country choices.');
console.log('Private deletion password file: ' + fileURLToPath(new URL('deletion-password.txt', privateLocal)));
