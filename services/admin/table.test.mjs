import test from 'node:test';
import assert from 'node:assert/strict';
import {selectRows, pageRows, rowsCsv} from './table.ts';
const rows=[{id:'a',display_name:'Đặng Ngọc Ánh',balance:100,status:'paid'},{id:'b',display_name:'Bình',balance:20,status:'pending'},{id:'c',display_name:'Anh',balance:5,status:'paid'}];
test('Vietnamese search ignores accents and supports nested detail',()=>{assert.deepEqual(selectRows(rows,{query:'dang ngoc'}).map(x=>x.id),['a']);assert.equal(selectRows([{detail:{note:'Đã thanh toán'}}],{query:'thanh toan'}).length,1)});
test('status filtering and numeric sorting compose without mutating input',()=>{assert.deepEqual(selectRows(rows,{status:'paid',sortKey:'balance',direction:'asc'}).map(x=>x.id),['c','a']);assert.equal(rows[0].id,'a');assert.deepEqual(selectRows(rows,{sortKey:'balance',direction:'desc'}).map(x=>x.id),['a','b','c'])});
test('pagination clamps stale pages after filters and handles zero results',()=>{assert.deepEqual(pageRows(rows,9,2),{rows:[rows[2]],page:2,pages:2,total:3,start:3,end:3});assert.deepEqual(pageRows([],4,20),{rows:[],page:1,pages:1,total:0,start:0,end:0})});
test('CSV preserves all fields and neutralizes formula injection',()=>{const csv=rowsCsv([{name:'=HYPERLINK("evil")',note:'a,b\n"c"',extra:5},{name:'\t+cmd',later:'Đặng'}]);assert.ok(csv.startsWith('\uFEFF'));assert.ok(csv.includes('"\'=HYPERLINK(""evil"")"'));assert.ok(csv.includes('"\'\t+cmd"'));assert.ok(csv.includes('"a,b\n""c"""'));assert.ok(csv.includes('later'));assert.ok(csv.includes('Đặng'))});
