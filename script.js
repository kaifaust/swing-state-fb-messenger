// INTRODUCTION
// ------------
// This script simplifies sending voter participation messages to your Facebook
// friends who live in key swing states during elections. It automates the process
// of finding friends in these states and prepares a message for you to send manually.

// HOW IT WORKS
// ------------
// The script simulates user interactions on Facebook to identify your friends
// in the specified swing states. While it automates most of the steps, you'll
// need to click the send buttons yourself to ensure full manual control over message
// sending, preventing mass-messaging issues.

// DISCLOSURE
// ------------
// This script is designed to help you send voter participation messages to your
// friends in a way that maintains your manual control. It deliberately does not
// automate the message-sending step to avoid potential ethical concerns related
// to mass-messaging. Additionally, as we developed this script, we encountered
// no issues related to being blocked by Facebook, and we implemented mechanisms
// that effectively imitate human behavior to reduce the risk of automated detection.
// Be aware, however, that using this script may still violate Facebook's terms of
// service. Use at your own discretion and risk.

// INSTRUCTIONS
// ------------
// 1. Open https://www.facebook.com in your browser.
// 2. Open the browser's Developer Console.
//    - For Mac: CMD+OPT+I
//    - For Windows: CTRL+SHIFT+I
// 3. Click on the "Console" tab.
// 4. Ensure "Enable User Gesture" is checked (if required by your browser).
// 5. Paste the script into the console and hit enter.
//    - In Chrome, it may prompt you to type "allow paste" and hit enter.
// 6. Follow the on-screen instructions to send messages.
//    - You can close the tab or refresh the page to stop the script at any time.

// CONFIGURATION OPTIONS:
// ------------
// You can modify which states to target.
const STATES = [
  "Pennsylvania",
  "Georgia",
  "Arizona",
  "Michigan",
  "Nevada",
  "North Carolina",
  "Wisconsin",
];

// You can modify the default message template.
const getMessageTemplate = (state) => {
  return `Hi! Are you living in ${state}? I'm reaching out to friends who live there to promote voter participation this November. Are you registered to vote?`;
};

// UTILITY FUNCTIONS
// ------------

// Finds elements on the page
const getElement = (selector) => document.querySelector(selector);

// Check if chats are open
const areChatsOpen = () => {
  const openChats = document.querySelectorAll(
    'div[data-pagelet="MWChatTabHeader"]'
  );
  return openChats.length > 0;
};

// Copy to State query to Clipboard (used to paste into FB's search box)
const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    console.log(`Copied to clipboard: ${text}`);
    return true;
  } catch (error) {
    console.error(`Failed to copy to clipboard: ${error}`);
    return false;
  }
};

// Retry utility
const retry = async (fn, retries = 5, interval = 500, message = "") => {
  if (message) updateStatus(message);
  try {
    const result = await fn();
    if (result) return result;
    if (retries > 0) {
      await delayMS(interval);
      return retry(fn, retries - 1, interval);
    }
  } catch (error) {
    console.error("Error:", error);
  }
  return null;
};

// Delay utility
const delayMS = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Inject message template into chat
const insertText = async (selector, message) => {
  const editableDiv = getElement(selector);
  if (editableDiv) {
    editableDiv.focus();
    const range = document.createRange();
    range.selectNodeContents(editableDiv);
    range.collapse(true);
    window.getSelection().removeAllRanges();
    window.getSelection().addRange(range);
    document.execCommand("insertText", false, message);
    editableDiv.dispatchEvent(new Event("input", { bubbles: true }));
    return true;
  }
  return false;
};

// Wait for chat to close
const waitForChatClose = async () => {
  return new Promise((resolve) => {
    const checkChat = async () => {
      const chats = document.querySelectorAll(
        'div[data-pagelet="MWChatTabHeader"]'
      );
      if (chats.length === 0) resolve(true);
      else await delayMS(500), checkChat();
    };
    checkChat();
  });
};

// Check if a person lives in the state
const livesInState = (resultDiv, state) => {
  const livesInRegex = new RegExp(`Lives in [^·]*,\\s*${state}\\b`, "i");
  const resultText = resultDiv.innerText || "";
  return livesInRegex.test(resultText);
};

// Navigate to homepage
const navigateToHomePage = async () => {
  const homeLink = getElement('a[aria-label="Facebook"]');
  if (homeLink) {
    homeLink.click();
    return true;
  }
  return false;
};

// Paste into the Facebook search box or prompt user for manual paste and Enter
const pasteIntoSearchBox = async (state) => {
  const input = getElement('input[aria-label="Search Facebook"]');
  if (input) {
    input.focus();

    // Try to paste automatically
    const pasteSuccess = document.execCommand("paste");

    if (!pasteSuccess) {
      // If paste is blocked, notify the user to paste manually
      updateStatus(
        "Your clipboard now has the necessary search term. Please tap CMD+V for MacOS, or CTRL+V for Windows to paste it, and then hit Enter."
      );

      // Wait for both manual paste and "Enter" key press
      return new Promise((resolve) => {
        let pasteDetected = false;
        let enterPressed = false;

        const onInputEvent = () => {
          // Detect if the correct text has been pasted
          if (input.value.includes(`lives in ${state}`)) {
            pasteDetected = true;
            checkProceed();
          }
        };

        const onKeydownEvent = (event) => {
          // Detect when Enter is pressed
          if (event.key === "Enter") {
            enterPressed = true;
            checkProceed();
          }
        };

        const checkProceed = () => {
          // Proceed only if both paste and Enter are detected
          if (pasteDetected && enterPressed) {
            input.removeEventListener("input", onInputEvent);
            input.removeEventListener("keydown", onKeydownEvent);
            resolve(true);
          }
        };

        // Add event listeners to detect manual paste and Enter key press
        input.addEventListener("input", onInputEvent);
        input.addEventListener("keydown", onKeydownEvent);
      });
    }

    // If automatic paste works, simulate pressing Enter automatically
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(
      new KeyboardEvent("keydown", { bubbles: true, key: "Enter" })
    );
    return true;
  }

  return false;
};

// USER INTERFACE
// ------------
// Status container
const createStatusContainer = () => {
  const container =
    getElement("#statusContainer") || document.createElement("div");
  container.id = "statusContainer";
  Object.assign(container.style, {
    position: "fixed",
    bottom: "20px",
    left: "50%",
    transform: "translateX(-50%)",
    backgroundColor: "#f4f6f9",
    border: "1px solid #bbb",
    padding: "15px 20px",
    zIndex: "1000",
    borderRadius: "10px",
    boxShadow: "0px 4px 20px rgba(0, 0, 0, 0.2)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    minWidth: "400px",
    maxWidth: "500px",
  });

  // Horizontal state labels above the progress bar
  let stateLabelsContainer = getElement("#stateLabelsContainer");
  if (!stateLabelsContainer) {
    stateLabelsContainer = document.createElement("div");
    stateLabelsContainer.id = "stateLabelsContainer";
    stateLabelsContainer.style.display = "flex";
    stateLabelsContainer.style.justifyContent = "space-between";
    stateLabelsContainer.style.width = "100%";
    stateLabelsContainer.style.marginBottom = "10px";

    STATES.forEach((state, index) => {
      const stateLabel = document.createElement("span");
      stateLabel.innerText = state;
      stateLabel.style.flex = "1";
      stateLabel.style.textAlign = "center";
      stateLabel.style.color = "#555";
      stateLabel.style.fontSize = "11px";
      stateLabel.style.fontWeight = currentIndex === index ? "bold" : "normal";
      stateLabelsContainer.appendChild(stateLabel);
    });

    container.insertBefore(stateLabelsContainer, container.firstChild);
  }

  // Progress bar container
  let progressBarContainer = getElement("#progressBarContainer");
  if (!progressBarContainer) {
    progressBarContainer = document.createElement("div");
    progressBarContainer.id = "progressBarContainer";
    Object.assign(progressBarContainer.style, {
      width: "100%",
      height: "15px",
      backgroundColor: "#e0e0e0",
      borderRadius: "7px",
      marginBottom: "10px",
      overflow: "hidden",
    });

    const progressBar = document.createElement("div");
    progressBar.id = "progressBar";
    Object.assign(progressBar.style, {
      width: "0%",
      height: "100%",
      backgroundColor: "#007bff",
    });

    progressBarContainer.appendChild(progressBar);
    container.insertBefore(progressBarContainer, container.firstChild);
  }

  // Current state indicator
  let stateLabel = getElement("#stateLabel");
  if (!stateLabel) {
    stateLabel = document.createElement("p");
    stateLabel.id = "stateLabel";
    stateLabel.style.margin = "0";
    stateLabel.style.marginBottom = "10px";
    stateLabel.style.fontSize = "14px";
    stateLabel.style.fontWeight = "bold";
    stateLabel.style.color = "#333";
    container.appendChild(stateLabel);
  }

  if (!getElement("#statusContainer")) {
    document.body.appendChild(container);
  }
  return container;
};

// Progress bar
const updateProgressBar = () => {
  const progressBar = getElement("#progressBar");
  const progress = ((currentIndex + 1) / STATES.length) * 100;
  progressBar.style.width = `${progress}%`;

  // Update current state label
  const stateLabel = getElement("#stateLabel");
  stateLabel.innerText = `Let's win ${STATES[currentIndex]}! (${
    currentIndex + 1
  } of ${STATES.length})`;

  // Update state labels bold font
  const stateLabels = document.querySelectorAll("#stateLabelsContainer span");
  stateLabels.forEach((label, index) => {
    label.style.fontWeight = currentIndex === index ? "bold" : "normal";
    label.style.color = currentIndex === index ? "#007bff" : "#555";
  });
};

const createCopyButton = (text, onSuccess) => {
  const statusContainer = createStatusContainer();
  let existingButton = getElement("#copyButton");

  if (existingButton) {
    existingButton.remove();
  }

  const button = document.createElement("button");
  button.id = "copyButton";
  button.innerText = `Continue`;
  button.style.marginTop = "10px";
  button.style.padding = "8px 20px";
  button.style.borderRadius = "5px";
  button.style.border = "none";
  button.style.backgroundColor = "#007bff";
  button.style.color = "white";
  button.style.cursor = "pointer";

  // Check if chatWarning already exists, if not, create and append it
  let chatWarning = getElement("#chatWarning");
  if (!chatWarning) {
    chatWarning = document.createElement("p");
    chatWarning.id = "chatWarning";
    chatWarning.style.margin = "5px 0";
    chatWarning.style.fontSize = "11px";
    chatWarning.style.fontWeight = "bold";
    chatWarning.style.color = "grey";
    chatWarning.style.display = "none"; // Hide by default
    chatWarning.innerText = "Close all chats to continue";
    statusContainer.appendChild(chatWarning);
  }

  // Function to update button state
  const updateButtonState = () => {
    if (areChatsOpen()) {
      button.disabled = true;
      button.style.backgroundColor = "#d3d3d3";
      button.style.cursor = "not-allowed";
      chatWarning.style.display = "block";
    } else {
      button.disabled = false;
      button.style.backgroundColor = "#007bff";
      button.style.cursor = "pointer";
      chatWarning.style.display = "none";
    }
  };

  updateButtonState();
  setInterval(updateButtonState, 500);

  statusContainer.appendChild(button);

  button.onclick = async () => {
    const success = await copyToClipboard(`lives in ${text}`);
    if (success) {
      button.remove();
      onSuccess();
    } else {
      updateStatus("Failed to copy to clipboard. Please try again.");
    }
  };
};

// Status message
const updateStatus = (message) => {
  const statusContainer = createStatusContainer();
  let statusText = getElement("#statusText");

  if (!statusText) {
    statusText = document.createElement("p");
    statusText.id = "statusText";
    statusText.style.margin = "0";
    statusText.style.fontSize = "14px";
    statusText.style.color = "#555";
    statusContainer.appendChild(statusText);
  }
  statusText.innerText = message;

  // Update the progress bar as well
  updateProgressBar();
};

// MAIN FUNCTION
// Processes states and autopopulates message templates
// ----------
// Keeps track of which state we're currently processing
let currentIndex = 0;

const processState = async (state) => {
  updateStatus(
    `This script is about to search for friends in ${state} and autopopulate message templates... It will be up to you to actually send the messages. Ready?`
  );

  createCopyButton(state, async () => {
    updateStatus(`Pasting text for ${state}...`);

    // Ensure search input is available
    const input = await retry(
      () => getElement('input[aria-label="Search Facebook"]'),
      5,
      500,
      `Looking for search box for ${state}...`
    );

    if (!input) return updateStatus(`Input not found for ${state}`);

    console.log(`Attempting to paste into search box for ${state}`);

    // Try to paste, or prompt the user for manual paste and Enter key press
    const pasteResult = await pasteIntoSearchBox(state);

    if (!pasteResult) {
      return; // Stop further execution if the paste failed or is not completed
    }

    await delayMS(1000);
    await retry(
      () => {
        const peopleSpan = [...document.querySelectorAll("span")].find(
          (span) => span.textContent === "People"
        );
        if (peopleSpan) {
          peopleSpan.closest("a")?.click();
          return true;
        }
        return false;
      },
      5,
      500,
      `Clicking People for ${state}...`
    );
    
    updateStatus(`Looking for Friends option for ${state}...`);
    await retry(
      () => {
        const friendsInput = getElement('input[aria-label="Friends"]');
        if (friendsInput) {
          friendsInput.click();
          return true;
        }
        return false;
      },
      5,
      500,
      `Clicking Friends for ${state}...`
    );

    updateStatus(`Looking for My Friends for ${state}...`);
    await retry(
      () => {
        const myFriendsOuterDiv = getElement('li[id="My Friends"] > div');
        if (myFriendsOuterDiv) {
          myFriendsOuterDiv.click();
          return true;
        }
        return false;
      },
      5,
      500,
      `Clicking My Friends for ${state}...`
    );

    updateStatus(`Looking for Message buttons for ${state}...`);
    await delayMS(3000);

    // Look for the feed div inside the "Search results" div
    const searchResultsDiv = getElement('div[aria-label="Search results"]');
    if (searchResultsDiv) {
      const feedDiv = searchResultsDiv.querySelector('div[role="feed"]');
      console.log("feed div: ", feedDiv);

      if (!feedDiv) {
        console.log("Feed not found");
        return updateStatus(`Feed not found for ${state}`);
      }

      console.log("Feed found, checking for message buttons...");

      const searchResults = [...feedDiv.children];
      console.log("search results: ", searchResults);
      const messageButtonsToClick = [];

      for (const resultDiv of searchResults) {
        console.log("result div: ", resultDiv);
        if (livesInState(resultDiv, state)) {
          const messageButton = resultDiv.querySelector(
            'div[aria-label="Message"][role="button"]'
          );
          if (messageButton) {
            console.log("message button found: ", messageButton);
            messageButtonsToClick.push(messageButton);
          }
        }
      }

      for (const button of messageButtonsToClick) {
        button.click();
        await delayMS(2000);

        updateStatus(`Inserting message template for ${state}...`);

        const messageTemplate = getMessageTemplate(state);
        await retry(
          () =>
            insertText(
              'div[contenteditable="true"][aria-placeholder="Aa"]',
              messageTemplate
            ),
          5,
          500,
          `Message template inserted. Either send this message or close the chat to move on.`
        );

        await waitForChatClose();

        updateStatus(`Loading next message template...`);
      }
    } else {
      console.log("Search results div not found");
      return updateStatus(`Search results not found for ${state}`);
    }

    updateStatus(`Finished sending messages for ${state}.`);

    // Move to next state
    if (currentIndex < STATES.length - 1) {
      currentIndex++;
      updateStatus("Navigating back to homepage...");
      await retry(navigateToHomePage, 5, 500, "Navigating back to homepage...");
      processNextState(); // Start processing next state after navigating home
    } else {
      updateStatus("All states processed. Refresh page to exit script.");
    }
  });
};


// INITIALIZATION
// --------------
// Process the next state
const processNextState = () => {
  const nextState = STATES[currentIndex];
  processState(nextState);
};

// Prepare processing states
const startProcess = async () => {
  await processState(STATES[currentIndex]);
};

// Start processing states
startProcess();
