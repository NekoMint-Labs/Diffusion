import crypto from 'node:crypto';
import { createProject, makeThought } from '../../src/core/model.ts';
import { PLAIN_ANSWER_INSTRUCTIONS } from '../../src/ai/plainAnswer.ts';
export const PRODUCT_SOURCE = 'e5f6703495db311cb19ff718dd4785876565301d';
export const ORIGIN = 'http://127.0.0.1:4194';
export const FLAGS = 'locale=en&readingTrial=1&propositionTrial=1&plainAnswerTrial=1';
export const CASE_IDS = ['polite-agreement', 'authored-correction', 'explicit-teacher', 'no-public-evidence'];
export const LIMIT = 8;
export const OUTPUT_CAP = 4000;
export const hash = value => crypto.createHash('sha256').update(value).digest('hex');
export function schedule(cases) {
    return CASE_IDS.flatMap((id, index) => (index % 2 ? ['candidate', 'control'] : ['control', 'candidate']).map(arm => ({ case: cases.find(c => c.id === id), arm, index: index * 2 + (index % 2 ? ['candidate','control'] : ['control','candidate']).indexOf(arm) })));
}
export function fixture(item) {
    const project = createProject('comparison-deadline-' + item.id, '模型对照 · deadline-' + item.id, 1);
    project.thoughts.question = makeThought(item.selected, {x:300,y:200}, 3, 'question');
    if (item.id === 'authored-correction' || item.id === 'explicit-teacher') {
        project.thoughts.root = makeThought('想判断学生会不会用考前复习工具；不接触私人作业、成绩或身份资料。', {x:0,y:0}, 1, 'root');
        project.thoughts.kept = {...makeThought('看你的学生能否听懂已经讲过的章节。', {x:100,y:50}, 2, 'kept'), generatedBy:'ai', generationAction:'continue', derivedFrom:['root']};
        project.inputs.correction = {id:'correction',text:item.selected,createdAt:3};
        Object.assign(project.thoughts.question, {derivedFrom:['kept'],generationAction:'continue',origin:{projectId:project.id,thoughtId:'kept',inputId:'correction',ranges:[{inputId:'correction',start:0,end:item.selected.length}]}});
    }
    return project;
}
export function canonical(body) {
    const copy=structuredClone(body);
    copy.messages=copy.messages.map(m=>{
        if(m.role==='system') return {...m,content:m.content.replace('\n'+PLAIN_ANSWER_INSTRUCTIONS,'')};
        if(m.role!=='user')return m;
        const input=JSON.parse(m.content);if(input.intent?.requestId)input.intent.requestId='<trace>';
        return {...m,content:JSON.stringify(input)};
    });
    return hash(JSON.stringify(copy));
}
export function intervene(body, arm) {
    if(!['control','candidate'].includes(arm)||body.model!=='deepseek-v4-pro'||body.max_tokens!==OUTPUT_CAP||body.stream!==false||body.thinking!==undefined||body.reasoning_effort!==undefined)throw new Error('Frozen provider/config mismatch');
    const copy=structuredClone(body),systems=copy.messages.filter(m=>m.role==='system');
    if(systems.length!==1||systems[0].content.split(PLAIN_ANSWER_INSTRUCTIONS).length!==2)throw new Error('Expected one exact candidate wording block');
    if(arm==='control')systems[0].content=systems[0].content.replace('\n'+PLAIN_ANSWER_INSTRUCTIONS,'');
    if(canonical(copy)!==canonical(body))throw new Error('Nonexperimental request difference');
    return copy;
}
export function guard(total, count){if(total>=LIMIT||count!==0)throw new Error('No retries or extra calls permitted');}
