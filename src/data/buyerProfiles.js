const WIKIDATA_API = "https://www.wikidata.org/w/api.php";

const knownEntityIds = {
  "C&A": "Q701338",
  "Carrefour Tex": "Q217599",
  "H&M": "Q188326",
  Lidl: "Q151954",
  Nike: "Q483915",
  Target: "Q1046951",
  Tesco: "Q487494",
  Uniqlo: "Q260767",
  Walmart: "Q483551",
  Zara: "Q147662",
};

const searchAliases = {
  "Deichmann Romania": "Deichmann",
  "Kmart Australia": "Kmart Australia",
  "LC Waikiki Romania": "LC Waikiki",
  "Lojas Americanas": "Americanas company",
  "Lojas Marisa": "Marisa retail",
  "Lojas Renner": "Lojas Renner",
  "Lojas Riachuelo": "Lojas Riachuelo",
  "Marks & Spencer": "Marks & Spencer",
  "PVH Corp.": "PVH Corp",
  "The Warehouse Group": "The Warehouse Group",
  "Woolworths South Africa": "Woolworths Holdings Limited",
};

const currencyCodes = {
  Q4916: "EUR",
  Q4917: "USD",
  Q25224: "GBP",
  Q25344: "CHF",
  Q1104069: "CAD",
  Q259502: "AUD",
  Q8146: "JPY",
  Q39099: "CNY",
  Q80524: "INR",
  Q181907: "BRL",
  Q199471: "NZD",
  Q1819070: "ZAR",
};

const profileCache = new Map();

function statementValue(entity, property) {
  const statements = entity?.claims?.[property] || [];
  const ranked = [...statements].sort((a, b) => {
    const rank = { preferred: 2, normal: 1, deprecated: 0 };
    const date = (statement) => statement.qualifiers?.P585?.[0]?.datavalue?.value?.time || "";
    return rank[b.rank] - rank[a.rank] || date(b).localeCompare(date(a));
  });
  return ranked.find((statement) => statement.mainsnak?.datavalue)?.mainsnak.datavalue.value;
}

function statement(entity, property) {
  const statements = entity?.claims?.[property] || [];
  return [...statements].sort((a, b) => {
    const rank = { preferred: 2, normal: 1, deprecated: 0 };
    const date = (item) => item.qualifiers?.P585?.[0]?.datavalue?.value?.time || "";
    return rank[b.rank] - rank[a.rank] || date(b).localeCompare(date(a));
  }).find((item) => item.mainsnak?.datavalue);
}

function getTime(item) {
  return item?.qualifiers?.P585?.[0]?.datavalue?.value?.time
    || item?.qualifiers?.P580?.[0]?.datavalue?.value?.time
    || null;
}

function getEntityId(value) {
  return value?.id || (Number.isInteger(value?.["numeric-id"]) ? `Q${value["numeric-id"]}` : null);
}

function parseQuantity(item) {
  const value = item?.mainsnak?.datavalue?.value;
  if (!value || typeof value.amount !== "string") return null;
  const amount = Number(value.amount);
  if (!Number.isFinite(amount)) return null;
  const unitId = value.unit?.match(/Q\d+$/)?.[0];
  return { amount, currency: currencyCodes[unitId] || null, date: getTime(item) };
}

function parseEntity(entity) {
  return {
    id: entity.id,
    label: entity.labels?.en?.value || entity.id,
    description: entity.descriptions?.en?.value || "",
    revenue: parseQuantity(statement(entity, "P2139")),
    marketCap: parseQuantity(statement(entity, "P2226")),
    employees: parseQuantity(statement(entity, "P1128")),
    website: statementValue(entity, "P856"),
    founded: statementValue(entity, "P571")?.time || null,
    parentId: getEntityId(statementValue(entity, "P749")) || getEntityId(statementValue(entity, "P127")),
  };
}

async function fetchJson(url, signal) {
  const response = await fetch(url, { signal, headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`Company data request failed (${response.status})`);
  return response.json();
}

async function findEntityId(name, signal) {
  if (knownEntityIds[name]) return knownEntityIds[name];
  const search = searchAliases[name] || name;
  const url = new URL(WIKIDATA_API);
  url.search = new URLSearchParams({
    action: "wbsearchentities",
    search,
    language: "en",
    uselang: "en",
    type: "item",
    limit: "8",
    format: "json",
    origin: "*",
  });
  const data = await fetchJson(url, signal);
  const exactBusiness = data.search?.find((result) => result.label?.toLowerCase() === name.toLowerCase()
    && /company|retail|brand|business|store|fashion|supermarket/i.test(result.description || ""));
  return exactBusiness?.id || null;
}

async function fetchEntity(id, signal) {
  if (!/^Q\d+$/.test(id)) throw new Error("Invalid company identifier");
  const url = new URL(WIKIDATA_API);
  url.search = new URLSearchParams({
    action: "wbgetentities",
    ids: id,
    props: "labels|descriptions|claims",
    languages: "en",
    languagefallback: "1",
    format: "json",
    origin: "*",
  });
  const data = await fetchJson(url, signal);
  return parseEntity(data.entities?.[id]);
}

export async function loadBuyerProfile(buyer, signal) {
  const key = `${buyer.buyer}|${buyer.country}`;
  if (profileCache.has(key)) return profileCache.get(key);

  // New portfolio records require an explicit financial identity; similar names are insufficient.
  const entityId = buyer.id?.startsWith('custom-') ? null : buyer.sources?.length ? knownEntityIds[buyer.buyer] || null : await findEntityId(buyer.buyer, signal);
  if (!entityId) return { buyer, unavailable: true, retrievedAt: new Date().toISOString() };

  const company = await fetchEntity(entityId, signal);
  let financials = company;
  if (!company.revenue && !company.marketCap && company.parentId) {
    const parent = await fetchEntity(company.parentId, signal);
    if (parent.revenue || parent.marketCap) financials = parent;
  }

  const profile = {
    buyer,
    company,
    financials,
    retrievedAt: new Date().toISOString(),
    sourceUrl: `https://www.wikidata.org/wiki/${company.id}`,
  };
  profileCache.set(key, profile);
  return profile;
}
