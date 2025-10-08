/**
 * Phase 1: Input validation utilities
 * Centralized input validation to prevent injection attacks and data corruption
 */

import { z } from 'zod';

// Common validation schemas
export const emailSchema = z.string()
  .email({ message: "Invalid email address" })
  .max(255, { message: "Email must be less than 255 characters" })
  .trim()
  .toLowerCase();

export const nameSchema = z.string()
  .min(1, { message: "Name cannot be empty" })
  .max(100, { message: "Name must be less than 100 characters" })
  .trim()
  .regex(/^[a-zA-Z\s'-]+$/, { message: "Name can only contain letters, spaces, hyphens, and apostrophes" });

export const textAreaSchema = z.string()
  .min(1, { message: "Field cannot be empty" })
  .max(5000, { message: "Text must be less than 5000 characters" })
  .trim();

export const urlSchema = z.string()
  .url({ message: "Invalid URL format" })
  .max(2000, { message: "URL must be less than 2000 characters" });

export const phoneSchema = z.string()
  .regex(/^\+?[1-9]\d{1,14}$/, { message: "Invalid phone number format" })
  .optional();

// Certificate validation
export const certificateNumberSchema = z.string()
  .regex(/^CERT-\d{4}-\d{6}$/, { message: "Invalid certificate number format" });

// Score validation (0-100)
export const scoreSchema = z.number()
  .min(0, { message: "Score must be at least 0" })
  .max(100, { message: "Score cannot exceed 100" });

// Duration validation (positive integer minutes)
export const durationSchema = z.number()
  .int({ message: "Duration must be a whole number" })
  .positive({ message: "Duration must be positive" });

/**
 * Sanitize HTML to prevent XSS attacks
 * NOTE: Only use this if HTML rendering is absolutely required.
 * Prefer plain text whenever possible.
 */
export function sanitizeHtml(input: string): string {
  // Basic sanitization - remove script tags and event handlers
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '')
    .trim();
}

/**
 * Validate and sanitize user input for database operations
 */
export function sanitizeForDatabase(input: string): string {
  return input
    .trim()
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
    .slice(0, 5000); // Hard limit on length
}

/**
 * Validate file upload
 */
export const fileUploadSchema = z.object({
  name: z.string().max(255),
  size: z.number().max(10 * 1024 * 1024), // 10MB max
  type: z.string().regex(/^(image|application|video)\/.+/)
});

/**
 * Validate search query to prevent injection
 */
export function sanitizeSearchQuery(query: string): string {
  return query
    .trim()
    .replace(/[^\w\s-]/gi, '') // Remove special characters except spaces and hyphens
    .slice(0, 200); // Limit length
}

/**
 * Validate UUID format
 */
export const uuidSchema = z.string()
  .uuid({ message: "Invalid UUID format" });

/**
 * Safe JSON parse with validation
 */
export function safeJsonParse<T>(json: string, schema: z.ZodType<T>): T | null {
  try {
    const parsed = JSON.parse(json);
    return schema.parse(parsed);
  } catch {
    return null;
  }
}

/**
 * Validate course title
 */
export const courseTitleSchema = z.string()
  .min(3, { message: "Course title must be at least 3 characters" })
  .max(200, { message: "Course title must be less than 200 characters" })
  .trim();

/**
 * Validate announcement content
 */
export const announcementSchema = z.object({
  title: z.string()
    .min(1, { message: "Title is required" })
    .max(200, { message: "Title must be less than 200 characters" })
    .trim(),
  content: z.string()
    .min(1, { message: "Content is required" })
    .max(5000, { message: "Content must be less than 5000 characters" })
    .trim(),
  priority: z.enum(['low', 'normal', 'high']),
});

/**
 * Validate message content
 */
export const messageSchema = z.object({
  content: z.string()
    .min(1, { message: "Message cannot be empty" })
    .max(2000, { message: "Message must be less than 2000 characters" })
    .trim(),
});
