import { useState } from 'react';
import { useAccount } from '../AuthContext';
import { productChoices, researchFor } from '../data/buyerResearch';

function Evidence({ source }) {
  return <p className="research-evidence"><a href={source.url} target="_blank" rel="noreferrer">{source.title} ↗</a><small>{source.period} · Checked {source.checkedAt}</small></p>;
}

export default function BuyerResearch({ buyer, details, saveDetails, showSourcing, onToggleSourcing }) {
  const canEdit = useAccount()?.role === 'super';
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [selectingProducts, setSelectingProducts] = useState(false);
  const research = researchFor(buyer);
  async function saveProducts(event) {
    event.preventDefault();
    if (!canEdit) return;
    const form = new FormData(event.currentTarget);
    try {
      const extra = String(form.get('additionalProducts') || '').split(',').map(value => value.trim()).filter(Boolean);
      await saveDetails({ ...details, products: [...new Set([...form.getAll('products'), ...extra])] });
      setSelectingProducts(false);
      setMessage('Confirmed products saved and recorded in activity history.');
    } catch (error) { setMessage(error.message); }
  }
  async function addNote(event) {
    event.preventDefault();
    if (!canEdit) return;
    const note = String(new FormData(event.currentTarget).get('note') || '').trim();
    if (!note) { setMessage('Enter a note before saving.'); return; }
    try {
      await saveDetails({ ...details, notes: [...details.notes, note] });
      setAddingNote(false);
      setMessage('Sourcing note saved and recorded in activity history.');
    } catch (error) { setMessage(error.message); }
  }
  return <section className="buyer-research" aria-label="Buyer research">
    <button type="button" className="research-open" aria-expanded={open} onClick={() => setOpen(value => !value)}>{open ? 'Close research' : 'Research this buyer'}</button>
    {open && <div className="research-sections">
      <h3>Sourcing footprint</h3>
      {research?.countries.length ? <>
        <p>{research.scope}</p><p>{research.footprintNote}</p>
        <ul>{research.countries.map(country => <li key={country}>{country}</li>)}</ul>
        <button type="button" aria-pressed={showSourcing} onClick={onToggleSourcing}>{showSourcing ? 'Hide sourcing map' : 'Show sourcing map'}</button>
        <p className="research-muted">Purple connections show disclosed country relationships, not transport routes or precise factory locations.</p>
        <Evidence source={research.footprintSource} />
      </> : <p>No sourcing locations have been verified for this buyer in the research library.</p>}
      {details.notes.length > 0 && <div className="sourcing-notes"><strong>User notes</strong>{details.notes.map((note, index) => <p key={index}>{note}</p>)}</div>}
      {canEdit && <button type="button" aria-expanded={addingNote} onClick={() => setAddingNote(value => !value)}>{addingNote ? 'Cancel note' : 'Add note'}</button>}
      {addingNote && <form className="sourcing-note-editor" onSubmit={addNote}>
        <label>Sourcing note<textarea name="note" required maxLength={5000} rows={5} placeholder="Add sourcing details for this buyer…" /></label>
        <button type="submit">Save note</button>
      </form>}

      <h3>Product fit</h3>
      {details.products.length > 0 ? <div className="confirmed-products">{details.products.map(product => <span key={product}>✓ {product}</span>)}</div> : <p>No product categories confirmed yet.</p>}
      {canEdit && <button type="button" aria-expanded={selectingProducts} onClick={() => setSelectingProducts(value => !value)}>Select product categories {selectingProducts ? '▴' : '▾'}</button>}
      {selectingProducts && <div className="capability-editor product-category-dropdown">
        <form onSubmit={saveProducts}>
          <fieldset><legend>Confirm all that apply to this buyer</legend>{[...new Set([...productChoices, ...details.products])].map(product => <label key={product}><input type="checkbox" name="products" value={product} defaultChecked={details.products.includes(product)} /> {product}</label>)}</fieldset>
          <label>Additional categories (comma-separated)<input name="additionalProducts" maxLength={500} placeholder="Add another product category" /></label>
          <button type="submit">Confirm products</button>
        </form>
      </div>}
      <p className="research-muted">Categories are user-confirmed. New saves are shared and recorded in activity history. Older browser-only notes are imported when you save.</p>
      <p role="status">{message}</p>

      <h3>Supplier onboarding</h3>
      {research?.onboarding ? <>
        <p><strong>{research.onboarding.status}</strong></p>
        <ul>{research.onboarding.requirements.map(item => <li key={item}>{item}</li>)}</ul>
        {research.onboarding.applicationUrl && <a className="research-application" href={research.onboarding.applicationUrl} target="_blank" rel="noreferrer">Open official supplier registration ↗</a>}
        <Evidence source={research.onboarding.source} />
      </> : <p>No official application route or buyer-specific requirements have been verified yet.</p>}
      <details><summary>Prepare your supplier introduction</summary><p>Suggested preparation, not confirmed buyer requirements:</p><ul><li>Company profile and relevant product catalogue</li><li>Capacity, MOQ and lead times</li><li>Current certification and audit documents, where applicable</li><li>Factory locations and quality-control overview</li></ul></details>
      <p className="research-muted">Source-based research snapshot. Open the linked official pages to check for changes. No application is submitted by this feature.</p>
    </div>}
  </section>;
}
