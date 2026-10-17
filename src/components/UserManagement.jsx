import { useEffect, useRef, useState } from 'react';
import { authRequest } from '../auth-client';
import { useAccount } from '../AuthContext';
export default function UserManagement({ onClose }) {
  const account = useAccount();
  const dialog = useRef(null);
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const element = dialog.current; element.showModal();
    let alive = true;
    authRequest('users.php').then(data => { if (alive) setUsers(data.users); }).catch(failure => { if (alive) setError(failure.message); });
    return () => { alive = false; element.close(); };
  }, []);
  async function save(body) {
    setBusy(true); setError('');
    try { const data = await authRequest('users.php', body); setUsers(data.users); setSelected(null); }
    catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  return <dialog className="buyer-editor user-management" ref={dialog} onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}>
    <div className="buyer-editor-heading"><h2>Manage users</h2><button onClick={onClose} disabled={busy} aria-label="Close user management">×</button></div>
    <p>{account.role === 'super' ? 'Manage all roles. Your own account is protected from changes here.' : 'Create, edit and delete general-user accounts.'}</p>
    {error && <p role="alert">{error}</p>}
    <div className="user-list">{users.map(user => <div key={user.id}><span><strong>{user.name}</strong> · {user.id} · {user.role}</span>
      <button disabled={busy || user.id === account.id} onClick={() => setSelected(user)}>Edit</button>
      <button disabled={busy || user.id === account.id} onClick={() => { if (window.confirm(`Delete account ${user.id}?`)) save({ action: 'delete', id: user.id }); }}>Delete</button>
    </div>)}</div>
    <button disabled={busy} onClick={() => setSelected({ id: '', name: '', role: 'general' })}>Add user</button>
    {selected && <form key={selected.id} onSubmit={event => { event.preventDefault(); if (!busy) save({ action: 'save', ...Object.fromEntries(new FormData(event.currentTarget)) }); }}>
      <label>User ID<input name="id" defaultValue={selected.id} readOnly={Boolean(selected.id)} required pattern="[a-zA-Z0-9][a-zA-Z0-9._-]{2,63}" maxLength={64} /></label>
      <label>Display name<input name="name" defaultValue={selected.name} required maxLength={120} /></label>
      <label>Role<select name="role" defaultValue={selected.role}><option value="general">General user</option>{account.role === 'super' && <><option value="admin">Admin</option><option value="super">Super user</option></>}</select></label>
      <label>{selected.id ? 'New password (leave blank to keep current)' : 'Password'}<input name="password" type="password" autoComplete="new-password" minLength={12} maxLength={256} required={!selected.id} /></label>
      <p>Passwords require at least 12 characters. Saving an account signs out its existing sessions.</p>
      <button disabled={busy} type="submit">{busy ? 'Saving…' : 'Save account'}</button>
    </form>}
  </dialog>;
}
