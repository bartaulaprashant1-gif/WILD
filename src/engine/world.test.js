
import { describe, it, expect } from "vitest";
import { validateWorld } from "./worldValidator.js";
import { createInitialState } from "./state.js";
import { movePlayer } from "./navigation.js";

const world = {
  manifest: {
    id: "test-world",
    startRoomId: "outside"
  },
  rooms: [
    {
      id: "outside",
      name: "Outside",
      description: "You are outside.",
      exits: { north: "hall" }
    },
    {
      id: "hall",
      name: "Hall",
      description: "You are in a hall.",
      exits: { south: "outside" }
    }
  ],
  entities: [
    {
      id: "key",
      name: "key",
      description: "A small key.",
      initialLocation: "hall",
      portable: true
    }
  ],
  rules: [],
  text: {
    messages: {
      invalidDirection: "You cannot go that way.",
      unknownRoom: "That room does not exist."
    }
  }
};

describe("world validation", () => {
  it("accepts a valid world", () => {
    expect(validateWorld(world).valid).toBe(true);
  });

  it("rejects an exit to a missing room", () => {
    const brokenWorld = {
      ...world,
      rooms: world.rooms.map((room) =>
        room.id === "outside"
          ? { ...room, exits: { north: "missing-room" } }
          : room
      )
    };

    const result = validateWorld(brokenWorld);

    expect(result.valid).toBe(false);
    expect(result.errors.join(" ")).toContain("missing-room");
  });

  it("rejects a missing starting room", () => {
    const brokenWorld = {
      ...world,
      manifest: {
        ...world.manifest,
        startRoomId: "missing-room"
      }
    };

    expect(validateWorld(brokenWorld).valid).toBe(false);
  });
});

describe("runtime state and navigation", () => {
  it("initializes the player in the starting room", () => {
    const state = createInitialState(world);

    expect(state.currentRoomId).toBe("outside");
    expect(state.visitedRoomIds).toEqual(["outside"]);
    expect(state.entities.key.location).toBe("hall");
  });

  it("moves the player and records the visited room", () => {
    const initialState = createInitialState(world);
    const result = movePlayer(world, initialState, "north");

    expect(result.ok).toBe(true);
    expect(result.state.currentRoomId).toBe("hall");
    expect(result.state.visitedRoomIds).toEqual([
      "outside",
      "hall"
    ]);
    expect(result.state.turnCount).toBe(1);
  });

  it("leaves state unchanged for an invalid direction", () => {
    const initialState = createInitialState(world);
    const result = movePlayer(world, initialState, "west");

    expect(result.ok).toBe(false);
    expect(result.code).toBe("INVALID_DIRECTION");
    expect(result.state).toBe(initialState);
    expect(initialState.turnCount).toBe(0);
  });

  it("does not mutate the previous state after moving", () => {
    const initialState = createInitialState(world);
    const result = movePlayer(world, initialState, "north");

    expect(initialState.currentRoomId).toBe("outside");
    expect(result.state.currentRoomId).toBe("hall");
  });
});
