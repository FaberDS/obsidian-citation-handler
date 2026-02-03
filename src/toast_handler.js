import { $ } from "./utils.js";
const toast = $("progress-toast");
const toastBar = $("toast-bar");
const toastCount = $("toast-count");
const toastMessage = $("toast-message");

export function updateProgress(current, total) {
  toast.classList.remove("hidden");

  const percent = Math.round((current / total) * 100);

  toastBar.style.width = `${percent}%`;
  toastCount.textContent = `${current}/${total}`;
  toastMessage.textContent = "Generating citations...";

  if (current >= total) {
    toastMessage.textContent = "Done!";
    setTimeout(() => {
      toast.classList.add("hidden");
      setTimeout(() => {
        toastBar.style.width = "0%";
      }, 300);
    }, 2000);
  }
}

let hideTimer = null;

function clearHideTimer() {
  if (hideTimer) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }
}

function setHidden(hidden) {
  toast.classList.toggle("hidden", hidden);
}

/**
 * Show the toast with a message.
 * Options:
 * - count: string like "3/10" (optional)
 * - showBar: boolean (default false)
 * - percent: number 0-100 (only if showBar true)
 * - autoHideMs: number (optional) auto hide after X ms
 */
export function showToast(message, opts = {}) {
  const { count = "", showBar = false, percent = 0, autoHideMs = null } = opts;

  clearHideTimer();

  toastMessage.textContent = message ?? "";
  toastCount.textContent = count ?? "";

  if (showBar) {
    toastBar.style.width = `${Math.max(0, Math.min(100, percent))}%`;
    toastBar.parentElement?.classList.remove("hidden");
  } else {
    toastBar.style.width = "0%";
  }

  setHidden(false);

  if (typeof autoHideMs === "number") {
    hideTimer = setTimeout(() => hideToast(), autoHideMs);
  }
}

export function hideToast({ resetBar = true } = {}) {
  clearHideTimer();
  setHidden(true);

  if (resetBar) {
    setTimeout(() => {
      toastBar.style.width = "0%";
      toastCount.textContent = "";
      toastMessage.textContent = "";
    }, 300);
  }
}

export function toastMessageOnly(message, autoHideMs = 1500) {
  showToast(message, { showBar: false, autoHideMs });
}

export function toastError(message, autoHideMs = 4000) {
  showToast(message, { showBar: false, autoHideMs });
}
