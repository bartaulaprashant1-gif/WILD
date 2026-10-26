
function normalizeName(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, " ");
}

function getEntityLocation(state, entityId) {
  return state.entities[entityId]?.location;
}

export function resolveEntity(world, state, target) {
  const normalizedTarget = normalizeName(target);

  const candidates = world.entities.filter((entity) => {
    const location = getEntityLocation(state, entity.id);

    return (
      location === state.currentRoomId ||
      location === "inventory"
    );
  });

  const matches = candidates.filter((entity) => {
    const names = [
      entity.id,
      entity.name,
      ...(entity.aliases ?? [])
    ].map(normalizeName);

    return names.includes(normalizedTarget);
  });

  if (matches.length === 0) {
    return {
      ok: false,
      code: "ENTITY_NOT_FOUND"
    };
  }

  if (matches.length > 1) {
    return {
      ok: false,
      code: "AMBIGUOUS_ENTITY",
      entityIds: matches.map((entity) => entity.id)
    };
  }

  return {
    ok: true,
    entity: matches[0]
  };
}
