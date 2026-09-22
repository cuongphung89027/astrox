import templates from './prompt-templates.json' with {type:'json'};
import originals from './original-prompts.json' with {type:'json'};
export type PromptNode = { id: string; values: (string | PromptNode)[] };
export const ORIGINAL_SYSTEM_PROMPT = originals.system;
export const PROMPT_TEMPLATES = templates;
export const ORIGINAL_TOPICS = originals.topics;
export function renderPrompt(node: PromptNode, overrides: Record<string,string> = {}, depth=0): string {
 if(depth>12 || !node || typeof node.id!=='string' || !Array.isArray(node.values))throw new Error('INVALID_PROMPT');
 if(node.id==='$join'){if(node.values.length>100)throw new Error('INVALID_PROMPT');return node.values.map(v=>typeof v==='string'?v:renderPrompt(v,overrides,depth+1)).join('');}
 const entry=templates.find(t=>t.id===node.id);if(!entry || node.values.length!==entry.variables.length)throw new Error('INVALID_PROMPT');
 const text=overrides[node.id]??entry.template;
 const result=text.replace(/\{\{v(\d+)\}\}/g,(_,index)=>{const value=node.values[Number(index)];if(value===undefined)throw new Error('INVALID_PROMPT_VARIABLE');return typeof value==='string'?value:renderPrompt(value,overrides,depth+1);});
 if(result.length>100000)throw new Error('PROMPT_TOO_LARGE');return result;
}
export function originalTasks():Record<string,string>{
 const out:Record<string,string>={};
 for(const [key,module] of Object.entries({TUVI_TOPICS:'tuvi',ZODIAC_TOPICS:'zodiac',BATU_TOPICS:'batu',NUMEROLOGY_TOPICS:'numerology'})){
  const topics=(originals.topics as Record<string,Array<{id:string;prompt?:string;subs?:Array<{id:string;prompt:string}>}>>)[key];
  for(const topic of topics)for(const sub of topic.subs||[topic])if(sub.prompt)out[module==='batu'||module==='numerology'?`${module}--${sub.id}`:`${module}--${topic.id}--${sub.id}`]=sub.prompt;
 }
 return out;
}
export function defaultPromptSettings(){return {templates:Object.fromEntries(templates.map(t=>[t.id,t.template])),tasks:originalTasks()};}
export function renderServicePrompt(node:PromptNode,serviceId:string,settings:ReturnType<typeof defaultPromptSettings>):string{
 const module=serviceId.split('--')[0];
 const visit=(n:PromptNode,depth=0):PromptNode=>{
  if(depth>12||!n||typeof n.id!=='string'||!Array.isArray(n.values))throw new Error('INVALID_PROMPT');
  if(n.id==='$join')return {id:n.id,values:n.values.map(v=>typeof v==='string'?v:visit(v,depth+1))};
  const t=templates.find(t=>t.id===n.id);if(!t||t.module!==module&&!t.id.includes('.profileContextText.')&&!(module==='compat'&&t.id==='zodiac.compatPrompt.0'))throw new Error('PROMPT_MODULE_MISMATCH');
  return {id:n.id,values:n.values.map((v,i)=>{if(t.variables[i]==='taskText'&&settings.tasks[serviceId])return renderTask(serviceId,typeof v==='string'?v:renderPrompt(v),settings.tasks[serviceId]);return typeof v==='string'?v:visit(v,depth+1);})};
 };
 return renderPrompt(visit(node),settings.templates);
}

function renderTask(id:string,rendered:string,template:string):string{
 const original=originalTasks()[id]||'';const names:string[]=[];
 const escaped=original.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 const pattern=escaped.replace(/\\\{(SIGN|ELEMENT|RULER|NATAL)\\\}/g,(_,name)=>{names.push(name);return '([\\s\\S]*?)';});
 const match=new RegExp('^'+pattern+'$').exec(rendered);const values=Object.fromEntries(names.map((n,i)=>[n,match?.[i+1]??'']));
 return template.replace(/\{(SIGN|ELEMENT|RULER|NATAL)\}/g,(_,name)=>values[name]||'');
}
