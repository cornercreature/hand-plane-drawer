import * as THREE from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {Line2} from 'three/addons/lines/Line2.js';
import {LineGeometry} from 'three/addons/lines/LineGeometry.js';
import {LineMaterial} from 'three/addons/lines/LineMaterial.js';
import {planeFaces} from './geometry.mjs';
import {planeVertices,materials} from './material.mjs';
type Plane={points:{x:number;y:number}[];style:{color:string;edge:string;fill:boolean;opacity:number;width:number;thickness?:number;material?:string};stroke:number};
export class PlaneRenderer{
  renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});
  scene=new THREE.Scene();camera=new THREE.PerspectiveCamera();
  cache=new Map<Plane,THREE.Group>();width=0;height=0;
  constructor(){
    this.renderer.setClearColor(0,0);this.renderer.outputColorSpace=THREE.SRGBColorSpace;
    this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.1;
    const room=new RoomEnvironment(),pmrem=new THREE.PMREMGenerator(this.renderer);
    this.scene.environment=pmrem.fromScene(room,.04).texture;room.dispose();pmrem.dispose();
    const light=new THREE.DirectionalLight(0xffffff,2.5);light.position.set(-3,4,5);this.scene.add(light);
  }
  remove(plane:Plane,group:THREE.Group){group.traverse(o=>{if(o instanceof THREE.Mesh||o instanceof THREE.Line){o.geometry.dispose();o.material.dispose();}});this.scene.remove(group);this.cache.delete(plane);}
  render(planes:Plane[],width:number,height:number,scale=1){
    if(width!==this.width||height!==this.height){for(const [p,g] of this.cache)this.remove(p,g);this.width=width;this.height=height;}
    const rw=Math.round(width*scale),rh=Math.round(height*scale);
    if(Math.max(rw,rh)>this.renderer.capabilities.maxTextureSize)throw new Error('This resolution exceeds your GPU limit. Choose a lower DPI.');
    if(this.renderer.domElement.width!==rw||this.renderer.domElement.height!==rh)this.renderer.setSize(rw,rh,false);
    this.camera.fov=2*Math.atan(height/(2*width))*180/Math.PI;this.camera.aspect=width/height;this.camera.near=.001;this.camera.far=1000;this.camera.updateProjectionMatrix();
    const live=new Set(planes);for(const [p,g] of this.cache)if(!live.has(p))this.remove(p,g);
    let order=0;
    for(const p of planes){
      let group=this.cache.get(p);
      if(!group){
        group=new THREE.Group();this.cache.set(p,group);this.scene.add(group);
        for(const face of planeFaces(p)){
          const vertices=planeVertices(face.points,width,height).flat(),geometry=new THREE.BufferGeometry();
          geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setIndex([0,1,2,0,2,3]);geometry.computeVertexNormals();
          const common={color:face.style.color,opacity:face.style.opacity,transparent:true,side:THREE.DoubleSide,depthTest:false,depthWrite:false,forceSinglePass:true};
          if(face.style.fill){const material=face.style.material??'flat';group.add(new THREE.Mesh(geometry,material==='flat'?new THREE.MeshBasicMaterial({...common,toneMapped:false}):new THREE.MeshStandardMaterial({...common,...materials[material as keyof typeof materials],envMapIntensity:1.3,forceSinglePass:true})));}else geometry.dispose();
          if(face.style.width>0){const edgeGeometry=new LineGeometry().setPositions([...vertices,...vertices.slice(0,3)]);
            group.add(new Line2(edgeGeometry,new LineMaterial({color:face.style.edge,linewidth:face.style.width,transparent:true,depthTest:false,depthWrite:false,toneMapped:false})));}
        }
      }
      group.children.forEach(o=>{o.renderOrder=order++;if(o instanceof Line2){o.material.linewidth=p.style.width*scale;o.material.resolution.set(rw,rh);}});
    }
    this.renderer.render(this.scene,this.camera);return this.renderer.domElement;
  }
}
