import test from 'node:test';
import assert from 'node:assert/strict';
import { createProject, makeThought } from '../../src/core/model.ts';
import { reduceProject } from '../../src/core/reducer.ts';
import { userEvent } from '../../src/core/events.ts';
test('create, edit and move are immutable canonical commits',()=>{
 const initial=createProject('test');const t=makeThought('A question',{x:10,y:20});
 const p=reduceProject(initial,userEvent({type:'thought.create',thought:t}));
 assert.equal(Object.keys(initial.thoughts).length,0);
 const moved=reduceProject(p,userEvent({type:'thought.move',positions:{[t.id]:{x:50,y:40}}}));
 assert.equal(moved.thoughts[t.id].x,50);assert.equal(p.thoughts[t.id].x,10);assert.equal(moved.history.length,p.history.length);
});
test('AI cannot directly mutate canonical state',()=>{
 assert.throws(()=>reduceProject(createProject(),{type:'thought.create',thought:makeThought('No',{x:0,y:0}),actor:'ai',at:1}),/semantic candidates/);
});
test('only a separate explicit action forms a crystal',()=>{
 const t=makeThought('Maybe',{x:0,y:0});let p=reduceProject(createProject(),userEvent({type:'thought.create',thought:t}));
 p=reduceProject(p,userEvent({type:'thought.keep',ids:[t.id]}));assert.equal(p.thoughts[t.id].kind,'thought');
 p=reduceProject(p,userEvent({type:'crystal.form',id:t.id,text:'My commitment'}));assert.equal(p.thoughts[t.id].kind,'crystal');
});
