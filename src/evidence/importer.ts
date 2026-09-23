import { t } from '../shared/i18n.ts';
import type { WebEvidenceProvider } from './contracts.ts';
import { discoveryCandidate, hasReadPassages, readCandidate } from './pipeline.ts';
import { id, makeThought, type Point, type SourceRecord, type EvidenceCandidate } from '../core/model.ts';
import type { ProjectController } from '../core/controller.ts';
import type { ProjectRepository } from '../storage/repository.ts';
import { safeWebURL, type PickedFile } from '../platform/contracts.ts';
import { ORIGINAL_LIMIT, type Extraction } from './extract.ts';
export interface FileParser {
    parse(file: PickedFile): Promise<Extraction>;
}
export class SourceImporter {
    private controller: ProjectController;
    private repository: ProjectRepository;
    private parser: FileParser;
    private notice: (text: string) => void;
    constructor(controller: ProjectController, repository: ProjectRepository, parser: FileParser, notice: (text: string) => void) { this.controller = controller; this.repository = repository; this.parser = parser; this.notice = notice; }
    async files(files: PickedFile[], point: Point): Promise<void> {
        if (files.length > 20)
            this.notice(t('Importing the first 20 files. Drop the remainder separately.'));
        // Sequential asynchronous ingestion bounds memory and remains outside pointer hot paths.
        for (const [index, file] of files.slice(0, 20).entries()) {
            let source: SourceRecord = { id: id('source'), title: file.name, status: 'processing', mime: file.type || 'application/octet-stream', size: file.size, excerpt: '', inspected: 'Metadata received; content extraction pending.', provenance: { note: 'Explicitly imported by the user.' }, originalPath: file.nativePath };
            const thought = { ...makeThought(file.name, { x: point.x + (index % 3) * 310, y: point.y + Math.floor(index / 3) * 145 }), kind: 'source' as const, sourceId: source.id };
            this.controller.dispatch({ type: 'source.add', source, thought });
            if (file.blob && file.size <= ORIGINAL_LIMIT) {
                try {
                    const key = `${this.controller.getSnapshot().project.id}:${source.id}`;
                    await this.repository.saveOriginal(key, file.blob);
                    source = { ...source, originalKey: key };
                }
                catch (error) {
                    console.error('[diffusion]', 'import', error);
                    this.notice(t('The source text is still usable; only its original file could not be saved.'));
                }
            }
            const extraction = await this.parser.parse(file);
            this.controller.dispatch({ type: 'source.update', source: { ...source, ...extraction } }, 'system');
        }
    }
    link(url: string, point: Point): SourceRecord {
        const safe = safeWebURL(url);
        const source: SourceRecord = { id: id('source'), title: new URL(safe).hostname + new URL(safe).pathname, status: 'limited', mime: 'text/uri-list', excerpt: '', inspected: 'URL only. Page content has not been fetched or read.', url: safe, provenance: { url: safe, note: 'URL explicitly dropped by the user; no automatic network request.' } };
        this.controller.dispatch({ type: 'source.add', source, thought: { ...makeThought(source.title, point), kind: 'source', sourceId: source.id } });
        return source;
    }
    async read(sourceId: string, provider: WebEvidenceProvider, query = '', signal?: AbortSignal): Promise<void> {
        const original = this.controller.getSnapshot().project.sources[sourceId];
        if (!original?.url) throw new Error('This source has no readable web URL.');
        const result = await readCandidate(provider, { id: sourceId, title: original.title, url: original.url, excerpt: original.discoverySnippet ?? '', inspected: original.inspected }, query, signal);
        const current = this.controller.getSnapshot().project.sources[sourceId];
        if (signal?.aborted || !current || current.url !== original.url) return;
        const read = hasReadPassages(result);
        const source: SourceRecord = { ...current, status: read ? 'ready' : 'limited', inspected: result.inspected,
            excerpt: read ? result.passages!.map(passage => passage.text).join('\n\n').slice(0, 6000) : '',
            evidence: read ? { stage: 'read', passages: result.passages! } : undefined,
            provenance: { ...current.provenance, locator: result.locator, note: 'An explicit bounded read. Search snippets are not evidence.' },
        };
        this.controller.dispatch({ type: 'source.update', source }, 'system');
    }
    candidate(candidate: EvidenceCandidate, point: Point, existingSourceId?: string): SourceRecord {
        const existing = existingSourceId ? this.controller.getSnapshot().project.sources[existingSourceId] : undefined;
        if (existing && existing.mime !== 'text/uri-list') throw new Error('A web candidate cannot replace a local file.');
        if (existing?.evidence && !hasReadPassages(candidate)) return existing; // Never downgrade an actually read source to a snippet.
        const discovery = discoveryCandidate(candidate);
        const read = hasReadPassages(candidate);
        const source: SourceRecord = {
            ...existing,
            id: existing?.id ?? id('source'), title: discovery.title, lastSubmitted: undefined, status: read ? 'ready' : 'limited', mime: 'text/uri-list',
            excerpt: read ? candidate.passages!.map(passage => passage.text).join('\n\n').slice(0, 6000) : '',
            discoverySnippet: discovery.excerpt,
            inspected: read ? candidate.inspected : discovery.inspected,
            url: discovery.url,
            ...(read ? { evidence: { stage: candidate.judgment ? 'judged' as const : 'read' as const, passages: candidate.passages!, judgment: candidate.judgment } } : {}),
            provenance: { url: discovery.url, locator: read ? candidate.locator : undefined, note: read ? 'Read passages retained with retrieval provenance; any judgment remains a scoped assessment.' : 'Discovery candidate only. The search snippet is not read evidence.' },
        };
        if (existing) this.controller.dispatch({ type: 'source.update', source });
        else this.controller.dispatch({ type: 'source.add', source, thought: { ...makeThought(source.title, point), kind: 'source', sourceId: source.id } });
        return source;
    }

}
