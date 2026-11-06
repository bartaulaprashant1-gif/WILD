
const DIRECTIONS = ["north", "east", "south", "west", "up", "down"];

export function createWorldDraft() {
  return {
    manifest: {
      id: "my-adventure",
      title: "My Adventure",
      version: "1.0.0",
      startRoomId: "starting-room",
    },
    rooms: [
      {
        id: "starting-room",
        name: "Starting Room",
        description: "Describe what the player sees here.",
        exits: {},
        exitRequirements: {},
      },
    ],
    entities: [],
    rules: [],
    text: {
      intro: "Your adventure begins.",
      messages: {
        invalidDirection: "You cannot go that way.",
        unknownRoom: "The destination room does not exist.",
        worldLoadFailed: "The world could not be loaded.",
      },
    },
  };
}

export function slugify(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function createUniqueRoomId(name, rooms) {
  const base = slugify(name) || "new-room";
  const existingIds = new Set(rooms.map((room) => room.id));

  if (!existingIds.has(base)) return base;

  let suffix = 2;
  while (existingIds.has(`${base}-${suffix}`)) {
    suffix++;
  }

  return `${base}-${suffix}`;
}

export function validateDraft(draft) {
  const errors = [];
  const roomIds = new Set();
  const entityIds=new Set()

  if (!draft.manifest.id.trim()) {
    errors.push("World ID is required.");
  }

  if (!draft.manifest.title.trim()) {
    errors.push("World title is required.");
  }

  if (draft.rooms.length === 0) {
    errors.push("Add at least one room.");
  }

  for (const room of draft.rooms) {
    if (!room.id) {
      errors.push("Every room must have an ID.");
      continue;
    }

    if (roomIds.has(room.id)) {
      errors.push(`Duplicate room ID: "${room.id}".`);
    }

    roomIds.add(room.id);

    if (!room.name.trim()) {
      errors.push(`Room "${room.id}" needs a name.`);
    }

    if (!room.description.trim()) {
      errors.push(`Room "${room.id}" needs a description.`);
    }
  }

  if (!roomIds.has(draft.manifest.startRoomId)) {
    errors.push("Choose a valid starting room.");
  }

  for (const room of draft.rooms) {
    for (const [direction, destinationId] of Object.entries(room.exits)) {
      if (!DIRECTIONS.includes(direction)) {
        errors.push(`Room "${room.id}" has an invalid direction.`);
      }

      if (!roomIds.has(destinationId)) {
        errors.push(
          `Room "${room.id}" points ${direction} to missing room "${destinationId}".`
        );
      }
    }
  }

  for (const entity of draft.entities) {
    if (!entity.id) {
      errors.push("Every entity must have an ID.");
      continue;
    }

    if (entityIds.has(entity.id)) {
      errors.push(`Duplicate entity ID: "${entity.id}".`);
    }

    entityIds.add(entity.id);

    if (!entity.name.trim()) {
      errors.push(`Entity "${entity.id}" needs a name.`);
    }

    if (!entity.description.trim()) {
      errors.push(`Entity "${entity.id}" needs a description.`);
    }

    if (!roomIds.has(entity.initialLocation)) {
      errors.push(
        `Entity "${entity.id}" starts in a nonexistent room.`
      );
    }

    if (typeof entity.portable !== "boolean") {
      errors.push(`Entity "${entity.id}" needs a valid portable setting.`);
    }

    if (!Array.isArray(entity.aliases)) {
      errors.push(`Entity "${entity.id}" aliases must be an array.`);
    }

    if (
      !entity.initialProperties ||
      typeof entity.initialProperties !== "object" ||
      Array.isArray(entity.initialProperties)
    ) {
      errors.push(
        `Entity "${entity.id}" properties must be a JSON object.`
      );
    }
  }

  return {
    ok: errors.length === 0,
    errors,
  };
}

export function addRoom(draft, name = "New Room") {
  const room = {
    id: createUniqueRoomId(name, draft.rooms),
    name,
    description: "Describe this room.",
    exits: {},
    exitRequirements: {},
  };

  return {
    ...draft,
    rooms: [...draft.rooms, room],
  };
}

export function updateRoom(draft, roomId, updates) {
  return {
    ...draft,
    rooms: draft.rooms.map((room) =>
      room.id === roomId ? { ...room, ...updates } : room
    ),
  };
}

export function deleteRoom(draft, roomId) {
  const rooms = draft.rooms
    .filter((room) => room.id !== roomId)
    .map((room) => {
      const exits = { ...room.exits };
      const exitRequirements = { ...room.exitRequirements };

      for (const [direction, destinationId] of Object.entries(exits)) {
        if (destinationId === roomId) {
          delete exits[direction];
          delete exitRequirements[direction];
        }
      }

      return { ...room, exits, exitRequirements };
    });

  return {
    ...draft,
    rooms,
    manifest: {
      ...draft.manifest,
      startRoomId:
        draft.manifest.startRoomId === roomId
          ? rooms[0]?.id ?? ""
          : draft.manifest.startRoomId,
    },
  };
}

export function createUniqueEntityId(name, entities) {
  const base = slugify(name) || "new-entity";
  const existingIds = new Set(entities.map((entity) => entity.id));

  if (!existingIds.has(base)) return base;

  let suffix = 2;

  while (existingIds.has(`${base}-${suffix}`)) {
    suffix++;
  }

  return `${base}-${suffix}`;
}

export function addEntity(draft, name = "New Object") {
  const entity = {
    id: createUniqueEntityId(name, draft.entities),
    name,
    description: "Describe this object.",
    initialLocation: draft.manifest.startRoomId,
    portable: true,
    aliases: [],
    initialProperties: {},
  };

  return {
    ...draft,
    entities: [...draft.entities, entity],
  };
}

export function updateEntity(draft, entityId, updates) {
  return {
    ...draft,
    entities: draft.entities.map((entity) =>
      entity.id === entityId
        ? { ...entity, ...updates }
        : entity
    ),
  };
}

export function deleteEntity(draft, entityId) {
  return {
    ...draft,
    entities: draft.entities.filter(
      (entity) => entity.id !== entityId
    ),
    // Rules referencing this entity will be removed in the
    // rule-editor stage, where we can validate those references.
  };
}

export { DIRECTIONS };
