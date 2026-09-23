import { z } from 'zod';
import { discoveryCandidate } from './pipeline.ts';
const webURL = z.string().url().max(3000).refine(value => { try {
    const u = new URL(value);
    return ['https:', 'http:'].includes(u.protocol) && !u.username && !u.password;
}
catch {
    return false;
} }, 'Expected an HTTP(S) URL without credentials');
export const evidenceCandidateSchema = z.object({ id: z.string().min(1).max(200), title: z.string().min(1).max(500), url: webURL, excerpt: z.string().max(6000), stage: z.literal('candidate').optional(), outcome: z.enum(['support', 'challenge', 'partial', 'prior-art', 'inconclusive', 'conflicting']).optional(), inspected: z.string().min(1).max(2000), locator: z.string().max(500).optional() }).strict().transform(discoveryCandidate);
export const searchResultsSchema = z.object({ candidates: z.array(evidenceCandidateSchema).max(10) }).strict();
export const fetchedSchema = z.object({ url: webURL, title: z.string().max(500), text: z.string().max(50000), inspected: z.string().max(2000) }).strict();
export const extractedSchema = z.object({ chunks: z.array(z.object({ text: z.string().max(6000), locator: z.string().max(500).optional(), inspected: z.string().max(2000) }).strict()).max(10) }).strict();
export const metadataSchema = z.object({ url: webURL, title: z.string().max(500), mime: z.string().max(100).optional() }).strict();
export const searchRequestSchema = z.object({ query: z.string().trim().min(1).max(3000), limit: z.number().int().min(1).max(10).default(5) }).strict();
export const resourceRequestSchema = z.object({ url: webURL, query: z.string().max(3000).optional() }).strict();

export const passageSchema = z.object({ id: z.string().min(1).max(200), text: z.string().trim().min(1).max(2500), url: webURL, locator: z.string().min(1).max(500), inspected: z.string().max(1000), retrievedAt: z.number().finite().nonnegative(), provider: z.string().min(1).max(200) }).strict();
export const reasoningSchema = z.object({ outcome: z.enum(['support', 'challenge', 'partial', 'prior-art', 'inconclusive', 'conflicting']), rationale: z.string().trim().min(1).max(4000), passageIds: z.array(z.string().min(1).max(200)).min(1).max(4) }).strict();
export const reasonRequestSchema = z.object({ claim: z.string().trim().min(1).max(3000), passages: z.array(passageSchema).min(1).max(4) }).strict();
