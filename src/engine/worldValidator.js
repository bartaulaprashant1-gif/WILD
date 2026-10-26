
export function validateWorld(world) {
  const errors = [];

  if (!world || typeof world !== "object") {
    return { valid: false, errors: ["World must be an object."] };
  }

  const { manifest, rooms, entities, rules, text } = world;

  if (!manifest || typeof manifest !== "object") {
    errors.push("Manifest must be an object.");
  }

  if (!Array.isArray(rooms)) {
    errors.push("Rooms must be an array.");
  }

  if (!Array.isArray(entities)) {
    errors.push("Entities must be an array.");
  }

  if (!Array.isArray(rules)) {
    errors.push("Rules must be an array.");
  }

  if (!text || typeof text !== "object" || Array.isArray(text)) {
    errors.push("Text must be an object.");
  }

  // Do not inspect collections until their types are verified.
  if (
    errors.length > 0
  ) {
    return { valid: false, errors };
  }

  const roomIds = new Set();
  const entityIds = new Set();
  const ruleIds = new Set();

  for (const room of rooms) {
    if (!room?.id || typeof room.id !== "string") {
      errors.push("Every room must have a string ID.");
      continue;
    }

    if (roomIds.has(room.id)) {
      errors.push(`Duplicate room ID: ${room.id}`);
    }

    roomIds.add(room.id);

    if (typeof room.name !== "string") {
      errors.push(`Room "${room.id}" must have a name.`);
    }

    if (typeof room.description !== "string") {
      errors.push(`Room "${room.id}" must have a description.`);
    }

    if (
      !room.exits ||
      typeof room.exits !== "object" ||
      Array.isArray(room.exits)
    ) {
      errors.push(`Room "${room.id}" must define exits.`);
    }
  }

  for (const entity of entities) {
    if (!entity?.id || typeof entity.id !== "string") {
      errors.push("Every entity must have a string ID.");
      continue;
    }

    if (entityIds.has(entity.id)) {
      errors.push(`Duplicate entity ID: ${entity.id}`);
    }

    entityIds.add(entity.id);

    if (typeof entity.name !== "string") {
      errors.push(`Entity "${entity.id}" must have a name.`);
    }

    if (typeof entity.initialLocation !== "string") {
      errors.push(
        `Entity "${entity.id}" must define initialLocation.`
      );
    }

    if (typeof entity.portable !== "boolean") {
      errors.push(`Entity "${entity.id}" must define portable.`);
    }

    if (
      entity.aliases !== undefined &&
      !Array.isArray(entity.aliases)
    ) {
      errors.push(`Entity "${entity.id}" aliases must be an array.`);
    }
  }

  for (const rule of rules) {
    if (!rule?.id || typeof rule.id !== "string") {
      errors.push("Every rule must have a string ID.");
      continue;
    }

    if (ruleIds.has(rule.id)) {
      errors.push(`Duplicate rule ID: ${rule.id}`);
    }

    ruleIds.add(rule.id);
  }

  if (!roomIds.has(manifest.startRoomId)) {
    errors.push(
      `Starting room "${manifest.startRoomId}" does not exist.`
    );
  }

  for (const room of rooms) {
    if (!room?.exits || typeof room.exits !== "object") continue;

    for (const [direction, destinationId] of Object.entries(room.exits)) {
      if (!roomIds.has(destinationId)) {
        errors.push(
          `Room "${room.id}" exit "${direction}" references missing room "${destinationId}".`
        );
      }
    }
  }

  for (const entity of entities) {
    if (
      typeof entity?.initialLocation === "string" &&
      !roomIds.has(entity.initialLocation)
    ) {
      errors.push(
        `Entity "${entity.id}" references missing room "${entity.initialLocation}".`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
