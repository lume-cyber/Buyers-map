import { useRef, useState } from 'react';
import { useAccount } from '../AuthContext';
import { authRequest } from '../auth-client';

const fields = [
  ['name','Contact name',160], ['title','Job title / department',160],
  ['email','Business email',254,'email'], ['phone','Business phone',80,'tel'],
  ['responsibility','Purchasing responsibility / products',500],
  ['officeName','Office name',160], ['city','Office city',160], ['country','Office country',100],
  ['address','Office address',500], ['source','Source link',500,'url'],
];
export default function BuyerContacts({ buyer }) {
  const canEdit = useAccount()?.role === 'super';
  const [saved, setSaved] = useState(null);
  const current = saved && (saved.contactsVersion || 0) >= (buyer.contactsVersion || 0) ? saved : buyer;
  const contacts = current.contacts || [];
  const [editor, setEditor] = useState(null);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [message, setMessage] = useState('');
  async function mutate(body) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setMessage('');
    try {
      const data = await authRequest('buyers.php', { ...body, id: buyer.id });
      setSaved(data.buyer); setEditor(null);
      window.dispatchEvent(new Event('buyer-directory-changed'));
      setMessage(body.action === 'contact-remove' ? 'Contact removed. Change recorded in activity history.' : 'Contact saved for this buyer.');
    } catch (error) { setMessage(error.message); }
    finally { lock.current = false; setBusy(false); }
  }
  async function refresh() {
    if (editor && !window.confirm('Discard this unsaved contact form and refresh the contact list?')) return;
    if (lock.current) return;
    lock.current = true; setBusy(true);
    try {
      const data = await authRequest('buyers.php');
      const record = data.buyers.find(item => item.id === buyer.id);
      if (!record) throw new Error('This buyer is no longer active.');
      setSaved(record); setEditor(null); setMessage('Contacts refreshed.');
    } catch (error) { setMessage(error.message); }
    finally { lock.current = false; setBusy(false); }
  }
  return <section className="buyer-contacts" aria-label="Buyer contact directory">
    <h3>Buyer contacts <span>({contacts.length})</span></h3>
    <p className="research-muted">Business contacts and buying offices. Office locations do not change the buyer’s headquarters or map marker. Details are user-provided.</p>
    {contacts.length === 0 && <p>No contacts added yet.</p>}
    {contacts.map(contact => <article key={contact.id}>
      <strong>{contact.name}</strong>{contact.title && <p>{contact.title}</p>}
      {contact.email && <p><a href={`mailto:${contact.email}`}>{contact.email}</a></p>}
      {contact.phone && <p>Phone: {contact.phone}</p>}
      {contact.responsibility && <p>Responsibility: {contact.responsibility}</p>}
      <p><b>{contact.officeType === 'Unknown' ? 'Office type not specified' : contact.officeType}</b>{contact.officeName && ` · ${contact.officeName}`}</p>
      {(contact.city || contact.country) && <p>{[contact.city,contact.country].filter(Boolean).join(', ')}</p>}
      {contact.address && <p>{contact.address}</p>}
      {contact.source && <a href={contact.source} target="_blank" rel="noreferrer">Contact source ↗</a>}
      {contact.notes && <p className="contact-notes">{contact.notes}</p>}
      {contact.updatedAt && <small>Updated {new Date(contact.updatedAt).toLocaleDateString()} by {contact.updatedBy}</small>}
      {canEdit && <div className="contact-actions"><button type="button" disabled={busy} onClick={() => { setEditor({ contact, version: current.contactsVersion || 0 }); setMessage(''); }}>Edit</button><button type="button" disabled={busy} onClick={() => { if (window.confirm(`Remove ${contact.name} from this buyer’s contacts?`)) mutate({ action: 'contact-remove', contactId: contact.id, expectedVersion: current.contactsVersion || 0 }); }}>Remove</button></div>}
    </article>)}
    <div className="contact-actions">{canEdit && <button type="button" disabled={busy} onClick={() => { setEditor({ contact: { officeType: 'Unknown' }, version: current.contactsVersion || 0 }); setMessage(''); }}>Add contact</button>}<button type="button" disabled={busy} onClick={refresh}>Refresh contacts</button></div>
    {editor && canEdit && <form key={editor.contact.id || 'new'} onSubmit={event => {
      event.preventDefault();
      mutate({ action: 'contact-save', contactId: editor.contact.id || '', expectedVersion: editor.version, contact: Object.fromEntries(new FormData(event.currentTarget)) });
    }}>
      <h4>{editor.contact.id ? 'Edit contact' : 'Add contact'}</h4>
      <fieldset disabled={busy}>
        {fields.map(([name,label,maxLength,type]) => <label key={name}>{label}{name === 'name' ? ' *' : ' (optional)'}<input name={name} type={type || 'text'} maxLength={maxLength} required={name === 'name'} defaultValue={editor.contact[name] || ''} /></label>)}
        <label>Office type<select name="officeType" defaultValue={editor.contact.officeType}>{['Unknown','Headquarters','Buying office','Other office'].map(type => <option key={type}>{type}</option>)}</select></label>
        <label>Notes (optional)<textarea name="notes" maxLength={1000} rows={3} defaultValue={editor.contact.notes || ''} /></label>
        <div className="contact-actions"><button type="submit">{busy ? 'Saving…' : 'Save contact'}</button><button type="button" onClick={() => setEditor(null)}>Cancel</button></div>
      </fieldset>
    </form>}
    <p role="status">{message}</p>
  </section>;
}
