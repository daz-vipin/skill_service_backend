
const mongoose = require('mongoose');
const net = require('net');
const dns = require('dns');

// MongoDB Atlas hosts
const atlasHosts = [
  'ac-zgif4tm-shard-00-00.1jzmnkh.mongodb.net',
  'ac-zgif4tm-shard-00-01.1jzmnkh.mongodb.net',
  'ac-zgif4tm-shard-00-02.1jzmnkh.mongodb.net',
];

// Diagnostic: Check TCP connectivity
for (const host of atlasHosts) {
  const socket = net.createConnection({
    host,
    port: 27017,
  });

  socket.setTimeout(5000);

  socket.on('connect', () => {
    console.log(`ATLAS TCP SUCCESS: ${host}:27017`);
    socket.destroy();
  });

  socket.on('timeout', () => {
    console.error(`ATLAS TCP TIMEOUT: ${host}:27017`);
    socket.destroy();
  });

  socket.on('error', (err) => {
    console.error(
      `ATLAS TCP FAILED: ${host}: ${err.code || err.message}`
    );
  });
}

// Diagnostic: Check Atlas DNS records
dns.resolveSrv(
  '_mongodb._tcp.1jzmnkh.mongodb.net',
  (err, records) => {
    if (err) {
      console.error('ATLAS DNS TEST FAILED:', err.message);
    } else {
      console.log('ATLAS DNS TEST SUCCESS:', records);
    }
  }
);

// Connect to MongoDB Atlas
async function connectDB() {
  if (!process.env.MONGODB_URI) {
    throw new Error(
      'MONGODB_URI is missing in environment variables'
    );
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
    });

    console.log(
      `MongoDB connected: ${mongoose.connection.host}`
    );
  } catch (err) {
    console.error('MongoDB connection error name:', err.name);
    console.error('MongoDB connection error message:', err.message);

    if (err.reason && err.reason.servers) {
      for (const [address, server] of err.reason.servers) {
        console.error('Atlas server:', address);
        console.error('Server error name:', server.error?.name);
        console.error('Server error message:', server.error?.message);
        console.error('Server error cause:', server.error?.cause);
      }
    }

    throw err;
  }
}

module.exports = connectDB;