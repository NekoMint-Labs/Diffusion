/** Authored verification data from real fixtures. No model calls or private project state. */
import fs from 'node:fs';
import { demoProject, performanceProject } from '../src/core/demo.ts';
import { setLocale } from '../src/shared/i18n.ts';
const output=process.argv[2];if(!output)throw new Error('Pass an output JSON path.');
setLocale('en');const en=demoProject();setLocale('zh');const zh=demoProject();setLocale('en');
fs.writeFileSync(output,JSON.stringify({en,zh,performance:[100,500,2000,5000].map(performanceProject)}));
