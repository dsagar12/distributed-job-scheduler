const Redis = require('ioredis');
const env = require('./env');

let publisher = null;
let subscriber = null;

try {
  publisher = new Redis(env.REDIS_URL, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    retryStrategy: (times) => (times > 3 ? null : Math.min(times * 100, 1000)),
  });

  subscriber = new Redis(env.REDIS_URL, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    retryStrategy: (times) => (times > 3 ? null : Math.min(times * 100, 1000)),
  });

  publisher.on('error', (err) => {
    // Graceful logging without crash
  });

  subscriber.on('error', (err) => {
    // Graceful logging without crash
  });
} catch {
  // Graceful offline fallback
}

module.exports = {
  publisher,
  subscriber,
};
