const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Process payment and compute TrimRide owner commission (20%) + tip
router.post('/process', async (req, res) => {
  const { bookingId, amount, paymentMethod, tipAmount = 0 } = req.body;

  const normalizedBookingId = Number(bookingId);
  const normalizedAmount = Number(amount);
  const normalizedTip = Number(tipAmount) >= 0 ? Number(tipAmount) : 0;
  const normalizedPaymentMethod =
    typeof paymentMethod === 'string' ? paymentMethod.trim() : 'card';

  if (!Number.isFinite(normalizedBookingId) || normalizedBookingId <= 0) {
    return res.status(400).json({ error: 'bookingId must be a positive number' });
  }

  if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
    return res.status(400).json({ error: 'amount must be a positive number' });
  }
  
  try {
    // Safe automatic database migration for live systems without dropping tables
    await pool.query(`
      ALTER TABLE payments 
      ADD COLUMN IF NOT EXISTS tip_amount DECIMAL(10, 2) DEFAULT 0.00,
      ADD COLUMN IF NOT EXISTS platform_fee DECIMAL(10, 2) DEFAULT 0.00,
      ADD COLUMN IF NOT EXISTS barber_payout DECIMAL(10, 2) DEFAULT 0.00;
    `);

    // Calculate TrimRide Platform Owner Cut (20% of base fare)
    const platformFee = Math.round((normalizedAmount * 0.20) * 100) / 100;
    // Calculate Barber net payout (80% base + 100% of tip)
    const barberPayout = Math.round(((normalizedAmount - platformFee) + normalizedTip) * 100) / 100;

    const result = await pool.query(
      'INSERT INTO payments (booking_id, amount, tip_amount, platform_fee, barber_payout, payment_method, status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [normalizedBookingId, normalizedAmount, normalizedTip, platformFee, barberPayout, normalizedPaymentMethod, 'completed']
    );

    // Update booking payment status and store total charged amount
    await pool.query(
      'UPDATE bookings SET payment_status = $1, payment_method = $2, total_amount = $3 WHERE id = $4',
      ['paid', normalizedPaymentMethod, normalizedAmount + normalizedTip, normalizedBookingId]
    );

    res.json({
      success: true,
      payment: result.rows[0],
      breakdown: {
        grossFare: normalizedAmount,
        tipAmount: normalizedTip,
        platformCommission: platformFee,
        barberNetPayout: barberPayout,
        totalCharged: normalizedAmount + normalizedTip
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;