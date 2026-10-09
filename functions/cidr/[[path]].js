// /cidr/10.0.0.0/22            -> subnet details
// /cidr/10.0.0.0/255.255.252.0 -> same, netmask form
// /cidr/10.0.0.5               -> treated as a /32
// IPv4 only.

const HEADERS = {
    "content-type": "text/plain; charset=utf-8",
    "access-control-allow-origin": "*",
    "cache-control": "no-store",
};

const USAGE = `usage:
  curl -L <host>/cidr/10.0.0.0/22
  curl -L <host>/cidr/192.168.1.77/255.255.255.0
  curl -L <host>/cidr/10.0.0.5          (treated as /32)
`;

// [network, prefix, label], most specific first
const SPECIAL = [
    ["0.0.0.0", 8, "\"this\" network"],
    ["10.0.0.0", 8, "private (RFC 1918)"],
    ["100.64.0.0", 10, "carrier-grade NAT (RFC 6598)"],
    ["127.0.0.0", 8, "loopback"],
    ["169.254.0.0", 16, "link-local"],
    ["172.16.0.0", 12, "private (RFC 1918)"],
    ["192.0.2.0", 24, "documentation (TEST-NET-1)"],
    ["192.168.0.0", 16, "private (RFC 1918)"],
    ["198.18.0.0", 15, "benchmarking"],
    ["198.51.100.0", 24, "documentation (TEST-NET-2)"],
    ["203.0.113.0", 24, "documentation (TEST-NET-3)"],
    ["224.0.0.0", 4, "multicast"],
    ["240.0.0.0", 4, "reserved"],
];

const parseIp = (s) => {
    if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(s)) return null;
    const parts = s.split(".").map(Number);
    if (parts.some((p) => p > 255)) return null;
    return parts.reduce((acc, p) => (acc * 256) + p, 0) >>> 0;
};

const fmtIp = (n) => [24, 16, 8, 0].map((shift) => (n >>> shift) & 255).join(".");

const maskOf = (prefix) => (prefix === 0 ? 0 : (0xFFFFFFFF << (32 - prefix)) >>> 0);

// Accepts "22" or "255.255.252.0"; returns the prefix length or null.
const parsePrefix = (s) => {
    if (/^\d{1,2}$/.test(s)) {
        const n = Number(s);
        return n <= 32 ? n : null;
    }
    const mask = parseIp(s);
    if (mask === null) return null;
    const inv = ~mask >>> 0;
    if ((inv & (inv + 1)) !== 0) return null; // not contiguous
    return 32 - Math.log2(inv + 1);
};

const classify = (ip) => {
    for (const [net, prefix, label] of SPECIAL) {
        if (((ip & maskOf(prefix)) >>> 0) === parseIp(net)) return label;
    }
    return "public";
};

function describe(input) {
    const [ipPart, prefixPart = "32", extra] = input.split("/");
    if (extra !== undefined) return null;

    const ip = parseIp(ipPart);
    const prefix = parsePrefix(prefixPart);
    if (ip === null || prefix === null) return null;

    const mask = maskOf(prefix);
    const network = (ip & mask) >>> 0;
    const broadcast = (network | ~mask) >>> 0;
    const total = 2 ** (32 - prefix);

    // /31 is point-to-point (RFC 3021) and /32 a single host: no network or
    // broadcast address to set aside.
    const [first, last, hosts] = prefix >= 31
        ? [network, broadcast, total]
        : [network + 1, broadcast - 1, total - 2];

    const rows = [
        ["cidr", `${fmtIp(network)}/${prefix}`],
        ["input", ip !== network ? `${fmtIp(ip)} (inside this network)` : undefined],
        ["netmask", fmtIp(mask)],
        ["wildcard", fmtIp(~mask >>> 0)],
        ["network", fmtIp(network)],
        ["broadcast", prefix >= 31 ? undefined : fmtIp(broadcast)],
        ["first host", fmtIp(first)],
        ["last host", fmtIp(last)],
        ["hosts", hosts.toLocaleString("en-US")],
        ["addresses", total.toLocaleString("en-US")],
        ["type", classify(network)],
    ].filter(([, value]) => value !== undefined);

    const width = Math.max(...rows.map(([label]) => label.length));
    return rows.map(([label, value]) => `${label.padEnd(width)}  ${value}`).join("\n") + "\n";
}

export function onRequest({ request }) {
    const url = new URL(request.url);
    const input = decodeURIComponent(url.pathname.replace(/^\/cidr\/?/, "")).trim()
        || url.searchParams.get("q") || "";

    if (!input) return new Response(USAGE, { headers: HEADERS });

    const body = describe(input);
    if (!body) {
        return new Response(`can't parse "${input}" as an IPv4 CIDR\n\n${USAGE}`, {
            status: 400,
            headers: HEADERS,
        });
    }
    return new Response(body, { headers: HEADERS });
}
