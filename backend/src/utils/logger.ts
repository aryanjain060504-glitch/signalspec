import winston from 'winston';
import { env } from '../config/env';

// List of sensitive keys to redact from logs
const SENSITIVE_KEYS = [
  'password',
  'token',
  'accessToken',
  'refreshToken',
  'secret',
  'authorization',
  'cookie',
  'encryption_key',
  'apiKey',
  'gemini_api_key',
];

const redactSensitiveData = winston.format((info) => {
  const sanitize = (obj: any): any => {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(sanitize);

    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      if (SENSITIVE_KEYS.some((s) => lowerKey.includes(s.toLowerCase()))) {
        result[key] = '[REDACTED]';
      } else if (typeof value === 'object') {
        result[key] = sanitize(value);
      } else {
        result[key] = value;
      }
    }
    return result;
  };

  return sanitize(info);
});

export const logger = winston.createLogger({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    redactSensitiveData(),
    winston.format.json()
  ),
  defaultMeta: { service: 'signalspec-backend' },
  transports: [
    new winston.transports.Console({
      format:
        env.NODE_ENV === 'production'
          ? winston.format.json()
          : winston.format.combine(
              winston.format.colorize(),
              winston.format.printf(({ timestamp, level, message, ...meta }) => {
                const metaString = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
                return `[${timestamp}] ${level}: ${message} ${metaString}`;
              })
            ),
    }),
  ],
});
