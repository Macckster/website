// /uuid          -> one random (v4) UUID
// /uuid/5        -> five of them, one per line (up to 100)
// /uuid?v=7      -> time-ordered v7 UUIDs instead (sort by creation time)

const HEADERS = {
    "content-type": "text/plain; charset=utf-8",
    "access-control-allow-origin": "*",
    "cache-control": "no-store",
};

const USAGE = `usage:
  curl -L <host>/uuid               one random (v4) UUID
  curl -L <host>/uuid/5             five of them (max 100)
  curl -L '<host>/uuid/5?v=7'       time-ordered v7 UUIDs
`;

const MAX = 100;

const hex = (bytes) => [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
const dashed = (h) => `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;

// RFC 9562: 48-bit Unix time in ms, then version, then random bits.
// Several made in the same millisecond only sort by their random part.
function uuidv7() {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    let ms = Date.now();
    for (let i = 5; i >= 0; i--) {
        bytes[i] = ms % 256;
        ms = Math.floor(ms / 256);
    }
    bytes[6] = (bytes[6] & 0x0f) | 0x70;  // version 7
    bytes[8] = (bytes[8] & 0x3f) | 0x80;  // RFC variant
    return dashed(hex(bytes));
}

export function onRequest({ request }) {
    const url = new URL(request.url);
    const countText = url.pathname.replace(/^\/uuid\/?/, "").replace(/\/$/, "") || "1";
    const version = url.searchParams.get("v") || "4";

    const fail = (msg) => new Response(`${msg}\n\n${USAGE}`, { status: 400, headers: HEADERS });
    if (!/^\d+$/.test(countText) || Number(countText) < 1 || Number(countText) > MAX) {
        return fail(`count must be a number from 1 to ${MAX}`);
    }
    if (version !== "4" && version !== "7") return fail(`unsupported version "${version}" (4 or 7)`);

    const make = version === "7" ? uuidv7 : () => crypto.randomUUID();
    const ids = Array.from({ length: Number(countText) }, make);
    return new Response(ids.join("\n") + "\n", { headers: HEADERS });
}
