import test from 'node:test';
import assert from 'node:assert/strict';
import {bezier,measurePath,pointOnPath,centerOf,placeOnPath,parseGuide} from '../src/guide.mjs';
import {parseProject,demoQuad} from '../src/geometry.mjs';
const node=(x,y,ix=x,iy=y,ox=x,oy=y)=>({x,y,in:{x:ix,y:iy},out:{x:ox,y:oy}});
const near=(a,b)=>assert.ok(Math.hypot(a.x-b.x,a.y-b.y)<.05,JSON.stringify({a,b}));
test('straight path uses pixel distances and clamps its endpoints',()=>{
  const path=measurePath([node(20,40),node(620,40)]);
  assert.equal(path.length,600);
  for(const d of [0,18,50,300,600])near(pointOnPath(path,d),{x:20+d,y:40});
  near(pointOnPath(path,-5),{x:20,y:40});near(pointOnPath(path,900),{x:620,y:40});
});
test('curved guide evaluates the cubic at arc length, including segment boundaries',()=>{
  const a=node(0,0,0,0,0,100),b=node(100,0,100,100),c=node(200,0);
  const path=measurePath([a,b,c]),first=measurePath([a,b]);
  assert.ok(first.length>199&&first.length<201);
  near(pointOnPath(path,first.length/2),bezier(a,b,.5));
  near(pointOnPath(path,first.length),b);near(pointOnPath(path,first.length+50),{x:150,y:0});
});
test('placing a plane on the guide preserves every corner offset and centers it exactly',()=>{
  const points=demoQuad(500,400,.7,1.5),position={x:100,y:200},placed=placeOnPath(points,position),center=centerOf(points);
  near(centerOf(placed),position);
  points.forEach((p,i)=>near({x:p.x-center.x,y:p.y-center.y},{x:placed[i].x-position.x,y:placed[i].y-position.y}));
});
test('empty, single-anchor, coincident and closed-end curves are handled',()=>{
  assert.equal(pointOnPath(measurePath([]),0),null);assert.equal(measurePath([node(10,10)]).length,0);
  const coincident=measurePath([node(10,10),node(10,10)]);assert.equal(coincident.length,0);near(pointOnPath(coincident,5),{x:10,y:10});
  assert.ok(measurePath([node(0,0,0,0,100,100),node(0,0,-100,100)]).length>100);
});
test('projects preserve guide-only drawings, and reject unsafe guide data',()=>{
  const guide={enabled:true,nodes:[node(50,100),node(800,500,700,400)]};
  const project=parseProject(JSON.stringify({version:1,width:1200,height:800,planes:[],guide}));
  assert.deepEqual(project.guide,guide);
  for(const invalid of [null,{...guide,enabled:'yes'},{...guide,nodes:Array(257).fill(node(1,1))},{...guide,nodes:[node(Infinity,0)]},{...guide,nodes:[{x:1,y:1}]}])assert.throws(()=>parseGuide(invalid));
  assert.equal(parseProject(JSON.stringify({version:1,width:1200,height:800,planes:[]})).guide,undefined);
});
