
import { describe, it, expect } from "vitest";
import { createInitialState } from "./state.js";
import { executeCommand } from "./actions.js";

const world = {
  manifest: {
    id: "cellar-test",
    startRoomId: "living-room"
  },
  rooms: [
    {
      id: "living-room",
      name: "Living Room",
      description: "A dusty room.",
      exits: { down: "cellar" },
      exitRequirements: {
        down: [
          {
            op: "entity-property-equals",
            entityId: "cellar-door",
            property: "unlocked",
            value: true
          }
        ]
      }
    },
    {
      id: "cellar",
      name: "Cellar",
      description: "A dark cellar.",
      exits: { up: "living-room" }
    }
  ],
  entities: [
    {
      id: "rusty-key",
      name: "rusty key",
      aliases: ["key"],
      description: "An old key.",
      initialLocation: "living-room",
      portable: true
    },
    {
      id: "cellar-door",
      name: "cellar door",
      aliases: ["door"],
      description: "A locked door.",
      initialLocation: "living-room",
      portable: false,
      initialProperties: { unlocked: false }
    }
  ],
  rules: [
    {
      id: "unlock-cellar-door",
      trigger: {
        type: "use",
        itemId: "rusty-key",
        targetId: "cellar-door"
      },
      conditions: [
        {
          op: "entity-location-is",
          entityId: "rusty-key",
          location: "inventory"
        },
        {
          op: "entity-property-equals",
          entityId: "cellar-door",
          property: "unlocked",
          value: false
        }
      ],
      effects: [
        {
          op: "set-entity-property",
          entityId: "cellar-door",
          property: "unlocked",
          value: true
        }
      ],
      successMessage: "The door unlocks."
    }
  ],
  text: {
    messages: {
      invalidDirection: "You cannot go that way.",
      unknownRoom: "That room does not exist."
    }
  }
};

describe("declarative puzzle rules", () => {
  it("blocks the cellar until the door is unlocked", () => {
    const state = createInitialState(world);

    const result = executeCommand(world, state, "down");

    expect(result.ok).toBe(false);
    expect(result.code).toBe("EXIT_BLOCKED");
    expect(result.state.currentRoomId).toBe("living-room");
  });

  it("unlocks the door and permits entry", () => {
    let state = createInitialState(world);

    state = executeCommand(world, state, "take key").state;

    const unlock = executeCommand(
      world,
      state,
      "use rusty key on cellar door"
    );

    expect(unlock.ok).toBe(true);
    expect(unlock.code).toBe("RULE_APPLIED");
    expect(
      unlock.state.entities["cellar-door"].properties.unlocked
    ).toBe(true);

    const enter = executeCommand(
      world,
      unlock.state,
      "down"
    );

    expect(enter.ok).toBe(true);
    expect(enter.state.currentRoomId).toBe("cellar");
  });

  it("does not unlock the door without the key", () => {
    const state = createInitialState(world);

    const result = executeCommand(
      world,
      state,
      "use key on door"
    );

    expect(result.ok).toBe(false);
    expect(result.state).toBe(state);
    expect(
      result.state.entities["cellar-door"].properties.unlocked
    ).toBe(false);
  });
});
