import test from 'node:test';import assert from 'node:assert/strict';import {renderPrompt,defaultPromptSettings,ORIGINAL_SYSTEM_PROMPT} from './prompt-engine.ts';
test('nested chart context survives template edits without evaluating values',()=>{const p={id:'tuvi.tuviPromptBody.0',values:['PROFILE',{id:'tuvi.ziweiContextText.0',values:['{"palaces":["Mệnh"]}']},'TASK']};const settings=defaultPromptSettings();settings.templates[p.id]='{{v1}}\nChỉ dùng dữ liệu.\n{{v2}}';const text=renderPrompt(p,settings.templates);assert.ok(text.includes('{"palaces":["Mệnh"]}'));assert.ok(text.endsWith('TASK'));assert.ok(!text.includes('PROFILE'));});
test('reject unknown templates and missing variables',()=>{assert.throws(()=>renderPrompt({id:'unknown',values:[]}));assert.throws(()=>renderPrompt({id:'tuvi.ziweiContextText.0',values:[]}));});
test('original system rules and all legacy leaf tasks are retained',()=>{assert.ok(ORIGINAL_SYSTEM_PROMPT.includes('KHÔNG tự bịa'));const t=defaultPromptSettings().tasks;assert.equal(Object.keys(t).filter(k=>k.startsWith('tuvi--')).length,42);assert.equal(Object.keys(t).filter(k=>k.startsWith('zodiac--')).length,18);});
test('service task edit preserves resolved zodiac sign',async()=>{const {renderServicePrompt}=await import('./prompt-engine.ts');const s=defaultPromptSettings(),id='zodiac--tinh-cach-cung--dac-diem-cot-loi';s.tasks[id]='Luận kỹ cung {SIGN}.';const node={id:'zodiac.zodiacPromptBody.0',values:['P','{}','Phân tích tính cách chi tiết của cung Ma Kết (Capricorn), gắn với dữ liệu tính trực tiếp. ~260-440 từ.']};assert.ok(renderServicePrompt(node,id,s).includes('Luận kỹ cung Ma Kết (Capricorn).'));});
test('compatibility respects every gender pairing even with a published template override',async()=>{
 const {renderServicePrompt}=await import('./prompt-engine.ts');const settings=defaultPromptSettings();
 settings.templates['compat.original']='Người 1: {{v0}} ({{v1}}). Người 2: {{v5}} ({{v6}}).';
 for(const [a,b] of [['Nam','Nam'],['Nữ','Nữ'],['Nam','Nữ'],['Nữ','Nam']]){
  const text=renderServicePrompt({id:'compat.original',values:['An',a,'01-01-1990','Tí','Hà Nội','Bình',b,'02-02-1991']},'compat--pair',settings);
  assert.ok(text.includes(`An (${a})`));assert.ok(text.includes(`Bình (${b})`));
  assert.match(text,/LGBTQ\+/);assert.match(text,/không.*giảm.*tương hợp/i);assert.match(text,/vợ.*chồng/);
 }
});

test('new pair template overrides retain inclusive guidance',()=>{for(const id of ['compat.tuviPair.v1','compat.batuPair.v1'])assert.match(renderPrompt({id,values:['{}']},{[id]:'{{v0}}'}),/LGBTQ\+/);});
