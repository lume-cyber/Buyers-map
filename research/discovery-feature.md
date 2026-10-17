# Country discovery

Click a country or select a search result to start a debounced discovery request. Hovering does not search. The purple section lists additional, unverified prospects; Review & add opens the normal editable form and only its submit action changes the shared directory.

Source: the public Wikidata SPARQL endpoint, https://query.wikidata.org/sparql . This is limited structured-data discovery, not exhaustive web search. Candidates have a country or headquarters-country statement, a website, and English descriptions mentioning apparel/textiles and a business type. Statements can be incomplete, historical or inaccurate. Name and website-host matches already in the directory are excluded.

Hosting needs PHP 8.1+, cURL with outbound HTTPS access, and writable api/private/. The existing build script copies server/discover.php into api/. Vite alone cannot execute the service. No API key is needed.

Results are cached per country on the server for 24 hours, with a 60-second error cooldown and a nonblocking global request lock. Cache files use PHP exit guards and private-directory protection. Do not include runtime discovery cache/lock files in deployment packages. Country requests are restricted to the generated countries.json allowlist. Changing country aborts the browser request; the server may finish the bounded request and cache it for later.

Reference: https://www.mediawiki.org/wiki/Wikidata_query_service/User_Manual
