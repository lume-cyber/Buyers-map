import GlobalBuyerSearch from "./GlobalBuyerSearch";
import DataQualityBadge from "./DataQualityBadge";
import DiscoveredBuyers from './DiscoveredBuyers';

export default function Sidebar({
  country,
  buyers,
  searchBuyer,
  onSearchSelect,
  opportunityScore,
  records,
  onDeleteBuyer,
  onSheetDragStart,
  discoveryCountry,
  onReviewDiscovery
}) {
  const getScoreColor = (score) => {
    if (!score) return "#94a3b8";
    if (score >= 90) return "#00ff88";
    if (score >= 80) return "#facc15";
    if (score >= 70) return "#fb923c";
    return "#ef4444";
  };

  return (
    <aside id="buyer-sidebar" className="buyer-sidebar" aria-label="Buyer intelligence">
      <button type="button" className="mobile-sheet-handle" aria-label="Drag to resize buyer panel" onPointerDown={onSheetDragStart}><span /></button>
      <h1
        style={{
          fontSize: "26px",
          marginBottom: "20px"
        }}
      >
        🌍 Buyer Intelligence
      </h1>

      <GlobalBuyerSearch onSelect={onSearchSelect} records={records} />
      <p className="buyer-card-footnote">Apparel & textile prospects · Brands may share a purchasing group. Open a profile for sources and review status.</p>


      <div
        style={{
          background: "#111827",
          borderRadius: "10px",
          padding: "15px",
          marginBottom: "15px",
          border: "1px solid #334155"
        }}
      >
        <div
          style={{
            color: "#94a3b8",
            fontSize: "12px"
          }}
        >
          SELECTED COUNTRY
        </div>

        <div
          style={{
            color: "#60a5fa",
            fontSize: "22px",
            fontWeight: "bold",
            marginTop: "5px"
          }}
        >
          {country}
        </div>
      </div>

      {opportunityScore && (
        <div
          style={{
            background: "#111827",
            borderRadius: "10px",
            padding: "15px",
            marginBottom: "20px",
            border: "1px solid #334155"
          }}
        >
          <div
            style={{
              color: "#94a3b8",
              fontSize: "12px"
            }}
          >
            OPPORTUNITY SCORE
          </div>

          <div
            style={{
              fontSize: "36px",
              fontWeight: "bold",
              color: getScoreColor(
                opportunityScore
              )
            }}
          >
            {opportunityScore}
          </div>
        </div>
      )}

      <div
        style={{
          marginBottom: "15px",
          color: "#94a3b8"
        }}
      >
        Buyer records:
        {" "}
        <strong>
          {buyers.length}
        </strong>
      </div>

      {buyers.map((buyer) => (
        <div className="buyer-list-row" key={buyer}>
        <button
          type="button"
          className="buyer-item"
          key={buyer}
          onClick={() =>
            searchBuyer?.(buyer)
          }
          style={{
            background: "#1e293b",
            border: "1px solid #334155",
            padding: "12px",
            borderRadius: "8px",
            marginBottom: "10px",
            cursor: "pointer"
          }}
        >
          <span>• {buyer}</span>
          {records.find(record => record.buyer === buyer && record.country === country) && <DataQualityBadge record={records.find(record => record.buyer === buyer && record.country === country)} compact />}
        </button>
        {onDeleteBuyer && <button type="button" className="buyer-list-delete" aria-label={`Archive ${buyer}`} title="Archive buyer — password required"
          onClick={() => onDeleteBuyer(records.find(record => record.buyer === buyer && record.country === country))}>Archive</button>}
        </div>
      ))}
      {discoveryCountry && <DiscoveredBuyers key={discoveryCountry} country={discoveryCountry} records={records} onReview={onReviewDiscovery} />}
    </aside>
  );
}
