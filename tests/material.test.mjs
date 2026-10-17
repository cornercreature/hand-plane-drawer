import test from 'node:test';
import assert from 'node:assert/strict';
import {materialGradient} from '../src/material.mjs';
import {svgDocument,parseProject} from '../src/geometry.mjs';
test('materials survive projects and produce distinct vector lighting; wireframe stays unfilled',()=>{
  const points=[{x:0,y:0},{x:100,y:0},{x:100,y:100},{x:0,y:100}],style={color:'#7799aa',edge:'#ffffff',fill:true,opacity:1,width:1};
  for(const material of ['flat','matte','reflective']){
    const plane={points,style:{...style,material},stroke:1},project={version:1,width:1200,height:800,planes:[plane]};
    assert.equal(parseProject(JSON.stringify(project)).planes[0].style.material,material);
    assert.equal(svgDocument([plane]).includes('<linearGradient'),material!=='flat');
    assert.ok(!svgDocument([{...plane,style:{...plane.style,fill:false}}]).includes('<linearGradient'));
  }
  assert.notDeepEqual(materialGradient(points,style.color,'matte'),materialGradient(points,style.color,'reflective'));
  assert.throws(()=>parseProject(JSON.stringify({version:1,width:1200,height:800,planes:[{points,stroke:1,style:{...style,material:'invalid'}}]})));
});
