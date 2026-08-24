export function onRequest({ request }) {
    return new Response(request.headers.get("CF-Connecting-IP") + "\n", {
        headers: {
            "content-type": "text/plain; charset=utf-8",
            "access-control-allow-origin": "*",
            "cache-control": "no-store",
        },
    });
}
