import { Suspense, useEffect, useMemo, useRef, useState, Component } from 'react'
import type { ReactNode } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { ContactShadows, Grid, Line, OrbitControls, RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import type { Car, SystemId } from './data'

export class SceneBoundary extends Component<{ children: ReactNode },{failed:boolean}> {
 state={failed:false}; static getDerivedStateFromError(){return {failed:true}}
 render(){return this.state.failed ? <div className="scene-error"><h3>3D view unavailable</h3><p>Your browser could not start WebGL. The catalogue and engineering notes remain available.</p></div> : this.props.children}
}
type V = [number,number,number]
export type SceneProps = {car:Car; paint:string; accent:string; number:string; selected:SystemId; onSelect:(id:SystemId)=>void; exploded:number; xray:boolean; hidden:boolean; spin:boolean; view:string; labels:boolean}
function Marker({label,position,onClick,active=false,scale=.26}:{label:string;position:V;onClick?:()=>void;active?:boolean;scale?:number}){
 const texture=useMemo(()=>{const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;const ctx=canvas.getContext('2d')!;ctx.beginPath();ctx.arc(64,64,55,0,Math.PI*2);ctx.fillStyle=active?'#3030e8':'#f8f9ff';ctx.fill();ctx.strokeStyle='#717aab';ctx.lineWidth=3;ctx.stroke();ctx.fillStyle=active?'#ffffff':'#16164f';ctx.font='500 42px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(label,64,65);return new THREE.CanvasTexture(canvas)},[label,active])
 useEffect(()=>()=>texture.dispose(),[texture])
 return <sprite renderOrder={5} position={position} scale={[scale,scale,1]} onClick={e=>{e.stopPropagation();onClick?.()}}><spriteMaterial map={texture} depthTest={false} transparent/></sprite>
}
function Loft({sections,color,opacity=1}:{sections:number[][];color:string;opacity?:number}){
 const geometry=useMemo(()=>{
  const pts:number[]=[];const idx:number[]=[];const n=32
  sections.forEach(([x,y,w,h])=>{for(let j=0;j<=n;j++){const t=j/n*Math.PI*2;pts.push(x,y+Math.sin(t)*h,Math.cos(t)*w)}})
  for(let i=0;i<sections.length-1;i++)for(let j=0;j<n;j++){const a=i*(n+1)+j,b=a+n+1;idx.push(a,b,a+1,b,b+1,a+1)}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pts,3));g.setIndex(idx);g.computeVertexNormals();return g
 },[sections])
 useEffect(()=>()=>geometry.dispose(),[geometry])
 return <mesh geometry={geometry} castShadow receiveShadow><meshStandardMaterial color={color} roughness={.3} metalness={.5} transparent={opacity<1} opacity={opacity} side={THREE.DoubleSide}/></mesh>
}
function Box({p,s,color,opacity=1,rotation}:{p:V;s:V;color:string;opacity?:number;rotation?:V}){return <RoundedBox position={p} args={s} radius={Math.min(...s)/4} smoothness={3} rotation={rotation} castShadow receiveShadow><meshStandardMaterial color={color} metalness={.5} roughness={.38} transparent={opacity<1} opacity={opacity}/></RoundedBox>}
function Part({id,offset,props,children}:{id:SystemId;offset:V;props:SceneProps;children:ReactNode}){
 const ref=useRef<THREE.Group>(null)
 useFrame((_,dt)=>{if(ref.current)ref.current.position.lerp(new THREE.Vector3(...offset).multiplyScalar(props.exploded),1-Math.exp(-dt*7))})
 return <group ref={ref} onClick={e=>{e.stopPropagation();props.onSelect(id)}} onPointerOver={e=>{e.stopPropagation();document.body.style.cursor='pointer'}} onPointerOut={()=>document.body.style.cursor='auto'}>{children}</group>
}
function CarAssembly(props:SceneProps){
 const {car,paint,accent,selected,xray,hidden,labels,number}=props
 const gt=car.category==='LMGT3'; const hybrid=car.architecture.includes('· hybrid')
 const bodyColor=selected==='body'?paint:paint
 const c=(id:SystemId,normal:string)=>selected===id?'#96b8ff':normal
 const alpha=xray?.17:1
 const motorX=car.architecture.startsWith('LMDh')?1.45:-1.48
 const internals=hidden||xray||props.exploded>0
 const engineX=car.architecture.includes('front-engine')?-1.05:car.architecture.includes('rear-engine')?1.65:.95
 return <group position={[0,.08,0]}>
  <Part id="floor" offset={[0,-.12,0]} props={props}><Box p={[0,.13,0]} s={[4.9,.09,1.92]} color={c('floor','#171d24')}/>{[-.6,-.3,0,.3,.6].map(z=><Box key={z} p={[2.05,.25,z]} s={[.65,.08,.045]} rotation={[0,0,.21]} color={c('floor','#343a40')}/>)}</Part>
  <Part id="chassis" offset={[0,.25,0]} props={props}><Box p={[-.1,.45,0]} s={[2.1,.55,1.04]} color={c('chassis','#2b3239')}/></Part>
  {!hidden&&<Part id="body" offset={[0,1.5,0]} props={props}>
   <Loft color={bodyColor} opacity={alpha} sections={gt?[[-2.4,.38,.1,.08],[-2.2,.52,.89,.23],[-1.45,.62,.98,.23],[-.7,.63,.86,.24],[.5,.63,.88,.25],[1.7,.59,.97,.26],[2.35,.5,.87,.22],[2.4,.5,.05,.05]]:[[-2.5,.28,.04,.04],[-2.35,.35,.53,.14],[-1.7,.4,.57,.18],[-.8,.42,.53,.22],[.7,.47,.55,.26],[1.65,.48,.72,.25],[2.35,.4,.77,.18],[2.45,.36,.05,.02]]}/>
   {[-1,1].map(sign=><group key={sign} position={[0,0,sign*.77]}>
    {!gt&&<Loft color={bodyColor} opacity={alpha} sections={[[-2.45,.36,.04,.04],[-2.25,.52,.24,.22],[-1.6,.63,.28,.27],[-.95,.5,.23,.16],[-.25,.38,.17,.16],[.65,.5,.2,.21],[1.5,.64,.28,.27],[2.27,.55,.25,.23],[2.4,.43,.05,.05]]}/>}
    <Box p={[-2.22,.54,0]} s={[.14,.045,.28]} color="#f3f9dc" opacity={alpha}/>
    <Box p={[.05,.34,sign*.06]} s={[1.42,.17,.16]} color="#171c22" opacity={alpha}/>
    {[0,1,2,3].map(i=><Box key={i} p={[-1.66+i*.13,.866,0]} s={[.045,.018,.23]} color="#252a2e" opacity={alpha}/>)}
    <Box p={[2.34,.52,0]} s={[.03,.03,.38]} color="#ff3247" opacity={alpha}/>
   </group>)}
   <Loft color={xray?paint:'#141f29'} opacity={xray?.14:1} sections={gt?[[-1.05,.73,.4,.01],[-.6,1.12,.6,.12],[.25,1.2,.61,.16],[.8,.98,.52,.13],[1.2,.71,.36,.01]]:[[-1.15,.56,.3,.02],[-.65,.84,.41,.27],[-.1,.98,.41,.29],[.5,.88,.35,.29],[.9,.59,.27,.06]]}/>
   <Box p={[gt?.1:.15,gt?1.37:1.28,0]} s={[gt?.85:.62,.028,gt?1.02:.62]} color={paint} opacity={alpha}/>
   <Box p={[-1.72,.59,0]} s={[.95,.022,.17]} color={accent} opacity={alpha}/>
   {!gt&&<Box p={[1.28,.84,0]} s={[1.68,.45,.045]} color={paint} opacity={alpha}/>}
   <Marker label={number} position={[-1.72,.64,0]} scale={.18}/>
  </Part>}
  <Part id="wing" offset={[.4,1.05,0]} props={props}><Box p={[2.13,1.17,0]} s={[.49,.065,2.09]} color={c('wing',paint)}/>{[-1,1].map(sign=><group key={sign}><Box p={[2.13,1.21,sign*1.04]} s={[.6,.25,.035]} color={c('wing',paint)}/><Box p={[1.94,.87,sign*.56]} s={[.08,.6,.06]} color={c('wing','#222930')}/></group>)}</Part>
  <group visible={internals}><Part id="engine" offset={[.6,.85,0]} props={props}><Box p={[engineX,.56,0]} s={[.75,.49,.66]} color={c('engine','#8b969d')}/>{[-1,1].map(sign=><Box key={sign} p={[engineX,.76,sign*.23]} s={[.8,.16,.27]} rotation={[sign*.25,0,0]} color={c('engine','#3b4349')}/>)}</Part>
  <Part id="gearbox" offset={[.95,.3,0]} props={props}><Box p={[1.76,.4,0]} s={[.6,.28,.42]} color={c('gearbox','#697780')}/></Part>
  {hybrid&&<Part id="hybrid" offset={[-.8,.5,0]} props={props}><Box p={[motorX,.35,0]} s={[.36,.24,.62]} color={c('hybrid','#d79741')}/><Box p={[-.35,.28,0]} s={[.78,.12,.7]} color={c('hybrid','#d79741')}/><Line points={[[motorX,.38,0],[-.6,.38,.38],[.4,.38,.38],[.8,.46,0]]} color="#ff9c3e" lineWidth={3}/></Part>}
  <Part id="cooling" offset={[0,.35,1.1]} props={props}>{[-1,1].map(sign=><group key={sign}><Box p={[.42,.48,sign*.65]} s={[.78,.35,.09]} rotation={[0,0,-.12]} color={c('cooling','#687b85')}/>{Array.from({length:12},(_,i)=><Box key={i} p={[.08+i*.06,.48,sign*.71]} s={[.013,.29,.015]} color={c('cooling','#273840')}/>)}</group>)}</Part>
  <Part id="cockpit" offset={[0,1.2,0]} props={props}><Box p={[.05,.69,0]} s={[.35,.56,.43]} rotation={[0,0,-.15]} color={c('cockpit','#25282c')}/><mesh position={[-.47,.77,0]} rotation={[0,Math.PI/2,0]}><torusGeometry args={[.17,.035,8,24]}/><meshStandardMaterial color={c('cockpit','#515d66')}/></mesh></Part>
  </group>
  {[-1.52,1.53].flatMap(x=>[-.95,.95].map(z=><group key={`${x}${z}`}>
   <Part id="suspension" offset={[0,.15,Math.sign(z)*.45]} props={props}>{[-.16,.16].map(y=><group key={y}><Line points={[[x-.35,.38+y,z*.35],[x,.43,z*.94],[x+.33,.38+y,z*.35]]} color={c('suspension','#a0aab4')} lineWidth={3}/></group>)}</Part>
   <Part id="brakes" offset={[0,.2,Math.sign(z)*.65]} props={props}><mesh position={[x,.43,z]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.25,.25,.065,32]}/><meshStandardMaterial color={c('brakes','#7c858e')} metalness={.85} roughness={.4}/></mesh><Box p={[x+.18,.45,z]} s={[.12,.24,.13]} color={c('brakes','#b58234')}/></Part>
   <Part id="wheels" offset={[0,.05,Math.sign(z)*1.1]} props={props}><group position={[x,.43,z]} rotation={[Math.PI/2,0,0]}><mesh castShadow><cylinderGeometry args={[.365,.365,.32,48]}/><meshStandardMaterial color={c('wheels','#11151a')} roughness={.82}/></mesh>{[-.17,.17].map(y=><group key={y}><mesh position={[0,y,0]}><cylinderGeometry args={[.245,.245,.02,32]}/><meshStandardMaterial color="#252b33" metalness={.8} roughness={.3}/></mesh><mesh position={[0,y*1.08,0]} rotation={[Math.PI/2,0,0]}><torusGeometry args={[.3,.007,6,48]}/><meshStandardMaterial color={accent}/></mesh>{Array.from({length:10},(_,i)=><Box key={i} p={[Math.sin(i*Math.PI/5)*.12,y*1.1,Math.cos(i*Math.PI/5)*.12]} s={[.026,.022,.24]} rotation={[0,i*Math.PI/5,0]} color="#8c969f"/>)}<mesh position={[0,y*1.2,0]}><cylinderGeometry args={[.045,.045,.02,6]}/><meshStandardMaterial color="#ceae61"/></mesh></group>)}</group></Part>
  </group>))}
  {labels&&[['wing',[2.13,1.4,0]],['body',[-1.65,1.04,-.7]],['wheels',[1.53,.7,1.15]],['cockpit',[-.1,1.5,0]]].map(([id,pos],i)=><Marker key={id as string} position={pos as V} active={selected===id} onClick={()=>props.onSelect(id as SystemId)} label={String(i+1).padStart(2,'0')}/>)}
 </group>
}
function Camera({view}:{view:string}){
 const {camera}=useThree()
 useEffect(()=>{const views:Record<string,V>={'Perspective':[-5.8,3.1,5.8],'Side':[0,1.35,7.7],'Front':[-7.7,1.35,0],'Top':[0,8,.001]};camera.position.set(...(views[view]||views.Perspective));camera.lookAt(0,.5,0)},[view,camera]);return null
}
export function CarScene(props:SceneProps){return <SceneBoundary><Canvas shadows dpr={[1,1.7]} camera={{position:[-5.8,3.1,5.8],fov:37}} gl={{antialias:true}}><color attach="background" args={['#e8eaf1']}/><ambientLight intensity={1.6}/><hemisphereLight args={['#ffffff','#697499',2]}/><directionalLight position={[-3,7,5]} intensity={3} castShadow shadow-mapSize={[1024,1024]}/><directionalLight position={[4,4,-4]} intensity={2}/><Suspense fallback={null}><CarAssembly {...props}/><ContactShadows position={[0,-.01,0]} opacity={.35} scale={14} blur={2.5} far={4} resolution={256}/></Suspense><Grid position={[0,-.02,0]} args={[24,24]} cellSize={.5} cellThickness={.4} cellColor="#cbd0df" sectionColor="#bfc5d8" sectionSize={2} sectionThickness={.7} fadeDistance={14} infiniteGrid/><Camera view={props.view}/><OrbitControls makeDefault target={[0,.5,0]} minDistance={4} maxDistance={12} maxPolarAngle={Math.PI*.48} autoRotate={props.spin} autoRotateSpeed={.7}/></Canvas></SceneBoundary>}

type Feature={geometry:{type:string;coordinates:number[]|number[][]};properties:{role:string;display?:string;name?:string;number?:number}}
export type Corner={name:string;position:V;number:number}
function TrackWorld({features,active,onCorner,night,animate}:{features:Feature[];active:string;onCorner:(c:Corner)=>void;night:boolean;animate:boolean}){
 const {points,corners}=useMemo(()=>{
 const raw=features.find(f=>f.properties.role==='outline')!.geometry.coordinates as number[][]
 const lng=raw.reduce((a,p)=>a+p[0],0)/raw.length,lat=raw.reduce((a,p)=>a+p[1],0)/raw.length
 const project=(p:number[]):V=>[(p[0]-lng)*Math.cos(lat*Math.PI/180)*150,0,-(p[1]-lat)*150]
 return {points:raw.map(project),corners:features.filter(f=>f.properties.role==='corner').map(f=>({name:f.properties.display||'Corner',number:f.properties.number||0,position:project(f.geometry.coordinates as number[])}))}
 },[features])
 const curve=useMemo(()=>{const path=new THREE.CurvePath<THREE.Vector3>();points.slice(1).forEach((p,i)=>path.add(new THREE.LineCurve3(new THREE.Vector3(...points[i]),new THREE.Vector3(...p))));path.updateArcLengths();return path},[points])
 const dot=useRef<THREE.Mesh>(null);const lap=useRef(0)
 useFrame((_,dt)=>{if(animate)lap.current=(lap.current+dt/40)%1;if(dot.current){dot.current.position.copy(curve.getPoint(lap.current));dot.current.position.y=.15}})
 return <><color attach="background" args={[night?'#05052d':'#e8eaf4']}/><ambientLight intensity={night?.5:1.7}/><directionalLight position={[4,10,3]} intensity={2}/><mesh rotation={[-Math.PI/2,0,0]} position={[0,-.08,0]} receiveShadow><planeGeometry args={[40,40]}/><meshStandardMaterial color={night?'#090930':'#dce0ef'}/></mesh><Grid args={[30,30]} position={[0,-.06,0]} cellSize={.5} cellColor={night?'#202050':'#c8cde2'} sectionColor={night?'#2b2b60':'#bac1dc'} sectionSize={2} fadeDistance={25}/><Line points={points.map(p=>[p[0],.02,p[2]] as V)} color={night?'#4f507f':'#ffffff'} lineWidth={14} depthTest={false} renderOrder={1}/><Line points={points.map(p=>[p[0],.04,p[2]] as V)} color={night?'#4444ff':'#18185b'} lineWidth={7} depthTest={false} renderOrder={2}/><mesh ref={dot}><sphereGeometry args={[.065,16,16]}/><meshStandardMaterial color="#f47740" emissive="#ed5925" emissiveIntensity={2}/></mesh>{corners.filter(c=>[1,6,7,8,9,10,12,14,18].includes(c.number)||c.name===active).map(c=><Marker key={c.number} position={[c.position[0],.15,c.position[2]]} active={active===c.name} onClick={()=>onCorner(c)} label={String(c.number)} scale={.22}/>)}<OrbitControls makeDefault target={[0,0,0]} minDistance={5} maxDistance={20} maxPolarAngle={Math.PI*.47}/></>
}
export function TrackScene({active,onCorner,night,animate}:{active:string;onCorner:(c:Corner)=>void;night:boolean;animate:boolean}){
 const [features,setFeatures]=useState<Feature[]>([]);const [error,setError]=useState(false)
 useEffect(()=>{fetch('/data/sarthe.geojson').then(r=>{if(!r.ok)throw Error();return r.json()}).then(d=>setFeatures(d.features)).catch(()=>setError(true))},[])
 if(error)return <div className="scene-error">Circuit data could not load. Reload the page to retry.</div>
 if(!features.length)return <div className="scene-error">Loading the circuit…</div>
 return <SceneBoundary><Canvas camera={{position:[-5,8,7],fov:39}} dpr={[1,1.7]}><TrackWorld features={features} active={active} onCorner={onCorner} night={night} animate={animate}/></Canvas></SceneBoundary>
}
