export const TILE_SIZE = 1024;

export const LIMITS = {
  MAX_STROKE_POINTS: 4000,
  MAX_POINT_BATCH: 200,
  MAX_TEXT_LENGTH: 500,
  MAX_BRUSH_SIZE: 64,
  MIN_BRUSH_SIZE: 1,
  MAX_FONT_SIZE: 96,
  MIN_FONT_SIZE: 10,
  MAX_TILES_PER_SUBSCRIBE: 64,
  STROKE_RATE_PER_MINUTE: 120,
  TEXT_RATE_PER_MINUTE: 60,
  REPORT_RATE_PER_MINUTE: 20
} as const;

export const SOCKET_EVENTS = {
  // client -> server
  CANVAS_SUBSCRIBE: "canvas:subscribe",
  CANVAS_UNSUBSCRIBE: "canvas:unsubscribe",
  STROKE_START: "stroke:start",
  STROKE_POINTS: "stroke:points",
  STROKE_END: "stroke:end",
  STROKE_DELETE: "stroke:delete",
  TEXT_CREATE: "text:create",
  TEXT_DELETE: "text:delete",

  // server -> client
  STROKE_STARTED: "stroke:started",
  STROKE_POINTS_RELAYED: "stroke:points",
  STROKE_COMPLETED: "stroke:completed",
  STROKE_DELETED: "stroke:deleted",
  TEXT_CREATED: "text:created",
  TEXT_DELETED: "text:deleted",
  CANVAS_SYNC: "canvas:sync",
  PRESENCE_UPDATE: "presence:update",
  ERROR: "error"
} as const;

export const API_VERSION = "v1";
