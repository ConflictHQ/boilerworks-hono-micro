import { Hono } from 'hono';
import { z } from 'zod';
import type { Env, Variables, ApiResponse, EventRow } from '../types.js';
import { apiKeyAuth } from '../middleware/api-key-auth.js';
import { requireScope } from '../middleware/require-scope.js';

const events = new Hono<{ Bindings: Env; Variables: Variables }>();

// All event routes require API key auth
events.use('/*', apiKeyAuth);

const CreateEventSchema = z.object({
  type: z.string().min(1).max(255),
  source: z.string().min(1).max(255),
  payload: z.record(z.unknown()).optional().default({}),
});

const UpdateEventSchema = z.object({
  type: z.string().min(1).max(255).optional(),
  source: z.string().min(1).max(255).optional(),
  payload: z.record(z.unknown()).optional(),
  status: z.string().min(1).max(50).optional(),
});

// POST /events -- create a new event
events.post('/', requireScope('events.write'), async (c) => {
  const body = await c.req.json();
  const parsed = CreateEventSchema.safeParse(body);

  if (!parsed.success) {
    return c.json<ApiResponse>(
      {
        ok: false,
        message: 'Validation failed',
        errors: parsed.error.issues.map((i) => ({
          field: i.path.join('.'),
          message: i.message,
        })),
      },
      400,
    );
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const { type, source, payload } = parsed.data;

  await c.env.DB.prepare(
    `INSERT INTO events (id, type, source, payload, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'received', ?, ?)`,
  )
    .bind(id, type, source, JSON.stringify(payload), now, now)
    .run();

  const event = await c.env.DB.prepare('SELECT * FROM events WHERE id = ?')
    .bind(id)
    .first<EventRow>();

  return c.json<ApiResponse>(
    {
      ok: true,
      data: formatEvent(event!),
    },
    201,
  );
});

// GET /events -- list events (excludes soft-deleted)
events.get('/', requireScope('events.read'), async (c) => {
  const limit = Math.min(Number(c.req.query('limit') || 100), 100);
  const offset = Number(c.req.query('offset') || 0);

  const { results } = await c.env.DB.prepare(
    `SELECT * FROM events
     WHERE deleted_at IS NULL
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
  )
    .bind(limit, offset)
    .all<EventRow>();

  const countRow = await c.env.DB.prepare(
    'SELECT COUNT(*) as count FROM events WHERE deleted_at IS NULL',
  ).first<{ count: number }>();

  return c.json<ApiResponse>({
    ok: true,
    data: {
      items: (results ?? []).map(formatEvent),
      total: countRow?.count ?? 0,
      limit,
      offset,
    },
  });
});

// GET /events/:id -- get a single event
events.get('/:id', requireScope('events.read'), async (c) => {
  const id = c.req.param('id');
  const event = await c.env.DB.prepare('SELECT * FROM events WHERE id = ? AND deleted_at IS NULL')
    .bind(id)
    .first<EventRow>();

  if (!event) {
    return c.json<ApiResponse>({ ok: false, message: 'Event not found' }, 404);
  }

  return c.json<ApiResponse>({ ok: true, data: formatEvent(event) });
});

// PATCH /events/:id -- update an event
events.patch('/:id', requireScope('events.write'), async (c) => {
  const id = c.req.param('id');

  const existing = await c.env.DB.prepare(
    'SELECT * FROM events WHERE id = ? AND deleted_at IS NULL',
  )
    .bind(id)
    .first<EventRow>();

  if (!existing) {
    return c.json<ApiResponse>({ ok: false, message: 'Event not found' }, 404);
  }

  const body = await c.req.json();
  const parsed = UpdateEventSchema.safeParse(body);

  if (!parsed.success) {
    return c.json<ApiResponse>(
      {
        ok: false,
        message: 'Validation failed',
        errors: parsed.error.issues.map((i) => ({
          field: i.path.join('.'),
          message: i.message,
        })),
      },
      400,
    );
  }

  const updates = parsed.data;
  const now = new Date().toISOString();

  await c.env.DB.prepare(
    `UPDATE events
     SET type = ?, source = ?, payload = ?, status = ?, updated_at = ?
     WHERE id = ? AND deleted_at IS NULL`,
  )
    .bind(
      updates.type ?? existing.type,
      updates.source ?? existing.source,
      updates.payload ? JSON.stringify(updates.payload) : existing.payload,
      updates.status ?? existing.status,
      now,
      id,
    )
    .run();

  const event = await c.env.DB.prepare('SELECT * FROM events WHERE id = ?')
    .bind(id)
    .first<EventRow>();

  return c.json<ApiResponse>({ ok: true, data: formatEvent(event!) });
});

// DELETE /events/:id -- soft delete
events.delete('/:id', requireScope('events.delete'), async (c) => {
  const id = c.req.param('id');

  const existing = await c.env.DB.prepare(
    'SELECT * FROM events WHERE id = ? AND deleted_at IS NULL',
  )
    .bind(id)
    .first<EventRow>();

  if (!existing) {
    return c.json<ApiResponse>({ ok: false, message: 'Event not found' }, 404);
  }

  const now = new Date().toISOString();
  await c.env.DB.prepare('UPDATE events SET deleted_at = ?, updated_at = ? WHERE id = ?')
    .bind(now, now, id)
    .run();

  return c.json<ApiResponse>({ ok: true, data: { deleted: true } });
});

function formatEvent(row: EventRow) {
  return {
    id: row.id,
    type: row.type,
    source: row.source,
    payload: JSON.parse(row.payload),
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
    deleted_at: row.deleted_at,
  };
}

export { events };
