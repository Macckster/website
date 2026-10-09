// /cron/*/15_9-17_*_*_1-5   -> plain-English explanation + next 5 runs
// /cron/@daily              -> macros work too
// ?tz=Europe/Berlin         -> timezone for the next runs (default: the
//                              caller's, as guessed by Cloudflare, else UTC)
//
// URLs can't hold spaces, so "_" (or "+") separates the fields.
// Standard 5-field cron with Vixie semantics: when both day-of-month and
// day-of-week are restricted, a day matches if EITHER does.

const HEADERS = {
    "content-type": "text/plain; charset=utf-8",
    "access-control-allow-origin": "*",
    "cache-control": "no-store",
};

const USAGE = `usage (quote it so your shell leaves the * alone; _ stands for a space):
  curl -L '<host>/cron/*/15_9-17_*_*_1-5'
  curl -L '<host>/cron/@daily'
  curl -L '<host>/cron/0_3_*_*_*?tz=Europe/Berlin'

fields: minute hour day-of-month month day-of-week
next runs are shown in your timezone unless ?tz= is given.
`;

const MONTHS = ["January", "February", "March", "April", "May", "June", "July",
    "August", "September", "October", "November", "December"];
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const pad = (n) => String(n).padStart(2, "0");

const FIELDS = [
    { name: "minute", min: 0, max: 59, unit: "minutes", fmt: String },
    { name: "hour", min: 0, max: 23, unit: "hours", fmt: pad },
    { name: "day-of-month", min: 1, max: 31, unit: "days", fmt: String },
    { name: "month", min: 1, max: 12, unit: "months", fmt: (v) => MONTHS[v - 1],
        names: MONTHS.map((m) => m.slice(0, 3).toLowerCase()), nameBase: 1 },
    // 0 and 7 are both Sunday
    { name: "day-of-week", min: 0, max: 7, starMax: 6, unit: "days of the week", fmt: (v) => DAYS[v % 7],
        names: DAYS.map((d) => d.slice(0, 3).toLowerCase()), nameBase: 0 },
];

const MACROS = {
    "@yearly": "0 0 1 1 *",
    "@annually": "0 0 1 1 *",
    "@monthly": "0 0 1 * *",
    "@weekly": "0 0 * * 0",
    "@daily": "0 0 * * *",
    "@midnight": "0 0 * * *",
    "@hourly": "0 * * * *",
};

class CronError extends Error {}

// ─── Parsing ────────────────────────────────────────────────────────────────

function parseValue(text, field) {
    const lower = text.toLowerCase();
    if (field.names && field.names.includes(lower)) return field.names.indexOf(lower) + field.nameBase;
    if (!/^\d+$/.test(text)) throw new CronError(`bad ${field.name} value "${text}"`);
    const n = Number(text);
    if (n < field.min || n > field.max) {
        throw new CronError(`${field.name} ${n} is out of range (${field.min}-${field.max})`);
    }
    return n;
}

// "1-5/2" -> { from: 1, to: 5, step: 2, all: false }
function parseItem(text, field) {
    const [range, stepText, extra] = text.split("/");
    if (extra !== undefined || range === "") throw new CronError(`bad ${field.name} "${text}"`);

    let step = 1;
    if (stepText !== undefined) {
        if (!/^\d+$/.test(stepText) || Number(stepText) < 1) {
            throw new CronError(`bad step "/${stepText}" in ${field.name}`);
        }
        step = Number(stepText);
    }

    if (range === "*") return { from: field.min, to: field.starMax ?? field.max, step, all: true };

    const [a, b] = range.split("-");
    const from = parseValue(a, field);
    // "5/15" means "from 5 through the end, every 15"
    const to = b !== undefined ? parseValue(b, field) : (stepText !== undefined ? field.max : from);
    if (from > to) throw new CronError(`${field.name} range "${range}" runs backwards`);
    return { from, to, step, all: false };
}

function parseField(text, field) {
    const items = text.split(",").map((part) => parseItem(part, field));
    const set = new Array(field.max + 1).fill(false);
    for (const { from, to, step } of items) {
        for (let v = from; v <= to; v += step) set[field.name === "day-of-week" ? v % 7 : v] = true;
    }
    return {
        items,
        set,
        star: text.startsWith("*"),                        // Vixie's DOM_STAR / DOW_STAR
        every: items.length === 1 && items[0].all && items[0].step === 1,
    };
}

function parse(expr) {
    const lower = expr.toLowerCase();
    if (lower === "@reboot") throw new CronError("@reboot runs at boot, not on a schedule");
    if (lower.startsWith("@")) {
        if (!MACROS[lower]) throw new CronError(`unknown macro "${expr}"`);
        expr = MACROS[lower];
    }

    const parts = expr.split(" ");
    if (parts.length !== 5) {
        throw new CronError(`expected 5 fields, got ${parts.length}`
            + (parts.length === 6 ? " (a seconds field isn't supported)" : ""));
    }
    return parts.map((text, i) => parseField(text, FIELDS[i]));
}

// ─── Explaining ─────────────────────────────────────────────────────────────

const joinList = (xs) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs.at(-1)}`);

const isSingle = (item) => !item.all && item.from === item.to;

// Text for one comma-separated item; "value" items get a field-specific prefix
// from the caller, stepped items read on their own.
function itemText(item, field) {
    const { fmt, unit } = field;
    if (item.step > 1) {
        const every = `every ${item.step} ${unit}`;
        return item.all ? every : `${every} from ${fmt(item.from)} through ${fmt(item.to)}`;
    }
    if (field.name === "hour") return `${pad(item.from)}:00-${pad(item.to)}:59`;
    return isSingle(item) ? fmt(item.from) : `${fmt(item.from)} through ${fmt(item.to)}`;
}

// Groups plain values under one prefix ("on Monday and Friday") and keeps
// stepped items separate ("every 2 hours").
function fieldText(parsed, field, prefix) {
    const values = parsed.items.filter((i) => i.step === 1).map((i) => itemText(i, field));
    const steps = parsed.items.filter((i) => i.step > 1).map((i) => itemText(i, field));
    return joinList([...(values.length ? [`${prefix(values)} ${joinList(values)}`] : []), ...steps]);
}

function explain([minute, hour, dom, month, dow]) {
    const parts = [];

    // "at 09:00 and 17:30" when minute and hour are both plain values
    const times = minute.items.every(isSingle) && hour.items.every(isSingle)
        ? hour.items.flatMap((h) => minute.items.map((m) => `${pad(h.from)}:${pad(m.from)}`))
        : null;

    if (times && times.length <= 8) {
        parts.push(`at ${joinList(times)}`);
    } else {
        parts.push(minute.every
            ? "every minute"
            : fieldText(minute, FIELDS[0], (v) => `at minute${v.length > 1 || !isSingle(minute.items[0]) ? "s" : ""}`));
        if (!hour.every) parts.push(fieldText(hour, FIELDS[1], () => "during"));
    }

    const domText = dom.every ? null : fieldText(dom, FIELDS[2], () => "on day-of-month");
    const dowText = dow.every ? null : fieldText(dow, FIELDS[4], () => "on");
    if (domText && dowText) {
        parts.push(!dom.star && !dow.star ? `${domText} or ${dowText}` : `${domText} if it's also ${dowText.replace(/^on /, "a ")}`);
    } else if (domText || dowText) {
        parts.push(domText || dowText);
    }

    if (!month.every) parts.push(fieldText(month, FIELDS[3], () => "in"));

    const sentence = parts.join(", ");
    return sentence[0].toUpperCase() + sentence.slice(1);
}

// ─── Next runs ──────────────────────────────────────────────────────────────

// Current wall-clock time in `tz`, as a "naive" UTC timestamp. All schedule
// maths happens on these, so DST gaps/overlaps are glossed over.
function wallClockNow(tz) {
    const parts = Object.fromEntries(
        new Intl.DateTimeFormat("en-US", {
            timeZone: tz, hourCycle: "h23",
            year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric",
        }).formatToParts(new Date()).map((p) => [p.type, Number(p.value)]),
    );
    return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute);
}

function nextRuns([minute, hour, dom, month, dow], start, count) {
    const dayMatches = (d) => {
        const domOk = dom.set[d.getUTCDate()];
        const dowOk = dow.set[d.getUTCDay()];
        return dom.star || dow.star ? domOk && dowOk : domOk || dowOk;
    };

    const runs = [];
    const giveUp = start + 5 * 366 * 86400e3;
    let t = start + 60e3;

    // Jump a whole month/day/hour at a time when that field doesn't match.
    while (runs.length < count && t < giveUp) {
        const d = new Date(t);
        const [y, mo, day, h] = [d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), d.getUTCHours()];
        if (!month.set[mo + 1]) t = Date.UTC(y, mo + 1, 1);
        else if (!dayMatches(d)) t = Date.UTC(y, mo, day + 1);
        else if (!hour.set[h]) t = Date.UTC(y, mo, day, h + 1);
        else if (!minute.set[d.getUTCMinutes()]) t += 60e3;
        else { runs.push(t); t += 60e3; }
    }
    return runs;
}

const fmtRun = (t) => {
    const d = new Date(t);
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} `
        + `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}  ${DAYS[d.getUTCDay()].slice(0, 3)}`;
};

const fmtIn = (ms) => {
    let mins = Math.round(ms / 60e3);
    const days = Math.floor(mins / 1440); mins -= days * 1440;
    const hours = Math.floor(mins / 60); mins -= hours * 60;
    return "in " + [days && `${days}d`, hours && `${hours}h`, `${mins}m`].filter(Boolean).join(" ");
};

// ─── Handler ────────────────────────────────────────────────────────────────

export function onRequest({ request }) {
    const url = new URL(request.url);
    const expr = (decodeURIComponent(url.pathname.replace(/^\/cron\/?/, "")) || url.searchParams.get("e") || "")
        .replace(/[_+]/g, " ").trim().replace(/\s+/g, " ");

    if (!expr) return new Response(USAGE, { headers: HEADERS });

    const tz = url.searchParams.get("tz") || request.cf?.timezone || "UTC";
    try {
        new Intl.DateTimeFormat("en-US", { timeZone: tz });
    } catch {
        return new Response(`unknown timezone "${tz}"\n`, { status: 400, headers: HEADERS });
    }

    let fields;
    try {
        fields = parse(expr);
    } catch (err) {
        if (!(err instanceof CronError)) throw err;
        return new Response(`${err.message}: "${expr}"\n\n${USAGE}`, { status: 400, headers: HEADERS });
    }

    const now = wallClockNow(tz);
    const runs = nextRuns(fields, now, 5);

    const lines = [
        `expression  ${expr}`,
        `meaning     ${explain(fields)}`,
        "",
        `next runs (${tz})`,
        ...(runs.length
            ? runs.map((t) => `  ${fmtRun(t)}   ${fmtIn(t - now)}`)
            : ["  none in the next 5 years"]),
        "",
    ];
    return new Response(lines.join("\n"), { headers: HEADERS });
}
