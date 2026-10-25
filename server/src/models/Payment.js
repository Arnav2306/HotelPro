import mongoose from 'mongoose';
import crypto from 'crypto';

const paymentSchema = new mongoose.Schema(
  {
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: [true, 'Booking reference is required'],
      index: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required']
    },
    amount: {
      type: Number,
      required: [true, 'Payment amount is required'],
      min: [0, 'Amount cannot be negative']
    },
    currency: {
      type: String,
      default: 'INR',
      uppercase: true,
      trim: true
    },
    provider: {
      type: String,
      default: 'demo',
      trim: true
    },
    transactionId: {
      type: String,
      unique: true,
      sparse: true,
      trim: true
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending'
    },
    paidAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

// Generate a unique demo transaction ID
paymentSchema.statics.generateTransactionId = function () {
  return 'HPDEMO-' + crypto.randomBytes(6).toString('hex').toUpperCase();
};

const Payment = mongoose.model('Payment', paymentSchema);

export default Payment;
