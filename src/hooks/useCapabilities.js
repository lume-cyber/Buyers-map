import { useState } from 'react';
import { defaultCapabilities } from '../data/buyerResearch';
const key = 'impress-fashion-capabilities-v1';
export function useCapabilities() {
  const [capabilities, setCapabilities] = useState(() => {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      if (!value || !Array.isArray(value.products)) return defaultCapabilities;
      return { products: value.products.filter(product => typeof product === 'string'), capacity: String(value.capacity || ''), moq: String(value.moq || ''), certifications: String(value.certifications || '') };
    } catch { return defaultCapabilities; }
  });
  function save(value) {
    // Save first, so storage failures are not reported as successful persistence.
    localStorage.setItem(key, JSON.stringify(value));
    setCapabilities(value);
  }
  return { capabilities, save };
}
