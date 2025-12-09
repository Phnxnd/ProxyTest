export default async function handler(req, res) {
  const target = req.query.url;
  if (!target) return res.status(400).send("Missing url");

  const response = await fetch(target, {
    headers: { "User-Agent": "Mozilla/5.0" }
  });

  const text = await response.text();
  res.setHeader("Content-Type", "text/html");
  res.send(text);
}
