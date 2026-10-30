import { createProject, makeThought } from '../../src/core/model.ts';
import { scenarios } from './options.mjs';
export function fixtures() {
    const common = '我想验证学生是否需要一个考前复习工具。每周只有两小时可以投入，不接触学生的私人作业、成绩或身份资料。目前还没有访谈或试用结果。';
    return scenarios.map(name => {
        const project = createProject('comparison-' + name, '模型对照 · ' + name, 1);
        project.thoughts.question = makeThought(common, {x:300,y:200},1,'question');
        if (name === 'correction' || name === 'uncertainty') {
            const prior = name === 'correction' ? '我想验证学生是否需要一个作业辅助工具。每周只有四小时，不接触学生的私人作业、成绩或身份资料。目前还没有访谈或试用结果。' : common;
            const correction = name === 'correction' ? '更正：现在每周只有两小时，改为考前复习，不做作业辅助；不接触学生私人作业、成绩或身份资料的限制保持不变。' : '我刚才只是设想，还没有确认学生存在这个问题。';
            project.thoughts.prior=makeThought(prior,{x:300,y:40},1,'prior');
            project.inputs.correction={id:'correction',text:correction,createdAt:2};
            project.thoughts.question={...makeThought(correction,{x:300,y:200},2,'question'),derivedFrom:['prior'],generationAction:'continue',origin:{projectId:project.id,thoughtId:'prior',inputId:'correction',ranges:[{inputId:'correction',start:0,end:correction.length}]}};
        }
        return project;
    });
}
