// /tz                                      -> current time here and in UTC
// /tz/Asia/Tokyo                           -> current time in Tokyo (+ here, UTC)
// /tz/15:00/Europe/Berlin                  -> 15:00 Berlin time, today, in your zone
// /tz/15:00/Europe/Berlin/America/New_York -> ... in New York instead
// /tz/2026-10-10_9am/UTC/Asia/Tokyo,Europe/Paris
//
// "Your zone" is Cloudflare's guess from your IP; override with ?here=Zone.
// Zone names are case-insensitive, and several can be separated by commas.

const HEADERS = {
    "content-type": "text/plain; charset=utf-8",
    "access-control-allow-origin": "*",
    "cache-control": "no-store",
};

const USAGE = `usage:
  curl -L <host>/tz/Asia/Tokyo                            now in Tokyo
  curl -L <host>/tz/15:00/Europe/Berlin                   15:00 Berlin time in your zone
  curl -L <host>/tz/3pm/Europe/Berlin/America/New_York    ... in New York
  curl -L <host>/tz/2026-10-10_09:30/UTC/Asia/Tokyo,Europe/Paris

times: now, 15:00, 15, 3pm, 3:30pm, 2026-10-10, 2026-10-10_15:00
`;

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const pad = (n) => String(n).padStart(2, "0");

class TzError extends Error {}

// Properly-cased zone name ("europe/berlin" -> "Europe/Berlin"), or null.
// V8 resolves some names to legacy aliases (Asia/Kolkata -> Asia/Calcutta);
// in that case keep what was typed, title-cased.
const canonicalZone = (name) => {
    let resolved;
    try {
        resolved = new Intl.DateTimeFormat("en-US", { timeZone: name }).resolvedOptions().timeZone;
    } catch {
        return null;
    }
    if (resolved.toLowerCase() === name.toLowerCase()) return resolved;
    return name.replace(/[a-z]+/gi, (w) => (w.length <= 3 && w === w.toUpperCase() ? w : w[0].toUpperCase() + w.slice(1).toLowerCase()));
};

// Splits ["Europe", "Berlin", "America", "New_York"] into zones by taking the
// longest valid name at each step (zones are 1-3 segments long).
function parseZones(segments) {
    const zones = [];
    const segs = segments.flatMap((s) => s.split(",")).filter(Boolean);
    while (segs.length) {
        let found = null;
        for (let k = Math.min(3, segs.length); k >= 1 && !found; k--) {
            const zone = canonicalZone(segs.slice(0, k).join("/"));
            if (zone) found = [zone, k];
        }
        if (!found) throw new TzError(`unknown timezone "${segs.join("/")}"`);
        zones.push(found[0]);
        segs.splice(0, found[1]);
    }
    return zones;
}

// "15:00" / "3pm" / "2026-10-10_9:30am" -> { date?: [y, m, d], time: [h, min] }
function parseTime(text) {
    const m = text.toLowerCase().match(
        /^(?:(\d{4})-(\d{2})-(\d{2}))?(?:[_t ]?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?)?$/,
    );
    if (!m || (!m[1] && !m[4])) return null;

    const date = m[1] ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
    let hour = m[4] ? Number(m[4]) : 0;
    const minute = m[5] ? Number(m[5]) : 0;
    if (m[6]) {
        if (hour < 1 || hour > 12) throw new TzError(`bad 12-hour time "${text}"`);
        hour = (hour % 12) + (m[6] === "pm" ? 12 : 0);
    }
    if (hour > 23 || minute > 59) throw new TzError(`bad time "${text}"`);
    if (date && (date[1] < 1 || date[1] > 12 || date[2] < 1 || date[2] > 31)) {
        throw new TzError(`bad date "${text}"`);
    }
    return { date, time: [hour, minute] };
}

// Wall-clock fields of `instant` in `zone`.
function wallClock(instant, zone) {
    const p = Object.fromEntries(
        new Intl.DateTimeFormat("en-US", {
            timeZone: zone, hourCycle: "h23",
            year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric",
        }).formatToParts(instant).map((x) => [x.type, Number(x.value)]),
    );
    return { y: p.year, m: p.month, d: p.day, h: p.hour, min: p.minute };
}

// Offset of `zone` from UTC at `instant`, in minutes.
function offsetMinutes(instant, zone) {
    const w = wallClock(instant, zone);
    const asUtc = Date.UTC(w.y, w.m - 1, w.d, w.h, w.min);
    return Math.round((asUtc - Math.floor(instant / 60e3) * 60e3) / 60e3);
}

// Wall-clock time in `zone` -> UTC instant. Checks the offset twice so times
// near a DST change land on the right side of it.
function toInstant(y, m, d, h, min, zone) {
    const naive = Date.UTC(y, m - 1, d, h, min);
    let instant = naive - offsetMinutes(naive, zone) * 60e3;
    instant = naive - offsetMinutes(instant, zone) * 60e3;
    return instant;
}

const fmtOffset = (mins) => {
    const sign = mins < 0 ? "-" : "+";
    const abs = Math.abs(mins);
    return `UTC${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
};

export function onRequest({ request }) {
    const url = new URL(request.url);
    const segments = decodeURIComponent(url.pathname.replace(/^\/tz\/?/, "")).split("/").filter(Boolean);
    const here = canonicalZone(url.searchParams.get("here") || request.cf?.timezone || "UTC") || "UTC";

    let instant = Date.now();
    let zones;
    let given = false;  // did the caller give a specific time?

    try {
        const parsed = segments.length && segments[0].toLowerCase() !== "now" ? parseTime(segments[0]) : null;
        const zoneSegs = parsed || segments[0]?.toLowerCase() === "now" ? segments.slice(1) : segments;
        zones = parseZones(zoneSegs);

        if (parsed) {
            given = true;
            const from = zones[0] || here;
            const today = wallClock(Date.now(), from);
            const [y, m, d] = parsed.date || [today.y, today.m, today.d];
            instant = toInstant(y, m, d, ...parsed.time, from);
            if (!zones.length) zones = [from];
            if (zones.length === 1 && zones[0] !== here) zones.push(here);
        } else if (!zones.includes(here)) {
            zones.push(here);
        }
    } catch (err) {
        if (!(err instanceof TzError)) throw err;
        return new Response(`${err.message}\n\n${USAGE}`, { status: 400, headers: HEADERS });
    }

    if (!zones.includes("UTC")) zones.push("UTC");

    // Day differences are relative to the first zone listed
    const base = wallClock(instant, zones[0]);
    const baseDay = Date.UTC(base.y, base.m - 1, base.d);

    const rows = zones.map((zone) => {
        const w = wallClock(instant, zone);
        const dayDiff = Math.round((Date.UTC(w.y, w.m - 1, w.d) - baseDay) / 86400e3);
        const weekday = DAYS[new Date(Date.UTC(w.y, w.m - 1, w.d)).getUTCDay()];
        return [
            `${pad(w.h)}:${pad(w.min)}`,
            `${weekday} ${w.y}-${pad(w.m)}-${pad(w.d)}`,
            zone,
            fmtOffset(offsetMinutes(instant, zone)),
            [dayDiff ? `${dayDiff > 0 ? "+" : ""}${dayDiff} day` : "", zone === here ? "<- you" : ""]
                .filter(Boolean).join("  "),
        ];
    });

    const widths = [0, 1, 2, 3].map((i) => Math.max(...rows.map((r) => r[i].length)));
    const lines = rows.map((r) => r.map((c, i) => (i < 4 ? c.padEnd(widths[i]) : c)).join("   ").trimEnd());

    const body = [
        ...(segments.length ? [] : [USAGE]),
        ...(given ? [] : ["now:"]),
        ...lines,
    ];

    return new Response(body.join("\n") + "\n", { headers: HEADERS });
}
