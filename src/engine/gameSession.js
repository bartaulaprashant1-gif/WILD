import { loadWorld } from "./worldLoader.js";
import { createInitialState } from "./state.js";
import { executeCommand } from "./actions.js";
import { evaluateConditions } from "./ruleEvaluator.js";

export async function createGameSession(worldId) {
  const world = await loadWorld(worldId);
  let state = createInitialState(world);

  function getCurrentRoom() {
    return world.rooms.find((room) => room.id === state.currentRoomId) ?? null;
  }

  function getVisibleEntities() {
    return world.entities.filter((entity) => {
      const location = state.entities[entity.id]?.location;

      return location === state.currentRoomId || location === "inventory";
    });
  }

  function getSuggestions() {
    const room = getCurrentRoom();

    if (!room) return [];

    const suggestions = ["look", "inventory"];

    for (const [direction] of Object.entries(room.exits)) {
      const requirements = room.exitRequirements?.[direction] ?? [];

      const check = evaluateConditions(world, state, requirements);

      if (check.ok && check.passed) {
        suggestions.push(`go ${direction}`);
      }
    }

    const visible = getVisibleEntities();

    for (const entity of visible) {
      suggestions.push(`examine ${entity.name}`);

      if (
        entity.portable &&
        state.entities[entity.id]?.location !== "inventory"
      ) {
        suggestions.push(`take ${entity.name}`);
      }
    }

    const carried = world.entities.filter(
      (entity) => state.entities[entity.id]?.location === "inventory",
    );

    for (const rule of world.rules) {
      if (rule.trigger?.type !== "use") continue;

      const item = carried.find((entity) => entity.id === rule.trigger.itemId);

      const target = visible.find(
        (entity) =>
          entity.id === rule.trigger.targetId &&
          state.entities[entity.id]?.location !== "inventory",
      );

      if (item && target) {
        suggestions.push(`use ${item.name} on ${target.name}`);
      }
    }

    return [...new Set(suggestions)];
  }

  function execute(input) {
    const result = executeCommand(world, state, input);

    if (result.ok) {
      state = result.state;
    }

    return result;
  }

  return {
    worldId: world.manifest.id,
    title: world.manifest.title,
    intro: world.text.intro ?? "",
    getState: () => state,
    getCurrentRoom,
    getSuggestions,
    getInventory: () =>
      world.entities.filter(
        (entity) => state.entities[entity.id]?.location === "inventory",
      ),
    execute,
  };
}
