import {renderPrompt,type PromptNode} from '../../../services/admin/prompt-engine';
const pending = new Map<string,PromptNode>();
/** Records structured template values alongside the rendered local preview. */
export function managedPrompt(id:string, values:unknown[]):string {
 const node:PromptNode={id,values:values.map(v=>{const text=String(v??'');return pending.get(text)??text;})};
 const text=renderPrompt(node);pending.set(text,node);
 if(pending.size>256)pending.delete(pending.keys().next().value!);
 return text;
}
export function promptDescriptor(text:string):PromptNode|undefined{return pending.get(text);}

export function managedJoin(values:string[],separator:string):string{const parts:string[]=[];values.forEach((v,i)=>{if(i)parts.push(separator);parts.push(v);});return managedPrompt('$join',parts);}
