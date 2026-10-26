
import { evaluateConditions } from "./ruleEvaluator.js";

export function movePlayer(world, state, direction) {
  const currentRoom = world.rooms.find(
    (room) => room.id === state.currentRoomId
  );

  if (!currentRoom) {
    return {
      ok: false,
      code: "INVALID_STATE",
      message: "The current room does not exist.",
      state
    };
  }

  const normalizedDirection = direction.toLowerCase().trim();
  const destinationId = currentRoom.exits[normalizedDirection];

  if (!destinationId) {
    return {
      ok: false,
      code: "INVALID_DIRECTION",
      message: world.text.messages.invalidDirection,
      state
    };
  }

  const requirements =
    currentRoom.exitRequirements?.[normalizedDirection] ?? [];

  const check = evaluateConditions(world, state, requirements);

  if (!check.ok) {
    return {
      ok: false,
      code: "INVALID_EXIT_RULE",
      message: "This exit has an invalid rule.",
      state
    };
  }

  if (!check.passed) {
    return {
      ok: false,
      code: "EXIT_BLOCKED",
      message: "The way is blocked.",
      state
    };
  }

  const destination = world.rooms.find(
    (room) => room.id === destinationId
  );

  if (!destination) {
    return {
      ok: false,
      code: "INVALID_DESTINATION",
      message: world.text.messages.unknownRoom,
      state
    };
  }

  const visitedRoomIds = state.visitedRoomIds.includes(destinationId)
    ? state.visitedRoomIds
    : [...state.visitedRoomIds, destinationId];

  const nextState = {
    ...state,
    currentRoomId: destinationId,
    visitedRoomIds,
    turnCount: state.turnCount + 1
  };

  return {
    ok: true,
    code: "MOVED",
    message: destination.description,
    room: destination,
    state: nextState
  };
}
