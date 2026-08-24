const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const currentLevel = process.env.LOG_LEVEL || 'info';

function formatMessage(level, context, message, meta) {
  const timestamp = new Date().toISOString();
  const metaStr = meta && Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
  return `[${timestamp}] [${level.toUpperCase()}] [${context}] ${message}${metaStr}`;
}

const logger = {
  info: (context, message, meta) => {
    if (LOG_LEVELS[currentLevel] >= LOG_LEVELS.info) {
      console.log(formatMessage('info', context, message, meta));
    }
  },
  warn: (context, message, meta) => {
    if (LOG_LEVELS[currentLevel] >= LOG_LEVELS.warn) {
      console.warn(formatMessage('warn', context, message, meta));
    }
  },
  error: (context, message, meta) => {
    if (LOG_LEVELS[currentLevel] >= LOG_LEVELS.error) {
      console.error(formatMessage('error', context, message, meta));
    }
  },
  debug: (context, message, meta) => {
    if (LOG_LEVELS[currentLevel] >= LOG_LEVELS.debug) {
      console.debug(formatMessage('debug', context, message, meta));
    }
  },
};

module.exports = logger;
