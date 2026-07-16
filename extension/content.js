console.log("[Gmail Email Tracker] Content script loaded successfully on Gmail!");

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

  fetch("http://127.0.0.1:8000/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      console.log("[Gmail Email Tracker] Successfully saved email to backend:", data);
    })
    .catch((error) => {
      console.error("[Gmail Email Tracker] Error saving email to backend:", error);
    });
}

// Initialize the MutationObserver to watch for additions to Gmail's DOM
const observer = new MutationObserver((mutations) => {
  const composeWindows = document.querySelectorAll("div.M9, div[role='dialog']");

  composeWindows.forEach((composeWindow) => {
    // Process new compose windows only
    if (!composeWindow.hasAttribute("data-tracker-detected")) {
      composeWindow.setAttribute("data-tracker-detected", "true");

      // 1. Generate unique email ID
      const emailId = crypto.randomUUID();
      composeWindow.setAttribute("data-email-id", emailId);
      console.log(`[Gmail Email Tracker] Compose window detected. Generated Email ID: ${emailId}`);

      // 2. Inject invisible tracking pixel into the email body
      const emailBody = composeWindow.querySelector('div[contenteditable="true"]');
      if (emailBody) {
        const img = document.createElement("img");
        
        // Point to our local FastAPI server pixel endpoint
        img.src = `http://127.0.0.1:8000/pixel/${emailId}`;
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
    }
  });
});

// Start observing the document body for changes in child nodes
observer.observe(document.body, {
  childList: true,
  subtree: true
});
