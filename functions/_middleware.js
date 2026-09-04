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
   /?tty        this page, from a browser

   --- links ----------------------------------------------------------
   github       https://github.com/Macckster
   --- notes ----------------------------------------------------------
   The browser version has things hidden in it. Start with the
   Konami code, then try typing at it.

   $ curl -L ${host}/ip

`;

export function onRequest({ request, next }) {
    const url = new URL(request.url);
    const terminal = TERMINAL_UA.test(request.headers.get("user-agent") || "");

    if (url.pathname === "/" && (terminal || url.searchParams.has("tty"))) {
        return new Response(page(url.host), {
            headers: {
                "content-type": "text/plain; charset=utf-8",
                "cache-control": "no-store",
            },
        });
    }

    return next();
}
