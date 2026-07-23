// Define backend API URL (Default to live Render backend so Google Image Proxy can fetch pixel over the internet)
const API_BASE_URL = "https://email-tracker-api-s7y7.onrender.com";
const LOCAL_API_BASE_URL = "http://127.0.0.1:8000";

// Helper to extract the recipient from Gmail's compose window
function getRecipient(composeWindow) {
  const toElement = composeWindow.querySelector('input[name="to"], textarea[name="to"], [name="to"]');
  if (toElement && toElement.value) {
    return toElement.value.trim();
  }

  const ariaToElement = composeWindow.querySelector('[aria-label="To"]');
  if (ariaToElement) {
    if (ariaToElement.value) return ariaToElement.value.trim();
    if (ariaToElement.textContent) return ariaToElement.textContent.trim();
  }

  const chips = composeWindow.querySelectorAll('div[email]');
  if (chips.length > 0) {
    return Array.from(chips)
      .map((chip) => chip.getAttribute("email"))
      .filter(Boolean)
      .join(", ");
  }

  return "unknown@recipient.com";
}

// Helper to extract the subject from Gmail's compose window
function getSubject(composeWindow) {
  const subjectInput = composeWindow.querySelector('input[name="subjectbox"]');
  if (subjectInput && subjectInput.value) {
    return subjectInput.value.trim();
  }
  return "(No Subject)";
}

// Function to send POST request to FastAPI backend
function saveEmailToBackend(emailId, recipient, subject) {
  const payload = {
    id: emailId,
    recipient: recipient,
    subject: subject
  };

  console.log("[Gmail Email Tracker] Attempting to save email record:", payload);

  // Retrieve stored API Key from extension local storage
  if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(["apiKey"], (result) => {
      const apiKey = result.apiKey;
      const headers = {
        "Content-Type": "application/json"
      };

      if (apiKey) {
        headers["X-API-Key"] = apiKey;
      } else {
        console.warn("[Gmail Email Tracker] Warning: No API Key found in chrome.storage.local. Open extension Options to paste your key.");
      }

      // Try saving to local backend first, or fallback to live Render backend
      sendPostRequest(payload, headers);
    });
  } else {
    sendPostRequest(payload, { "Content-Type": "application/json" });
  }
}

function sendPostRequest(payload, headers) {
  // Post to local server first, with automatic fallback to live Render backend
  const localUrl = `${LOCAL_API_BASE_URL}/emails`;
  const remoteUrl = `${API_BASE_URL}/emails`;
  
  fetch(localUrl, {
    method: "POST",
    headers: headers,
    body: JSON.stringify(payload)
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      console.log("[Gmail Email Tracker] Successfully saved email to local backend:", data);
    })
    .catch((localError) => {
      console.warn("[Gmail Email Tracker] Local backend post failed/blocked, falling back to Render:", localError);
      fetch(remoteUrl, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(payload)
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.json();
        })
        .then((data) => {
          console.log("[Gmail Email Tracker] Successfully saved email to Render backend:", data);
        })
        .catch((remoteError) => {
          console.error("[Gmail Email Tracker] Error saving email to both local and Render backend:", remoteError);
        });
    });
}

// Initialize the MutationObserver to watch for additions to Gmail's DOM
const observer = new MutationObserver((mutations) => {
  // Target Gmail's top-level compose window container (div.M9)
  const composeWindows = document.querySelectorAll("div.M9");

  composeWindows.forEach((composeWindow) => {
    // Skip if this compose window or any parent element was already processed
    if (composeWindow.hasAttribute("data-tracker-detected") || composeWindow.closest("[data-tracker-detected]")) {
      return;
    }
    composeWindow.setAttribute("data-tracker-detected", "true");

      // 1. Generate unique email ID
      const emailId = crypto.randomUUID();
      composeWindow.setAttribute("data-email-id", emailId);
      console.log(`[Gmail Email Tracker] Compose window detected. Generated Email ID: ${emailId}`);

      // 2. Inject invisible tracking pixel into the email body
      const emailBody = composeWindow.querySelector('div[contenteditable="true"]');
      if (emailBody) {
        const img = document.createElement("img");
        
        // Point to live Render backend so Google Image Proxy and remote recipients can load pixel over public internet
        img.src = `${API_BASE_URL}/pixel/${emailId}`;
        img.width = 1;
        img.height = 1;
        img.alt = "";
        
        // Style to ensure absolute invisibility
        img.style.display = "none";
        img.style.setProperty("display", "none", "important");
        img.setAttribute("data-tracker-pixel", emailId);
        
        // Append the tracking pixel at the end of the email content body
        emailBody.appendChild(img);
        console.log(`[Gmail Email Tracker] Successfully injected tracking pixel for ${emailId}`);
      }

      // 3. Locate the "Send" button inside the compose window
      const sendButton = composeWindow.querySelector(".aoO, [role='button'][data-tooltip*='Send']");

      const handleSendAction = () => {
        // Prevent duplicate trigger on click + Enter key press
        if (composeWindow.getAttribute("data-email-sent") === "true") {
          return;
        }
        composeWindow.setAttribute("data-email-sent", "true");

        const recipient = getRecipient(composeWindow);
        const subject = getSubject(composeWindow);
        saveEmailToBackend(emailId, recipient, subject);
      };

      if (sendButton) {
        sendButton.addEventListener("click", handleSendAction);
      }

      composeWindow.addEventListener("keydown", (event) => {
        if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
          handleSendAction();
        }
      });
  });
});

// Start observing the document body for changes in child nodes
observer.observe(document.body, {
  childList: true,
  subtree: true
});
