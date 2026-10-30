import test from 'node:test';
import assert from 'node:assert/strict';
import { parseOptions, summarizeRequests } from '../../experiments/role-b-comparison/options.mjs';
const args = ['--source', '5e4f979c5c210246577280ac91fd58d2631d8920', '--role', 'candidate', '--flags', 'readingTrial=1&propositionTrial=1', '--url', 'http://127.0.0.1:4191/', '--out', 'unused'];
test('browser capture defaults to plan and rejects non-isolated origins/ambiguous provenance', () => {
    assert.equal(parseOptions(args).execute, false);
    for (const [key,value] of [['--source','5e4f979'],['--url','https://example.com/'],['--url','http://127.0.0.1:4191/?x=1'],['--scenarios','angle,angle'],['--flags','none'],['--port','0']]) {
        const input = [...args]; const index=input.indexOf(key); if(index<0)input.push(key,value);else input[index+1]=value;
        assert.throws(()=>parseOptions(input));
    }
});
test('single-request qualification uses observed transport completion, not configured candidate count', () => {
    assert.equal(summarizeRequests([]).singleRequest,false);
    assert.equal(summarizeRequests([{done:false}]).singleRequest,false);
    assert.equal(summarizeRequests([{done:true,status:200}]).singleRequest,true);
    assert.equal(summarizeRequests([{done:true,status:200},{done:true,status:200}]).singleRequest,false);
    assert.equal(summarizeRequests([{done:true,status:500}]).providerSuccess,false);
});
