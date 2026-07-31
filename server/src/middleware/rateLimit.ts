import rateLimit from 'express-rate-limit';

export const apiLimiter = rateLimit({
  windowMs: 60_000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many requests — slow down.' },
});

export const authLimiter = rateLimit({
  windowMs: 5 * 60_000,
  limit: 40,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts.' },
});

export const publicFormLimiter = rateLimit({
  windowMs: 10 * 60_000,
  limit: 12,
  message: { error: 'Too many submissions. Please try later.' },
});
