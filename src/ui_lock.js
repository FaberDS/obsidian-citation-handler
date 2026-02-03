import { state } from "./state.js";
import { ui } from "./ui.js";

function setDisabled(el, disabled) {
  if (!el) return;
  el.disabled = !!disabled;
  el.setAttribute("aria-disabled", String(!!disabled));
}

export function isBusy() {
  return state.busy;
}

export function setBusy(isBusy, message = "Working…") {
  state.busy = !!isBusy;

  if (ui.overlay) {
    ui.overlay.classList.toggle("hidden", !state.busy);
    const title = ui.overlay.querySelector(".busyOverlayTitle");
    if (title) title.textContent = message;
  }

  setDisabled(ui.openBtn, state.busy);
  setDisabled(ui.promptBtn, state.busy);
  setDisabled(ui.filterEl, state.busy);

  if (ui.filesEl) {
    ui.filesEl
      .querySelectorAll("button")
      .forEach((b) => setDisabled(b, state.busy));
  }

  document.body.style.cursor = state.busy ? "progress" : "";
}
