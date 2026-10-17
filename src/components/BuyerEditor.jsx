import { useEffect, useRef, useState } from 'react';

export default function BuyerEditor({ mode, buyer, countries, onSave, onClose }) {
  const dialog = useRef(null);
  const busyRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const deleting = mode === 'delete';
  useEffect(() => {
    const element = dialog.current;
    element.showModal();
    return () => element.close();
  }, []);
  async function submit(event) {
    event.preventDefault();
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true); setError('');
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    try {
      await onSave(deleting ? { action: 'delete', id: buyer.id, password: fields.password } : { action: 'add', ...fields });
      onClose();
    } catch (failure) { setError(failure.message); }
    finally { busyRef.current = false; setBusy(false); }
  }
  return <dialog ref={dialog} className="buyer-editor" aria-labelledby="buyer-editor-title"
    onCancel={event => { event.preventDefault(); if (!busyRef.current) onClose(); }}>
    <form onSubmit={submit}>
      <div className="buyer-editor-heading">
        <h2 id="buyer-editor-title">{deleting ? 'Archive buyer' : 'Add buyer'}</h2>
        <button type="button" aria-label="Close form" disabled={busy} onClick={onClose}>×</button>
      </div>
      {deleting ? <>
        <p>Archive <strong>{buyer.buyer}</strong> from {buyer.country}? This hides the buyer from the map and list. A super user can restore it from Activity &amp; recovery.</p>
        <label>Your sign-in password <input name="password" type="password" autoComplete="current-password" required maxLength={256} autoFocus /></label>
      </> : <>
        <p>Only buyer name and country are required. Details will be visible to everyone using this site.</p>
        <label>Buyer name <span aria-hidden="true">*</span><input name="buyer" required maxLength={160} autoFocus placeholder="Company or brand name" defaultValue={buyer?.buyer || ''} /></label>
        <label>Country <span aria-hidden="true">*</span><select name="country" required defaultValue={buyer?.country || ''}><option value="" disabled>Select a country</option>{countries.map(country => <option key={country} value={country}>{country}</option>)}</select></label>
        <label>Website <span>(optional)</span><input name="website" type="url" maxLength={500} placeholder="https://example.com" defaultValue={buyer?.website || ''} /></label>
        <div className="buyer-editor-grid">
          <label>City <span>(optional)</span><input name="city" maxLength={160} /></label>
          <label>Parent group <span>(optional)</span><input name="group" maxLength={160} /></label>
        </div>
        <label>Products / category <span>(optional)</span><input name="categories" maxLength={200} placeholder="Knitwear, denim, home textiles…" /></label>
        <label>Notes <span>(optional)</span><textarea name="notes" rows={3} maxLength={2000} defaultValue={buyer?.notes || ''} /></label>
        <p className="buyer-editor-note">New buyers appear at a country-level map location. Adding a city does not verify an office address.</p>
      </>}
      {error && <p className="buyer-editor-error" role="alert">{error}</p>}
      <div className="buyer-editor-actions">
        <button type="button" disabled={busy} onClick={onClose}>Cancel</button>
        <button type="submit" disabled={busy} className={deleting ? 'danger-button' : 'primary-button'}>{busy ? 'Saving…' : deleting ? 'Archive buyer' : 'Add buyer'}</button>
      </div>
    </form>
  </dialog>;
}
