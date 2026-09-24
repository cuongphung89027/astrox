const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('../web/node_modules/typescript');
for(const ext of ['.ts','.tsx'])require.extensions[ext]=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,f);
const React=require('../web/node_modules/react'),{renderToStaticMarkup}=require('../web/node_modules/react-dom/server');
const {AiText}=require('../web/src/components/kit/AiText.tsx');
test('old known terminology has a Vietnamese display while retaining the original in a closed disclosure',()=>{
 const original='Nhật chủ 日主 và The Fool';const html=renderToStaticMarkup(React.createElement(AiText,{text:original}));
 assert.ok(html.includes('Nhật Chủ'));assert.ok(html.includes('<details'));assert.ok(html.includes(original));assert.ok(!html.includes('<details open'));
});
test('untranslated historical passages are not silently erased or shown as a clean reading',()=>{
 const html=renderToStaticMarkup(React.createElement(AiText,{text:'未知词 năm 2026'}));
 assert.ok(html.includes('chưa được Việt hóa'));assert.ok(html.includes('<details'));assert.ok(html.includes('未知词 năm 2026'));
});
