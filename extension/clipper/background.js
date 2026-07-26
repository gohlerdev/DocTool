chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "doctool-clip",
    title: "Save to DocTool",
    contexts: ["selection", "page"],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== "doctool-clip" || !tab?.id) return;
  const text = info.selectionText || tab.title || "";
  const md = `# ${tab.title || "Clip"}\n\n${info.pageUrl || ""}\n\n${text}\n`;
  try {
    await chrome.storage.local.set({ lastClip: md, clippedAt: Date.now() });
  } catch (_) {}
});
