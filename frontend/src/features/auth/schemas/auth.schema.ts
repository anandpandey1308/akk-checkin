import { z } from 'zod';

export const loginSchema = z.object({
  emailOrUsername: z
    .string()
    .min(1, { message: 'Username or Email is required' })
    .min(3, { message: 'Must be at least 3 characters' })
    .max(50, { message: 'Must not exceed 50 characters' }),
  password: z
    .string()
    .min(1, { message: 'Password is required' })
    .min(6, { message: 'Password must be at least 6 characters' }),
  rememberMe: z.boolean().default(false),
});

export type LoginCredentials = z.infer<typeof loginSchema>;
