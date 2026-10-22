const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const requireAuth = require('../middleware/auth');
const { sendPushToUser } = require('../services/pushService');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadsDir = path.join(__dirname, '..', 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname || '') || '.jpg';
    cb(null, 'style-' + uniqueSuffix + ext);
  },
});
const upload = multer({ storage });

function normalizedEnvEmail(key) {
  if (
    process.env.NODE_ENV === 'test' ||
    String(process.env.DEMO_MODE || '').toLowerCase() !== 'true'
  ) {
    return '';
  }
  return String(process.env[key] || '').trim().toLowerCase();
}

// Upload haircut style reference photo
router.post('/upload-style-photo', requireAuth, upload.single('photo'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image file provided' });
  }
  const photoUrl = '/uploads/' + req.file.filename;
  return res.json({ photoUrl });
});

// Book a service
router.post('/book', requireAuth, async (req, res) => {
  const {
    barberId, barber_id, id, serviceId, bookingType,
    referencePhoto, reference_photo, notes,
  } = req.body;
  const customerId = req.userId;
  const normalizedBarberId = Number(barberId || barber_id || id || 0);
  const demoLockedCustomerEmail = normalizedEnvEmail('DEMO_LOCK_CUSTOMER_EMAIL');
  const demoLockedBarberEmail = normalizedEnvEmail('DEMO_LOCK_BARBER_EMAIL');

  if (!Number.isFinite(normalizedBarberId) || normalizedBarberId <= 0) {
    return res.status(400).json({ error: 'barberId is required' });
  }

  const normalizedBookingType = bookingType || 'queue';
  const finalReferencePhoto = referencePhoto || reference_photo || null;
  const finalNotes = notes ? String(notes).trim() : null;
  const verificationPin = String(Math.floor(1000 + Math.random() * 9000));
  
  try {
    const io = req.app.get('io');

    const customerResult = await pool.query(
      'SELECT email FROM users WHERE id = $1 LIMIT 1',
      [customerId]
    );

    if (customerResult.rows.length === 0) {
      return res.status(401).json({ error: 'Customer account not found' });
    }

    const customerEmail = String(customerResult.rows[0].email || '').toLowerCase();
    if (demoLockedCustomerEmail && !demoLockedCustomerEmail.split(',').map(e => e.trim()).includes(customerEmail)) {
      return res.status(403).json({
        error: 'Demo mode: this customer account is not allowed to place bookings.',
      });
    }

    const barberProfileResult = await pool.query(
      `SELECT bp.id, bp.user_id, bp.is_active, u.email
       FROM barber_profiles bp
       JOIN users u ON u.id = bp.user_id
       WHERE bp.id = $1
       LIMIT 1`,
      [normalizedBarberId]
    );

    if (barberProfileResult.rows.length === 0) {
      return res.status(404).json({ error: 'Selected barber was not found' });
    }

    const selectedBarber = barberProfileResult.rows[0];

    if (!selectedBarber.is_active) {
      return res.status(409).json({ error: 'Selected barber is currently offline' });
    }

    const selectedBarberEmail = String(selectedBarber.email || '').toLowerCase();
    if (demoLockedBarberEmail && !demoLockedBarberEmail.split(',').map(e => e.trim()).includes(selectedBarberEmail)) {
      return res.status(403).json({
        error: 'Demo mode: only the demo barber account can receive requests.',
      });
    }

    // Get current queue position
    const queueResult = await pool.query(
      'SELECT COALESCE(MAX(queue_position), 0) + 1 as next_position FROM bookings WHERE barber_id = $1 AND status = $2',
      [normalizedBarberId, 'pending']
    );
    
    const queuePosition = queueResult.rows[0].next_position;
    
    // Create booking
    const result = await pool.query(
      `INSERT INTO bookings (
         customer_id, barber_id, service_id, booking_type, queue_position, status,
         reference_photo, notes, verification_pin
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
        customerId,
        normalizedBarberId,
        serviceId || null,
        normalizedBookingType,
        queuePosition,
        'pending',
        finalReferencePhoto,
        finalNotes,
        verificationPin,
      ]
    );

    // Update barber queue count
    await pool.query(
      'UPDATE barber_profiles SET queue_count = queue_count + 1 WHERE id = $1',
      [normalizedBarberId]
    );

    const barberUserId = selectedBarber.user_id;
    io.to(`user-${barberUserId}`).emit('booking-requested', {
      bookingId: result.rows[0].id,
      customerId,
      barberId: normalizedBarberId,
      queuePosition,
      referencePhoto: result.rows[0].reference_photo,
      notes: result.rows[0].notes,
      verificationPin: result.rows[0].verification_pin,
    });

    sendPushToUser(barberUserId, {
      title: 'New booking request',
      body: 'A customer just requested your service.',
      data: {
        type: 'booking_requested',
        bookingId: result.rows[0].id,
        barberId: normalizedBarberId,
        customerId,
      },
    }).catch(() => {});

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get customer's current active booking (pending, confirmed, or in_progress)
router.get('/my-booking', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT b.id, b.status, b.queue_position, b.barber_id,
              b.reference_photo, b.notes, b.verification_pin,
              bp.shop_name, bp.latitude, bp.longitude,
              s.name AS service_name
       FROM bookings b
       JOIN barber_profiles bp ON b.barber_id = bp.id
       LEFT JOIN services s ON b.service_id = s.id
       WHERE b.customer_id = $1 AND b.status IN ('pending', 'confirmed', 'in_progress')
       ORDER BY b.created_at DESC
       LIMIT 1`,
      [req.userId]
    );
    res.json(result.rows[0] || null);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get recent customer booking outcomes (pending/confirmed/cancelled/completed)
router.get('/my-bookings', requireAuth, async (req, res) => {
  const requestedLimit = Number(req.query.limit || 8);
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(Math.max(requestedLimit, 1), 20)
    : 8;

  try {
    const result = await pool.query(
      `SELECT b.id, b.status, b.queue_position, b.created_at,
              b.reference_photo, b.notes, b.verification_pin,
              b.barber_id, bp.shop_name,
              s.name AS service_name
       FROM bookings b
       JOIN barber_profiles bp ON b.barber_id = bp.id
       LEFT JOIN services s ON b.service_id = s.id
       WHERE b.customer_id = $1
       ORDER BY b.created_at DESC
       LIMIT $2`,
      [req.userId, limit]
    );

    return res.json(result.rows);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Get customer favorites
router.get('/favorites', requireAuth, async (req, res) => {
  const customerId = req.userId;
  try {
    const result = await pool.query(
      `SELECT bp.id, bp.user_id, bp.shop_name, bp.shop_address, bp.latitude, bp.longitude,
              bp.rating, bp.queue_count, bp.estimated_wait_time, bp.is_active, bp.shop_image,
              fb.created_at AS favorited_at
       FROM favorite_barbers fb
       JOIN barber_profiles bp ON bp.id = fb.barber_id
       WHERE fb.customer_id = $1
       ORDER BY fb.created_at DESC`,
      [customerId]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Toggle favorite barber
router.post('/favorites/toggle', requireAuth, async (req, res) => {
  const customerId = req.userId;
  const { barberId, barber_id } = req.body;
  const normalizedBarberId = Number(barberId || barber_id);

  if (!Number.isFinite(normalizedBarberId) || normalizedBarberId <= 0) {
    return res.status(400).json({ error: 'barberId is required' });
  }

  try {
    const check = await pool.query(
      'SELECT id FROM favorite_barbers WHERE customer_id = $1 AND barber_id = $2',
      [customerId, normalizedBarberId]
    );

    if (check.rows.length > 0) {
      await pool.query(
        'DELETE FROM favorite_barbers WHERE customer_id = $1 AND barber_id = $2',
        [customerId, normalizedBarberId]
      );
      return res.json({ isFavorite: false, barberId: normalizedBarberId });
    } else {
      await pool.query(
        'INSERT INTO favorite_barbers (customer_id, barber_id) VALUES ($1, $2)',
        [customerId, normalizedBarberId]
      );
      return res.json({ isFavorite: true, barberId: normalizedBarberId });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Get customer loyalty punch card status
router.get('/loyalty', requireAuth, async (req, res) => {
  const customerId = req.userId;
  try {
    const totalResult = await pool.query(
      `SELECT COUNT(*)::int AS total_completed_cuts
       FROM bookings
       WHERE customer_id = $1 AND status = 'completed'`,
      [customerId]
    );
    const totalCuts = totalResult.rows[0]?.total_completed_cuts || 0;
    const punchCycle = 5;
    const currentPunches = totalCuts % punchCycle;
    const isRewardUnlocked = currentPunches === 0 && totalCuts > 0;
    const nextRewardIn = isRewardUnlocked ? 0 : punchCycle - currentPunches;

    res.json({
      totalCompletedCuts: totalCuts,
      punchCycle,
      currentPunches,
      isRewardUnlocked,
      nextRewardIn,
      rewardText: isRewardUnlocked ? '🎉 20% OFF Reward Unlocked!' : `${nextRewardIn} more cut${nextRewardIn === 1 ? '' : 's'} until 20% off!`,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Cancel an existing booking by customer
router.post('/cancel-booking', requireAuth, async (req, res) => {
  const { bookingId, booking_id, id, reason } = req.body;
  const targetBookingId = bookingId || booking_id || id;

  if (!targetBookingId) {
    return res.status(400).json({ error: 'bookingId is required' });
  }

  try {
    const bookingResult = await pool.query(
      `SELECT b.id, b.customer_id, b.barber_id, b.status, b.queue_position, bp.user_id AS barber_user_id
       FROM bookings b
       JOIN barber_profiles bp ON b.barber_id = bp.id
       WHERE b.id = $1`,
      [targetBookingId]
    );

    if (bookingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const booking = bookingResult.rows[0];

    if (booking.customer_id !== req.userId) {
      return res.status(403).json({ error: 'Not authorized to cancel this booking' });
    }

    if (booking.status === 'completed') {
      return res.status(400).json({ error: 'Cannot cancel a completed booking' });
    }

    if (booking.status === 'cancelled') {
      return res.status(400).json({ error: 'Booking is already cancelled' });
    }

    await pool.query('UPDATE bookings SET status = $1 WHERE id = $2', ['cancelled', targetBookingId]);

    await pool.query(
      'UPDATE barber_profiles SET queue_count = GREATEST(queue_count - 1, 0) WHERE id = $1',
      [booking.barber_id]
    );

    if (booking.queue_position && booking.queue_position > 0) {
      await pool.query(
        'UPDATE bookings SET queue_position = queue_position - 1 WHERE barber_id = $1 AND status = $2 AND queue_position > $3',
        [booking.barber_id, 'pending', booking.queue_position]
      );
    }

    const io = req.app.get('io');
    if (io) {
      const payload = {
        bookingId: Number(targetBookingId),
        status: 'cancelled',
        byCustomer: true,
        reason: reason || 'Customer cancelled',
      };

      io.to(`booking-${targetBookingId}`).emit('booking-status-updated', payload);
      io.to(`user-${booking.customer_id}`).emit('booking-status-updated', payload);
      if (booking.barber_user_id) {
        io.to(`user-${booking.barber_user_id}`).emit('booking-status-updated', payload);
        io.to(`user-${booking.barber_user_id}`).emit('booking-cancelled', payload);
      }
    }

    if (booking.barber_user_id) {
      sendPushToUser(booking.barber_user_id, {
        title: 'Booking cancelled by customer',
        body: 'A customer has cancelled their booking request.',
        data: {
          type: 'booking_status_updated',
          bookingId: Number(targetBookingId),
          status: 'cancelled',
        },
      }).catch(() => {});
    }

    return res.json({ success: true, bookingId: Number(targetBookingId), status: 'cancelled' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;