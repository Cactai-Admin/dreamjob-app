import { z } from 'zod'

// ---- Auth ----

export const loginSchema = z.object({
  identifier: z
    .string()
    .min(1, 'Username or email is required'),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters'),
})

export type LoginInput = z.infer<typeof loginSchema>

export const signupSchema = z.object({
  email: z
    .string()
    .email('Please enter a valid email address'),
  displayName: z
    .string()
    .min(1, 'Display name is required'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
})

export type SignupInput = z.infer<typeof signupSchema>

// ---- Profile ----

export const profileSchema = z.object({
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  phone: z.string().optional(),
  location: z.string().optional(),
  headline: z.string().optional(),
  summary: z.string().optional(),
  linkedin_url: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
  website_url: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
  years_experience: z.coerce.number().int().min(0).optional(),
  desired_title: z.string().optional(),
  desired_salary_min: z.coerce.number().min(0).optional(),
  desired_salary_max: z.coerce.number().min(0).optional(),
  desired_location: z.string().optional(),
  willing_to_relocate: z.boolean().optional(),
  remote_preference: z.string().optional(),
})

export type ProfileInput = z.infer<typeof profileSchema>

// ---- Employment ----

export const employmentSchema = z.object({
  company_name: z.string().min(1, 'Company name is required'),
  title: z.string().min(1, 'Job title is required'),
  location: z.string().optional(),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().optional(),
  is_current: z.boolean().default(false),
  description: z.string().optional(),
  responsibilities: z.array(z.string()).default([]),
  achievements: z.array(z.string()).default([]),
  technologies: z.array(z.string()).default([]),
})

export type EmploymentInput = z.infer<typeof employmentSchema>

// ---- Workflow ----

export const workflowCreateSchema = z.object({
  listing_url: z
    .string()
    .url('Please enter a valid URL'),
})

export type WorkflowCreateInput = z.infer<typeof workflowCreateSchema>

// ---- Q&A ----

export const qaAnswerSchema = z.object({
  answer_text: z.string().min(1, 'An answer is required'),
})

export type QAAnswerInput = z.infer<typeof qaAnswerSchema>

// ---- Listing (manual entry) ----

export const listingManualSchema = z.object({
  company_name: z.string().min(1, 'Company name is required'),
  title: z.string().min(1, 'Job title is required'),
  requirements: z.string().min(1, 'Requirements are required'),
  description: z.string().min(1, 'Description is required'),
})

export type ListingManualInput = z.infer<typeof listingManualSchema>
