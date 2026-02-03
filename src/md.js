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
