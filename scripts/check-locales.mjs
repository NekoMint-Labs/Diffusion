/** Static dictionary coverage; external/user-authored content is deliberately not translated. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';

const require = createRequire(import.meta.url);
let ts;
try { ts = require('typescript'); }
catch { ts = require(path.join(execFileSync('npm', ['root', '-g'], { encoding: 'utf8' }).trim(), 'typescript')); }

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const keys = new Set();
const dictionary = ts.createSourceFile('zh.ts', fs.readFileSync(path.join(root, 'src/locales/zh.ts'), 'utf8'), ts.ScriptTarget.Latest, true);
function entries(node) {
    if (ts.isPropertyAssignment(node) && ts.isStringLiteral(node.name)) keys.add(node.name.text);
    ts.forEachChild(node, entries);
}
entries(dictionary);

const missing = new Map();
const raw = [];
const unlocalized = [];
const textAssignments = new Set(['textContent', 'innerText', 'innerHTML']);
const visibleAttributes = new Set(['aria-label', 'placeholder', 'subtitle', 'title']);

function staticStrings(node) {
    if (!node) return [];
    if (ts.isStringLiteralLike(node)) return [node.text];
    if (ts.isConditionalExpression(node)) return [...staticStrings(node.whenTrue), ...staticStrings(node.whenFalse)];
    return [];
}
function isTranslation(node) {
    return ts.isCallExpression(node) && ts.isIdentifier(node.expression) && ['t', 'msg'].includes(node.expression.text);
}
function addMissing(node, file) {
    for (const text of staticStrings(node)) if (!keys.has(text)) missing.set(text, file);
}
function addUnlocalized(node, file, kind) {
    for (const text of staticStrings(node)) if (text.trim() && !/^([.?/,()\s\u2026\u25c7]|&#\d+;)+$/.test(text.trim())) unlocalized.push({ file, kind, text });
}
function isNoticeCall(node) {
    return ts.isIdentifier(node.expression) && node.expression.text === 'notice'
        || ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === 'notice';
}
function isFeedbackSetter(node) {
    return ts.isIdentifier(node.expression) && /^(setNotice|setMessage|setStatus|setFeedback|setStartupError)$/.test(node.expression.text);
}
function isPromptState(node) {
    const declaration = node.parent;
    if (!ts.isVariableDeclaration(declaration) || declaration.initializer !== node || !ts.isArrayBindingPattern(declaration.name)) return false;
    const name = declaration.name.elements[0]?.name;
    return !!name && ts.isIdentifier(name) && /prompt|helper|feedback/i.test(name.text);
}

function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (/\.tsx?$/.test(full) && !full.includes('/locales/')) {
            const file = path.relative(root, full);
            const source = ts.createSourceFile(file, fs.readFileSync(full, 'utf8'), ts.ScriptTarget.Latest, true, full.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
            function visit(node) {
                if (ts.isCallExpression(node)) {
                    if (isTranslation(node)) addMissing(node.arguments[0], file);
                    else if (isNoticeCall(node) || isFeedbackSetter(node)) addUnlocalized(node.arguments[0], file, isNoticeCall(node) ? 'notice' : 'feedback');
                    else if (ts.isIdentifier(node.expression) && node.expression.text === 'useState' && isPromptState(node)) addUnlocalized(node.arguments[0], file, 'helper');
                }
                if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken && ts.isPropertyAccessExpression(node.left) && textAssignments.has(node.left.name.text)) addUnlocalized(node.right, file, 'dom-text');
                if (ts.isPropertyAssignment(node) && node.name.getText(source) === 'notice' && !isTranslation(node.initializer)) addUnlocalized(node.initializer, file, 'notice');
                if (ts.isJsxAttribute(node) && visibleAttributes.has(node.name.text) && node.initializer && ts.isJsxExpression(node.initializer) && node.initializer.expression && !isTranslation(node.initializer.expression)) addUnlocalized(node.initializer.expression, file, 'jsx-attribute');
                if (ts.isJsxText(node) && node.text.trim() && !/^([.?/,()\s\u2026\u25c7]|&#\d+;)+$/.test(node.text.trim())) raw.push({ file, text: node.text.trim() });
                ts.forEachChild(node, visit);
            }
            visit(source);
        }
    }
}
walk(path.join(root, 'src'));
console.log(JSON.stringify({ dictionaryKeys: keys.size, missing: [...missing].map(([key, file]) => ({ key, file })), unwrappedJSX: raw, unlocalized }, null, 2));
process.exitCode = missing.size || raw.length || unlocalized.length ? 1 : 0;
