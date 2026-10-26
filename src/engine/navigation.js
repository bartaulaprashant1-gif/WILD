
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

  // Produce a new state rather than mutating the old one.
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
