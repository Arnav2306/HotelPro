import mongoose from 'mongoose';
import crypto from 'crypto';

const refundSchema = new mongoose.Schema(
  {
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: [true, 'Booking reference is required'],
      index: true
    },
    payment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
      required: [true, 'Payment reference is required'],
      index: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      index: true
    },
    initiatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Initiating staff/admin reference is required']
    },
    refundId: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      index: true
    },
    paymentId: {
      type: String,
      required: [true, 'Payment ID is required'],
      trim: true,
      index: true
    },
    amount: {
      type: Number,
      required: [true, 'Refund amount in INR is required'],
      min: [0.01, 'Refund amount must be greater than zero']
    },
    amountInPaise: {
      type: Number,
      required: [true, 'Refund amount in paise is required'],
      min: [1, 'Refund amount in paise must be at least 1']
    },
    currency: {
      type: String,
      default: 'INR',
      uppercase: true,
      trim: true
    },
    status: {
      type: String,
      enum: ['pending', 'processed', 'failed'],
      default: 'pending',
      index: true
    },
    reason: {
      type: String,
      trim: true,
      default: 'Customer request / Cancellation'
    },
    arn: {
      type: String,
      trim: true
    },
    failureReason: {
      type: String,
      trim: true
    },
    idempotencyKey: {
      type: String,
      unique: true,
      sparse: true,
      trim: true
    }
  },
  { timestamps: true }
);

// Helper to generate demo refund ID for offline/development mode
refundSchema.statics.generateDemoRefundId = function () {
  return 'HPRFND-' + crypto.randomBytes(6).toString('hex').toUpperCase();
};

const Refund = mongoose.model('Refund', refundSchema);

export default Refund;
