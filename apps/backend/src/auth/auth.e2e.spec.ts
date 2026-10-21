import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { IP_RATE_LIMIT } from '../common/ip-rate-limit.guard';
import { createTestApp, type FakeClock, type FakeSms } from '../test/test-app';
import { REGISTRATION_TICKET_TTL_MS } from '../sessions/sessions.service';

const PHONE = '050-123-4567';
const PROFILE = { name: 'Dana Levi', email: 'Dana@Example.com' };

describe('Auth flow (HTTP)', () => {
  let app: INestApplication;
  let clock: FakeClock;
  let sms: FakeSms;

  beforeEach(async () => {
    ({ app, clock, sms } = await createTestApp());
  });

  afterEach(() => app.close());

  const agent = () => request.agent(app.getHttpServer());

  async function verify(client: ReturnType<typeof agent>, phone = PHONE) {
    await client.post('/api/auth/request-otp').send({ phone }).expect(202);
    return client.post('/api/auth/verify-otp').send({ phone, code: sms.lastCode() });
  }

  async function register(client: ReturnType<typeof agent>) {
    expect((await verify(client)).body).toEqual({ status: 'registration_required' });
    return client.post('/api/auth/complete-registration').send(PROFILE).expect(201);
  }

  it('registers a new user, then signs them in again', async () => {
    const client = agent();
    await client.get('/api/auth/me').expect(401);

    const registered = await register(client);
    expect(registered.body.user).toMatchObject({ phone: '+972501234567', name: 'Dana Levi', email: 'dana@example.com' });
    await client.get('/api/auth/me').expect(200, registered.body);

    await client.post('/api/auth/logout').send({}).expect(204);
    await client.get('/api/auth/me').expect(401);

    clock.advance(60_000);
    const again = await verify(agent(), '0501234567');
    expect(again.status).toBe(200);
    expect(again.body).toEqual({ status: 'authenticated', user: registered.body.user });
  });

  it('sets httpOnly, SameSite=Lax cookies and no session before registration', async () => {
    const client = agent();
    const verified = await verify(client);
    const ticketCookie = verified.headers['set-cookie']?.[0] ?? '';
    expect(ticketCookie).toMatch(/^reg_ticket=.+; Path=\/api\/auth; .*HttpOnly; SameSite=Lax/);
    await client.get('/api/auth/me').expect(401);

    const completed = await client.post('/api/auth/complete-registration').send(PROFILE).expect(201);
    expect(completed.headers['set-cookie']).toEqual(
      expect.arrayContaining([expect.stringMatching(/^sid=.+; Path=\/; Expires=.+; HttpOnly; SameSite=Lax/)]),
    );
  });

  it('accepts a registration ticket only once', async () => {
    const client = agent();
    const verified = await verify(client);
    const ticket = verified.headers['set-cookie']?.[0].split(';')[0] ?? '';

    await client.post('/api/auth/complete-registration').send(PROFILE).expect(201);
    await request(app.getHttpServer())
      .post('/api/auth/complete-registration')
      .set('Cookie', ticket)
      .send(PROFILE)
      .expect(401)
      .expect(({ body }) => expect(body.reason).toBe('registration_expired'));
  });

  it('rejects expired registration tickets', async () => {
    const client = agent();
    await verify(client);
    clock.advance(REGISTRATION_TICKET_TTL_MS);

    await client.post('/api/auth/complete-registration').send(PROFILE).expect(401);
  });

  it('answers request-otp identically for registered and unknown phones', async () => {
    await register(agent());
    clock.advance(60_000);

    const known = await agent().post('/api/auth/request-otp').send({ phone: PHONE }).expect(202);
    const unknown = await agent().post('/api/auth/request-otp').send({ phone: '0529999999' }).expect(202);
    expect(Object.keys(known.body)).toEqual(Object.keys(unknown.body));
    expect(known.headers['set-cookie']).toBeUndefined();
    expect(unknown.headers['set-cookie']).toBeUndefined();
  });

  it('reports wrong codes with the remaining attempts', async () => {
    const client = agent();
    await client.post('/api/auth/request-otp').send({ phone: PHONE }).expect(202);
    const wrong = sms.lastCode() === '000000' ? '111111' : '000000';

    await client
      .post('/api/auth/verify-otp')
      .send({ phone: PHONE, code: wrong })
      .expect(401)
      .expect(({ body }) => expect(body).toMatchObject({ reason: 'invalid_code', attemptsRemaining: 2 }));
  });

  it('validates input', async () => {
    await agent()
      .post('/api/auth/request-otp')
      .send({ phone: '+1 555 123 4567' })
      .expect(400)
      .expect(({ body }) => expect(body.reason).toBe('validation_failed'));
    await agent().post('/api/auth/verify-otp').send({ phone: PHONE, code: '12' }).expect(400);
  });

  it('returns Retry-After during the resend cooldown', async () => {
    const client = agent();
    await client.post('/api/auth/request-otp').send({ phone: PHONE }).expect(202);

    const limited = await client.post('/api/auth/request-otp').send({ phone: PHONE }).expect(429);
    expect(limited.headers['retry-after']).toBe('30');
    expect(limited.body).toMatchObject({ reason: 'rate_limited', retryAfterSeconds: 30 });
  });

  it('rejects requests that are not JSON', async () => {
    await agent().post('/api/auth/request-otp').type('form').send(`phone=${PHONE}`).expect(415);
  });

  it('rate limits the auth mutations per IP', async () => {
    const client = agent();
    for (let i = 0; i < IP_RATE_LIMIT.limit; i++) {
      await client.post('/api/auth/verify-otp').send({ phone: PHONE, code: '123456' });
    }
    await client.post('/api/auth/verify-otp').send({ phone: PHONE, code: '123456' }).expect(429);
  });
});
