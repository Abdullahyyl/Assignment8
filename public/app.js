const statusEl = document.getElementById("status");
const bodyEl = document.getElementById("body");

// Format a response body: pretty-print JSON, otherwise show the raw text
function formatBody(text) {
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}

async function callRoute(path, method) {
  statusEl.className = "";
  statusEl.textContent = "loading...";
  bodyEl.textContent = "";

  try {
    // relative URL: works because the page is served by the same server
    const response = await fetch(path, { method });
    const text = await response.text();
    statusEl.textContent = `${response.status} ${response.statusText}`;
    statusEl.className = response.ok ? "ok" : "fail";
    bodyEl.textContent = formatBody(text);
  } catch (error) {
    // network error: the server could not be reached at all
    statusEl.textContent = "network error";
    statusEl.className = "fail";
    bodyEl.textContent = error.message;
  }
}

document.querySelectorAll("button[data-path]").forEach((button) => {
  button.addEventListener("click", () => {
    callRoute(button.dataset.path, button.dataset.method || "GET");
  });
});
