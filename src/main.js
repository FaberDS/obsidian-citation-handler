import "./style.css";
import { state } from "./state.js";
import { ui } from "./ui.js";
import { checkBrowserSupport } from "./precheck.js";
import { renderFileList } from "./render.js";
import { mdToHtml } from "./md.js";
import { toastMessageOnly } from "./toast_handler.js";
import { ensureReadWritePermission } from "./file_handling.js";
import { syncTopBar } from "./ui_state.js";

const REQUIRED_PERMISSION = "readwrite";
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

function setActivePath(p) {
  state.activePath = p;
}

ui.openBtn.addEventListener("click", async () => {
  try {
    if (isBusy()) return;

    const picked = await window.showDirectoryPicker({
      mode: REQUIRED_PERMISSION,
    });
    const ok = await ensureReadWritePermission(picked);
    if (!ok) {
      toastError("Permission not granted");
    }
    await saveLastDirHandle(picked);

    await openDirHandle(picked, { allowPrompt: true });
  } catch (err) {
    if (err?.name !== "AbortError") console.error(err);
  }
});

ui.filterEl.addEventListener("input", () => renderFileList());

ui.filesEl.addEventListener("click", async (e) => {
  if (isBusy()) return;
  const btn = e.target.closest("button[data-path]");
  if (!btn) return;

  await openFileWithCtx(btn.dataset.path, {
    setActivePath,
    saveLastPath,
    citationKeyFromPath,
  });
  ui.llmOutputEl.innerHTML = "";
});

async function openDirHandle(handle, { allowPrompt = false } = {}) {
  toastMessageOnly("Loading vault…");

  state.dirHandle = handle;
  state.currentNoteHandle = null;
  state.currentNotePath = "";
  state.activePath = "";
  const q = await state.dirHandle.queryPermission({
    mode: REQUIRED_PERMISSION,
  });
  if (q !== "granted") {
    if (!allowPrompt) {
      ui.statusEl.textContent = `${state.dirHandle.name} (click Open to allow access)`;
      return false;
    }
    const ok = await ensureReadWritePermission(noteHandle);
  }

  ui.statusEl.textContent = state.dirHandle.name;
  ui.metaEl.textContent = "";
  state.activePath = "";
  ui.filterEl.value = "";
  ui.filesEl.replaceChildren();
  ui.llmOutputEl.innerHTML = "";
  ui.contentEl.replaceChildren();
  state.files = (await listTextFiles(state.dirHandle)).sort(
    (a, b) => (b.lastModified || 0) - (a.lastModified || 0),
  );

  renderFileList();

  const savedPath = await loadLastPath();
  const hasSaved = savedPath && state.files.some((f) => f.path === savedPath);
  syncTopBar();

  if (hasSaved) {
    await openFileWithCtx(savedPath, {
      setActivePath,
      saveLastPath,
      renderFileList,
      citationKeyFromPath,
      mdToHtml,
    });
  } else if (state.files[0]) {
    await openFileWithCtx(state.files[0].path, {
      setActivePath,
      saveLastPath,
      renderFileList,
      citationKeyFromPath,
      mdToHtml,
    });
  }
}

function citationKeyFromPath(path) {
  const name = path.split("/").pop() || path;
  return name.replace(/\.md$/i, "");
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
    } catch {}
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
    setActivePath,
    saveLastPath,
    citationKeyFromPath,
  };
}

state.fileCtx = buildFileCtx();
syncTopBar();
