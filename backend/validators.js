const { z } = require('zod');

const LANGS = ['en','te','hi'];

const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email()
    .max(254, 'Email too long'),
  full_name: z.string().trim().min(2, 'Name too short').max(80, 'Name too long'),
  password: z.string()
    .min(6, 'Password must be at least 6 chars')
    .max(72, 'Password too long'),
  // keep languages simple (default en); hackathon-friendly
  languages: z.array(z.enum(LANGS)).default(['en']).optional(),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(6, 'Password must be at least 6 chars').max(72),
});

const resetSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  new_password: z.string().min(6, 'Password must be at least 6 chars').max(72),
});

module.exports = { registerSchema, loginSchema, resetSchema };
