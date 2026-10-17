import { useEffect, useRef } from 'react';
import BuyerCard from './BuyerCard';

export default function FloatingBuyerProfile({ buyer, onClose, onDelete, showSourcing, onToggleSourcing }) {
  const windowRef = useRef(null);
  useEffect(() => {
    windowRef.current?.focus({ preventScroll: true });
  }, []);

  return <div ref={windowRef} className="buyer-profile-window" role="dialog"
    aria-labelledby="buyer-card-title" tabIndex={-1}
    onKeyDown={event => {
      if (event.key === 'Escape') { event.stopPropagation(); onClose(); }
    }}>
    <BuyerCard buyer={buyer} onClose={onClose} onDelete={onDelete} showSourcing={showSourcing} onToggleSourcing={onToggleSourcing} />
  </div>;
}
