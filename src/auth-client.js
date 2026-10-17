let csrf = '';
export async function authRequest(path, body) {
  const response = await fetch(`${import.meta.env.BASE_URL}api/${path}`, {
    method: body ? 'POST' : 'GET', credentials: 'same-origin', cache: 'no-store',
    headers: body ? { 'Content-Type': 'application/json', 'X-Buyer-Request': '1', 'X-CSRF-Token': csrf } : {},
    body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(15000),
  });
  let data;
  try { data = await response.json(); } catch { throw new Error('The local PHP service is unavailable. Start it and try again.'); }
  if (response.status === 401 && path !== 'auth.php') window.dispatchEvent(new Event('session-expired'));
  if (!response.ok) throw new Error(data.error || 'Request failed.');
  if (data.csrf) csrf = data.csrf;
  return data;
}
export function csrfToken() { return csrf; }
