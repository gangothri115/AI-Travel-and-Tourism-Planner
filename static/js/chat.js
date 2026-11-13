
// Safe, lightweight Markdown renderer for AI replies.
// Escapes HTML first; only supports common formatting and line breaks.
function renderSafeMarkdown(value) {
    const escape = (text) => String(text ?? "").replace(/[&<>"']/g, ch => ({
        "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
    })[ch]);
    let text = escape(value);
    text = text.replace(/^###\s+(.+)$/gm, "<h3>$1</h3>")
               .replace(/^##\s+(.+)$/gm, "<h2>$1</h2>")
               .replace(/^#\s+(.+)$/gm, "<h1>$1</h1>")
               .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
               .replace(/\*(.+?)\*/g, "<em>$1</em>")
               .replace(/^\s*[-*]\s+(.+)$/gm, "• $1")
               .replace(/\n/g, "<br>");
    return text;
}

// ========================================================
// CHAT ELEMENTS
// ========================================================

const chatInput =
    document.getElementById("chatInput");


const sendButton =
    document.getElementById("sendButton");


const chatMessages =
    document.getElementById("chatMessages");


const typingIndicator =
    document.getElementById("typingIndicator");


// ========================================================
// CONVERSATION MEMORY
// ========================================================

let conversation = JSON.parse(sessionStorage.getItem("travelConversation") || "[]");
if (!Array.isArray(conversation)) conversation = [];


// Prevent multiple redirects
let redirectingToPlanning = false;


// ========================================================
// ADD MESSAGE TO CHAT
// ========================================================

function addMessage(message, type) {

    const wrapper =
        document.createElement("div");


    wrapper.className =
        `message ${type}-message`;


    // ----------------------------------------------------
    // AVATAR
    // ----------------------------------------------------

    const avatar =
        document.createElement("div");


    avatar.className =
        "message-avatar";


    avatar.textContent =
        type === "ai"
            ? "🤖"
            : "👤";


    // ----------------------------------------------------
    // MESSAGE BUBBLE
    // ----------------------------------------------------

    const bubble =
        document.createElement("div");


    bubble.className =
        "message-bubble";


    // ----------------------------------------------------
    // MESSAGE TEXT
    // ----------------------------------------------------

    const paragraph = document.createElement("div");
    paragraph.className = "message-content";
    paragraph.innerHTML = renderSafeMarkdown(message);

    // ----------------------------------------------------
    // BUILD MESSAGE
    // ----------------------------------------------------
    bubble.appendChild(paragraph);


    wrapper.appendChild(
        avatar
    );


    wrapper.appendChild(
        bubble
    );


    chatMessages.appendChild(
        wrapper
    );


    // ----------------------------------------------------
    // AUTO SCROLL
    // ----------------------------------------------------

    chatMessages.scrollTop =
        chatMessages.scrollHeight;
}


// ========================================================
// SEND MESSAGE
// ========================================================

let messageInFlight = false;

async function sendMessage() {
    if (!chatInput || !sendButton || !chatMessages || messageInFlight) return;
    const message = chatInput.value.trim();


    // ----------------------------------------------------
    // EMPTY MESSAGE
    // ----------------------------------------------------

    if (!message) {

        return;
    }


    // ----------------------------------------------------
    // SHOW USER MESSAGE
    // ----------------------------------------------------

    addMessage(
        message,
        "user"
    );


    // ----------------------------------------------------
    // CLEAR INPUT
    // ----------------------------------------------------

    chatInput.value = "";


    // ----------------------------------------------------
    // SHOW TYPING INDICATOR
    // ----------------------------------------------------

    if (typingIndicator) {

        typingIndicator.style.display =
            "block";
    }


    // ----------------------------------------------------
    // DISABLE SEND BUTTON
    // ----------------------------------------------------

    sendButton.disabled =
        true;


    try {

        // ------------------------------------------------
        // SEND REQUEST TO FLASK
        // ------------------------------------------------

        const response =
            await fetch(
                "/api/chat",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        message: message,

                        conversation:
                            conversation

                    })
                }
            );


        // ------------------------------------------------
        // CONVERT RESPONSE TO JSON
        // ------------------------------------------------

        const data =
            await response.json();


        // ------------------------------------------------
        // ERROR RESPONSE
        // ------------------------------------------------

        if (!data.success) {

            addMessage(
                data.error ||
                "Something went wrong.",
                "ai"
            );

            return;
        }


        // ------------------------------------------------
        // SHOW AI RESPONSE
        // ------------------------------------------------

        addMessage(
            data.reply,
            "ai"
        );


        // ------------------------------------------------
        // SAVE TRIP REQUIREMENTS
        // ------------------------------------------------

        if (data.trip_requirements) {

            sessionStorage.setItem(

                "tripRequirements",

                JSON.stringify(
                    data.trip_requirements
                )

            );
        }


        // ------------------------------------------------
        // SAVE CONVERSATION
        // ------------------------------------------------

        conversation.push({

            role: "user",

            content: message

        });


        conversation.push({

            role: "assistant",

            content: data.reply

        });
        sessionStorage.setItem("travelConversation", JSON.stringify(conversation));


        // ------------------------------------------------
        // CHECK WHETHER TRIP IS READY
        // ------------------------------------------------

    if (
    data.trip_ready === true &&
    !redirectingToPlanning
) {

    redirectingToPlanning = true;


    // Save the final trip information
    if (data.trip_requirements) {

        sessionStorage.setItem(
            "tripRequirements",
            JSON.stringify(
                data.trip_requirements
            )
        );
    }


    // Give the user a moment to read
    // the confirmation message

    setTimeout(function () {

        window.location.assign(
            "/planning"
        );

    }, 1200);

}  


    } catch (error) {

        // ------------------------------------------------
        // CONSOLE ERROR
        // ------------------------------------------------

        console.error(
            "Chat error:",
            error
        );


        // ------------------------------------------------
        // USER-FRIENDLY ERROR
        // ------------------------------------------------

        addMessage(

            "Sorry! I couldn't connect to the AI right now. Please try again.",

            "ai"

        );


    } finally {

        // ------------------------------------------------
        // HIDE TYPING INDICATOR
        // ------------------------------------------------

        if (typingIndicator) {

            typingIndicator.style.display =
                "none";
        }


        // ------------------------------------------------
        // ENABLE SEND BUTTON
        // ------------------------------------------------

        sendButton.disabled = false;
        messageInFlight = false;

        // ------------------------------------------------
        // RETURN CURSOR TO INPUT
        // ------------------------------------------------

        chatInput.focus();
    }
}


// ========================================================
// SEND BUTTON CLICK
// ========================================================

sendButton.addEventListener(

    "click",

    sendMessage

);


// ========================================================
// ENTER KEY
// ========================================================

chatInput.addEventListener(

    "keydown",

    function (event) {

        // Enter = send
        // Shift + Enter = new line

        if (
            event.key === "Enter" &&
            !event.shiftKey
        ) {

            event.preventDefault();

            sendMessage();
        }

    }

);


// ========================================================
// INITIAL MESSAGE FROM HOME PAGE
// ========================================================

const initialMessage =
    sessionStorage.getItem(
        "initialTravelMessage"
    );


if (initialMessage) {

    // Remove it so it is not sent again
    sessionStorage.removeItem(
        "initialTravelMessage"
    );


    // Put it into the input
    chatInput.value =
        initialMessage;


    // Automatically send
    sendMessage();
}
// Restore the current conversation when returning to the chat page.
document.addEventListener("DOMContentLoaded", () => {
    if (conversation.length && chatMessages.children.length <= 1) {
        conversation.forEach(item => {
            if (item && (item.role === "user" || item.role === "assistant")) {
                addMessage(item.content, item.role === "assistant" ? "ai" : "user");
            }
        });
    }
});
