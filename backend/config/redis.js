const redis = require('redis');

// Redis Client Configuration
const redisClient = redis.createClient({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  // password: process.env.REDIS_PASSWORD, // jeśli wymagane
});

// Cache Client (oddzielna instancja dla cache)
const cacheClient = redis.createClient({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
});

// Pub/Sub Client (oddzielna instancja dla messaging)
const pubSubClient = redis.createClient({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
});

// Error handling
redisClient.on('error', (err) => {
  console.error('Redis Client Error:', err);
});

cacheClient.on('error', (err) => {
  console.error('Cache Client Error:', err);
});

pubSubClient.on('error', (err) => {
  console.error('PubSub Client Error:', err);
});

// Connection handlers
redisClient.on('connect', () => {
  console.log('Redis Client Connected');
});

cacheClient.on('connect', () => {
  console.log('Cache Client Connected');
});

pubSubClient.on('connect', () => {
  console.log('PubSub Client Connected');
});

// Initialize connections
const connectRedis = async () => {
  try {
    await redisClient.connect();
    await cacheClient.connect();
    await pubSubClient.connect();
    console.log('All Redis clients connected successfully');
  } catch (error) {
    console.error('Redis connection failed:', error);
    process.exit(1);
  }
};

module.exports = {
  redisClient,
  cacheClient,
  pubSubClient,
  connectRedis
};