let enabled = true;

document.addEventListener('DOMContentLoaded', () => {

  function detectColorScheme() {
    BTBrowser.storage.local.get("storageData", (result) => {
      const storageTheme = result.storageData?.uiTheme;
      let uiTheme;

      if (!storageTheme || storageTheme === 'system') {
        uiTheme = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark" : "light";
      } else {
        uiTheme = storageTheme;
      }

      document.documentElement.setAttribute("data-theme", uiTheme);
    });
  }

  detectColorScheme();
  

  const checkbox = document.getElementById("toggle-extension");
  const statusText = document.getElementById("status-text");

  BTBrowser.storage.onChanged.addListener((changes) => {
    if (Object.hasOwn(changes, 'enabled')) {
      enabled = !!changes.enabled.newValue;
      checkbox.checked = enabled;
      statusText.textContent = enabled ? "On" : "Off";
    }
  });

  // Restore the switch state from storage
  BTBrowser.storage.local.get(["enabled", "storageData"], (result) => {
    if (result.storageData && result.storageData.uiPass) {
      BTBrowser.runtime.openOptionsPage(() => window.close());
    }

    if (result.enabled === undefined) {
      result.enabled = true;
    }
    checkbox.checked = !!result.enabled;
    statusText.textContent = !!result.enabled ? "On" : "Off";
  });

  // Listen for changes to the switch
  checkbox.addEventListener("change", (event) => {
    if (event.target instanceof HTMLInputElement) {
      BTBrowser.storage.local.set({enabled: !!event.target.checked}, () => {
        BTBrowser.tabs.reload(); // Reload page to apply the new state
      });
    }
  });

  // Open options page
  document.getElementById("options-button").addEventListener("click", () => {
    BTBrowser.runtime.openOptionsPage(() => window.close());
  });
});
