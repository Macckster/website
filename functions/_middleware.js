// Terminal clients (curl, wget, ...) hitting "/" get a plain-text version of
// the site. Everything else falls through to the normal static assets.
//
// Browsers can force it with https://<host>/?tty

const TERMINAL_UA = /^(curl|Wget|HTTPie|xh|lwp-request|python-requests|Go-http-client)/i;

const page = (host) => String.raw`
                        !
                        ^
                       / \
                      /___\
                     |=   =|
                     |     |
                     |  ∞  |
                     |     |
                     |     |
                    /|##!##|\
                   / |##!##| \
                  /  |##!##|  \
                 |  / ^ | ^ \  |
                 | /  ( | )  \ |
                 |/   ( | )   \|
                     ((   ))
                    ((  :  ))
                    ((  :  ))
                     ((   ))
                      (( ))
                       ( )
                        .
                        .

                D E E P   S P A C E
              somewhere in the universe

   --- endpoints ------------------------------------------------------
   /ip          your public IP address, plain text
   /ip?extra=1  the above, plus country, network, colo, ...
   /cidr        subnet calculator       /cidr/10.0.0.0/22
   /dns         DNS lookup              /dns/example.com/mx
   /cron        explain a cron line     /cron/*/15_9-17_*_*_1-5
   /tz          convert timezones       /tz/15:00/Europe/Berlin
   /tools       all of the above with input fields, for browsers
   /?tty        this page, from a browser

   --- cheat sheets ---------------------------------------------------
   /firewalld   /systemd   /git   /ssh

   --- links ----------------------------------------------------------
   github       https://github.com/Macckster
   --- notes ----------------------------------------------------------
   The browser version has things hidden in it. Start with the
   Konami code, then try typing at it.

   $ curl -L ${host}/ip

`;

// Cheat sheet pages. Terminal clients get a plain-text rendering generated
// from the HTML page itself, so the .html file stays the only source.
const CHEATSHEETS = new Set(["/firewalld", "/systemd", "/git", "/ssh"]);

const RULE_WIDTH = 66;

const decode = (s) => s
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");

function cheatsheetToText(html) {
    const out = [""];
    const re = /<(h1|h2|h3|pre)[^>]*>([\s\S]*?)<\/\1>|<p class="note">([\s\S]*?)<\/p>/g;

    for (const [, tag, body, note] of html.matchAll(re)) {
        if (note !== undefined) {
            out.push(`     # ${decode(note).trim()}`);
            continue;
        }
        const text = decode(body);
        if (tag === "h1") {
            const title = `${text.trim()} cheat sheet`;
            out.push(`   ${title}`, `   ${"=".repeat(title.length)}`);
        } else if (tag === "h2") {
            const head = `--- ${text.trim().toLowerCase()} `;
            out.push("", "", `   ${head.padEnd(RULE_WIDTH, "-")}`);
        } else if (tag === "h3") {
            out.push("", `   ${text.trim()}`);
        } else {
            out.push(...text.replace(/\n+$/, "").split("\n").map((l) => `       ${l}`));
        }
    }

    out.push("", "");
    return out.join("\n");
}

const plain = (body) => new Response(body, {
    headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-store",
    },
});

export async function onRequest({ request, next }) {
    const url = new URL(request.url);
    const terminal = TERMINAL_UA.test(request.headers.get("user-agent") || "");
    const wantsText = terminal || url.searchParams.has("tty");

    if (url.pathname === "/" && wantsText) {
        return plain(page(url.host));
    }

    if (CHEATSHEETS.has(url.pathname) && wantsText) {
        const res = await next();
        if (!res.ok) return res;
        return plain(cheatsheetToText(await res.text()));
    }

    return next();
}
