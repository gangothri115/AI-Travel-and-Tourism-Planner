document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("destinationInput");
  const button = document.getElementById("startChatButton");
  if (!input || !button) return;

  const submit = () => {
    const message = input.value.trim();
    if (!message) { input.focus(); return; }

    // A new request from Home must never inherit a previous trip's context.
    sessionStorage.removeItem("tripRequirements");
    sessionStorage.removeItem("travelConversation");
    sessionStorage.removeItem("activeTripId");
    sessionStorage.setItem("initialTravelMessage", message);
    sessionStorage.setItem("startNewTravelConversation", "1");
    window.location.assign("/chat");
  };

  button.addEventListener("click", submit);
  input.addEventListener("keydown", event => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  });
});
