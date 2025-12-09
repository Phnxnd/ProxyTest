export default async function handler(req, res) {
  const target = req.query.url;
  if (!target) {
    return res.status(400).send("Missing url");
  }

  const targetUrl = new URL(target);

  const response = await fetch(target, {
    headers: {
      "User-Agent": "Mozilla/5.0"
    }
  });

  let html = await response.text();

  // Rewrite relative asset paths
  html = html.replace(/(src|href)=["']\/(.*?)["']/g, (match, attr, path) => {
    return `${attr}="/api/proxy?url=${encodeURIComponent(
      targetUrl.origin + "/" + path
    )}"`;
  });

  res.setHeader("Content-Type", "text/html");
  res.send(html);
}
