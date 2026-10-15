const express = require('express');
const request = require('supertest');

jest.mock('../config/database', () => ({
  query: jest.fn(),
}));

jest.mock('../middleware/auth', () => (req, _res, next) => {
  const raw = req.headers['x-user-id'];
  req.userId = raw ? Number(raw) : 1;
  next();
});

const pool = require('../config/database');
const bookingsRouter = require('../routes/bookings');

function createTestApp(ioMock) {
  const app = express();
  app.use(express.json());
  app.set('io', ioMock);
  app.use('/api/bookings', bookingsRouter);
  return app;
}

describe('Bookings routes', () => {
  let ioMock;
  let emitMock;

  beforeEach(() => {
    emitMock = jest.fn();
    ioMock = {
      to: jest.fn(() => ({ emit: emitMock })),
    };
    pool.query.mockReset();
  });

  test('POST /api/bookings/:bookingId/respond validates action', async () => {
    const app = createTestApp(ioMock);

    const res = await request(app)
      .post('/api/bookings/55/respond')
      .set('x-user-id', '10')
      .send({ action: 'maybe' });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('action must be accept or decline');
  });

  test('POST /api/bookings/:bookingId/respond returns 404 when booking does not exist', async () => {
    const app = createTestApp(ioMock);

    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 7 }] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post('/api/bookings/77/respond')
      .set('x-user-id', '10')
      .send({ action: 'accept' });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Booking not found');
  });

  test('POST /api/bookings/:bookingId/respond returns 403 for barber mismatch', async () => {
    const app = createTestApp(ioMock);

    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 7 }] })
      .mockResolvedValueOnce({
        rows: [{ id: 9, customer_id: 22, barber_id: 99, status: 'pending' }],
      });

    const res = await request(app)
      .post('/api/bookings/9/respond')
      .set('x-user-id', '10')
      .send({ action: 'accept' });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Not authorized for this booking');
  });

  test('POST /api/bookings/:bookingId/respond accepts pending booking and emits status update', async () => {
    const app = createTestApp(ioMock);

    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 7 }] })
      .mockResolvedValueOnce({
        rows: [{ id: 9, customer_id: 22, barber_id: 7, status: 'pending' }],
      })
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post('/api/bookings/9/respond')
      .set('x-user-id', '10')
      .send({ action: 'accept' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ bookingId: 9, status: 'confirmed' });

    expect(ioMock.to).toHaveBeenCalledWith('user-22');
    expect(emitMock).toHaveBeenCalledWith(
      'booking-status-updated',
      expect.objectContaining({ bookingId: 9, status: 'confirmed', byBarber: true })
    );

    expect(pool.query).toHaveBeenCalledWith('UPDATE bookings SET status = $1 WHERE id = $2', ['confirmed', '9']);
  });

  test('POST /api/bookings/:bookingId/respond declines pending booking and decrements queue', async () => {
    const app = createTestApp(ioMock);

    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 7 }] })
      .mockResolvedValueOnce({
        rows: [{ id: 9, customer_id: 22, barber_id: 7, status: 'pending' }],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post('/api/bookings/9/respond')
      .set('x-user-id', '10')
      .send({ action: 'decline' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ bookingId: 9, status: 'cancelled' });

    expect(pool.query).toHaveBeenNthCalledWith(
      4,
      'UPDATE barber_profiles SET queue_count = GREATEST(queue_count - 1, 0) WHERE id = $1',
      [7]
    );
  });

  test('POST /api/bookings/:bookingId/location validates coordinate types', async () => {
    const app = createTestApp(ioMock);

    const res = await request(app)
      .post('/api/bookings/9/location')
      .set('x-user-id', '10')
      .send({ latitude: 'not-a-number', longitude: 28.0 });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/latitude/);
  });

  test('POST /api/bookings/:bookingId/location returns 404 if booking is missing', async () => {
    const app = createTestApp(ioMock);

    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post('/api/bookings/9/location')
      .set('x-user-id', '10')
      .send({ latitude: -26.2, longitude: 28.0 });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Booking not found');
  });

  test('POST /api/bookings/:bookingId/location emits updates to booking and customer rooms', async () => {
    const app = createTestApp(ioMock);

    pool.query.mockResolvedValueOnce({ rows: [{ customer_id: 22 }] });

    const res = await request(app)
      .post('/api/bookings/9/location')
      .set('x-user-id', '10')
      .send({ latitude: -26.2, longitude: 28.0 });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });

    expect(ioMock.to).toHaveBeenCalledWith('booking-9');
    expect(ioMock.to).toHaveBeenCalledWith('user-22');
    expect(emitMock).toHaveBeenCalledWith(
      'barber-location-updated',
      expect.objectContaining({ bookingId: 9, latitude: -26.2, longitude: 28.0 })
    );
  });

  test('POST /api/bookings/:bookingId/complete completes session and emits socket updates', async () => {
    const app = createTestApp(ioMock);

    // 1: resolveBarberProfileId
    // 2: bookingResult (customer_id: 33, barber_id: 7)
    // 3: update status to completed
    // 4: update queue_position
    // 5: update barber_profiles queue_count
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 7 }] })
      .mockResolvedValueOnce({
        rows: [{ id: 12, customer_id: 33, barber_id: 7, status: 'confirmed' }],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post('/api/bookings/12/complete')
      .set('x-user-id', '10');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, bookingId: 12, status: 'completed' });

    expect(ioMock.to).toHaveBeenCalledWith('booking-12');
    expect(ioMock.to).toHaveBeenCalledWith('user-33');
    expect(emitMock).toHaveBeenCalledWith(
      'booking-status-updated',
      expect.objectContaining({ bookingId: 12, status: 'completed', byBarber: true })
    );
  });

  test('GET /api/bookings/my-active returns active confirmed booking for barber', async () => {
    const app = createTestApp(ioMock);

    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 7 }] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 15,
            status: 'confirmed',
            first_name: 'John',
            last_name: 'Doe',
            service_name: 'Skin Fade',
          },
        ],
      });

    const res = await request(app)
      .get('/api/bookings/my-active')
      .set('x-user-id', '10');

    expect(res.status).toBe(200);
    expect(res.body).toEqual(
      expect.objectContaining({ id: 15, status: 'confirmed', first_name: 'John' })
    );
  });

  test('POST /api/bookings/:bookingId/cancel cancels booking when called by customer', async () => {
    const app = createTestApp(ioMock);

    // 1: booking lookup
    // 2: update status to cancelled
    // 3: update barber queue_count
    // 4: update remaining pending queue positions
    pool.query
      .mockResolvedValueOnce({
        rows: [{ id: 40, customer_id: 10, barber_id: 5, status: 'pending', queue_position: 1, barber_user_id: 99 }],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post('/api/bookings/40/cancel')
      .set('x-user-id', '10')
      .send({ reason: 'Need to reschedule' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, bookingId: 40, status: 'cancelled' });

    expect(ioMock.to).toHaveBeenCalledWith('booking-40');
    expect(ioMock.to).toHaveBeenCalledWith('user-10');
    expect(ioMock.to).toHaveBeenCalledWith('user-99');
    expect(emitMock).toHaveBeenCalledWith(
      'booking-status-updated',
      expect.objectContaining({ bookingId: 40, status: 'cancelled', byCustomer: true })
    );
  });
});
