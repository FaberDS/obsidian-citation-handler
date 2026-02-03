import { makeMdTable } from "./md.js";
import { extractHighlights, hasInTextHighlights } from "./citation.js";
import { $ } from "./utils.js";
import {
  ensureResultsBox,
  renderResultsTableInline,
  persistCitationsToNote,
} from "./render.js";

if ("LanguageModel" in self) {
  const session = await LanguageModel.create({
    monitor(m) {
      m.addEventListener("downloadprogress", (e) => {
        console.log(`Downloaded ${e.loaded * 100}%`);
      });
    },
  });
  const promptBtn = $("promptCitations");

  promptBtn.addEventListener("click", async () => {
    await runCitationsOneByOne({
      session,
    });
  });
} else {
  console.log("❌ LanguageModel is not available");
}

function parseModelLine(line) {
  let s = line.trim().replace(/^\-\s*/, "");

  const placeMatch = s.match(/\(place:\s*([^)]+)\)/i);
  const place = placeMatch ? placeMatch[1].trim() : "";

  const paraphrase = placeMatch ? s.slice(0, placeMatch.index).trim() : s;

  return { paraphrase, place };
}

function buildCitationPrompt({ quote }) {
  return [
    "Return ONLY valid JSON. No markdown, no code fences, no extra text.",
    "",
    "Schema (exact keys):",
    '{ "paraphrase": string, "place": string }',
    "",
    "Rules:",
    "1) paraphrase: one sentence, no direct quoting, no newline.",
    "2) place: 2–6 words, lowercase, use spaces or hyphens only.",
    "3) Ensure the JSON is strictly valid (escape any quotes).",
    "",
    `highlight: ${quote}`,
  ].join("\n");
}

function extractJsonObject(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No JSON object found in model output");
  }
  return JSON.parse(text.slice(start, end + 1));
}
async function runCitationsOneByOne({ session }) {
  const promptBtn = $("promptCitations");
  promptBtn.setAttribute("disabled", true);
  const contentEl = $("content");
  const outEl = $("llmOutputElement");
  const metaEl = $("meta");

  const citationKey = metaEl.dataset.citationKey;
  const noteHtml = contentEl.innerHTML;

  const highlights = extractHighlights(noteHtml);
  if (!highlights.length) {
    outEl.textContent = "No highlights found.";
    promptBtn.setAttribute("disabled", false);

    return;
  }

  const rows = [];

  outEl.textContent = `Processing ${highlights.length} highlights...\n`;

  for (let i = 0; i < highlights.length; i++) {
    const h = highlights[i];

    const prompt = buildCitationPrompt({
      citationKey,
      page: h.page,
      quote: h.quote,
      href: h.href,
    });

    const stream = await session.promptStreaming(prompt);

    let modelText = "";
    for await (const chunk of stream) modelText += chunk;

    const obj = extractJsonObject(modelText);

    if (!obj.paraphrase || !obj.place)
      throw new Error("Missing paraphrase/place");
    if (String(obj.page) !== String(h.page)) obj.page = Number(h.page);
    obj.href = h.href;
    obj.citationKey = citationKey;
    obj.autocite = `\\autocite[${h.page}]{${citationKey}}`;
    renderResultsTableInline({ citationKey, rows });

    rows.push({
      quote: h.quote,
      paraphrase: obj.paraphrase,
      place: obj.place,
      page: h.page,
      href: h.href,
    });
    updatePromptButtonState();

    outEl.textContent = `Done ${i + 1}/${highlights.length}...\n`;
  }

  const table = makeMdTable(rows);

  outEl.textContent = table;
  await persistCitationsToNote({
    noteHandle: window.currentNoteHandle,
    citationKey,
    rows,
    refresh: () => openFileWithCtx(window.currentNotePath, fileCtx),
  });
  promptBtn.setAttribute("disabled", true);
}

function updatePromptButtonVisibility() {
  const contentEl = document.getElementById("content");
  const promptBtn = document.getElementById("promptCitations");
  if (!contentEl || !promptBtn) return;

  const show = hasInTextHighlights(contentEl.innerHTML);
  promptBtn.hidden = !show;
}

function watchContentForPromptToggle() {
  const contentEl = document.getElementById("content");
  if (!contentEl) return;

  updatePromptButtonVisibility();

  const obs = new MutationObserver(() => updatePromptButtonVisibility());
  obs.observe(contentEl, {
    childList: true,
    subtree: true,
    characterData: true,
  });
}

function decodeHtmlEntities(str) {
  const ta = document.createElement("textarea");
  ta.innerHTML = str;
  return ta.value;
}

function decodeUntilStable(str, max = 3) {
  let prev = String(str ?? "");
  for (let i = 0; i < max; i++) {
    const next = decodeHtmlEntities(prev);
    if (next === prev) break;
    prev = next;
  }
  return prev;
}

function extractInTextAnnotationsHtml(contentInnerHtml) {
  const decoded = decodeUntilStable(contentInnerHtml, 3);

  const m = decoded.match(
    /<h[1-6]>\s*In-text annotations\s*<\/h[1-6]>\s*([\s\S]*?)(?=<h[1-6]\b|$)/i,
  );
  return (m ? m[1] : "").trim();
}

function fnv1a32(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function shortHash(str) {
  return fnv1a32(str).toString(36);
}

let lastAnnoHash = "";

function updatePromptButtonState() {
  const contentEl = document.getElementById("content");
  const btn = document.getElementById("promptCitations");
  if (!contentEl || !btn) return;

  const block = extractInTextAnnotationsHtml(contentEl.innerHTML);

  if (!block) {
    btn.hidden = true;
    lastAnnoHash = "";
    return;
  }

  btn.hidden = false;

  const h = shortHash(block);

  const unchanged = h === lastAnnoHash;
  btn.disabled = unchanged;

  btn.title = unchanged
    ? "No change in In-text annotations"
    : "Generate citations";

  lastAnnoHash = h;
}

function watchContent() {
  const contentEl = document.getElementById("content");
  if (!contentEl) return;

  updatePromptButtonState();

  const obs = new MutationObserver(() => updatePromptButtonState());
  obs.observe(contentEl, {
    childList: true,
    subtree: true,
    characterData: true,
  });
}

watchContent();

watchContentForPromptToggle();
