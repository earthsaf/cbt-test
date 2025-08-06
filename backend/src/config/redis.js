const Redis = require('ioredis');

const redisClient = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD,
  retryStrategy: (times) => {
    if (times > 3) {
      console.error('Redis connection failed');
      return null;
    }
    return Math.min(times * 50, 2000);
  }
});

module.exports = redisClient;
