document.addEventListener("DOMContentLoaded", () => {
  const apiKeyInput = document.getElementById("apiKeyInput");
  const saveBtn = document.getElementById("saveBtn");
  const statusMsg = document.getElementById("statusMsg");

  // 1. Load saved API key from chrome.storage.local on page initialization
  if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(["apiKey"], (result) => {
      if (result.apiKey) {
        apiKeyInput.value = result.apiKey;
      }
    });
  }

  // 2. Save API key to chrome.storage.local on button click
  saveBtn.addEventListener("click", () => {
    const apiKey = apiKeyInput.value.trim();

    if (!apiKey) {
      showStatus("Please enter an API key.", "error");
      return;
    }

    if (!apiKey.startsWith("et_live_")) {
      showStatus("Warning: API Keys usually start with 'et_live_'. Saving anyway...", "warning");
    }

    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ apiKey: apiKey }, () => {
        showStatus("API Key saved successfully! Gmail tracking is now active.", "success");
      });
    } else {
      showStatus("chrome.storage.local API is not available in this environment.", "error");
    }
  });

  // Helper to render feedback status banners
  function showStatus(msg, type) {
    statusMsg.textContent = msg;
    statusMsg.className = `status ${type}`;
    statusMsg.style.display = "block";
    setTimeout(() => {
      statusMsg.style.display = "none";
    }, 4000);
  }
});
