const DIRECTION_ALIASES = {
  n: "north",
  north: "north",
  s: "south",
  south: "south",
  e: "east",
  east: "east",
  w: "west",
  west: "west",
  u: "up",
  up: "up",
  d: "down",
  down: "down",
};

function normalizeText(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[.,!?]+$/g, "")
    .replace(/\s+/g, " ");
}

export function parseCommand(input) {
  if (typeof input !== "string" || !input.trim()) {
    return {
      ok: false,
      code: "EMPTY_COMMAND",
      message: "Enter a command.",
    };
  }

  const normalized = normalizeText(input);

  // Movement: "north", "go north", "move north"
  const movement = normalized.match(
    /^(?:(?:go|move|walk)\s+)?(north|south|east|west|up|down|n|s|e|w|u|d)$/,
  );

  if (movement) {
    return {
      ok: true,
      type: "move",
      direction: DIRECTION_ALIASES[movement[1]],
    };
  }

  if (/^(?:look|look around|l)$/.test(normalized)) {
    return { ok: true, type: "look" };
  }

  if (/^(?:inventory|inv|i)$/.test(normalized)) {
    return { ok: true, type: "inventory" };
  }

  const targetCommands = [
    {
      pattern: /^(?:examine|inspect|x|look at)\s+(.+)$/,
      type: "examine",
    },
    {
      pattern: /^(?:take|get|pick up)\s+(.+)$/,
      type: "take",
    },
    {
      pattern: /^use\s+(.+?)\s+on\s+(.+)$/,
      type: "use",
    },
  ];

  for (const { pattern, type } of targetCommands) {
  const match = normalized.match(pattern);

  if (match) {
    if (type === "use") {
      return {
        ok: true,
        type,
        item: match[1],
        target: match[2]
      };
    }

    return {
      ok: true,
      type,
      target: match[1]
    };
  }
}

  return {
    ok: false,
    code: "UNKNOWN_COMMAND",
    message: "I don't understand that command.",
  };
}
