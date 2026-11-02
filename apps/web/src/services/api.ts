import { z } from "zod";
import {
  apiErrorSchema,
  sessionDtoSchema,
  strokeDtoSchema,
  textDtoSchema,
  type SessionDto,
  type StrokeDto,
  type TextDto
} from "@everypaper/shared";
import { API_BASE } from "../lib/env";

const tilesResponseSchema = z.object({
  tiles: z.array(
    z.object({
      tileId: z.string(),
      strokes: z.array(strokeDtoSchema),
      texts: z.array(textDtoSchema)
    })
  )
});
export type TilesResponse = z.infer<typeof tilesResponseSchema>;

const tileResponseSchema = z.object({
  tileId: z.string(),
  strokes: z.array(strokeDtoSchema),
  texts: z.array(textDtoSchema)
});
export type TileResponse = z.infer<typeof tileResponseSchema>;

export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, schema: z.ZodType<T>, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      credentials: "include",
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
      ...init
    });
  } catch (err) {
    throw new ApiError(err instanceof Error ? err.message : "Network request failed");
  }

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    let code: string | undefined;
    try {
      const body: unknown = await res.json();
      const parsed = apiErrorSchema.safeParse(body);
      if (parsed.success) {
        message = parsed.data.error.message;
        code = parsed.data.error.code;
      }
    } catch {
      // response wasn't JSON / didn't match the error shape; keep the default message
    }
    throw new ApiError(message, res.status, code);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  const json: unknown = await res.json().catch(() => undefined);
  return schema.parse(json);
}

async function requestVoid(path: string, init?: RequestInit): Promise<void> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      credentials: "include",
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
      ...init
    });
  } catch (err) {
    throw new ApiError(err instanceof Error ? err.message : "Network request failed");
  }
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body: unknown = await res.json();
      const parsed = apiErrorSchema.safeParse(body);
      if (parsed.success) message = parsed.data.error.message;
    } catch {
      // ignore
    }
    throw new ApiError(message, res.status);
  }
}

export const api = {
  createSession(): Promise<SessionDto> {
    return request<SessionDto>("/sessions", sessionDtoSchema, { method: "POST" });
  },

  getMe(): Promise<SessionDto> {
    return request<SessionDto>("/sessions/me", sessionDtoSchema);
  },

  getTiles(ids: string[]): Promise<TilesResponse> {
    const query = encodeURIComponent(ids.join(","));
    return request<TilesResponse>(`/canvas/tiles?ids=${query}`, tilesResponseSchema);
  },

  getTile(tx: number, ty: number): Promise<TileResponse> {
    return request<TileResponse>(`/canvas/tiles/${tx}/${ty}`, tileResponseSchema);
  },

  createStroke(payload: unknown): Promise<StrokeDto> {
    return request<StrokeDto>("/strokes", strokeDtoSchema, {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },

  deleteStroke(id: string): Promise<void> {
    return requestVoid(`/strokes/${id}`, { method: "DELETE" });
  },

  createText(payload: unknown): Promise<TextDto> {
    return request<TextDto>("/texts", textDtoSchema, {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },

  deleteText(id: string): Promise<void> {
    return requestVoid(`/texts/${id}`, { method: "DELETE" });
  },

  createReport(payload: unknown): Promise<void> {
    return requestVoid("/reports", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  }
};
