
import "./style.css";
import { createGameSession } from "./engine/gameSession.js";

const app = document.querySelector("#app");

app.innerHTML = `
  <main class="game-shell">
    <header class="game-header">
      <div>
        <p class="eyebrow">INTERACTIVE FICTION ENGINE</p>
        <h1 id="game-title">Loading world...</h1>
      </div>
      <span class="status"><span class="status-dot"></span> LOCAL SESSION</span>
    </header>

    <section class="room-panel" aria-live="polite">
      <p class="eyebrow">CURRENT LOCATION</p>
      <h2 id="room-name">Loading...</h2>
      <p id="room-description"></p>
    </section>

    <section class="transcript-panel" aria-label="Game transcript">
      <div id="transcript" class="transcript"></div>
    </section>

    <form id="command-form" class="command-form">
      <label for="command-input"><span class="prompt-symbol">&gt;</span> COMMAND</label>
      <div class="input-row">
        <input
          id="command-input"
          name="command"
          type="text"
          autocomplete="off"
          placeholder="Try: look, north, take key..."
          autofocus
        />
        <button type="submit">EXECUTE</button>
      </div>
    </form>

    <section class="suggestion-panel">
      <div class="section-heading">
        <h2>AVAILABLE COMMANDS</h2>
        <span id="suggestion-count"></span>
      </div>
      <div id="suggestions" class="suggestions"></div>
    </section>

    <footer class="game-footer">
      <span id="inventory-summary">Inventory: empty</span>
      <span id="turn-counter">TURN 0</span>
    </footer>
  </main>
`;

const elements = {
  title: document.querySelector("#game-title"),
  roomName: document.querySelector("#room-name"),
  roomDescription: document.querySelector("#room-description"),
  transcript: document.querySelector("#transcript"),
  form: document.querySelector("#command-form"),
  input: document.querySelector("#command-input"),
  suggestions: document.querySelector("#suggestions"),
  suggestionCount: document.querySelector("#suggestion-count"),
  inventory: document.querySelector("#inventory-summary"),
  turnCounter: document.querySelector("#turn-counter")
};

let session;

function appendTranscript(label, message, kind = "system") {
  const entry = document.createElement("article");
  entry.className = `transcript-entry ${kind}`;

  const heading = document.createElement("span");
  heading.className = "transcript-label";
  heading.textContent = label;

  const body = document.createElement("p");
  body.textContent = message;

  entry.append(heading, body);
  elements.transcript.append(entry);
  elements.transcript.scrollTop = elements.transcript.scrollHeight;
}

function renderRoom() {
  const room = session.getCurrentRoom();

  if (!room) return;

  elements.roomName.textContent = room.name;
  elements.roomDescription.textContent = room.description;
}

function renderInventoryAndTurn() {
  const items = session.getInventory();
  const state = session.getState();

  elements.inventory.textContent = items.length
    ? `Inventory: ${items.map((item) => item.name).join(", ")}`
    : "Inventory: empty";

  elements.turnCounter.textContent = `TURN ${state.turnCount}`;
}

function renderSuggestions() {
  const suggestions = session.getSuggestions();

  elements.suggestions.replaceChildren();
  elements.suggestionCount.textContent = `${suggestions.length} OPTIONS`;

  for (const command of suggestions) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "suggestion";
    button.textContent = command;

    button.addEventListener("click", () => {
      runCommand(command);
    });

    elements.suggestions.append(button);
  }
}

function render() {
  renderRoom();
  renderInventoryAndTurn();
  renderSuggestions();
}

function runCommand(input) {
  const command = input.trim();

  if (!command || !session) return;

  elements.input.value = "";
  appendTranscript("YOU", command, "player");

  const result = session.execute(command);

  appendTranscript(
    result.ok ? result.code : `ERROR / ${result.code}`,
    result.message,
    result.ok ? "success" : "error"
  );

  render();
  elements.input.focus();
}

elements.form.addEventListener("submit", (event) => {
  event.preventDefault();
  runCommand(elements.input.value);
});

async function startGame() {
  try {
    session = await createGameSession("forgotten-cellar");

    elements.title.textContent = session.title;

    if (session.intro) {
      appendTranscript("INTRODUCTION", session.intro);
    }

    appendTranscript(
      "SYSTEM",
      "Type a command or select one of the suggestions below."
    );

    render();
    elements.input.focus();
  } catch (error) {
    elements.title.textContent = "World failed to load";
    appendTranscript(
      "FATAL ERROR",
      error instanceof Error ? error.message : String(error),
      "error"
    );
  }
}

startGame();
