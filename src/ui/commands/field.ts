import type { DiffusionCommand, SurfaceDeps } from './types.ts';
export interface FieldDeps extends SurfaceDeps {
    beginRename(): void;
    createField(): void;
    duplicateField(): void;
    exportArchive(): void;
    exportMarkdown(): void;
}
/** FIELD: ownership of the whole Field. Supported by the canonical data model and repository. */
export function fieldCommands(deps: FieldDeps): DiffusionCommand[] {
    return [
        { id: 'rename-field', group: 'field', label: 'Rename Field', keywords: ['title', 'name', '重命名'], run: () => deps.beginRename() },
        { id: 'new-field', group: 'field', label: 'New Field', keywords: ['create', '新建'], run: () => deps.createField() },
        { id: 'open-field', group: 'field', label: 'Open Field...', keywords: ['recent', 'switch', '打开'], run: () => deps.openSurface('fields') },
        { id: 'duplicate-field', group: 'field', label: 'Duplicate Field', keywords: ['copy', 'branch', '复制'], run: () => deps.duplicateField() },
        { id: 'export', group: 'field', label: 'Export', keywords: ['archive', 'json', 'save', '导出'], run: () => deps.exportArchive() },
        { id: 'export-markdown', group: 'field', label: 'Export as Markdown', keywords: ['readable', 'text', 'md', '导出'], run: () => deps.exportMarkdown() },
        { id: 'import', group: 'field', label: 'Import / Restore', keywords: ['bring', 'file', '导入'], run: () => deps.openSurface('import') },
        { id: 'history', group: 'field', label: 'How did this form?', keywords: ['trajectory', 'history', '历史'], run: () => deps.openSurface('history') },
        { id: 'fork', group: 'field', label: 'Try a Fork...', keywords: ['alternate', 'branch', '分叉'], available: context => !context.project.fork, run: () => deps.openSurface('fork') },
        { id: 'compare-fork', group: 'field', label: 'Compare Fork / Main', keywords: ['alternate', '分叉'], available: context => Boolean(context.project.fork), run: () => deps.openSurface('fork') },
    ];
}
