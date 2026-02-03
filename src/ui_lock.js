import { $ } from "./utils.js";

let busy = false;

function setDisabled(el, disabled) {
  if (!el) return;
  el.disabled = !!disabled;
  el.setAttribute("aria-disabled", String(!!disabled));
}

export function setBusy(isBusy, message = "Generating citations…") {
  busy = !!isBusy;

  const overlay = $("busy-overlay");
  if (overlay) {
    overlay.classList.toggle("hidden", !busy);
    overlay.setAttribute("aria-hidden", String(!busy));
    const title = overlay.querySelector(".busyOverlayTitle");
    if (title) title.textContent = message;
  }

  setDisabled($("open"), busy);
  setDisabled($("promptCitations"), busy);
  setDisabled($("filter"), busy);

  const files = $("files");
  if (files) {
    files.querySelectorAll("button").forEach((b) => setDisabled(b, busy));
  }

  document.body.style.cursor = busy ? "progress" : "";
}

export function isBusy() {
  return busy;
}
