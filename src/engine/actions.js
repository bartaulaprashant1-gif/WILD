import { parseCommand } from "./commandParser.js";
import { resolveEntity } from "./entityResolver.js";
import { movePlayer } from "./navigation.js";
import { evaluateConditions, applyEffects } from "./ruleEvaluator.js";

function result(ok, code, message, state, extra = {}) {
  return { ok, code, message, state, ...extra };
}

function currentRoom(world, state) {
  return world.rooms.find((room) => room.id === state.currentRoomId);
}

function dispatch(world, state, command) {
  if (!command.ok) {
    return result(false, command.code, command.message, state);
  }

  switch (command.type) {
    case "move": {
      const movement = movePlayer(world, state, command.direction);

      return {
        ...movement,
        room: movement.ok ? movement.room : undefined,
      };
    }

    case "look": {
      const room = currentRoom(world, state);

      if (!room) {
        return result(
          false,
          "INVALID_STATE",
          "The current room does not exist.",
          state,
        );
      }

      return result(true, "LOOKED", room.description, state, { room });
    }

    case "inventory": {
      const items = world.entities.filter(
        (entity) => state.entities[entity.id]?.location === "inventory",
      );

      const message = items.length
        ? `You are carrying: ${items.map((item) => item.name).join(", ")}.`
        : "You are not carrying anything.";

      return result(true, "INVENTORY", message, state, {
        items,
      });
    }

    case "examine": {
      const resolved = resolveEntity(world, state, command.target);

      if (!resolved.ok) {
        return result(
          false,
          resolved.code,
          resolved.code === "AMBIGUOUS_ENTITY"
            ? "Which object do you mean?"
            : "You cannot see that here.",
          state,
          { entityIds: resolved.entityIds },
        );
      }

      return result(true, "EXAMINED", resolved.entity.description, state, {
        entity: resolved.entity,
      });
    }

    case "take": {
      const resolved = resolveEntity(world, state, command.target);

      if (!resolved.ok) {
        return result(
          false,
          resolved.code,
          resolved.code === "AMBIGUOUS_ENTITY"
            ? "Which object do you mean?"
            : "You cannot see that here.",
          state,
          { entityIds: resolved.entityIds },
        );
      }

      const entity = resolved.entity;

      if (state.entities[entity.id].location === "inventory") {
        return result(
          false,
          "ALREADY_CARRIED",
          "You already have that.",
          state,
        );
      }

      if (!entity.portable) {
        return result(false, "NOT_PORTABLE", "You cannot take that.", state);
      }

      const nextState = {
        ...state,
        entities: {
          ...state.entities,
          [entity.id]: {
            ...state.entities[entity.id],
            location: "inventory",
          },
        },
        turnCount: state.turnCount + 1,
      };

      return result(true, "TAKEN", `Taken: ${entity.name}.`, nextState, {
        entity,
      });
    }

    case "use": {
      const itemResult = resolveEntity(world, state, command.item);

      if (!itemResult.ok) {
        return result(
          false,
          itemResult.code,
          "You do not have that item available.",
          state,
        );
      }

      const item = itemResult.entity;

      if (state.entities[item.id].location !== "inventory") {
        return result(
          false,
          "ITEM_NOT_CARRIED",
          "You must be carrying that item first.",
          state,
        );
      }

      const targetResult = resolveEntity(world, state, command.target);

      if (!targetResult.ok) {
        return result(
          false,
          targetResult.code,
          "You cannot see that target here.",
          state,
        );
      }

      const target = targetResult.entity;

      const matchingRules = world.rules.filter(
        (rule) =>
          rule.trigger?.type === "use" &&
          rule.trigger.itemId === item.id &&
          rule.trigger.targetId === target.id,
      );

      if (matchingRules.length === 0) {
        return result(false, "NO_MATCHING_RULE", "Nothing happens.", state);
      }

      if (matchingRules.length > 1) {
        return result(
          false,
          "AMBIGUOUS_RULE",
          "This action matches multiple rules.",
          state,
        );
      }

      const rule = matchingRules[0];
      const check = evaluateConditions(world, state, rule.conditions);

      if (!check.ok) {
        return result(
          false,
          "INVALID_RULE",
          "This interaction has an invalid rule.",
          state,
        );
      }

      if (!check.passed) {
        return result(
          false,
          "CONDITIONS_NOT_MET",
          "That does not work right now.",
          state,
        );
      }

      const applied = applyEffects(state, rule.effects);

      if (!applied.ok) {
        return result(
          false,
          applied.code,
          "The interaction could not be completed.",
          state,
        );
      }

      const nextState = {
        ...applied.state,
        turnCount: state.turnCount + 1,
      };

      return result(
        true,
        "RULE_APPLIED",
        rule.successMessage ?? "Something changes.",
        nextState,
        { ruleId: rule.id },
      );
    }

    default:
      return result(
        false,
        "UNSUPPORTED_ACTION",
        "That action is not implemented yet.",
        state,
      );
  }
}

export function executeCommand(world, state, input) {
  const command = parseCommand(input);
  return dispatch(world, state, command);
}
