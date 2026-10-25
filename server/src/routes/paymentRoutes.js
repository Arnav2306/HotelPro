import express from 'express';
import mongoose from 'mongoose';
import crypto from 'crypto';
import Booking from '../models/Booking.js';
import Payment from '../models/Payment.js';
import Refund from '../models/Refund.js';
import { authenticateUser, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

/**
 * Safely verify HMAC-SHA256 signatures with timing attack protection
 */
const verifyHmacSignature = (payload, signature, secret) => {
  if (!payload || !signature || !secret) return false;
  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    const expectedBuf = Buffer.from(expectedSignature, 'utf8');
    const receivedBuf = Buffer.from(signature, 'utf8');

    if (expectedBuf.length !== receivedBuf.length) return false;
    return crypto.timingSafeEqual(expectedBuf, receivedBuf);
  } catch {
    return false;
  }
};

// GET /api/payments/config
// Returns public gateway configuration for client checkout initialization
router.get('/config', authenticateUser, (req, res) => {
  const keyId = process.env.RAZORPAY_KEY_ID || null;
  const isConfigured = Boolean(keyId && process.env.RAZORPAY_KEY_SECRET);
  const isProduction = process.env.NODE_ENV === 'production';
  const isTestMode = keyId ? keyId.startsWith('rzp_test_') : !isProduction;

  return res.status(200).json({
    razorpayKeyId: keyId,
    isConfigured,
    testMode: isTestMode,
    currency: 'INR',
    demoAllowed: !isProduction
  });
});

// POST /api/payments/create-order/:bookingId
// Create a trusted Razorpay Order from server-calculated booking amounts
router.post('/create-order/:bookingId', authenticateUser, async (req, res) => {
  try {
    const { bookingId } = req.params;

    if (!isValidObjectId(bookingId)) {
      return res.status(400).json({ error: 'Invalid booking identifier format.' });
    }

    const booking = await Booking.findById(bookingId).populate('room', 'title roomNumber category');
    if (!booking) {
      return res.status(404).json({ error: 'Reservation not found.' });
    }

    // Ownership check
    if (booking.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied: You can only initiate payment for your own reservations.' });
    }

    // Allow payment only for confirmed or checked-in bookings
    if (!['confirmed', 'checked-in'].includes(booking.bookingStatus)) {
      return res.status(400).json({
        error: `Cannot pay for a reservation with status '${booking.bookingStatus}'.`
      });
    }

    // Idempotency: Prevent duplicate payment if already paid
    if (booking.paymentStatus === 'paid') {
      const existingPayment = await Payment.findOne({ booking: bookingId, status: 'paid' });
      return res.status(409).json({
        error: 'This reservation has already been paid in full.',
        transactionId: existingPayment?.transactionId || existingPayment?.paymentId
      });
    }

    // Calculate payable amount strictly from authoritative server booking record
    // Razorpay requires amounts in paise (1 INR = 100 paise)
    const amountInRupees = booking.totalAmount;
    const amountInPaise = Math.round(amountInRupees * 100);

    if (amountInPaise < 100) {
      return res.status(400).json({ error: 'Payable amount must be at least ₹1.00.' });
    }

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    // Check if credentials are configured
    if (!keyId || !keySecret) {
      if (process.env.NODE_ENV === 'production') {
        return res.status(503).json({
          error: 'Payment gateway configuration is missing on the server. Please contact support.'
        });
      }

      // In local dev without live keys, notify client to use demo flow or configure test keys
      return res.status(200).json({
        mockOrder: true,
        message: 'Razorpay test credentials not configured in server/.env. Demo payment mode is available.',
        bookingId: booking._id,
        amount: amountInPaise,
        currency: 'INR'
      });
    }

    // Production safety safeguard: Prevent accidentally using live keys in non-production environments
    if (process.env.NODE_ENV !== 'production' && keyId.startsWith('rzp_live_')) {
      console.error('[Payment Safety Block]: Attempted to use LIVE Razorpay credentials outside of production.');
      return res.status(403).json({
        error: 'Live payment credentials cannot be used in a development environment.'
      });
    }

    // Generate unique receipt reference
    const receipt = `rcpt_${booking._id.toString().slice(-8)}_${Date.now().toString().slice(-4)}`;

    // Call Razorpay API to create official order
    const authHeader = 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader
      },
      body: JSON.stringify({
        amount: amountInPaise,
        currency: 'INR',
        receipt,
        notes: {
          bookingId: booking._id.toString(),
          userId: req.user._id.toString(),
          roomTitle: booking.room?.title || 'Hotel Suite'
        }
      })
    });

    const orderData = await response.json();

    if (!response.ok) {
      const errorMsg = orderData.error?.description || orderData.error?.code || 'Order creation failed.';
      console.error('[Razorpay Order Creation Failed]:', errorMsg);
      return res.status(502).json({
        error: errorMsg || 'Failed to initialize payment with Razorpay.'
      });
    }

    // Upsert pending payment record linked to this order
    let payment = await Payment.findOne({ booking: booking._id, status: 'pending' });
    if (!payment) {
      payment = new Payment({
        booking: booking._id,
        user: req.user._id,
        amount: amountInRupees,
        currency: 'INR',
        provider: 'razorpay',
        orderId: orderData.id,
        receipt,
        status: 'pending'
      });
    } else {
      payment.orderId = orderData.id;
      payment.receipt = receipt;
      payment.amount = amountInRupees;
      payment.provider = 'razorpay';
    }
    await payment.save();

    return res.status(200).json({
      orderId: orderData.id,
      amount: orderData.amount, // in paise
      currency: orderData.currency,
      keyId,
      bookingId: booking._id,
      hotelName: 'HotelPro Luxury Resort'
    });
  } catch (err) {
    console.error('[Create Razorpay Order Error]:', err);
    return res.status(500).json({ error: 'Failed to create payment order. Please try again.' });
  }
});

// POST /api/payments/verify
// Verify Razorpay Checkout payment signature and update booking state
router.post('/verify', authenticateUser, async (req, res) => {
  try {
    const { bookingId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    if (!bookingId || !isValidObjectId(bookingId)) {
      return res.status(400).json({ error: 'Valid booking ID is required.' });
    }

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({ error: 'Missing payment verification credentials.' });
    }

    const booking = await Booking.findById(bookingId).populate('room', 'title roomNumber');
    if (!booking) {
      return res.status(404).json({ error: 'Reservation not found.' });
    }

    // Ownership check
    if (booking.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied: You can only verify payments for your own bookings.' });
    }

    // Idempotency check: If already marked paid, return existing success record
    if (booking.paymentStatus === 'paid') {
      const existingPayment = await Payment.findOne({ booking: bookingId, status: 'paid' });
      return res.status(200).json({
        message: 'Payment was already verified and confirmed.',
        payment: {
          transactionId: existingPayment?.transactionId || existingPayment?.paymentId,
          orderId: existingPayment?.orderId,
          amount: existingPayment?.amount,
          currency: existingPayment?.currency,
          status: existingPayment?.status,
          paidAt: existingPayment?.paidAt,
          provider: existingPayment?.provider
        },
        booking
      });
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      return res.status(500).json({ error: 'Payment gateway secret is not configured on the server.' });
    }

    // Verify signature: HMAC-SHA256(order_id + '|' + payment_id, secret)
    const payload = `${razorpayOrderId}|${razorpayPaymentId}`;
    const isValid = verifyHmacSignature(payload, razorpaySignature, keySecret);

    if (!isValid) {
      console.warn(`[Payment Verification Failure]: Invalid signature for booking ${bookingId}`);

      // Record failed payment attempt ONLY if not already marked paid
      await Payment.findOneAndUpdate(
        { booking: bookingId, orderId: razorpayOrderId, status: { $ne: 'paid' } },
        { status: 'failed', provider: 'razorpay', paymentId: razorpayPaymentId },
        { upsert: false }
      );

      return res.status(400).json({
        error: 'Invalid payment signature. Verification failed. If your account was debited, contact reservations.'
      });
    }

    // Signature verified successfully -> update Payment and Booking records
    let payment = await Payment.findOne({ booking: bookingId, orderId: razorpayOrderId });
    if (!payment) {
      payment = new Payment({
        booking: booking._id,
        user: req.user._id,
        amount: booking.totalAmount,
        currency: 'INR',
        provider: 'razorpay',
        orderId: razorpayOrderId
      });
    }

    payment.paymentId = razorpayPaymentId;
    payment.transactionId = razorpayPaymentId;
    payment.signature = razorpaySignature;
    payment.status = 'paid';
    payment.paidAt = new Date();

    try {
      await payment.save();
      booking.paymentStatus = 'paid';
      await booking.save();
    } catch (saveErr) {
      if (saveErr.code === 11000) {
        // Handled race condition: another concurrent callback or webhook already marked it paid
        const existingPaid = await Payment.findOne({ booking: bookingId, status: 'paid' });
        return res.status(200).json({
          message: 'Payment verified and reservation confirmed successfully.',
          payment: {
            transactionId: existingPaid?.transactionId || existingPaid?.paymentId,
            orderId: existingPaid?.orderId,
            amount: existingPaid?.amount,
            currency: existingPaid?.currency,
            status: existingPaid?.status,
            paidAt: existingPaid?.paidAt,
            provider: existingPaid?.provider
          },
          booking
        });
      }
      throw saveErr;
    }

    return res.status(200).json({
      message: 'Payment verified and reservation confirmed successfully.',
      payment: {
        transactionId: payment.transactionId,
        orderId: payment.orderId,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        paidAt: payment.paidAt,
        provider: payment.provider
      },
      booking
    });
  } catch (err) {
    console.error('[Verify Payment Error]:', err);
    return res.status(500).json({ error: 'Failed to verify payment.' });
  }
});

// POST /api/payments/webhook
// Secure Razorpay Webhook endpoint for automated server-to-server confirmation
router.post('/webhook', async (req, res) => {
  try {
    const webhookSignature = req.headers['x-razorpay-signature'];
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.warn('[Webhook Warning]: RAZORPAY_WEBHOOK_SECRET not set; rejecting webhook call.');
      return res.status(503).json({ error: 'Webhook secret unconfigured.' });
    }

    if (!webhookSignature) {
      return res.status(400).json({ error: 'Missing x-razorpay-signature header.' });
    }

    // Verify signature using the exact raw request body buffer
    const rawBody = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(req.body);
    const isValid = verifyHmacSignature(rawBody, webhookSignature, webhookSecret);

    if (!isValid) {
      console.warn('[Webhook Warning]: Invalid webhook signature.');
      return res.status(400).json({ error: 'Invalid webhook signature.' });
    }

    const event = req.body?.event;
    const payload = req.body?.payload;

    // Handle payment.captured or order.paid
    if (event === 'payment.captured' || event === 'order.paid') {
      const paymentEntity = payload?.payment?.entity;
      const orderId = paymentEntity?.order_id || payload?.order?.entity?.id;
      const paymentId = paymentEntity?.id;
      const bookingId = paymentEntity?.notes?.bookingId;

      let payment = null;
      if (orderId) {
        payment = await Payment.findOne({ orderId });
      }
      if (!payment && bookingId && isValidObjectId(bookingId)) {
        payment = await Payment.findOne({ booking: bookingId });
        if (!payment) {
          const booking = await Booking.findById(bookingId);
          if (booking) {
            payment = new Payment({
              booking: booking._id,
              user: booking.user,
              amount: booking.totalAmount,
              currency: 'INR',
              provider: 'razorpay',
              orderId: orderId,
              status: 'pending'
            });
          }
        }
      }

      if (payment) {
        // Idempotent update: never downgrade from paid
        if (payment.status !== 'paid') {
          payment.status = 'paid';
          payment.paidAt = new Date();
          if (paymentId) {
            payment.paymentId = paymentId;
            payment.transactionId = paymentId;
          }
          try {
            await payment.save();
            await Booking.findByIdAndUpdate(payment.booking, { paymentStatus: 'paid' });
            console.log(`[Webhook]: Payment confirmed for booking ${payment.booking}`);
          } catch (saveErr) {
            if (saveErr.code === 11000) {
              console.log(`[Webhook]: Booking ${payment.booking} was concurrently marked paid.`);
            } else {
              throw saveErr;
            }
          }
        }
      }
    } else if (event === 'payment.failed') {
      const paymentEntity = payload?.payment?.entity;
      const orderId = paymentEntity?.order_id;
      if (orderId) {
        await Payment.findOneAndUpdate(
          { orderId, status: { $ne: 'paid' } },
          { status: 'failed', paymentId: paymentEntity?.id }
        );
      }
    } else if (event === 'refund.processed') {
      const refundEntity = payload?.refund?.entity;
      const refundId = refundEntity?.id;
      if (refundId) {
        const refund = await Refund.findOne({ refundId });
        if (refund) {
          refund.status = 'processed';
          if (refundEntity.acquirer_data?.arn) {
            refund.arn = refundEntity.acquirer_data.arn;
          }
          await refund.save();

          const allProcessed = await Refund.find({ payment: refund.payment, status: 'processed' });
          const totalRefundedInRupees = allProcessed.reduce((s, r) => s + r.amount, 0);

          const parentPayment = await Payment.findById(refund.payment);
          if (parentPayment) {
            parentPayment.amountRefunded = totalRefundedInRupees;
            parentPayment.status = totalRefundedInRupees >= parentPayment.amount ? 'refunded' : 'partially_refunded';
            await parentPayment.save();

            await Booking.findByIdAndUpdate(parentPayment.booking, { paymentStatus: parentPayment.status });
            console.log(`[Webhook]: Refund ${refundId} confirmed processed. Booking ${parentPayment.booking} status: ${parentPayment.status}`);
          }
        }
      }
    } else if (event === 'refund.failed') {
      const refundEntity = payload?.refund?.entity;
      const refundId = refundEntity?.id;
      if (refundId) {
        await Refund.findOneAndUpdate(
          { refundId },
          { status: 'failed', failureReason: refundEntity.error_description || 'Refund failed by issuing bank' }
        );
      }
    }

    // Always respond 200 OK to acknowledge receipt
    return res.status(200).json({ status: 'ok' });
  } catch (err) {
    console.error('[Webhook Processing Error]:', err);
    return res.status(500).json({ error: 'Webhook handler error.' });
  }
});

// POST /api/payments/demo/:bookingId
// Demo payment — strictly disabled in production
router.post('/demo/:bookingId', authenticateUser, async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'Demo payments are disabled in production environment.' });
    }

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

    // Create demo payment record
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

    let payment = await Payment.findOne({ booking: bookingId, status: { $in: ['paid', 'partially_refunded', 'refunded'] } });
    if (!payment) {
      payment = await Payment.findOne({ booking: bookingId }).sort({ createdAt: -1 });
    }
    return res.status(200).json({ payment: payment || null });
  } catch (err) {
    console.error('[Get Payment Error]:', err);
    return res.status(500).json({ error: 'Failed to retrieve payment info.' });
  }
});

// POST /api/payments/refund/:bookingId
// Initiate a full or partial refund (Staff & Admin only)
router.post('/refund/:bookingId', authenticateUser, authorizeRoles('staff', 'admin'), async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { amount, reason } = req.body || {};
    const idempotencyKey = req.headers['x-idempotency-key'] || req.body?.idempotencyKey || null;

    if (!isValidObjectId(bookingId)) {
      return res.status(400).json({ error: 'Invalid booking identifier format.' });
    }

    // Idempotency check: Return existing refund if idempotency key matches
    if (idempotencyKey) {
      const existingRefund = await Refund.findOne({ idempotencyKey });
      if (existingRefund) {
        return res.status(200).json({
          message: 'Refund request was already processed (idempotent response).',
          refund: existingRefund
        });
      }
    } else if (process.env.NODE_ENV === 'production') {
      // In production, require idempotency key to prevent concurrent over-refund race conditions
      return res.status(400).json({
        error: 'X-Idempotency-Key header is required for refund requests in production.'
      });
    }

    const booking = await Booking.findById(bookingId).populate('room', 'title roomNumber');
    if (!booking) {
      return res.status(404).json({ error: 'Reservation not found.' });
    }

    // Locate eligible captured payment
    const payment = await Payment.findOne({
      booking: bookingId,
      status: { $in: ['paid', 'partially_refunded'] }
    });

    if (!payment) {
      return res.status(400).json({
        error: 'No refundable payment found for this reservation. Only captured payments can be refunded.'
      });
    }

    // Calculate refundable balance from database records
    const existingRefunds = await Refund.find({
      payment: payment._id,
      status: { $in: ['processed', 'pending'] }
    });
    const totalRefundedPaise = existingRefunds.reduce((sum, r) => sum + r.amountInPaise, 0);
    const paymentTotalPaise = Math.round(payment.amount * 100);
    const remainingRefundablePaise = paymentTotalPaise - totalRefundedPaise;

    if (remainingRefundablePaise <= 0) {
      return res.status(400).json({
        error: 'This reservation has already been fully refunded. No refundable balance remaining.'
      });
    }

    // Validate requested refund amount (default to full remaining balance if unspecified)
    let refundAmountInPaise = remainingRefundablePaise;
    if (amount !== undefined && amount !== null && amount !== '') {
      const parsedAmount = Number(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return res.status(400).json({ error: 'Refund amount must be a positive number.' });
      }
      refundAmountInPaise = Math.round(parsedAmount * 100);
      if (refundAmountInPaise > remainingRefundablePaise) {
        return res.status(400).json({
          error: `Requested refund of ₹${parsedAmount.toFixed(2)} exceeds refundable balance of ₹${(remainingRefundablePaise / 100).toFixed(2)}.`
        });
      }
    }

    const refundAmountInRupees = refundAmountInPaise / 100;
    const safeReason = reason ? String(reason).trim().slice(0, 200) : 'Customer cancellation / staff adjustment';

    // Handle Demo Payment Refund
    if (payment.provider === 'demo') {
      if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({ error: 'Demo refunds are disabled in production environment.' });
      }

      const demoRefundId = Refund.generateDemoRefundId();
      const refund = new Refund({
        booking: booking._id,
        payment: payment._id,
        user: booking.user,
        initiatedBy: req.user._id,
        refundId: demoRefundId,
        paymentId: payment.transactionId || 'HPDEMO-PAYMENT',
        amount: refundAmountInRupees,
        amountInPaise: refundAmountInPaise,
        currency: 'INR',
        status: 'processed',
        reason: safeReason,
        idempotencyKey
      });
      await refund.save();

      // Update payment and booking states
      payment.amountRefunded = (payment.amountRefunded || 0) + refundAmountInRupees;
      payment.status = (payment.amountRefunded >= payment.amount) ? 'refunded' : 'partially_refunded';
      await payment.save();

      booking.paymentStatus = payment.status;
      await booking.save();

      return res.status(200).json({
        message: `[DEMO] Successfully issued ${payment.status === 'refunded' ? 'full' : 'partial'} refund of ₹${refundAmountInRupees.toFixed(2)}.`,
        refund,
        payment: {
          amount: payment.amount,
          amountRefunded: payment.amountRefunded,
          status: payment.status
        },
        booking: {
          _id: booking._id,
          paymentStatus: booking.paymentStatus,
          bookingStatus: booking.bookingStatus
        }
      });
    }

    // Handle Razorpay Payment Refund
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      if (process.env.NODE_ENV === 'production') {
        return res.status(503).json({ error: 'Payment gateway configuration is missing on the server.' });
      }

      return res.status(200).json({
        mockRefund: true,
        message: 'Razorpay keys not configured in server/.env. Demo refund simulation mode is available.',
        bookingId: booking._id,
        amount: refundAmountInRupees
      });
    }

    // Production safety block for mismatched dev keys
    if (process.env.NODE_ENV !== 'production' && keyId.startsWith('rzp_live_')) {
      return res.status(403).json({
        error: 'Live payment credentials cannot be used in a development environment.'
      });
    }

    if (!payment.paymentId) {
      return res.status(400).json({ error: 'Payment identifier is missing from payment record.' });
    }

    // Call official Razorpay Refund API
    const authHeader = 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    const response = await fetch(`https://api.razorpay.com/v1/payments/${payment.paymentId}/refund`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader
      },
      body: JSON.stringify({
        amount: refundAmountInPaise,
        notes: {
          bookingId: booking._id.toString(),
          initiatedBy: req.user._id.toString(),
          reason: safeReason
        }
      })
    });

    const refundData = await response.json();

    if (!response.ok) {
      const errorMsg = refundData.error?.description || refundData.error?.code || 'Razorpay refund processing failed.';
      console.error('[Razorpay Refund Error]:', errorMsg);

      // Persist failed refund attempt for audit trail
      try {
        await new Refund({
          booking: booking._id,
          payment: payment._id,
          user: booking.user,
          initiatedBy: req.user._id,
          paymentId: payment.paymentId,
          amount: refundAmountInRupees,
          amountInPaise: refundAmountInPaise,
          currency: 'INR',
          status: 'failed',
          reason: safeReason,
          failureReason: errorMsg,
          idempotencyKey
        }).save();
      } catch {}

      return res.status(502).json({ error: errorMsg });
    }

    // Persist verified/pending refund record
    const isProcessed = refundData.status === 'processed';
    const refund = new Refund({
      booking: booking._id,
      payment: payment._id,
      user: booking.user,
      initiatedBy: req.user._id,
      refundId: refundData.id,
      paymentId: payment.paymentId,
      amount: refundData.amount ? refundData.amount / 100 : refundAmountInRupees,
      amountInPaise: refundData.amount || refundAmountInPaise,
      currency: refundData.currency || 'INR',
      status: isProcessed ? 'processed' : 'pending',
      arn: refundData.acquirer_data?.arn || null,
      reason: safeReason,
      idempotencyKey
    });
    await refund.save();

    if (isProcessed) {
      payment.amountRefunded = (payment.amountRefunded || 0) + refund.amount;
      payment.status = (payment.amountRefunded >= payment.amount) ? 'refunded' : 'partially_refunded';
      await payment.save();

      booking.paymentStatus = payment.status;
      await booking.save();
    }

    return res.status(200).json({
      message: `Refund of ₹${refund.amount.toFixed(2)} ${isProcessed ? 'processed successfully' : 'initiated and pending bank confirmation'}.`,
      refund,
      payment: {
        amount: payment.amount,
        amountRefunded: payment.amountRefunded,
        status: payment.status
      },
      booking: {
        _id: booking._id,
        paymentStatus: booking.paymentStatus,
        bookingStatus: booking.bookingStatus
      }
    });
  } catch (err) {
    console.error('[Refund Error]:', err);
    return res.status(500).json({ error: 'Failed to process refund.' });
  }
});

// GET /api/payments/refunds/:bookingId
// List all refunds for a specific reservation (Guest owner, Staff, or Admin)
router.get('/refunds/:bookingId', authenticateUser, async (req, res) => {
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

    const refunds = await Refund.find({ booking: bookingId })
      .populate('initiatedBy', 'name role')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      count: refunds.length,
      refunds
    });
  } catch (err) {
    console.error('[Get Refunds Error]:', err);
    return res.status(500).json({ error: 'Failed to retrieve refunds.' });
  }
});

// GET /api/payments/reconcile/:bookingId
// Safely reconcile local payment and refund state with Razorpay (Staff & Admin only)
router.get('/reconcile/:bookingId', authenticateUser, authorizeRoles('staff', 'admin'), async (req, res) => {
  try {
    const { bookingId } = req.params;

    if (!isValidObjectId(bookingId)) {
      return res.status(400).json({ error: 'Invalid booking identifier format.' });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found.' });
    }

    const payment = await Payment.findOne({ booking: bookingId }).sort({ createdAt: -1 });
    const localRefunds = await Refund.find({ booking: bookingId }).sort({ createdAt: -1 });

    const localProcessedRefunds = localRefunds.filter((r) => r.status === 'processed');
    const localRefundedTotal = localProcessedRefunds.reduce((sum, r) => sum + r.amount, 0);

    const discrepancies = [];

    // Internal consistency check
    if (payment) {
      if (Math.abs((payment.amountRefunded || 0) - localRefundedTotal) > 0.01) {
        discrepancies.push(`Local Payment amountRefunded (₹${payment.amountRefunded || 0}) differs from processed refunds sum (₹${localRefundedTotal}).`);
      }
      if (payment.amountRefunded >= payment.amount && booking.paymentStatus !== 'refunded') {
        discrepancies.push(`Payment is fully refunded but Booking status is '${booking.paymentStatus}' instead of 'refunded'.`);
      }
    } else if (booking.paymentStatus === 'paid') {
      discrepancies.push(`Booking marked 'paid' but no Payment record found.`);
    }

    let gatewayData = null;
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (payment?.provider === 'razorpay' && payment?.paymentId && keyId && keySecret) {
      try {
        const authHeader = 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');
        const [payRes, rfdRes] = await Promise.all([
          fetch(`https://api.razorpay.com/v1/payments/${payment.paymentId}`, {
            headers: { Authorization: authHeader }
          }),
          fetch(`https://api.razorpay.com/v1/payments/${payment.paymentId}/refunds`, {
            headers: { Authorization: authHeader }
          })
        ]);

        if (payRes.ok) {
          const rzPayment = await payRes.json();
          const rzRefunds = rfdRes.ok ? await rfdRes.json() : { items: [] };

          const gatewayAmountRupees = rzPayment.amount / 100;
          const gatewayRefundedRupees = (rzPayment.amount_refunded || 0) / 100;

          gatewayData = {
            id: rzPayment.id,
            status: rzPayment.status,
            amount: gatewayAmountRupees,
            amountRefunded: gatewayRefundedRupees,
            refundStatus: rzPayment.refund_status,
            refundCount: rzRefunds.items?.length || 0
          };

          if (Math.abs(gatewayAmountRupees - payment.amount) > 0.01) {
            discrepancies.push(`Gateway captured amount (₹${gatewayAmountRupees}) does not match local record (₹${payment.amount}).`);
          }
          if (Math.abs(gatewayRefundedRupees - localRefundedTotal) > 0.01) {
            discrepancies.push(`Gateway reports ₹${gatewayRefundedRupees} refunded, but local processed records show ₹${localRefundedTotal}.`);
          }
        }
      } catch (fetchErr) {
        console.warn('[Reconciliation Gateway Fetch Failed]:', fetchErr.message);
      }
    }

    return res.status(200).json({
      bookingId,
      reconciled: discrepancies.length === 0,
      discrepancies,
      local: {
        bookingPaymentStatus: booking.paymentStatus,
        paymentStatus: payment?.status || null,
        paymentAmount: payment?.amount || 0,
        amountRefunded: payment?.amountRefunded || 0,
        refundRecordsCount: localRefunds.length,
        processedRefundsSum: localRefundedTotal
      },
      gateway: gatewayData
    });
  } catch (err) {
    console.error('[Reconcile Error]:', err);
    return res.status(500).json({ error: 'Failed to perform reconciliation.' });
  }
});

export default router;
