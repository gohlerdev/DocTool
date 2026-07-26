async function clip() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      const sel = window.getSelection()?.toString() || "";
      return {
        title: document.title,
        url: location.href,
        selection: sel.slice(0, 8000),
      };
    },
  });
  const md = `# ${result.title}\n\nSource: ${result.url}\n\n${result.selection || "_(no selection)_"}\n`;
  document.getElementById("out").value = md;
  // Deep link / share target — host app registers doctool://clip
  const payload = encodeURIComponent(md);
  document.getElementById("status").textContent =
    "Staged. Open DocTool and import, or use doctool://clip deep link on mobile.";
  try {
    await navigator.clipboard.writeText(md);
    document.getElementById("status").textContent += " Copied Markdown.";
  } catch (_) {}
  // Attempt protocol handoff
  window.open(`doctool://clip?body=${payload.slice(0, 1500)}`, "_blank");
}

document.getElementById("clip").addEventListener("click", () => clip().catch(console.error));
