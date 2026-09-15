export type MobilityStation = {id:string; name:string; eligible:boolean; [key:string]:unknown};
export type MobilityDay = {date:string; weekday:string; departures:number[]; arrivals:number[]; actual:number[]; forecast_num:(number|null)[]; history_count:number[]};
export type MobilityResult = {transfer:number[]; residual:number; forecast_residual_num:number; forecast_residual:number; worst_station_residual:number; moves:number; touched:number; unused_budget:number; net_flow_bound:number; feasible:boolean};
export type MobilityPolicy = 'no_action'|'greedy'|'optimized'|'oracle';
export const mobilityPolicies:MobilityPolicy[]=['no_action','greedy','optimized','oracle'];
export const mobilityLabels:Record<MobilityPolicy,string>={no_action:'No relocation',greedy:'Greedy pairing',optimized:'Exact allocation',oracle:'Perfect-information reference'};
const ascii=(a:string,b:string)=>a<b?-1:a>b?1:0;
function check(ids:string[],f:(number|null)[],eligible:boolean[],B:number,K:number,protectedIndex:number|null,L:number){
 if(!Number.isSafeInteger(B)||B<0||B>100000||!Number.isSafeInteger(K)||K<0||!Number.isSafeInteger(L)||L<=0)throw Error('Invalid budget, station limit or forecast scale.');
 if(ids.length!==f.length||ids.length!==eligible.length||new Set(ids).size!==ids.length||ids.some(id=>typeof id!=='string'||!/^[\x00-\x7F]*$/.test(id))||eligible.some(v=>typeof v!=='boolean'))throw Error('Invalid station dimensions.');
 if(protectedIndex!==null&&(!Number.isInteger(protectedIndex)||protectedIndex<0||protectedIndex>=ids.length))throw Error('Invalid protected station.');
 if(f.some((v,i)=>v===null?eligible[i]:!Number.isSafeInteger(v)||Math.abs(v)>1e9)||ids.length*1e9>Number.MAX_SAFE_INTEGER)throw Error('Invalid exact forecast.');
}
type Unit={gain:number;i:number;mag:number};
function stream(pool:number[],n:number,f:(number|null)[],ids:string[],B:number,L:number):Unit[]{
 const full:Unit[]=[],fraction:Unit[]=[];
 for(const i of pool.slice(0,n)){
  const mag=Math.abs(f[i]??0),q=Math.floor(mag/L),rem=mag%L;
  for(let j=0;j<q&&full.length<B;j++)full.push({gain:L,i,mag});
  if(rem)fraction.push({gain:2*rem-L,i,mag});
 }
 fraction.sort((a,b)=>b.gain-a.gain||b.mag-a.mag||ascii(ids[a.i],ids[b.i]));
 return full.concat(fraction).slice(0,B);
}
export function mobilityOptimize(ids:string[],f:(number|null)[],eligible:boolean[],B:number,K:number,protectedIndex:number|null=null,L=60):number[]{
 check(ids,f,eligible,B,K,protectedIndex,L);
 const r=ids.map(()=>0);if(!B||K<2)return r;
 const pool=(sign:number)=>ids.map((_,i)=>i).filter(i=>eligible[i]&&i!==protectedIndex&&(f[i]??0)*sign>0).sort((a,b)=>Math.abs(f[b]??0)-Math.abs(f[a]??0)||ascii(ids[a],ids[b]));
 const pos=pool(1),neg=pool(-1),np=Math.min(K-1,pos.length),nn=Math.min(K-1,neg.length);
 const ps=Array.from({length:np+1},(_,n)=>stream(pos,n,f,ids,B,L)),ns=Array.from({length:nn+1},(_,n)=>stream(neg,n,f,ids,B,L));
 let bestGain=0,bestMoves=0,bestTouched=0,bestP=0,bestN=0;
 for(let p=1;p<=np;p++)for(let n=1;n<=nn&&p+n<=K;n++){
  const a=ps[p],b=ns[n],touched=new Set<number>();let gain=0,m=0;
  while(m<Math.min(B,a.length,b.length)&&a[m].gain+b[m].gain>0){gain+=a[m].gain+b[m].gain;touched.add(a[m].i);touched.add(b[m].i);m++;}
  if(gain>bestGain||(gain===bestGain&&(m<bestMoves||(m===bestMoves&&touched.size<bestTouched)))){bestGain=gain;bestMoves=m;bestTouched=touched.size;bestP=p;bestN=n;}
 }
 for(let j=0;j<bestMoves;j++){r[ps[bestP][j].i]++;r[ns[bestN][j].i]--;}
 return r;
}
export function mobilityGreedy(ids:string[],f:(number|null)[],eligible:boolean[],B:number,K:number,protectedIndex:number|null=null,L=60):number[]{
 check(ids,f,eligible,B,K,protectedIndex,L);const r=ids.map(()=>0);let touched=0;if(K<2)return r;
 type Candidate={i:number;gain:number;remaining:number;added:number};
 const better=(a:Candidate,b:Candidate|null)=>!b||a.gain>b.gain||(a.gain===b.gain&&(a.remaining>b.remaining||(a.remaining===b.remaining&&ascii(ids[a.i],ids[b.i])<0)));
 for(let m=0;m<B;m++){
  const positive:(Candidate|null)[]=[null,null],negative:(Candidate|null)[]=[null,null];
  for(let i=0;i<ids.length;i++){
   const value=f[i]??0;if(!eligible[i]||i===protectedIndex||value===0)continue;
   const rem=Math.abs(value)-L*Math.abs(r[i]);if(rem<=0)continue;
   const c={i,gain:Math.abs(rem)-Math.abs(rem-L),remaining:Math.max(0,rem),added:r[i]===0?1:0};
   const side=value>0?positive:negative;if(better(c,side[c.added]))side[c.added]=c;
  }
  let best:{p:Candidate;n:Candidate;gain:number;added:number;remaining:number}|null=null;
  for(const p of positive)for(const n of negative){
   if(!p||!n||touched+p.added+n.added>K)continue;
   const c={p,n,gain:p.gain+n.gain,added:p.added+n.added,remaining:p.remaining+n.remaining};
   if(c.gain<=0)continue;
   if(!best||c.gain>best.gain||(c.gain===best.gain&&(c.added<best.added||(c.added===best.added&&(c.remaining>best.remaining||(c.remaining===best.remaining&&(ascii(ids[p.i],ids[best.p.i])<0||(ids[p.i]===ids[best.p.i]&&ascii(ids[n.i],ids[best.n.i])<0))))))))best=c;
  }
  if(!best)break;r[best.p.i]++;r[best.n.i]--;touched+=best.added;
 }
 return r;
}
export function mobilityEvaluate(r:number[],actual:number[],f:(number|null)[],eligible:boolean[],B:number,K:number,protectedIndex:number|null=null,L=60):MobilityResult{
 if(r.length!==actual.length||r.length!==f.length||r.length!==eligible.length||actual.some(v=>!Number.isSafeInteger(v)))throw Error('Invalid observed flow.');
 const moves=r.reduce((s,v)=>s+Math.max(0,v),0),touched=r.filter(v=>v!==0).length;
 const residuals=actual.map((v,i)=>Math.abs(v-r[i]));
 const forecast_residual_num=f.reduce<number>((s,v,i)=>s+(v===null||!eligible[i]?0:Math.abs(v-L*r[i])),0);
 const feasible=r.every((v,i)=>Number.isSafeInteger(v)&&((eligible[i]&&i!==protectedIndex)||v===0))&&r.reduce((a,b)=>a+b,0)===0&&moves<=B&&touched<=K;
 if(!feasible)throw Error('Allocation violates the stated scenario constraints.');
 return {transfer:r,residual:residuals.reduce((a,b)=>a+b,0),forecast_residual_num,forecast_residual:forecast_residual_num/L,worst_station_residual:Math.max(0,...residuals),moves,touched,unused_budget:B-moves,net_flow_bound:Math.abs(actual.reduce((a,b)=>a+b,0)),feasible};
}
export function mobilityAll(stations:MobilityStation[],day:MobilityDay,B:number,K:number,protectedIndex:number|null=null):Record<MobilityPolicy,MobilityResult>{
 const ids=stations.map(s=>s.id),e=stations.map(s=>s.eligible),f=day.forecast_num;
 const plans={no_action:ids.map(()=>0),greedy:mobilityGreedy(ids,f,e,B,K,protectedIndex),optimized:mobilityOptimize(ids,f,e,B,K,protectedIndex),oracle:mobilityOptimize(ids,day.actual.map(v=>v*60),e,B,K,protectedIndex)};
 return Object.fromEntries(mobilityPolicies.map(p=>[p,mobilityEvaluate(plans[p],day.actual,f,e,B,K,protectedIndex)])) as Record<MobilityPolicy,MobilityResult>;
}
