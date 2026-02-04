import { ui } from "./ui.js";
import { state } from "./state.js";
import { hasInTextHighlights } from "./citation.js";
export function syncTopBar() {
  const hasOpenFile = !!state.currentNotePath;
  const hasHighlights =
    hasOpenFile && hasInTextHighlights(ui.contentEl.innerHTML);

  const show = hasOpenFile && hasHighlights;

  ui.promptBtn.hidden = !show;
  ui.promptBtn.disabled = !show;
}
