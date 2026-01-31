import mongoose from 'mongoose';

const connectDB = async () => {
    try {
        const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/guardian-shield';

        await mongoose.connect(MONGO_URI);

        console.log('✅ MongoDB Connected Successfully');
    } catch (err) {
        console.error('❌ MongoDB Connection Error:', err);
        console.log('⚠️ Running in Offline Mode (Database features will fail)');
        // process.exit(1); // Don't crash the server, just log it.
    }
};

export default connectDB;
