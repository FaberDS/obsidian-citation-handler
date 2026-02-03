function escCell(text) {
  return String(text)
    .replace(/\|/g, "\\|")
    .replace(/\r?\n/g, "<br>")
    .replace(//g, "<br>•")
    .trim();
}

export function makeMdTable(rows) {
  const header =
    `| Original highlight | Paraphrase | Place | Page |\n` +
    `|---|---|---|---|\n`;

  const body = rows
    .map((r) => {
      const pageLink = `[p.${r.page}](${r.href})`;
      return `| ${escCell(r.quote)} | ${escCell(r.paraphrase)} | ${escCell(r.place)} | ${pageLink} |`;
    })
    .join("\n");

  return header + body + "\n";
}

export function makeMdCitationsSection({ citationKey, rows }) {
  const header =
    `### LLM citations (${citationKey})\n\n` +
    `| Original highlight | Paraphrase | Place | Page | Citation |\n` +
    `|---|---|---|---|---|\n`;

  const body = rows
    .map((r) => {
      const pageLink = `[p.${r.page}](${r.href})`;
      const cite = `\\autocite[${r.page}]{${citationKey}}`;
      return `| ${escCell(r.quote)} | ${escCell(r.paraphrase)} | ${escCell(r.place)} | ${pageLink} | ${escCell(cite)} |`;
    })
    .join("\n");

  return header + body + "\n";
}

export function mdToHtml(md) {
  const lines = String(md || "")
    .replace(/\r\n?/g, "\n")
    .split("\n");
  const blocks = [];

  let i = 0;
  let inCode = false;
  let codeFence = "```";
  let codeBuf = [];

  let listType = null;
  let listBuf = [];

  const flushList = () => {
    if (!listType || !listBuf.length) return;
    const tag = listType === "ol" ? "ol" : "ul";
    blocks.push(`<${tag}>${listBuf.join("")}</${tag}>`);
    listType = null;
    listBuf = [];
  };

  const flushParagraph = (buf) => {
    const text = buf.join(" ").trim();
    if (!text) return;
    blocks.push(`<p>${inline(text)}</p>`);
  };

  let paraBuf = [];

  while (i < lines.length) {
    const line = lines[i];

    if (!inCode) {
      const m = line.match(/^\s*(```+)(.*)$/);
      if (m) {
        flushList();
        flushParagraph(paraBuf);
        paraBuf = [];

        inCode = true;
        codeFence = m[1];
        codeBuf = [];
        i++;
        continue;
      }
    } else {
      if (line.trim().startsWith(codeFence)) {
        const code = escapeHtml(codeBuf.join("\n"));
        blocks.push(`<pre><code>${code}</code></pre>`);
        inCode = false;
        i++;
        continue;
      }
      codeBuf.push(line);
      i++;
      continue;
    }

    if (!line.trim()) {
      flushList();
      flushParagraph(paraBuf);
      paraBuf = [];
      i++;
      continue;
    }

    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      flushList();
      flushParagraph(paraBuf);
      paraBuf = [];

      const level = h[1].length;
      blocks.push(`<h${level}>${inline(h[2].trim())}</h${level}>`);
      i++;
      continue;
    }

    const ol = line.match(/^\s*(\d+)\.\s+(.*)$/);
    if (ol) {
      flushParagraph(paraBuf);
      paraBuf = [];

      if (listType && listType !== "ol") flushList();
      listType = "ol";
      listBuf.push(`<li>${inline(ol[2])}</li>`);
      i++;
      continue;
    }

    const ul = line.match(/^\s*[-*+]\s+(.*)$/);
    if (ul) {
      flushParagraph(paraBuf);
      paraBuf = [];

      if (listType && listType !== "ul") flushList();
      listType = "ul";
      listBuf.push(`<li>${inline(ul[1])}</li>`);
      i++;
      continue;
    }

    const bq = line.match(/^\s*>\s?(.*)$/);
    if (bq) {
      flushList();
      flushParagraph(paraBuf);
      paraBuf = [];

      blocks.push(`<blockquote>${inline(bq[1])}</blockquote>`);
      i++;
      continue;
    }

    paraBuf.push(escapeHtml(line.trim()));
    i++;
  }

  flushList();
  flushParagraph(paraBuf);

  return blocks.join("\n");
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function inline(s) {
  let out = escapeHtml(String(s));

  out = out.replace(/`([^`]+)`/g, (_, c) => `<code>${escapeHtml(c)}</code>`);

  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, text, href) => {
    const safeHref = href.replace(/"/g, "%22");
    return `<a href="${safeHref}" target="_blank" rel="noopener">${text}</a>`;
  });

  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/\*([^*]+)\*/g, "<em>$1</em>");

  return out;
}
