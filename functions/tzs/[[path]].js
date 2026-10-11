// /tzs           -> every timezone, one per line: name, current offset, local time
// /tzs/europe    -> only lines containing "europe" (case-insensitive)
// /tzs/+05:30    -> works on the offset too
//
// Meant for grepping:  curl -sL <host>/tzs | grep -i berlin
// Any name listed here works with /tz.

const HEADERS = {
    "content-type": "text/plain; charset=utf-8",
    "access-control-allow-origin": "*",
    "cache-control": "no-store",
};

// V8 still reports some zones by their old names; list the current ones
// (/tz accepts both). Same table as in tools.html.
const MODERN = {
    "Asia/Calcutta": "Asia/Kolkata", "Asia/Saigon": "Asia/Ho_Chi_Minh", "Asia/Katmandu": "Asia/Kathmandu",
    "Asia/Rangoon": "Asia/Yangon", "Europe/Kiev": "Europe/Kyiv", "Atlantic/Faeroe": "Atlantic/Faroe",
    "America/Godthab": "America/Nuuk", "Pacific/Truk": "Pacific/Chuuk", "Pacific/Ponape": "Pacific/Pohnpei",
    "Pacific/Enderbury": "Pacific/Kanton", "Africa/Asmera": "Africa/Asmara",
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const pad = (n) => String(n).padStart(2, "0");

// "UTC+05:30" and "Sun 14:31" for `zone` at `now`
function describe(zone, now) {
    const p = Object.fromEntries(
        new Intl.DateTimeFormat("en-US", {
            timeZone: zone, hourCycle: "h23",
            year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric",
        }).formatToParts(now).map((x) => [x.type, Number(x.value)]),
    );
    const wall = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
    const mins = Math.round((wall - Math.floor(now / 60e3) * 60e3) / 60e3);
    const abs = Math.abs(mins);
    const offset = `UTC${mins < 0 ? "-" : "+"}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
    return [offset, `${DAYS[new Date(wall).getUTCDay()]} ${pad(p.hour)}:${pad(p.minute)}`];
}

export function onRequest({ request }) {
    const url = new URL(request.url);
    const filter = decodeURIComponent(url.pathname.replace(/^\/tzs\/?/, "")).replace(/\/$/, "").trim().toLowerCase();

    const zones = [...new Set(["UTC", ...Intl.supportedValuesOf("timeZone").map((z) => MODERN[z] || z)])].sort();
    const now = Date.now();
    const width = Math.max(...zones.map((z) => z.length));

    const lines = zones
        .map((zone) => [zone.padEnd(width), ...describe(zone, now)].join("  "))
        .filter((line) => !filter || line.toLowerCase().includes(filter));

    if (!lines.length) {
        return new Response(`no timezone matches "${filter}"\n`, { status: 404, headers: HEADERS });
    }
    return new Response(lines.join("\n") + "\n", { headers: HEADERS });
}
