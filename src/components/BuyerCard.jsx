import { useBuyerProfile } from "../hooks/useBuyerProfile";
import DataQualityBadge from "./DataQualityBadge";
import BuyerResearch from "./BuyerResearch";
import BuyerContacts from './BuyerContacts';
import { useBuyerResearchNotes } from "../hooks/useBuyerResearchNotes";

function formatMoney(metric) {
  if (!metric) return "Not publicly available";
  if (!metric.currency) return `${new Intl.NumberFormat('en', { notation: 'compact' }).format(metric.amount)} (currency unspecified)`;
  const currency = metric.currency;
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(metric.amount);
}

function formatNumber(metric) {
  return metric
    ? new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(metric.amount)
    : "Not publicly available";
}

function formatDate(value) {
  if (!value) return null;
  const date = new Date(value.replace(/^\+/, ""));
  return Number.isNaN(date.valueOf()) ? null : new Intl.DateTimeFormat("en", { year: "numeric", month: "short" }).format(date);
}

function Metric({ label, value, date }) {
  return <div className="buyer-metric">
    <span>{label}</span>
    <strong>{value}</strong>
    {date && <small>Reported {formatDate(date)}</small>}
  </div>;
}

export default function BuyerCard({ buyer, onClose, onDelete, showSourcing, onToggleSourcing }) {
  const { status, profile, error } = useBuyerProfile(buyer);
  const { details, saveDetails } = useBuyerResearchNotes(buyer);
  if (!buyer) return null;

  return <section className="buyer-card" aria-labelledby="buyer-card-title">
    <div className="buyer-card-heading">
      <div>
        <span className="buyer-card-eyebrow">BUYER PROFILE</span>
        <h2 id="buyer-card-title">{buyer.buyer}</h2>
        <p>{[buyer.city, buyer.country].filter(Boolean).join(", ")}</p>
        <DataQualityBadge record={buyer} />
      </div>
      <button type="button" className="buyer-card-close" onClick={onClose} aria-label="Close buyer profile">×</button>
    </div>

    {details.products.length > 0 && <div className="confirmed-products" aria-label="User-confirmed product categories">{details.products.map(product => <span key={product}>✓ {product}</span>)}</div>}
    {buyer.website && <div className="buyer-card-links"><a href={buyer.website} target="_blank" rel="noreferrer">Buyer website ↗</a></div>}
    {buyer.notes && <p className="buyer-description buyer-notes">{buyer.notes}</p>}
    {buyer.group && <p className="parent-note">Group / operator: <strong>{buyer.group}</strong>{buyer.recordType && ` · ${buyer.recordType}`}</p>}
    <p className="buyer-card-footnote">{buyer.reviewStatus || 'Needs source review'}{buyer.reviewedAt && ` · ${buyer.reviewedAt}`}. Prospect listing; current purchase requirements are not confirmed.</p>
    <p className="buyer-card-footnote">{buyer.locationBasis}</p>
    <div className="buyer-card-links">{buyer.sources?.map(source => <a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.publisher}: {source.title} ↗</a>)}</div>
    {status === "loading" && <div className="buyer-card-loading" role="status">Retrieving company information…</div>}
    {status === "error" && <div className="buyer-card-message" role="status">Company data is temporarily unavailable. {error}</div>}
    {status === "ready" && profile?.unavailable && <div className="buyer-card-message">No matching public company profile was found.</div>}
    {status === "ready" && profile?.company && <>
      {profile.company.description && <p className="buyer-description">{profile.company.description}</p>}
      {profile.financials.id !== profile.company.id && <p className="parent-note">Financial figures reported by parent company: <strong>{profile.financials.label}</strong></p>}
      <div className="buyer-metrics">
        <Metric label="Company value" value={formatMoney(profile.financials.marketCap)} date={profile.financials.marketCap?.date} />
        <Metric label="Revenue / sales" value={formatMoney(profile.financials.revenue)} date={profile.financials.revenue?.date} />
        <Metric label="Employees" value={formatNumber(profile.financials.employees || profile.company.employees)} date={(profile.financials.employees || profile.company.employees)?.date} />
        <Metric label="Founded" value={formatDate(profile.company.founded) || "Not publicly available"} />
      </div>
      <div className="buyer-card-links">
        {profile.company.website && <a href={profile.company.website} target="_blank" rel="noreferrer">Official website ↗</a>}
        <a href={profile.sourceUrl} target="_blank" rel="noreferrer">Source: Wikidata ↗</a>
      </div>
      <p className="buyer-card-footnote">Retrieved live {new Date(profile.retrievedAt).toLocaleTimeString()}. Financial figures are the latest reported values in the source, not live sales.</p>
    </>}
    {buyer.id && <BuyerContacts key={buyer.id} buyer={buyer} />}
    <BuyerResearch buyer={buyer} details={details} saveDetails={saveDetails} showSourcing={showSourcing} onToggleSourcing={onToggleSourcing} />
    {buyer.id && onDelete && <button type="button" className="delete-buyer-button" onClick={() => onDelete(buyer)}>Archive buyer · Password required</button>}
  </section>;
}
