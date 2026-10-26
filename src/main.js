import "./style.css";
import { createGameSession } from "./engine/gameSession.js";
import {
  createWorldDraft,
  addRoom,
  updateRoom,
  deleteRoom,
  validateDraft,
  DIRECTIONS,
} from "./builder/worldDraft.js";

const app = document.querySelector("#app");

let session = null;
let isLoadingGame = false;
let gameError = "";

const state = {
  page: "home",
  transcript: [],
  builderDraft: createWorldDraft(),
  editingRoomId: "starting-room",
  builderNotice: "",
};

function escapeHTML(value = "") {
  return String(value).replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[char],
  );
}

function button(label, action, className = "") {
  return `<button class="${className}" data-action="${action}">${label}</button>`;
}

function navLink(label, page) {
  const active = state.page === page ? "active" : "";
  return `<button class="nav-link ${active}" data-page="${page}">${label}</button>`;
}

function renderShell(content) {
  app.innerHTML = `
    <div class="site-shell">
      <header class="site-header">
        <button class="brand" data-page="home" aria-label="Go home">
          <span class="brand-icon">&gt;_</span>
          <span>TEXT ADVENTURE</span>
        </button>

        <nav class="main-nav" aria-label="Main navigation">
          ${navLink("Play", "play")}
          ${navLink("Create", "create")}
          ${navLink("About", "about")}
        </nav>
      </header>

      <main>${content}</main>

      <footer class="site-footer">
        <span>TEXT ADVENTURE <span class="muted">v1.0.0</span></span>
        <span>Your story. Your world.</span>
      </footer>
    </div>
  `;
}

function renderHome() {
  renderShell(`
    <section class="hero panel">
      <div class="hero-copy">
        <p class="eyebrow">A WORLD OF YOUR OWN</p>
        <h1>Text Adventure<span class="cursor">_</span></h1>
        <p class="hero-tagline">Explore. Solve. Discover.</p>
        <p class="hero-description">
          Enter mysterious worlds built from words, choices, and clever puzzles.
          Play an adventure or build one of your own.
        </p>

        <div class="button-row">
          ${button("▶ &nbsp; Play Adventure", "play", "btn btn-primary")}
          ${button("✎ &nbsp; Create World", "create", "btn")}
          ${button("ⓘ &nbsp; About", "about", "btn")}
        </div>
      </div>

      <div class="hero-art" aria-label="Retro pixel-art dungeon illustration">
        <div class="art-frame">
          <div class="art-symbol">╔══════════╗<br>
            ║ &nbsp; ? &nbsp; ? &nbsp; ? &nbsp; ║<br>
            ║ &nbsp; ┌──┐ &nbsp; ║<br>
            ║ &nbsp; │ ░ │ &nbsp; ║<br>
            ║ &nbsp; └──┘ &nbsp; ║<br>
            ╚══════════╝
          </div>
          <p>THE UNKNOWN AWAITS</p>
        </div>
      </div>
    </section>

    <section class="home-grid">
      <article class="panel feature-panel">
        <p class="section-kicker">01 / PLAY</p>
        <h2>Featured Adventure</h2>
        <div class="world-preview">
          <div class="world-icon" aria-hidden="true">⌂</div>
          <div>
            <h3>The Forgotten Cellar</h3>
            <p>
              An abandoned house. A rusty key. A locked cellar hiding
              something below.
            </p>
            ${button("▶ &nbsp; Enter World", "play", "btn btn-small")}
          </div>
        </div>
        <p class="small-note">The first playable world in the collection.</p>
      </article>

      <article class="panel feature-panel">
        <p class="section-kicker">02 / CREATE</p>
        <h2>Build Your Own World</h2>
        <p class="feature-lead">Your imagination sets the rules.</p>
        <ol class="steps">
          <li><span>01</span><div><strong>Define your world</strong><p>Name it and choose a starting room.</p></div></li>
          <li><span>02</span><div><strong>Build rooms and puzzles</strong><p>Connect locations, add objects, and create rules.</p></div></li>
          <li><span>03</span><div><strong>Export and play</strong><p>Download your world and load it into the game.</p></div></li>
        </ol>
        ${button("✎ &nbsp; Open World Builder", "create", "btn btn-wide")}
      </article>

      <article class="panel feature-panel">
        <p class="section-kicker">03 / THE ENGINE</p>
        <h2>About the Project</h2>
        <p>
          A browser-based text adventure engine with separate world data,
          reusable gameplay systems, and a terminal-inspired interface.
        </p>
        <ul class="feature-list">
          <li>Typed commands and clickable suggestions</li>
          <li>JSON-driven rooms, entities, and rules</li>
          <li>Custom-world import and export — planned</li>
          <li>Local save/load — planned</li>
        </ul>
        ${button("Learn About the Engine →", "about", "text-link")}
      </article>
    </section>
  `);
}

function renderPlay() {
  if (!session) {
    renderShell(`
      <section class="page-heading">
        <p class="eyebrow">PLAY / 01</p>
        <h1>Choose your adventure</h1>
        <p>Step into a world and discover what it holds.</p>
      </section>

      <section class="panel play-card">
        <div class="world-icon large" aria-hidden="true">⌂</div>
        <div class="play-card-copy">
          <p class="section-kicker">AVAILABLE WORLD</p>
          <h2>The Forgotten Cellar</h2>
          <p>
            Explore an abandoned house, find useful objects, and unlock
            the way into the cellar.
          </p>
          ${button(
            isLoadingGame ? "Loading world..." : "▶ &nbsp; Start Playing",
            "start-game",
            "btn btn-primary",
          )}
          ${gameError ? `<p class="error-message">${escapeHTML(gameError)}</p>` : ""}
        </div>
      </section>
    `);
    return;
  }

  const room = session.getCurrentRoom();
  const inventory = session.getInventory();
  const suggestions = session.getSuggestions();

  renderShell(`
    <section class="page-heading compact-heading">
      <p class="eyebrow">PLAY / THE FORGOTTEN CELLAR</p>
      <h1>Adventure Terminal<span class="cursor">_</span></h1>
    </section>

    <section class="game-layout">
      <div class="panel game-panel">
        <div class="terminal-bar">
          <span><span class="status-dot"></span> WORLD SESSION ACTIVE</span>
          <span>TURN ${session.getState().turnCount}</span>
        </div>

        <div class="room-heading">
          <p class="section-kicker">CURRENT LOCATION</p>
          <h2>${escapeHTML(room?.name ?? "Unknown Room")}</h2>
          <p>${escapeHTML(room?.description ?? "")}</p>
        </div>

        <div class="transcript" id="transcript" aria-live="polite">
          ${state.transcript
            .map(
              (entry) => `
            <p class="transcript-line ${entry.type}">
              <span class="line-prefix">${entry.type === "command" ? ">" : "·"}</span>
              ${escapeHTML(entry.text)}
            </p>
          `,
            )
            .join("")}
        </div>

        <form id="command-form" class="command-form">
          <label for="command-input">&gt;</label>
          <input
            id="command-input"
            name="command"
            autocomplete="off"
            placeholder="Enter a command..."
            aria-label="Enter a game command"
          />
          <button class="btn btn-small" type="submit">SEND ↵</button>
        </form>

        <div class="suggestions">
          <p class="section-kicker">SUGGESTED COMMANDS</p>
          <div class="suggestion-list">
            ${suggestions
              .map((suggestion) =>
                button(
                  escapeHTML(suggestion),
                  `command:${suggestion}`,
                  "suggestion",
                ),
              )
              .join("")}
          </div>
        </div>
      </div>

      <aside class="panel inventory-panel">
        <p class="section-kicker">PLAYER STATUS</p>
        <h2>Inventory</h2>
        ${
          inventory.length
            ? `<ul class="inventory-list">${inventory
                .map((item) => `<li>${escapeHTML(item.name)}</li>`)
                .join("")}</ul>`
            : `<p class="muted">Your inventory is empty.</p>`
        }
        <div class="panel-divider"></div>
        <p class="section-kicker">WORLD ID</p>
        <p class="mono">${escapeHTML(session.worldId)}</p>
        ${button("↻ Restart World", "restart-game", "btn btn-wide")}
      </aside>
    </section>
  `);

  const transcript = document.querySelector("#transcript");
  if (transcript) transcript.scrollTop = transcript.scrollHeight;
}

function renderExitOptions(room, direction) {
  const selectedId = room.exits[direction] ?? "";

  return `
    <label class="builder-field">
      <span>${direction.toUpperCase()} EXIT</span>
      <select name="exit-${direction}">
        <option value="">No exit</option>
        ${state.builderDraft.rooms
          .filter((candidate) => candidate.id !== room.id)
          .map(
            (candidate) => `
            <option
              value="${escapeHTML(candidate.id)}"
              ${selectedId === candidate.id ? "selected" : ""}
            >
              ${escapeHTML(candidate.name)}
            </option>
          `,
          )
          .join("")}
      </select>
    </label>
  `;
}

function renderRoomList() {
  return state.builderDraft.rooms
    .map(
      (room) => `
    <div class="builder-room-row">
      <div>
        <strong>${escapeHTML(room.name)}</strong>
        <p class="mono">${escapeHTML(room.id)}</p>
        ${
          room.id === state.builderDraft.manifest.startRoomId
            ? '<span class="room-badge">START ROOM</span>'
            : ""
        }
      </div>
      <div class="room-row-actions">
        <button
          class="btn btn-small"
          data-action="edit-room:${escapeHTML(room.id)}"
        >Edit</button>
        <button
          class="btn btn-small btn-danger"
          data-action="delete-room:${escapeHTML(room.id)}"
          ${state.builderDraft.rooms.length === 1 ? "disabled" : ""}
        >Delete</button>
      </div>
    </div>
  `,
    )
    .join("");
}


function renderCreate() {
  const draft = state.builderDraft;
  const editingRoom =
    draft.rooms.find((room) => room.id === state.editingRoomId)
    ?? draft.rooms[0]
    ?? null;

  const validation = validateDraft(draft);

  renderShell(`
    <section class="page-heading">
      <p class="eyebrow">CREATE / WORLD WORKSHOP</p>
      <h1>Build Your World<span class="cursor">_</span></h1>
      <p>Create a network of rooms for players to explore.</p>
    </section>

    <div class="builder-workspace">
      <section class="panel builder-section">
        <p class="section-kicker">01 / WORLD DETAILS</p>
        <h2>Set the scene</h2>

        <form id="world-details-form" class="builder-form">
          <label class="builder-field">
            <span>WORLD TITLE</span>
            <input
              name="title"
              required
              maxlength="80"
              value="${escapeHTML(draft.manifest.title)}"
              placeholder="The Forgotten Kingdom"
            />
          </label>

          <label class="builder-field">
            <span>WORLD ID</span>
            <input
              name="worldId"
              required
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              value="${escapeHTML(draft.manifest.id)}"
              placeholder="forgotten-kingdom"
            />
            <small>Lowercase letters, numbers, and hyphens only.</small>
          </label>

          <label class="builder-field">
            <span>INTRODUCTION</span>
            <textarea
              name="intro"
              rows="3"
              maxlength="1000"
            >${escapeHTML(draft.text.intro)}</textarea>
          </label>

          <label class="builder-field">
            <span>STARTING ROOM</span>
            <select name="startRoomId" required>
              ${draft.rooms.map((room) => `
                <option
                  value="${escapeHTML(room.id)}"
                  ${draft.manifest.startRoomId === room.id ? "selected" : ""}
                >
                  ${escapeHTML(room.name)}
                </option>
              `).join("")}
            </select>
          </label>

          <button class="btn btn-primary" type="submit">
            Save World Details
          </button>
        </form>
      </section>

      <section class="panel builder-section">
        <p class="section-kicker">02 / LOCATIONS</p>
        <h2>Rooms & Connections</h2>
        <p class="muted">
          Each room is a location. Exits connect it to other rooms.
        </p>

        <div class="builder-room-list">
          ${renderRoomList()}
        </div>

        <form id="add-room-form" class="add-room-form">
          <label class="builder-field">
            <span>NEW ROOM NAME</span>
            <input
              name="newRoomName"
              required
              maxlength="80"
              placeholder="e.g. Hidden Library"
            />
          </label>
          <button class="btn btn-wide" type="submit">+ Add Room</button>
        </form>
      </section>

      ${editingRoom ? `
        <section class="panel builder-section room-editor">
          <p class="section-kicker">03 / ROOM EDITOR</p>
          <h2>Edit: ${escapeHTML(editingRoom.name)}</h2>

          <form id="room-editor-form" class="builder-form">
            <input
              type="hidden"
              name="roomId"
              value="${escapeHTML(editingRoom.id)}"
            />

            <label class="builder-field">
              <span>ROOM NAME</span>
              <input
                name="roomName"
                required
                maxlength="80"
                value="${escapeHTML(editingRoom.name)}"
              />
            </label>

            <label class="builder-field">
              <span>ROOM DESCRIPTION</span>
              <textarea
                name="roomDescription"
                rows="4"
                required
                maxlength="2000"
              >${escapeHTML(editingRoom.description)}</textarea>
            </label>

            <div class="exit-editor">
              <p class="section-kicker">DIRECTIONAL EXITS</p>
              <p class="muted">
                Choose a destination for each direction, or select No exit.
              </p>
              <div class="exit-grid">
                ${DIRECTIONS.map((direction) =>
                  renderExitOptions(editingRoom, direction)
                ).join("")}
              </div>
            </div>

            <button class="btn btn-primary" type="submit">
              Save Room
            </button>
          </form>
        </section>
      ` : ""}

      <section class="panel builder-section">
        <p class="section-kicker">04 / VALIDATION</p>
        <h2>World Check</h2>

        <p class="${validation.ok ? "validation-ok" : "validation-error"}">
          ${validation.ok
            ? "✓ Your current room structure is valid."
            : "⚠ Fix the following issues before continuing:"}
        </p>

        ${validation.errors.length ? `
          <ul class="validation-list">
            ${validation.errors.map((error) =>
              `<li>${escapeHTML(error)}</li>`
            ).join("")}
          </ul>
        ` : ""}

        ${state.builderNotice
          ? `<p class="builder-notice">${escapeHTML(state.builderNotice)}</p>`
          : ""}

        <div class="world-summary">
          <span>ROOMS <strong>${draft.rooms.length}</strong></span>
          <span>ENTITIES <strong>${draft.entities.length}</strong></span>
          <span>RULES <strong>${draft.rules.length}</strong></span>
        </div>

        <p class="small-note">
          Export is intentionally disabled until entities and rules are supported.
          Your draft currently lives in this page's memory.
        </p>
      </section>
    </div>
  `);
}

function renderAbout() {
  renderShell(`
    <section class="page-heading">
      <p class="eyebrow">ABOUT / 03</p>
      <h1>Behind the Words<span class="cursor">_</span></h1>
      <p>A small engine for worlds that exist in your imagination.</p>
    </section>

    <section class="about-grid">
      <article class="panel">
        <p class="section-kicker">THE IDEA</p>
        <h2>Worlds are data.</h2>
        <p>
          Rooms, exits, entities, and puzzle rules live in separate JSON files.
          The engine interprets that data, manages the game state, and returns
          structured results to the interface.
        </p>
      </article>

      <article class="panel">
        <p class="section-kicker">THE STACK</p>
        <h2>Simple, modular, browser-native.</h2>
        <ul class="feature-list">
          <li>Vanilla JavaScript ES modules</li>
          <li>HTML and CSS</li>
          <li>Vite development server</li>
          <li>JSON-based world definitions</li>
          <li>Vitest for automated tests</li>
        </ul>
      </article>

      <article class="panel">
        <p class="section-kicker">THE ROAD AHEAD</p>
        <h2>Built to grow.</h2>
        <ul class="feature-list">
          <li>Custom-world builder and export</li>
          <li>Import and validate user-created worlds</li>
          <li>Local save/load support</li>
          <li>More puzzles and command handling</li>
        </ul>
      </article>
    </section>
  `);
}

function render() {
  if (state.page === "play") return renderPlay();
  if (state.page === "create") return renderCreate();
  if (state.page === "about") return renderAbout();
  renderHome();
}

async function startGame() {
  if (isLoadingGame) return;

  isLoadingGame = true;
  gameError = "";
  renderPlay();

  try {
    session = await createGameSession("forgotten-cellar");
    state.transcript = [
      { type: "message", text: session.intro },
      { type: "message", text: 'Type "look" to inspect your surroundings.' },
    ];
  } catch (error) {
    gameError =
      error instanceof Error ? error.message : "Could not load the world.";
    session = null;
  } finally {
    isLoadingGame = false;
    renderPlay();
  }
}

function runCommand(input) {
  const command = input.trim();
  if (!command || !session) return;

  state.transcript.push({ type: "command", text: command });

  const result = session.execute(command);
  state.transcript.push({
    type: result.ok ? "message" : "error",
    text: result.message ?? "The command could not be completed.",
  });

  renderPlay();
  document.querySelector("#command-input")?.focus();
}

app.addEventListener("click", async (event) => {
  const target = event.target.closest("[data-page], [data-action]");
  if (!target) return;

  if (target.dataset.page) {
    state.page = target.dataset.page;
    render();
    return;
  }

  const action = target.dataset.action;


if (action.startsWith("edit-room:")) {
  state.editingRoomId = action.slice("edit-room:".length);
  state.builderNotice = "";
  renderCreate();
  return;
}

if (action.startsWith("delete-room:")) {
  const roomId = action.slice("delete-room:".length);

  if (state.builderDraft.rooms.length > 1) {
    state.builderDraft = deleteRoom(state.builderDraft, roomId);

    if (state.editingRoomId === roomId) {
      state.editingRoomId =
        state.builderDraft.manifest.startRoomId;
    }

    state.builderNotice = "Room deleted. Any exits pointing to it were removed.";
  }

  renderCreate();
  return;
}


  if (action === "start-game") {
    await startGame();
  } else if (action === "restart-game") {
    session = null;
    state.transcript = [];
    state.page = "play";
    renderPlay();
  } else if (action.startsWith("command:")) {
    runCommand(action.slice("command:".length));
  } else if (["play", "create", "about", "home"].includes(action)) {
    state.page = action;
    render();
  }
});


app.addEventListener("submit", (event) => {
  const form = event.target;
  event.preventDefault();

  if (form.id === "command-form") {
    const input = form.elements.command;
    runCommand(input.value);
    return;
  }

  const data = new FormData(form);

  if (form.id === "world-details-form") {
    const title = String(data.get("title") ?? "").trim();
    const worldId = String(data.get("worldId") ?? "").trim();
    const intro = String(data.get("intro") ?? "").trim();
    const startRoomId = String(data.get("startRoomId") ?? "");

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(worldId)) {
      state.builderNotice =
        "World ID must contain lowercase letters, numbers, and single hyphens.";
      renderCreate();
      return;
    }

    state.builderDraft = {
      ...state.builderDraft,
      manifest: {
        ...state.builderDraft.manifest,
        id: worldId,
        title,
        startRoomId,
      },
      text: {
        ...state.builderDraft.text,
        intro,
      },
    };

    state.builderNotice = "World details saved.";
    renderCreate();
    return;
  }

  if (form.id === "add-room-form") {
    const name = String(data.get("newRoomName") ?? "").trim();
    if (!name) return;

    const previousRoomIds = new Set(
      state.builderDraft.rooms.map((room) => room.id)
    );

    state.builderDraft = addRoom(state.builderDraft, name);

    const newRoom = state.builderDraft.rooms.find(
      (room) => !previousRoomIds.has(room.id)
    );

    state.editingRoomId = newRoom.id;
    state.builderNotice = `Room "${name}" added.`;
    renderCreate();
    return;
  }

  if (form.id === "room-editor-form") {
    const roomId = String(data.get("roomId") ?? "");
    const name = String(data.get("roomName") ?? "").trim();
    const description = String(data.get("roomDescription") ?? "").trim();

    if (!name || !description) {
      state.builderNotice = "Room name and description are required.";
      renderCreate();
      return;
    }

    const exits = {};

    for (const direction of DIRECTIONS) {
      const destinationId = String(
        data.get(`exit-${direction}`) ?? ""
      );

      if (destinationId) {
        exits[direction] = destinationId;
      }
    }

    state.builderDraft = updateRoom(
      state.builderDraft,
      roomId,
      { name, description, exits }
    );

    state.builderNotice = "Room saved.";
    renderCreate();
  }
});


render();
