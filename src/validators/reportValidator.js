import { z } from 'zod';

export const createReportSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  scamType: z.enum(['Screenshot', 'Text', 'URL', 'Phone', 'Email']),
  category: z.enum([
    'Phishing',
    'Fake Job',
    'Lottery / Prize',
    'UPI / QR Code',
    'Bank Scam',
    'Telegram Scam',
    'WhatsApp Fraud',
    'Crypto Fraud',
    'Investment Trap',
    'Loan Scam',
    'Instagram Impersonation',
    'Fake Internship',
    'E-Commerce Fraud',
    'Other'
  ]),
  evidenceUrls: z.array(z.string().url()).optional(),
  scammerDetails: z.object({
    phone: z.string().optional(),
    email: z.string().optional(),
    website: z.string().optional(),
    upiId: z.string().optional(),
    socialHandle: z.string().optional()
  }).optional(),
  riskScore: z.number().min(0).max(100).default(50)
});

export const commentSchema = z.object({
  content: z.string().min(2, 'Comment cannot be empty')
});

export const voteSchema = z.object({
  type: z.enum(['upvote', 'downvote'])
});
