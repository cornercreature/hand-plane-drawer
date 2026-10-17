import test from 'node:test';
import assert from 'node:assert/strict';
import {planeVertices,materials} from '../src/material.mjs';
import {parseProject,demoQuad} from '../src/geometry.mjs';
test('3D planes reproject to the original corners at every canvas size',()=>{
  for(const [w,h] of [[1200,800],[800,1200]])for(const angle of [0,.7,2]){
    const points=demoQuad(w/2,h/2,angle),vertices=planeVertices(points,w,h);
    vertices.forEach(([x,y,z],i)=>{assert.ok(Math.abs(w/2+w*x/-z-points[i].x)<1e-8);assert.ok(Math.abs(h/2-w*y/-z-points[i].y)<1e-8);});
    const sub=(a,b)=>a.map((v,i)=>v-b[i]),u=sub(vertices[1],vertices[0]),v=sub(vertices[3],vertices[0]),q=sub(vertices[2],vertices[0]);
    const normal=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
    assert.ok(Math.abs(normal.reduce((s,v,i)=>s+v*q[i],0))<1e-8);
  }
});
test('all material presets roundtrip; invalid material names are rejected',()=>{
  const project={version:1,width:1200,height:800,planes:[{points:demoQuad(600,400),stroke:1,style:{color:'#7799aa',edge:'#ffffff',fill:true,opacity:1,width:1}}]};
  for(const material of Object.keys(materials)){project.planes[0].style.material=material;assert.equal(parseProject(JSON.stringify(project)).planes[0].style.material,material);}
  project.planes[0].style.material='invalid';assert.throws(()=>parseProject(JSON.stringify(project)));
});
