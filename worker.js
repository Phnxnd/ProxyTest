export default {
  async fetch(request) {
    const url = new URL(request.url);
    const target = url.searchParams.get("url");
    if (!target) {
      return new Response("Missing ?url=", { status: 400 });
    }
    return fetch(target, {
      headers: { "User-Agent": "Mozilla/5.0" }
    });
  }
};
