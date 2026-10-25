import mongoose from 'mongoose';

export const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/hotelpro';
  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 8000, // Allow extra time for MongoDB Atlas cold-start
      retryWrites: true
    });
    console.log(`[HotelPro DB] MongoDB connected: ${conn.connection.host}`);
    return true;
  } catch (error) {
    // Report clearly so deployment logs catch it
    console.error(`[HotelPro DB] MongoDB connection FAILED: ${error.message}`);
    console.error('[HotelPro DB] Check MONGODB_URI environment variable and network access rules.');
    return false;
  }
};
