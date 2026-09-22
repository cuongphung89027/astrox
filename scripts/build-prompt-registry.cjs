const fs=require('fs'),ts=require('../web/node_modules/typescript');
const html=fs.readFileSync('index.html','utf8');const source=ts.createSourceFile('legacy.js',[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(x=>x[1]).join('\n'),99,true);
const vars={};function scan(n){if(ts.isVariableDeclaration(n)&&n.initializer&&ts.isIdentifier(n.name))vars[n.name.text]=n.initializer;ts.forEachChild(n,scan)}scan(source);
const vm=require('vm'),arrays={};for(const name of ['TUVI_TOPICS','ZODIAC_TOPICS','BATU_TOPICS','NUMEROLOGY_TOPICS'])arrays[name]=vm.runInNewContext('('+vars[name].getText(source)+')');
const originals={system:vars.SYSTEM_PROMPT_BASE.text};for(const [name,items] of Object.entries(arrays))for(const topic of items)for(const sub of topic.subs||[topic])originals[`${name}::${topic.id}::${sub.id}`]=sub.prompt;
fs.writeFileSync('services/admin/original-prompts.ts','export default '+JSON.stringify({source:'index.html',system:originals.system,topics:arrays},null,2)+';\n');
