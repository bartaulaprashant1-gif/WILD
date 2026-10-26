
export function evaluateConditions(world, state, conditions = []) {
  for (const condition of conditions) {
    let passed = false;

    switch (condition.op) {
      case "flag-equals":
        passed =
          state.flags[condition.flag] === condition.value;
        break;

      case "entity-location-is":
        passed =
          state.entities[condition.entityId]?.location ===
          condition.location;
        break;

      case "entity-property-equals":
        passed =
          state.entities[condition.entityId]?.properties?.[
            condition.property
          ] === condition.value;
        break;

      case "room-is":
        passed = state.currentRoomId === condition.roomId;
        break;

      default:
        return {
          ok: false,
          code: "UNKNOWN_CONDITION",
          condition
        };
    }

    if (!passed) {
      return {
        ok: true,
        passed: false,
        failedCondition: condition
      };
    }
  }

  return { ok: true, passed: true };
}

export function applyEffects(state, effects = []) {
  let nextState = {
    ...state,
    entities: { ...state.entities },
    flags: { ...state.flags }
  };

  for (const effect of effects) {
    switch (effect.op) {
      case "set-flag":
        nextState.flags[effect.flag] = effect.value;
        break;

      case "set-entity-property": {
        const entityState = nextState.entities[effect.entityId];

        if (!entityState) {
          return {
            ok: false,
            code: "UNKNOWN_ENTITY",
            state
          };
        }

        nextState.entities[effect.entityId] = {
          ...entityState,
          properties: {
            ...entityState.properties,
            [effect.property]: effect.value
          }
        };
        break;
      }

      case "move-entity": {
        const entityState = nextState.entities[effect.entityId];

        if (!entityState) {
          return {
            ok: false,
            code: "UNKNOWN_ENTITY",
            state
          };
        }

        nextState.entities[effect.entityId] = {
          ...entityState,
          location: effect.location
        };
        break;
      }

      default:
        return {
          ok: false,
          code: "UNKNOWN_EFFECT",
          state
        };
    }
  }

  return { ok: true, state: nextState };
}
