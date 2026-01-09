import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';

export const validate = (schema: ZodSchema) => async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await schema.parseAsync({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation failed',
        details: error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      });
      return;
    }
    res.status(500).json({ error: 'Validation error' });
  }
};

// Common validation schemas
export const schemas = {
  register: z.object({
    body: z.object({
      email: z.string().email('Invalid email address'),
      password: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number'),
      phone: z.string().optional(),
    }),
  }),

  login: z.object({
    body: z.object({
      email: z.string().email(),
      password: z.string(),
    }),
  }),

  createProfile: z.object({
    body: z.object({
      first_name: z.string().min(1, 'First name is required'),
      last_name: z.string().min(1, 'Last name is required'),
      date_of_birth: z.string().refine((date) => !isNaN(Date.parse(date)), {
        message: 'Invalid date format',
      }),
      city: z.string().min(1, 'City is required'),
      state: z.string().length(2, 'State must be 2 characters'),
      zip_code: z.string().regex(/^\d{5}$/, 'Invalid zip code'),
      budget_min: z.number().min(0, 'Budget must be positive'),
      budget_max: z.number().min(0, 'Budget must be positive'),
      // FHA COMPLIANCE: Child data is now OPTIONAL (user-initiated disclosure)
      // Users can choose to share this information, platform does not require it
      children_count: z.number().int().min(0).optional(),
      children_age_groups: z.string().optional(),
      schedule_type: z.enum(['flexible', 'fixed', 'shift_work']),
      work_from_home: z.boolean(),
    }),
  }),

  updateProfile: z.object({
    body: z.object({
      bio: z.string().max(500).optional(),
      budget_min: z.number().min(0).optional(),
      budget_max: z.number().min(0).optional(),
      parenting_style: z.string().optional(),
      dietary_preferences: z.string().optional(),
      house_rules: z.string().optional(),
    }),
  }),

  createMessage: z.object({
    body: z.object({
      recipient_id: z.string().uuid(),
      content: z.string().min(1).max(2000),
      message_type: z.enum(['text', 'image', 'file']).optional(),
    }),
  }),
};
