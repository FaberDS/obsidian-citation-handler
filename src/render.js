import {
  ensureReadWritePermission,
  readFileText,
  writeFileText,
  openFile,
} from "./file_handling.js";
import { makeMdCitationsSection } from "./md.js";

export function ensureResultsBox() {
  let box = document.getElementById("citationsBox");
  if (box) return box;

  const outEl = document.getElementById("llmOutputElement");
  box = document.createElement("div");
  box.id = "citationsBox";
  box.className = "citationsBox";

  // header
  const header = document.createElement("div");
  header.className = "citationsBoxHeader";

  const title = document.createElement("div");
  title.id = "citationsBoxTitle";
  title.className = "citationsBoxTitle";
  title.textContent = "Citations";

  header.appendChild(title);

  // table container
  const body = document.createElement("div");
  body.className = "citationsBoxBody";

  const tableWrap = document.createElement("div");
  tableWrap.id = "citationsTableWrap";

  body.appendChild(tableWrap);

  box.append(header, body);

  outEl.insertAdjacentElement("afterend", box);

  return box;
}

export function renderResultsTableInline({ citationKey, rows }) {
  ensureResultsBox();
  console.log(rows);
  const title = document.getElementById("citationsBoxTitle");
  title.textContent = `Citations – ${citationKey} (${rows.length})`;

  const wrap = document.getElementById("citationsTableWrap");
  wrap.textContent = "";

  const table = document.createElement("table");
  table.className = "citationsTable";

  const thead = document.createElement("thead");
  const hr = document.createElement("tr");
  [
    "Original highlight",
    "Paraphrase",
    "Place",
    "Page",
    "citation",
    "Action",
  ].forEach((h) => {
    const th = document.createElement("th");
    th.textContent = h;
    hr.appendChild(th);
  });
  thead.appendChild(hr);

  const tbody = document.createElement("tbody");
  for (const r of rows) {
    const tr = document.createElement("tr");

    const tdQ = document.createElement("td");
    tdQ.textContent = r.quote;

    const tdP = document.createElement("td");
    tdP.textContent = r.paraphrase;

    const tdPl = document.createElement("td");
    tdPl.textContent = r.place;

    const tdPg = document.createElement("td");
    const a = document.createElement("a");
    a.href = r.href;
    a.textContent = `p.${r.page}`;
    a.target = "_blank";
    a.rel = "noopener";
    tdPg.appendChild(a);

    const tdCi = document.createElement("td");
    const cite = `\\\\autocite[${r.page}]{${citationKey}}`;
    tdCi.textContent = cite.replace(/\\\\/g, "\\");

    const tdCopy = document.createElement("td");
    tdCopy.className = "action-column";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "copyBtn";
    btn.textContent = "Copy";

    btn.addEventListener("click", async () => {
      const q = stripTrailingPeriod(r.quote);
      const text = `${q} \\autocite[${r.page}]{${citationKey}}.`;
      await navigator.clipboard.writeText(text);

      const old = btn.textContent;
      btn.textContent = "Copied";
      setTimeout(() => (btn.textContent = old), 800);
    });

    tdCopy.appendChild(btn);

    tr.append(tdQ, tdP, tdPl, tdPg, tdCi, tdCopy);
    tbody.appendChild(tr);
  }

  table.append(thead, tbody);
  wrap.appendChild(table);
}

function stripTrailingPeriod(s) {
  s = (s ?? "").trim();
  if (s.endsWith(".") && !s.endsWith("...")) return s.slice(0, -1);
  return s;
}
export async function persistCitationsToNote({
  noteHandle,
  citationKey,
  rows,
  refresh, 
}) {
  if (!noteHandle) throw new Error("No current note handle available.");

  const ok = await ensureReadWritePermission(noteHandle);
  if (!ok) throw new Error("Read/write permission not granted.");

  const md = await readFileText(noteHandle);

  const START = "%% llm-citations:begin %%";
  const END = "%% llm-citations:end %%";

  const section = makeMdCitationsSection({ citationKey, rows });
  const updated = upsertBetweenMarkers(md, START, END, section);

  await writeFileText(noteHandle, updated);

  if (typeof refresh === "function") {
    await refresh();
  }
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function upsertBetweenMarkers(noteMd, startMarker, endMarker, newBlock) {
  const re = new RegExp(
    `${escapeRegExp(startMarker)}[\\s\\S]*?${escapeRegExp(endMarker)}`,
    "m",
  );

  const wrapped = `${startMarker}\n${newBlock}\n${endMarker}`;

  if (re.test(noteMd)) return noteMd.replace(re, wrapped);

  const sep = noteMd.endsWith("\n") ? "" : "\n";
  return `${noteMd}${sep}\n${wrapped}\n`;
}

function citeSentenceFromRow(r, citationKey) {
  return `"${r.quote}" \\autocite[${r.page}]{${citationKey}}`;
}
