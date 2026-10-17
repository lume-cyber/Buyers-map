import { useState } from 'react';
import { authRequest } from '../auth-client';

export function useBuyerResearchNotes(buyer) {
  const key = `buyer-research-notes-v1:${buyer.id || `${buyer.buyer}|${buyer.country}`}`;
  const [details, setDetails] = useState(() => {
    if (buyer.research) return buyer.research;
    try {
      const saved = JSON.parse(localStorage.getItem(key));
      return {
        products: Array.isArray(saved?.products) ? saved.products.filter(value => typeof value === 'string') : [],
        notes: Array.isArray(saved?.notes) ? saved.notes.filter(value => typeof value === 'string') : [],
      };
    } catch { return { products: [], notes: [] }; }
  });
  const [expected, setExpected] = useState(buyer.research || { products: [], notes: [] });
  async function saveDetails(next) {
    const response = await authRequest('buyers.php', { action: 'research', id: buyer.id, details: next, expectedResearch: expected });
    setDetails(response.buyer.research);
    setExpected(response.buyer.research);
    window.dispatchEvent(new Event('buyer-directory-changed'));
  }
  return { details, saveDetails };
}
