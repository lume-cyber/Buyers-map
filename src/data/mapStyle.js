export const mapColors = {
  buyer: '#38bdf8', added: '#34d399', selected: '#fb7185', hub: '#facc15',
  sourcing: '#c084fc', export: '#f8fafc',
};
export function buyerColor(buyer) {
  return buyer.id?.startsWith('custom-') ? mapColors.added : mapColors.buyer;
}
// Bound total pixel work even on large external monitors.
export function mapPixelRatio(width, height, lowGraphics, deviceRatio = 1) {
  return Math.min(lowGraphics ? 1 : Math.min(deviceRatio, 1.5), Math.sqrt((lowGraphics ? 1600000 : 4000000) / Math.max(1, width * height)));
}
