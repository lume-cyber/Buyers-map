# Local login and roles

Open http://127.0.0.1:5173/ while the local frontend and PHP services are running.
The initial user ID is `superuser`. Its generated password is in `.local-credentials/login-credentials.txt` (outside the PHP document root). Do not upload or share that file. Existing local accounts are preserved on subsequent setup runs.

## Permissions

- Super user: view/add/delete buyers, edit local research notes/categories, and manage all user roles. Buyer deletion requires the signed-in user's password, replacing the former shared deletion password.
- Admin: view/add buyers and create, edit, reset passwords for, or delete general-user accounts. Cannot modify admins or super users or grant those roles.
- General user: view buyers/research/discovery and add buyers. No deletion, research editing, or account management.

Account management is in the top account bar. User IDs are case-insensitive. New passwords must have at least 12 characters. Account changes invalidate that account's existing sessions. Self-edit/deletion is blocked in account management, and at least one super user must remain.

## Start locally

Run `node scripts/prepare-local-api.mjs` to copy current service code and prepare private seed data without replacing users or buyer data. With PHP installed, start `php -S 127.0.0.1:8173 -t .local-api`, then run `npm run dev` in another terminal. Vite proxies `/api` to PHP, keeping session cookies on the same origin.

For this session, a temporary PHP runtime was installed under `/private/tmp/buyer-auth-php`. It is currently running on port 8173 with session files in `/private/tmp/buyer-auth-sessions`. That temporary runtime may need reinstalling after macOS clears temporary files. This setup does not change cPanel or create a deployment ZIP.

## Security and limitations

The PHP endpoints check the current stored role on every protected request. Cookies are HttpOnly and SameSite Strict, and Secure on HTTPS. Sessions rotate on login, expire after 30 minutes without API activity, and have an eight-hour maximum. Passwords use individually salted PBKDF2-SHA256 with 600,000 iterations. State-changing requests require a session CSRF token and same-origin checks. Login failures are limited per account and IP. Data files use PHP exit guards; private files are excluded from version control and denied by Vite.

Curated buyer data now comes from authenticated PHP instead of a browser-bundled fallback. The new seed is private/seed.php. Older deployment ZIPs and existing live files are unchanged; a future deployment must remove legacy public seed.json and old public bundles and initialize accounts separately. Never upload local credentials, local users, sessions, or test data as a routine release.

New research notes/product confirmations are now stored with the shared buyer record and audited. Existing browser-only entries are used as a starting point when no server research exists, and imported on the next save. Concurrent changes are rejected rather than silently overwritten.

## Activity and recovery

### Buyer contacts

Each active buyer profile has a Buyer contacts section. Super users can add, edit and remove up to 100 contacts per buyer; admins and general users can view them. Only contact name is required. Optional fields cover title, business email/phone, responsibility, office type/name/location/address, source link and notes. Office locations are separate from buyer headquarters and do not move map markers. Records are user-provided, not automatically verified.

Contacts are shared via authenticated PHP, retained during buyer archive/restore, and recorded with before/after values in activity history. Concurrent changes and duplicate nonempty email addresses within the same buyer are rejected. Contact removal is recorded in history but has no dedicated restore button. No messages are sent by this feature; the email link opens the user's mail application.

Super users can open Activity & recovery from the account bar. Buyer deletion now archives the complete record and can be reversed with Restore buyer. Restore rejects a duplicate active name/country and preserves research and coordinates. Admins/general users cannot archive or restore buyers or read the activity endpoint.

The log records buyer additions, archives, restores, research before/after values and account additions, edits, password resets (flag only) and deletions. Passwords and hashes are excluded. Events are written in the same saved state as their corresponding changes. History is paginated, starts with this feature, and does not reconstruct earlier actions. Account deletions remain permanent; recovery applies to buyers. There is no permanent buyer-purge control or automatic history expiry. Server administrators can still alter storage; this is an application history, not a tamper-proof audit service.

Validation: frontend lint/build, visual login inspection, and 42 isolated API checks covering anonymous access, CSRF, login, role escalation, buyer permissions, password reset, session revocation, account deletion protection, logout and throttling. Test records were created only in disposable storage.
