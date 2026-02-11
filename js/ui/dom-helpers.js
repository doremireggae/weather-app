export const $ = id => document.getElementById(id);

export function toDateStr(d) { return d.toISOString().split("T")[0]; }

export function showError(msg) {
  $("status").className = "";
  $("error").textContent = msg;
  $("error").className = "show";
  $("error").style.display = "block";
}

export function setTitle(text) {
  document.title = text;
  const el = $("app-title");
  if (el.textContent === text) return;
  el.style.opacity = "0";
  setTimeout(() => { el.textContent = text; el.style.opacity = "1"; }, 200);
}
