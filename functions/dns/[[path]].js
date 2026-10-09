// /dns/example.com      -> A, AAAA, MX, TXT, NS and CAA records
// /dns/example.com/mx   -> just one record type
// /dns/1.1.1.1          -> reverse (PTR) lookup
// Resolved through Cloudflare's DNS-over-HTTPS JSON API.

const HEADERS = {
    "content-type": "text/plain; charset=utf-8",
    "access-control-allow-origin": "*",
    "cache-control": "no-store",
};

const USAGE = `usage:
  curl -L <host>/dns/example.com
  curl -L <host>/dns/example.com/mx
  curl -L <host>/dns/1.1.1.1            (reverse lookup)

types: A AAAA CNAME MX TXT NS SOA PTR CAA SRV HTTPS
`;

const DOH = "https://cloudflare-dns.com/dns-query";
const DEFAULT_TYPES = ["A", "AAAA", "MX", "TXT", "NS", "CAA"];

// Numeric RR types in answers -> names
const TYPE_NAMES = {
    1: "A", 2: "NS", 5: "CNAME", 6: "SOA", 12: "PTR", 15: "MX", 16: "TXT",
    28: "AAAA", 33: "SRV", 65: "HTTPS", 257: "CAA",
};
const KNOWN_TYPES = new Set(Object.values(TYPE_NAMES));

const STATUS = { 0: "NOERROR", 1: "FORMERR", 2: "SERVFAIL", 3: "NXDOMAIN", 4: "NOTIMP", 5: "REFUSED" };

const isIpv4 = (s) => /^\d{1,3}(\.\d{1,3}){3}$/.test(s) && s.split(".").every((p) => Number(p) <= 255);
const isName = (s) => /^[a-z0-9_-]+(\.[a-z0-9_-]+)*$/i.test(s) && s.length <= 253;

async function query(name, type) {
    const res = await fetch(`${DOH}?name=${encodeURIComponent(name)}&type=${type}`, {
        headers: { accept: "application/dns-json" },
    });
    if (!res.ok) throw new Error(`resolver returned HTTP ${res.status}`);
    return res.json();
}

export async function onRequest({ request }) {
    const url = new URL(request.url);
    const [rawName = "", rawType] = decodeURIComponent(url.pathname.replace(/^\/dns\/?/, ""))
        .split("/").filter(Boolean);
    let name = rawName.trim().replace(/\.$/, "").toLowerCase();
    const wanted = (rawType || url.searchParams.get("type") || "").toUpperCase();

    if (!name) return new Response(USAGE, { headers: HEADERS });

    const fail = (msg) => new Response(`${msg}\n\n${USAGE}`, { status: 400, headers: HEADERS });
    if (wanted && !KNOWN_TYPES.has(wanted)) return fail(`unknown record type "${wanted}"`);

    let types = wanted ? [wanted] : DEFAULT_TYPES;
    if (isIpv4(name)) {
        name = name.split(".").reverse().join(".") + ".in-addr.arpa";
        types = ["PTR"];
    } else if (!isName(name)) {
        return fail(`"${rawName}" doesn't look like a hostname`);
    }

    let results;
    try {
        results = await Promise.all(types.map((type) => query(name, type)));
    } catch (err) {
        return new Response(`lookup failed: ${err.message}\n`, { status: 502, headers: HEADERS });
    }

    // A and AAAA both return the same CNAME chain, so dedupe across queries.
    const seen = new Set();
    const rows = [];
    for (const result of results) {
        for (const rr of result.Answer || []) {
            const type = TYPE_NAMES[rr.type] || `TYPE${rr.type}`;
            const key = `${type} ${rr.name} ${rr.data}`;
            if (seen.has(key)) continue;
            seen.add(key);
            rows.push([type, rr.name, String(rr.TTL), rr.data]);
        }
    }

    const lines = [name, ""];
    if (rows.length) {
        const widths = [0, 1, 2].map((i) => Math.max(...rows.map((r) => r[i].length)));
        for (const row of rows) {
            lines.push(row.map((cell, i) => (i < 3 ? cell.padEnd(widths[i]) : cell)).join("  "));
        }
    } else {
        // Every query failed the same way (e.g. NXDOMAIN) or just came back empty
        const status = STATUS[results[0].Status] || `status ${results[0].Status}`;
        lines.push(status === "NOERROR" ? `no ${types.join("/")} records` : status);
    }
    lines.push("", "via 1.1.1.1 (DNS over HTTPS)", "");

    return new Response(lines.join("\n"), { headers: HEADERS });
}
