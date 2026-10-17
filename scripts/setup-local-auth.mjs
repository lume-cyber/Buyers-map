import { mkdirSync, existsSync, writeFileSync } from 'node:fs';
import { randomBytes, pbkdf2Sync } from 'node:crypto';
const root = new URL('../', import.meta.url);
const directory = new URL('.local-api/private/', root);
mkdirSync(directory, { recursive: true, mode: 0o700 });
const file = new URL('users.php', directory);
if (existsSync(file)) {
  console.log('Local accounts already initialized; no changes made.');
} else {
  const password = randomBytes(24).toString('base64url');
  const salt = randomBytes(24).toString('hex');
  const hash = pbkdf2Sync(password, salt, 600000, 32, 'sha256').toString('hex');
  const users = { superuser: { id: 'superuser', name: 'Super user', role: 'super', version: 1, salt, hash } };
  const secrets = new URL('.local-credentials/', root);
  mkdirSync(secrets, { recursive: true, mode: 0o700 });
  writeFileSync(new URL('login-credentials.txt', secrets), `Local Buyer Intelligence login\nUser ID: superuser\nPassword: ${password}\n\nKeep private. Never upload this file.\n`, { mode: 0o600, flag: 'wx' });
  writeFileSync(file, '<?php exit; ?>\n' + JSON.stringify({ users, rates: {} }), { mode: 0o600, flag: 'wx' });
  console.log('Created local superuser. Credentials: .local-credentials/login-credentials.txt');
}
