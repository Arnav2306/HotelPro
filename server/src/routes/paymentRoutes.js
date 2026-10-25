import express from 'express';
import mongoose from 'mongoose';
import Booking from '../models/Booking.js';
import Payment from '../models/Payment.js';
import { authenticateUser } from '../middleware/auth.js';

const router = express.Router();
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// POST /api/payments/demo/:bookingId
// Demo payment — explicitly labeled, no real payment processing.
router.post('/demo/:bookingId', authenticateUser, async (req, res) => {
  try {
    const { bookingId } = req.params;

    if (!isValidObjectId(bookingId)) {
      return res.status(400).json({ error: 'Invalid booking identifier format.' });
    }

    const booking = await Booking.findById(bookingId).populate('room', 'title roomNumber');
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found.' });
    }

    // Ownership check
    if (booking.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'You can only pay for your own bookings.' });
    }

    // Allow payment only for confirmed or checked-in bookings
    if (!['confirmed', 'checked-in'].includes(booking.bookingStatus)) {
      return res.status(400).json({
        error: `Payment is not applicable for a booking with status '${booking.bookingStatus}'.`
      });
    }

    // Prevent duplicate successful payments
    const existingPayment = await Payment.findOne({
      booking: bookingId,
      status: 'paid'
    });
    if (existingPayment) {
      return res.status(409).json({
        error: 'This booking has already been paid.',
        transactionId: existingPayment.transactionId
      });
    }

    // Create demo payment record — no real transaction occurs
    const transactionId = Payment.generateTransactionId();
    const payment = new Payment({
      booking: booking._id,
      user: req.user._id,
      amount: booking.totalAmount,
      currency: 'INR',
      provider: 'demo',
      transactionId,
      status: 'paid',
      paidAt: new Date()
    });
    await payment.save();

    // Update booking payment status
    booking.paymentStatus = 'paid';
    await booking.save();

    return res.status(200).json({
      message: '[DEMO] Payment processed successfully. No real transaction occurred.',
      payment: {
        transactionId: payment.transactionId,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        paidAt: payment.paidAt,
        provider: payment.provider
      }
    });
  } catch (err) {
    console.error('[Demo Payment Error]:', err);
    return res.status(500).json({ error: 'Failed to process demo payment.' });
  }
});

// GET /api/payments/booking/:bookingId
// Get payment info for a specific booking (owner or staff/admin)
router.get('/booking/:bookingId', authenticateUser, async (req, res) => {
  try {
    const { bookingId } = req.params;

    if (!isValidObjectId(bookingId)) {
      return res.status(400).json({ error: 'Invalid booking identifier format.' });
    }

    const booking = await Booking.findById(bookingId).select('user');
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found.' });
    }

    const isOwner = booking.user.toString() === req.user._id.toString();
    const isStaffOrAdmin = ['staff', 'admin'].includes(req.user.role);
    if (!isOwner && !isStaffOrAdmin) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const payment = await Payment.findOne({ booking: bookingId }).sort({ createdAt: -1 });
    return res.status(200).json({ payment: payment || null });
  } catch (err) {
    console.error('[Get Payment Error]:', err);
    return res.status(500).json({ error: 'Failed to retrieve payment info.' });
  }
});

export default router;
