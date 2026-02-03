import "./style.css";
import { $ } from "./utils.js";
import { checkBrowserSupport } from "./precheck.js";

checkBrowserSupport();
import {
  loadLastDirHandle,
  saveLastDirHandle,
  loadLastPath,
  saveLastPath,
} from "./local_db.js";
import { openFile as openFileWithCtx } from "./file_handling.js";
import "./prompt_api.js";
import { isBusy } from "./ui_lock.js";

import { ensureResultsBox, renderResultsTableInline } from "./render.js";

// Bit nostalgy for jQuery
const openBtn = $("open");
const statusEl = $("status");
const filterEl = $("filter");
const filesEl = $("files");
const metaEl = $("meta");
const contentEl = $("content");
const llmOutputEl = $("llmOutputElement");
// STATE
let dirHandle = null;
let activePath = "";
let files = [];

// --- EVENTS ---
function setActivePath(p) {
  activePath = p;
}

openBtn.addEventListener("click", async () => {
  console.log("open clicked. busy?", isBusy());
  try {
    if (isBusy()) return;

    const picked = await window.showDirectoryPicker({ mode: "readwrite" });
    await ensurePermission(picked, "readwrite");
    await saveLastDirHandle(picked);

    await openDirHandle(picked, { allowPrompt: true });
  } catch (err) {
    if (err?.name !== "AbortError") console.error(err);
  }
});

filterEl.addEventListener("input", () => renderFileList());

filesEl.addEventListener("click", async (e) => {
  if (isBusy()) return;
  const btn = e.target.closest("button[data-path]");
  if (!btn) return;

  await openFileWithCtx(btn.dataset.path, {
    files,
    setActivePath,
    saveLastPath,
    renderFileList,
    metaEl,
    contentEl,
    citationKeyFromPath,
    mdToHtml,
  });
  llmOutputEl.innerHTML = "";
});

async function openDirHandle(handle, { allowPrompt = false } = {}) {
  dirHandle = handle;

  const q = await dirHandle.queryPermission({ mode: "read" });
  if (q !== "granted") {
    if (!allowPrompt) {
      statusEl.textContent = `${dirHandle.name} (click Open to allow access)`;
      return false;
    }
    await ensurePermission(dirHandle, "read");
  }
  console.log("openDirHandle.", q);

  statusEl.textContent = dirHandle.name;
  metaEl.textContent = "";
  activePath = "";
  filterEl.value = "";
  filesEl.replaceChildren();
  llmOutputEl.innerHTML = "";
  contentEl.replaceChildren();

  files = await listTextFiles(dirHandle);
  files.sort((a, b) => (b.lastModified || 0) - (a.lastModified || 0));
  console.log("listed files:", files.length, files.slice(0, 5));

  renderFileList();

  const savedPath = loadLastPath();
  const hasSaved = savedPath && files.some((f) => f.path === savedPath);

  if (hasSaved) {
    await openFileWithCtx(savedPath, {
      files,
      setActivePath,
      saveLastPath,
      renderFileList,
      metaEl,
      contentEl,
      citationKeyFromPath,
      mdToHtml,
    });
  } else if (files[0]) {
    await openFileWithCtx(files[0].path, {
      files,
      setActivePath,
      saveLastPath,
      renderFileList,
      metaEl,
      contentEl,
      citationKeyFromPath,
      mdToHtml,
    });
  }
}

function citationKeyFromPath(path) {
  const name = path.split("/").pop() || path;
  return name.replace(/\.md$/i, "");
}
function renderFileList() {
  const q = (filterEl.value || "").trim().toLowerCase();

  filesEl.replaceChildren(
    ...files
      .filter((f) => (q ? f.path.toLowerCase().includes(q) : true))
      .map((f) => {
        const b = document.createElement("button");
        b.type = "button";
        b.dataset.path = f.path;
        b.textContent = f.path;
        if (f.path === activePath) b.className = "active";
        return b;
      }),
  );
}

// --- PERMISSIONS ---

async function ensurePermission(handle, mode = "read") {
  const opts = { mode };
  const q = await handle.queryPermission(opts);
  if (q === "granted") return true;

  const r = await handle.requestPermission(opts);
  if (r !== "granted") throw new Error("Permission not granted");
  return true;
}

// --- FILE LISTING ---

async function listTextFiles(rootDirHandle) {
  const out = [];

  for await (const item of walkDir(rootDirHandle)) {
    const { path, handle } = item;
    if (!/\.(md|markdown|txt)$/i.test(path)) continue;

    try {
      const f = await handle.getFile();
      out.push({ path, handle, lastModified: f.lastModified });
    } catch {
      // ignore unreadable entries
    }
  }
  return out;
}

async function* walkDir(dirHandle, basePath = "") {
  for await (const [name, handle] of dirHandle.entries()) {
    const path = basePath ? `${basePath}/${name}` : name;
    if (handle.kind === "file") yield { path, handle };
    else if (handle.kind === "directory") yield* walkDir(handle, path);
  }
}

// ------------------------
// Tiny markdown -> HTML
// ------------------------

function mdToHtml(md) {
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

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

(async function restoreOnLoad() {
  try {
    const stored = await loadLastDirHandle();
    if (stored) await openDirHandle(stored, { allowPrompt: false });
  } catch (e) {
    console.warn("restoreOnLoad failed:", e?.message || e);
  }
})();

function buildFileCtx() {
  return {
    get files() {
      return files;
    },
    setActivePath,
    saveLastPath,
    renderFileList,
    metaEl,
    contentEl,
    citationKeyFromPath,
    mdToHtml,
  };
}

window.fileCtx = buildFileCtx();
