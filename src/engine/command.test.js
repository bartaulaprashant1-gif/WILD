
import { describe, it, expect } from "vitest";
import { parseCommand } from "./commandParser.js";
import { createInitialState } from "./state.js";
import { executeCommand } from "./actions.js";

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
      name: "rusty key",
      aliases: ["key"],
      description: "An old rusty key.",
      initialLocation: "hall",
      portable: true
    },
    {
      id: "statue",
      name: "statue",
      aliases: [],
      description: "A stone statue.",
      initialLocation: "hall",
      portable: false
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

describe("command parser", () => {
  it("normalizes movement aliases", () => {
    expect(parseCommand(" GO   N ")).toEqual({
      ok: true,
      type: "move",
      direction: "north"
    });
  });

  it("parses item commands", () => {
    expect(parseCommand("take rusty key")).toEqual({
      ok: true,
      type: "take",
      target: "rusty key"
    });
  });

  it("rejects empty and unknown commands", () => {
    expect(parseCommand(" ").code).toBe("EMPTY_COMMAND");
    expect(parseCommand("dance")).toMatchObject({
      ok: false,
      code: "UNKNOWN_COMMAND"
    });
  });
});

describe("command execution", () => {
  it("moves using a parsed command", () => {
    const state = createInitialState(world);
    const result = executeCommand(world, state, "go north");

    expect(result.ok).toBe(true);
    expect(result.state.currentRoomId).toBe("hall");
  });

  it("takes a visible portable item", () => {
    const initialState = createInitialState(world);
    const hallState = executeCommand(
      world,
      initialState,
      "north"
    ).state;

    const result = executeCommand(
      world,
      hallState,
      "take key"
    );

    expect(result.ok).toBe(true);
    expect(result.state.entities.key.location).toBe("inventory");
    expect(hallState.entities.key.location).toBe("hall");
  });

  it("does not take a non-portable object", () => {
    const initialState = createInitialState(world);
    const hallState = executeCommand(
      world,
      initialState,
      "north"
    ).state;

    const result = executeCommand(
      world,
      hallState,
      "take statue"
    );

    expect(result.ok).toBe(false);
    expect(result.code).toBe("NOT_PORTABLE");
    expect(result.state).toBe(hallState);
  });

  it("cannot take an object in another room", () => {
    const state = createInitialState(world);
    const result = executeCommand(world, state, "take key");

    expect(result.ok).toBe(false);
    expect(result.code).toBe("ENTITY_NOT_FOUND");
    expect(result.state).toBe(state);
  });

  it("supports examining and inventory", () => {
    const state = createInitialState(world);
    const hallState = executeCommand(
      world,
      state,
      "north"
    ).state;

    expect(
      executeCommand(world, hallState, "examine key").message
    ).toBe("An old rusty key.");

    const afterTake = executeCommand(
      world,
      hallState,
      "take key"
    ).state;

    expect(
      executeCommand(world, afterTake, "inventory").items
        .map((item) => item.id)
    ).toEqual(["key"]);
  });
});
