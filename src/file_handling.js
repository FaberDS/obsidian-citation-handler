let files = [];

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

// file_handling.js
export async function openFile(path, ctx) {
  const {
    files,
    setActivePath,
    saveLastPath,
    renderFileList,
    metaEl,
    contentEl,
    citationKeyFromPath,
    mdToHtml,
  } = ctx;

  const item = files.find((f) => f.path === path);
  if (!item) return;

  setActivePath(path);
  saveLastPath(path);
  renderFileList();

  window.currentNoteHandle = item.handle;
  window.currentNotePath = path;

  const file = await item.handle.getFile();
  const text = await file.text();

  metaEl.textContent = `${path}\n${new Date(file.lastModified).toLocaleString()}`;
  metaEl.dataset.citationKey = citationKeyFromPath(path);

  contentEl.innerHTML = mdToHtml(text);
}
