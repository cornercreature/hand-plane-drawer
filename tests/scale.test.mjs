import test from 'node:test';
import assert from 'node:assert/strict';
import {scalePlane,parseProject,svgDocument,validQuad} from '../src/geometry.mjs';
import {centerOf,placeOnPath} from '../src/guide.mjs';
const points=[{x:100,y:100},{x:120,y:100},{x:120,y:120},{x:100,y:120}];
test('scale preserves center, multiplies edge lengths, and leaves the input intact',()=>{
  for(const scale of [.1,.5,1]){const result=scalePlane(points,scale);assert.deepEqual(centerOf(result),centerOf(points));assert.equal(result[1].x-result[0].x,20*scale);}
  assert.deepEqual(scalePlane(points,1),points);assert.equal(points[0].x,100);
});
test('small scaled planes roundtrip and export without losing their guide position',()=>{
  const scaled=scalePlane(placeOnPath(points,{x:500,y:300}),.1);
  assert.deepEqual(centerOf(scaled),{x:500,y:300});assert.equal(validQuad(scaled,0),true);
  const plane={points:scaled,stroke:1,style:{color:'#d6f39a',edge:'#d6f39a',fill:true,opacity:.12,width:1.2}};
  const restored=parseProject(JSON.stringify({version:1,width:1200,height:800,planes:[plane]}));
  assert.deepEqual(restored.planes,[plane]);assert.ok(svgDocument(restored.planes).includes('499.00,299.00'));
});
