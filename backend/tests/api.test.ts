import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../src/app';

let app: Express;

beforeAll(() => {
  const built = createApp({ databasePath: ':memory:' });
  app = built.app;
});

afterAll(() => {
  // noop; in-memory stores have nothing to close
});

describe('GET /api/health', () => {
  it('reports ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.dictionarySize).toBeGreaterThan(20000);
  });
});

describe('POST /api/generate', () => {
  it('generates subdomains and records history', async () => {
    const res = await request(app).post('/api/generate').send({
      domains: ['example.com'],
      count: 250,
      categories: ['email', 'security'],
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.results.length).toBe(250);
    expect(res.body.results[0]).toContain('.example.com');
    expect(res.body.historyId).toBeGreaterThan(0);
  });

  it('returns exactly the documented response shape', async () => {
    const res = await request(app).post('/api/generate').send({
      domains: ['example.com'],
      count: 1000,
    });
    expect(Object.keys(res.body).sort()).toEqual([
      'duplicatesRemoved',
      'generationTimeMs',
      'historyId',
      'results',
      'success',
      'total',
      'unique',
    ]);
    expect(res.body.total).toBe(1000);
    expect(res.body.unique).toBe(1000);
    expect(res.body.results).toHaveLength(1000);
  });

  it('rejects invalid domains', async () => {
    const res = await request(app).post('/api/generate').send({
      domains: ['not_a_valid_domain'],
      count: 100,
    });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('rejects malformed bodies', async () => {
    const res = await request(app).post('/api/generate').send({ count: 'lots' });
    expect(res.status).toBe(400);
  });

  it('rejects oversized counts', async () => {
    const res = await request(app)
      .post('/api/generate')
      .send({ domains: ['example.com'], count: 2_000_000 });
    expect(res.status).toBe(400);
  });

  it('sanitizes XSS payloads in custom prefixes', async () => {
    const res = await request(app)
      .post('/api/generate')
      .send({
        domains: ['example.com'],
        count: 5,
        categories: [],
        customPrefixes: ['<img src=x onerror=alert(1)>'],
      });
    expect(res.status).toBe(200);
    const first = res.body.results[0];
    expect(first).not.toContain('<');
    expect(first).not.toContain('>');
  });

  it('generates https-formatted output', async () => {
    const res = await request(app)
      .post('/api/generate')
      .send({ domains: ['example.com'], count: 3, format: 'https' });
    expect(res.status).toBe(200);
    expect(res.body.results[0]).toMatch(/^https:\/\//);
  });
});

describe('GET /api/history', () => {
  it('lists saved runs', async () => {
    const res = await request(app).get('/api/history');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.total).toBeGreaterThan(0);
  });

  it('fetches a single record and exports it', async () => {
    const gen = await request(app).post('/api/generate').send({
      domains: ['example.com'],
      count: 10,
    });
    const id = gen.body.historyId;

    const single = await request(app).get(`/api/history/${id}`);
    expect(single.status).toBe(200);
    expect(single.body.record.results).toHaveLength(10);

    const txt = await request(app).get(`/api/history/${id}/export?format=txt`);
    expect(txt.status).toBe(200);
    expect(txt.text.split('\n').filter(Boolean)).toHaveLength(10);

    const csv = await request(app).get(`/api/history/${id}/export?format=csv`);
    expect(csv.headers['content-type']).toContain('text/csv');

    const json = await request(app).get(`/api/history/${id}/export?format=json`);
    expect(json.status).toBe(200);

    const xlsx = await request(app).get(`/api/history/${id}/export?format=xlsx`);
    expect(xlsx.status).toBe(200);
    expect(xlsx.headers['content-type']).toContain('spreadsheetml');
  });

  it('returns 404 for unknown records', async () => {
    const res = await request(app).get('/api/history/999999');
    expect(res.status).toBe(404);
  });

  it('deletes a record', async () => {
    const gen = await request(app).post('/api/generate').send({
      domains: ['example.com'],
      count: 5,
    });
    const id = gen.body.historyId;
    const del = await request(app).delete(`/api/history/${id}`);
    expect(del.status).toBe(200);
    const gone = await request(app).get(`/api/history/${id}`);
    expect(gone.status).toBe(404);
  });
});

describe('unknown routes', () => {
  it('returns 404', async () => {
    const res = await request(app).get('/api/does-not-exist');
    expect(res.status).toBe(404);
  });
});
