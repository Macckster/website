// /headers       -> the request line and headers your client sent
// /headers?all   -> plus the ones Cloudflare adds on the way in

const HEADERS = {
    "content-type": "text/plain; charset=utf-8",
    "access-control-allow-origin": "*",
    "cache-control": "no-store",
};

// Added by Cloudflare's edge, not sent by the client
const ADDED = new Set([
    "cdn-loop", "x-forwarded-for", "x-forwarded-proto", "x-real-ip",
]);
const isAdded = (name) => name.startsWith("cf-") || ADDED.has(name);

export function onRequest({ request }) {
    const url = new URL(request.url);
    const all = url.searchParams.has("all");

    const rows = [...request.headers].filter(([name]) => all || !isAdded(name));
    const width = Math.max(0, ...rows.map(([name]) => name.length));
    const protocol = request.cf?.httpProtocol || "HTTP/1.1";

    const lines = [
        `${request.method} ${url.pathname}${url.search} ${protocol}`,
        "",
        ...rows.map(([name, value]) => `${(name + ":").padEnd(width + 1)}  ${value}`),
        "",
        ...(all ? [] : ["(headers added by Cloudflare are hidden, add ?all to see them)", ""]),
    ];
    return new Response(lines.join("\n"), { headers: HEADERS });
}
