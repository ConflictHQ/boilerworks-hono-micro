export interface Env {
  DB: D1Database;
  ENVIRONMENT: string;
}

export interface ApiKeyRow {
  id: string;
  name: string;
  key_hash: string;
  scopes: string;
  is_active: number;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface EventRow {
  id: string;
  type: string;
  source: string;
  payload: string;
  status: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ApiResponse<T = unknown> {
  ok: boolean;
  message?: string;
  data?: T;
  errors?: { field: string; message: string }[];
}

export type Variables = {
  apiKey: ApiKeyRow;
};
