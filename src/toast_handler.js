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
