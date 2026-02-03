export function decodeHtmlEntities(str) {
  const ta = document.createElement("textarea");
  ta.innerHTML = str;
  return ta.value;
}

export function decodeUntilStable(str, max = 3) {
  let prev = String(str ?? "");
  for (let i = 0; i < max; i++) {
    const next = decodeHtmlEntities(prev);
    if (next === prev) break;
    prev = next;
  }
  return prev;
}

export function hasInTextHighlights(contentInnerHtml) {
  const decoded = decodeUntilStable(contentInnerHtml, 3);

  const m = decoded.match(
    /<h3>\s*In-text annotations\s*<\/h3>\s*([\s\S]*?)(?=<h[1-6]\b|$)/i,
  );
  if (!m) return false;

  const block = m[1] || "";
  return /<mark\b/i.test(block);
}

export function extractHighlights(noteHtml) {
  const decoded = decodeUntilStable(noteHtml, 3);

  const blockMatch = decoded.match(
    /<h3>\s*In-text annotations\s*<\/h3>\s*([\s\S]*?)(?:<h3>|$)/i,
  );
  const block = blockMatch ? blockMatch[1] : decoded;

  // <mark ...>QUOTE</mark> <a href="zotero://open-pdf/...">Page 21</a>
  const re =
    /<mark\b[^>]*>([\s\S]*?)<\/mark>\s*<a\b[^>]*href="([^"]+)"[^>]*>\s*Page\s*(\d+)\s*<\/a>/gi;

  const out = [];
  let m;
  while ((m = re.exec(block)) !== null) {
    const quote = m[1]
      .trim()
      .replace(/^"+|"+$/g, "")
      .trim();
    const href = m[2];
    const page = m[3];
    if (quote && href && page) out.push({ quote, href, page });
  }
  return out;
}
