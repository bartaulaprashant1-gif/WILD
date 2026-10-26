
import { validateWorld } from "./worldValidator.js";

async function fetchJson(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Failed to load ${url}: HTTP ${response.status}`
    );
  }

  return response.json();
}

export async function loadWorld(worldId) {
  if (!/^[a-z0-9-]+$/.test(worldId)) {
    throw new Error("Invalid world ID.");
  }

  const baseUrl = `/worlds/${worldId}/`;
  const manifest = await fetchJson(
    `${baseUrl}manifest.json`
  );

  if (
    manifest.id !== worldId ||
    !manifest.files ||
    typeof manifest.files !== "object"
  ) {
    throw new Error("Invalid world manifest.");
  }

  const fileNames = Object.values(manifest.files);

  if (
    !["rooms", "entities", "rules", "text"].every(
      (key) => typeof manifest.files[key] === "string"
    ) ||
    fileNames.some(
      (file) =>
        file.includes("/") ||
        file.includes("\\") ||
        file === "." ||
        file === ".."
    )
  ) {
    throw new Error("Invalid world file references.");
  }

  const [rooms, entities, rules, text] = await Promise.all([
    fetchJson(`${baseUrl}${manifest.files.rooms}`),
    fetchJson(`${baseUrl}${manifest.files.entities}`),
    fetchJson(`${baseUrl}${manifest.files.rules}`),
    fetchJson(`${baseUrl}${manifest.files.text}`)
  ]);

  const world = {
    manifest,
    rooms,
    entities,
    rules,
    text
  };

  const result = validateWorld(world);

  if (!result.valid) {
    throw new Error(
      `World validation failed:\n${result.errors.join("\n")}`
    );
  }

  return world;
}
