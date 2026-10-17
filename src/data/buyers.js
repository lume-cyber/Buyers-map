import { buyerDirectory } from './buyerDirectory.js';
export const buyersData = Object.fromEntries(
  [...new Set(buyerDirectory.map(record => record.country))].sort().map(country => [
    country, buyerDirectory.filter(record => record.country === country).map(record => record.buyer),
  ]),
);
