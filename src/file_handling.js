import { renderResultsTableInline, renderFileList } from "./render.js";
import { mdToHtml } from "./md.js";
import { ui } from "./ui.js";
import { state } from "./state.js";

export async function ensureReadWritePermission(handle) {
  const opts = { mode: "readwrite" };
  if (
    handle.queryPermission &&
    (await handle.queryPermission(opts)) === "granted"
  )
    return true;
  if (
    handle.requestPermission &&
    (await handle.requestPermission(opts)) === "granted"
  )
    return true;
  return false;
}

export async function readFileText(handle) {
  const f = await handle.getFile();
  return await f.text();
}

export async function writeFileText(handle, text) {
  const w = await handle.createWritable();
  await w.write(text);
  await w.close();
}

export async function openFile(path, ctx) {
  const { setActivePath, saveLastPath, citationKeyFromPath } = ctx;

  const item = state.files.find((f) => f.path === path);
  if (!item) return;

  setActivePath(path);
  saveLastPath(path);

  state.currentNoteHandle = item.handle;
  state.currentNotePath = path;

  const file = await item.handle.getFile();
  const fullText = await file.text();
  const key = citationKeyFromPath(path);

  ui.metaEl.textContent = `${path}\n${new Date(file.lastModified).toLocaleString()}`;
  ui.metaEl.dataset.citationKey = key;

  const { cleanText, citationsRows } = parseCitationsFromMd(fullText);

  ui.contentEl.innerHTML = mdToHtml(cleanText);

  const oldBox = document.getElementById("citationsBox");
  if (oldBox) oldBox.remove();

  if (citationsRows.length > 0) {
    renderResultsTableInline({
      citationKey: key,
      rows: citationsRows,
    });
  }
}

function parseCitationsFromMd(text) {
  const regex = /%% llm-citations:begin %%[\s\S]*?%% llm-citations:end %%/;
  const match = text.match(regex);

  if (!match) {
    return { cleanText: text, citationsRows: [] };
  }

  const block = match[0];
  const cleanText = text.replace(block, "").trim();

  const rows = [];
  const lines = block.split("\n");

  for (let line of lines) {
    line = line.trim();
    if (!line.startsWith("|") || line.includes("---")) continue;

    const cols = line
      .split("|")
      .map((c) => c.trim())
      .filter((c) => c !== "");

    if (cols[0] && cols[0].toLowerCase().includes("original highlight"))
      continue;

    if (cols.length >= 5) {
      const pageRaw = cols[3];
      const hrefMatch = pageRaw.match(/\((.*?)\)/);
      const pageNum = pageRaw
        .replace(/\[|\]|\(.*?\)/g, "")
        .replace("p.", "")
        .trim();
      const href = hrefMatch ? hrefMatch[1] : "";

      rows.push({
        quote: cols[0],
        paraphrase: cols[1].replace(/&#39;/g, "'").replace(/&quot;/g, '"'),
        place: cols[2],
        page: pageNum,
        href: href,
        citationKey: "",
      });
    }
  }

  return { cleanText, citationsRows: rows };
}
