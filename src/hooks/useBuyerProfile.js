import { useEffect, useState } from "react";
import { loadBuyerProfile } from "../data/buyerProfiles";

export function useBuyerProfile(buyer) {
  const [state, setState] = useState({ buyerKey: null, status: "idle", profile: null, error: null });
  const buyerKey = buyer ? `${buyer.buyer}|${buyer.country}` : null;

  useEffect(() => {
    if (!buyer) return;

    const controller = new AbortController();
    loadBuyerProfile(buyer, controller.signal)
      .then((profile) => setState({ buyerKey, status: "ready", profile, error: null }))
      .catch((error) => {
        if (error.name !== "AbortError") {
          setState({ buyerKey, status: "error", profile: null, error: error.message });
        }
      });
    return () => controller.abort();
  }, [buyer, buyerKey]);

  if (!buyer) return { status: "idle", profile: null, error: null };
  if (state.buyerKey !== buyerKey) return { status: "loading", profile: null, error: null };
  return state;
}
