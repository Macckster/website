// /ip           -> your public IP address, plain text (unchanged)
// /ip?extra=1   -> IP plus whatever Cloudflare knows about the connection

const HEADERS = {
    "content-type": "text/plain; charset=utf-8",
    "access-control-allow-origin": "*",
    "cache-control": "no-store",
};

// [label, value] pairs, in display order. Anything undefined is dropped, so
// the output only ever shows fields Cloudflare actually filled in.
const fields = (request, cf) => [
    ["ip", request.headers.get("CF-Connecting-IP")],
    ["country", cf.country],
    ["region", cf.region],
    ["city", cf.city],
    ["postal code", cf.postalCode],
    ["continent", cf.continent],
    ["timezone", cf.timezone],
    ["coordinates", cf.latitude && cf.longitude ? `${cf.latitude}, ${cf.longitude}` : undefined],
    ["asn", cf.asn ? `AS${cf.asn}` : undefined],
    ["network", cf.asOrganization],
    ["colo", cf.colo],
    ["protocol", cf.httpProtocol],
    ["tls", cf.tlsVersion],
    ["cipher", cf.tlsCipher],
    ["user agent", request.headers.get("user-agent")],
];

export function onRequest({ request }) {
    const url = new URL(request.url);
    const ip = request.headers.get("CF-Connecting-IP");

    // Old behaviour: bare IP and nothing else.
    if (!url.searchParams.has("extra")) {
        return new Response(ip + "\n", { headers: HEADERS });
    }

    // request.cf is absent outside of Cloudflare's edge (e.g. plain local dev).
    const rows = fields(request, request.cf || {}).filter(([, value]) => value);
    const width = Math.max(...rows.map(([label]) => label.length));
    const body = rows.map(([label, value]) => `${label.padEnd(width)}  ${value}`).join("\n");

    return new Response(body + "\n", { headers: HEADERS });
}
