export default function KPIBar({
  buyersCount,
  countriesCount,
  routesCount
}) {
  const cards = [
    {
      title: "Buyer records",
      value: buyersCount,
      color: "#00bfff"
    },
    {
      title: "Countries",
      value: countriesCount,
      color: "#00ff88"
    },
    {
      title: "Trade Routes",
      value: routesCount,
      color: "#ff9900"
    },
    {
      title: "Markets",
      value: countriesCount,
      color: "#a855f7"
    },
    {
      title: "Hub",
      value: "Impress Fashion Ltd",
      color: "#ffff00"
    }
  ];

  return (
    <header className="dashboard-header">
      <img className="dashboard-logo" src={`${import.meta.env.BASE_URL}impress-logo.png`} alt="Impress Fashion Ltd logo" />
      <div className="kpi-bar" aria-label="Market overview">
      {cards.map((card) => (
        <div className={`kpi-card${card.title === 'Hub' ? ' kpi-hub' : ''}`} key={card.title} style={{ "--kpi-color": card.color }}>
          <div className="kpi-title">{card.title}</div>
          <div className="kpi-value">{card.value}</div>
        </div>
      ))}
      </div>
    </header>
  );
}
