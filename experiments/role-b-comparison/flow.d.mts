import type { Page } from '@playwright/test';
export function command(page: Page, id: string): Promise<void>;
export function selectProvider(page: Page, provider: string): Promise<void>;
export function primeSingleDiffuse(page: Page, provider: string, requestCount: () => number): Promise<{ setup: string; setupRequests: number; configuredSteps: number; fieldSources: boolean; web: boolean }>;
export function runScenario(page: Page, name: string, provider: string, requestCount: () => number): Promise<{ configuredSteps?: number; configuredCandidates?: number; setupRequests?: number; fieldSources: boolean; web: boolean; explicitInput?: string }>;
export function openField(page: Page, id: string): Promise<void>;
export function restoreExport(page: Page, file: string): Promise<string>;
