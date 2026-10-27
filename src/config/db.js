const mongoose = require('mongoose');
const dns = require('dns');

dns.resolveSrv('_mongodb._tcp.1jzmnkh.mongodb.net', (err, records) => {
  if (err) {
    console.error('ATLAS DNS TEST FAILED:', err.message);
  } else {
    console.log('ATLAS DNS TEST SUCCESS:', records);
  }
});

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
