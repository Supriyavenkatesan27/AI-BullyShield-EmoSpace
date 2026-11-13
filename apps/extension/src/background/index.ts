chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({ id: 'bullyshield-analyze', title: 'Analyze with AI BullyShield', contexts: ['selection'] });
  });
});
chrome.contextMenus.onClicked.addListener(async (info) => {
  if (info.menuItemId !== 'bullyshield-analyze' || !info.selectionText) return;
  await chrome.storage.local.set({ pendingText: info.selectionText.slice(0, 5000) });
  await chrome.action.openPopup().catch(() => undefined);
});
