const mongoose = require('mongoose');

async function connectDB() {
if (!process.env.MONGODB_URI) {
throw new Error('MONGODB_URI is missing in environment variables');
}

try {
await mongoose.connect(process.env.MONGODB_URI, {
serverSelectionTimeoutMS: 10000,
});

console.log(`MongoDB connected: ${mongoose.connection.host}`);


} catch (err) {
console.error('MongoDB connection error name:', err.name);
console.error('MongoDB connection error message:', err.message);


if (err.reason) {
  console.error('MongoDB connection error details:', err.reason);
}

throw err;


}
}

module.exports = connectDB;
