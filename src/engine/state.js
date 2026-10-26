
export function createInitialState(world) {
  const entities = Object.fromEntries(
    world.entities.map((entity) => [
      entity.id,
      {
        location: entity.initialLocation,
        properties: {}
      }
    ])
  );

  return {
    worldId: world.manifest.id,
    currentRoomId: world.manifest.startRoomId,
    visitedRoomIds: [world.manifest.startRoomId],
    entities,
    flags: {},
    turnCount: 0
  };
}
