import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required']
    },
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: [true, 'Room reference is required']
    },
    checkIn: {
      type: Date,
      required: [true, 'Check-in date is required']
    },
    checkOut: {
      type: Date,
      required: [true, 'Check-out date is required']
    },
    guests: {
      type: Number,
      required: [true, 'Guest count is required'],
      min: [1, 'Guest count must be at least 1']
    },
    nights: {
      type: Number,
      required: [true, 'Number of nights is required'],
      min: [1, 'Reservation must be for at least 1 night']
    },
    nightlyPrice: {
      type: Number,
      required: [true, 'Nightly price snapshot is required'],
      min: [0, 'Nightly price cannot be negative']
    },
    totalAmount: {
      type: Number,
      required: [true, 'Total reservation amount is required'],
      min: [0, 'Total amount cannot be negative']
    },
    bookingStatus: {
      type: String,
      enum: ['confirmed', 'checked-in', 'checked-out', 'cancelled'],
      default: 'confirmed'
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'refunded'],
      default: 'pending'
    },
    specialRequests: {
      type: String,
      default: '',
      trim: true,
      maxlength: [500, 'Special requests cannot exceed 500 characters']
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Compound index to optimize date collision lookups
bookingSchema.index({ room: 1, bookingStatus: 1, checkIn: 1, checkOut: 1 });

// Helper to check valid status transitions
bookingSchema.statics.isValidStatusTransition = function (currentStatus, newStatus) {
  const allowedTransitions = {
    'confirmed': ['checked-in', 'cancelled'],
    'checked-in': ['checked-out'],
    'checked-out': [],
    'cancelled': []
  };

  return allowedTransitions[currentStatus]?.includes(newStatus) || false;
};

const Booking = mongoose.model('Booking', bookingSchema);

export default Booking;
