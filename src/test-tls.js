const tls = require('tls');

const host =
  'ac-zgif4tm-shard-00-00.1jzmnkh.mongodb.net';

console.log('Testing TLS connection to MongoDB Atlas...');
console.log('Node version:', process.version);

const socket = tls.connect({
  host,
  port: 27017,
  servername: host,
  rejectUnauthorized: true,
  minVersion: 'TLSv1.2',
  timeout: 10000,
});

socket.once('secureConnect', () => {
  console.log('TLS SUCCESS');
  console.log('Protocol:', socket.getProtocol());
  socket.end();
});

socket.once('timeout', () => {
  console.error('TLS TIMEOUT');
  socket.destroy();
  process.exitCode = 1;
});

socket.once('error', (err) => {
  console.error('TLS FAILED');
  console.error('Code:', err.code);
  console.error('Message:', err.message);
  process.exitCode = 1;
});