
const CONDITION_OPS = new Set([
  "flag-equals",
  "entity-location-is",
  "entity-property-equals",
  "room-is"
]);

const EFFECT_OPS = new Set([
  "set-flag",
  "set-entity-property",
  "move-entity"
]);

const isObject = (value) =>
  value !== null &&
  typeof value === "object" &&
  !Array.isArray(value);

const isPrimitive = (value) =>
  value === null ||
  ["string", "number", "boolean"].includes(typeof value);

export function validateWorld(world) {
  const errors = [];

  if (!isObject(world)) {
    return { valid: false, errors: ["World must be an object."] };
  }

  const { manifest, rooms, entities, rules, text } = world;

  if (!isObject(manifest)) errors.push("Manifest must be an object.");
  if (!Array.isArray(rooms)) errors.push("Rooms must be an array.");
  if (!Array.isArray(entities)) errors.push("Entities must be an array.");
  if (!Array.isArray(rules)) errors.push("Rules must be an array.");
  if (!isObject(text)) errors.push("Text must be an object.");

  if (
    !isObject(manifest) ||
    !Array.isArray(rooms) ||
    !Array.isArray(entities) ||
    !Array.isArray(rules) ||
    !isObject(text)
  ) {
    return { valid: false, errors };
  }

  if (typeof manifest.id !== "string" || !manifest.id) {
    errors.push("Manifest must have an ID.");
  }

  if (
    typeof manifest.startRoomId !== "string" ||
    !manifest.startRoomId
  ) {
    errors.push("Manifest must define startRoomId.");
  }

  if (!isObject(text.messages)) {
    errors.push("Text must define a messages object.");
  }

  const roomIds = new Set();
  const entityIds = new Set();
  const ruleIds = new Set();

  for (const room of rooms) {
    if (!isObject(room) || typeof room.id !== "string" || !room.id) {
      errors.push("Every room must have a string ID.");
      continue;
    }

    if (roomIds.has(room.id)) errors.push(`Duplicate room ID: ${room.id}`);
    roomIds.add(room.id);

    if (typeof room.name !== "string") {
      errors.push(`Room "${room.id}" must have a name.`);
    }

    if (typeof room.description !== "string") {
      errors.push(`Room "${room.id}" must have a description.`);
    }

    if (!isObject(room.exits)) {
      errors.push(`Room "${room.id}" must define exits as an object.`);
    }

    if (
      room.exitRequirements !== undefined &&
      !isObject(room.exitRequirements)
    ) {
      errors.push(`Room "${room.id}" exitRequirements must be an object.`);
    }
  }

  for (const entity of entities) {
    if (!isObject(entity) || typeof entity.id !== "string" || !entity.id) {
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

    if (typeof entity.description !== "string") {
      errors.push(`Entity "${entity.id}" must have a description.`);
    }

    if (typeof entity.initialLocation !== "string") {
      errors.push(`Entity "${entity.id}" must define initialLocation.`);
    }

    if (typeof entity.portable !== "boolean") {
      errors.push(`Entity "${entity.id}" must define portable.`);
    }

    if (
      entity.aliases !== undefined &&
      (!Array.isArray(entity.aliases) ||
        !entity.aliases.every((alias) => typeof alias === "string"))
    ) {
      errors.push(`Entity "${entity.id}" aliases must be strings.`);
    }

    if (
      entity.initialProperties !== undefined &&
      (!isObject(entity.initialProperties) ||
        !Object.values(entity.initialProperties).every(isPrimitive))
    ) {
      errors.push(`Entity "${entity.id}" has invalid initialProperties.`);
    }
  }

  for (const rule of rules) {
    if (!isObject(rule) || typeof rule.id !== "string" || !rule.id) {
      errors.push("Every rule must have a string ID.");
      continue;
    }

    if (ruleIds.has(rule.id)) errors.push(`Duplicate rule ID: ${rule.id}`);
    ruleIds.add(rule.id);

    if (
      !isObject(rule.trigger) ||
      rule.trigger.type !== "use" ||
      typeof rule.trigger.itemId !== "string" ||
      typeof rule.trigger.targetId !== "string"
    ) {
      errors.push(`Rule "${rule.id}" has an invalid trigger.`);
    }

    if (!Array.isArray(rule.conditions) || !Array.isArray(rule.effects)) {
      errors.push(`Rule "${rule.id}" must define conditions and effects arrays.`);
    }

    if (
      rule.successMessage !== undefined &&
      typeof rule.successMessage !== "string"
    ) {
      errors.push(`Rule "${rule.id}" successMessage must be a string.`);
    }
  }

  if (!roomIds.has(manifest.startRoomId)) {
    errors.push(`Starting room "${manifest.startRoomId}" does not exist.`);
  }

  for (const room of rooms) {
    if (!isObject(room) || !isObject(room.exits)) continue;

    for (const [direction, destinationId] of Object.entries(room.exits)) {
      if (!roomIds.has(destinationId)) {
        errors.push(
          `Room "${room.id}" exit "${direction}" references missing room "${destinationId}".`
        );
      }
    }

    if (!isObject(room.exitRequirements)) continue;

    for (const [direction, conditions] of Object.entries(room.exitRequirements)) {
      if (!Object.hasOwn(room.exits, direction)) {
        errors.push(
          `Room "${room.id}" has requirements for nonexistent exit "${direction}".`
        );
      }

      validateConditions(
        conditions,
        `Room "${room.id}" exit "${direction}"`,
        errors,
        roomIds,
        entityIds
      );
    }
  }

  for (const entity of entities) {
    if (!isObject(entity)) continue;

    if (
      typeof entity.initialLocation === "string" &&
      entity.initialLocation !== "inventory" &&
      !roomIds.has(entity.initialLocation)
    ) {
      errors.push(
        `Entity "${entity.id}" references missing room "${entity.initialLocation}".`
      );
    }
  }

  for (const rule of rules) {
    if (!isObject(rule)) continue;

    if (isObject(rule.trigger)) {
      if (!entityIds.has(rule.trigger.itemId)) {
        errors.push(`Rule "${rule.id}" references missing trigger item.`);
      }

      if (!entityIds.has(rule.trigger.targetId)) {
        errors.push(`Rule "${rule.id}" references missing trigger target.`);
      }
    }

    if (Array.isArray(rule.conditions)) {
      validateConditions(
        rule.conditions,
        `Rule "${rule.id}"`,
        errors,
        roomIds,
        entityIds
      );
    }

    if (Array.isArray(rule.effects)) {
      for (const effect of rule.effects) {
        if (!isObject(effect) || !EFFECT_OPS.has(effect.op)) {
          errors.push(`Rule "${rule.id}" has an unknown effect operation.`);
          continue;
        }

        if (
          effect.op === "set-entity-property" ||
          effect.op === "move-entity"
        ) {
          if (!entityIds.has(effect.entityId)) {
            errors.push(
              `Rule "${rule.id}" effect references missing entity "${effect.entityId}".`
            );
          }
        }

        if (
          effect.op === "move-entity" &&
          effect.location !== "inventory" &&
          !roomIds.has(effect.location)
        ) {
          errors.push(
            `Rule "${rule.id}" moves an entity to a missing room.`
          );
        }

        if (
          effect.op === "set-flag" &&
          (typeof effect.flag !== "string" || !isPrimitive(effect.value))
        ) {
          errors.push(`Rule "${rule.id}" has an invalid set-flag effect.`);
        }

        if (
          effect.op === "set-entity-property" &&
          (typeof effect.property !== "string" || !isPrimitive(effect.value))
        ) {
          errors.push(`Rule "${rule.id}" has an invalid property effect.`);
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

function validateConditions(conditions, owner, errors, roomIds, entityIds) {
  if (!Array.isArray(conditions)) {
    errors.push(`${owner} conditions must be an array.`);
    return;
  }

  for (const condition of conditions) {
    if (!isObject(condition) || !CONDITION_OPS.has(condition.op)) {
      errors.push(`${owner} has an unknown condition operation.`);
      continue;
    }

    if (
      condition.op === "flag-equals" &&
      (typeof condition.flag !== "string" || !isPrimitive(condition.value))
    ) {
      errors.push(`${owner} has an invalid flag condition.`);
    }

    if (
      condition.op === "room-is" &&
      !roomIds.has(condition.roomId)
    ) {
      errors.push(`${owner} references missing room "${condition.roomId}".`);
    }

    if (
      ["entity-location-is", "entity-property-equals"].includes(condition.op) &&
      !entityIds.has(condition.entityId)
    ) {
      errors.push(`${owner} references missing entity "${condition.entityId}".`);
    }

    if (
      condition.op === "entity-location-is" &&
      condition.location !== "inventory" &&
      !roomIds.has(condition.location)
    ) {
      errors.push(`${owner} references missing location "${condition.location}".`);
    }

    if (
      condition.op === "entity-property-equals" &&
      (typeof condition.property !== "string" ||
        !isPrimitive(condition.value))
    ) {
      errors.push(`${owner} has an invalid entity-property condition.`);
    }
  }
}
