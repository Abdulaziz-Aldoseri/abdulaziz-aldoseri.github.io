import { useEffect, useRef, useState } from 'react';
import { useEvaluatedScenario, focusStudyResult } from '../lib/useEvaluatedScenario';
import { ChoiceControl, StepControl, StudyWorkbench, StudyControlPanel } from './StudyControls';

type Parameters = { passenger_multiplier:number; frequency_fraction:number; daily_operating_hours:number };
type Assignment = { route_id:string; month:number; type_id:string; roundtrips:number };
type FleetPlan = {
  fleet_by_type:Record<string,number>; total_fleet:number; total_roundtrips:number; total_minutes:number;
  assignments:Assignment[];
  utilization:{type_id:string; month:number; used_minutes:number; available_minutes:number; utilization_fraction:number}[];
  route_outcomes:{route_id:string; month:number; target_passengers:number; target_roundtrips:number; seats:number; roundtrips:number}[];
};
type Scenario = { id:string; parameters:Parameters; optimized:FleetPlan; baseline:FleetPlan };
type ScenarioSummary = {id:string;sha256:string;parameters:Parameters;optimized:{total_fleet:number};baseline:{total_fleet:number}};
export type AirlineIndex = {
  year:number; default_scenario_id:string; types:{id:string;label:string}[];
  routes:{id:string;destination:string;coefficients:Record<string,{seats:number;block_minutes:number}>}[];
  scenario_choices:{passenger_multiplier:number[]; frequency_fraction:number[]; daily_operating_hours:number[]};
  scenarios:ScenarioSummary[]; default_case:Scenario;
};
const format = (n:number, decimals=0) => new Intl.NumberFormat('en-GB',{maximumFractionDigits:decimals}).format(n);
const monthName = (m:number) => new Intl.DateTimeFormat('en-GB',{month:'long',timeZone:'UTC'}).format(new Date(Date.UTC(2025,m-1,1)));
const labels = { optimized:'Minimum-fleet plan', baseline:'Historical-share rule' };
type Policy = keyof typeof labels;

export default function AirlineExplorer({index}:{index:AirlineIndex}) {
  const reference = index.default_case;
  if (!reference || index.scenarios.length!==27) throw new Error('The reviewed airline scenario grid is incomplete.');
  const [id,setId] = useState(reference.id);
  const [month,setMonth] = useState(1);
  const [policy,setPolicy] = useState<Policy>('optimized');
  const [cap,setCap] = useState<number|null>(null);
  const [ready,setReady] = useState(false);
  const resultRef = useRef<HTMLElement>(null);
  const moveFocus = useRef(false);
  const maxCap = Math.max(...index.scenarios.map(s=>s.baseline.total_fleet));
  const selected = index.scenarios.find(s=>s.id===id)!;
  const {scenario,loading,failure,retry}=useEvaluatedScenario(id,reference,'/data/airline',selected.sha256,
    (v):v is Scenario=>!!v&&typeof v==='object'&&'id' in v&&['optimized','baseline'].every(p=>{
      const plan=(v as Record<string,any>)[p];return plan&&Number.isInteger(plan.total_fleet)&&Array.isArray(plan.assignments)&&Array.isArray(plan.utilization)&&Array.isArray(plan.route_outcomes);
    }));
  const plan = scenario[policy];
  const feasible = cap===null || plan.total_fleet<=cap;
  const possible = cap===null || scenario.optimized.total_fleet<=cap;
  useEffect(()=>{
    const restore=()=>{
      const p=new URLSearchParams(location.search);
      setId(index.scenarios.some(s=>s.id===p.get('scenario'))?p.get('scenario')!:reference.id);
      const m=p.get('month')||'';setMonth(/^(?:[1-9]|1[0-2])$/.test(m)?Number(m):1);
      const c=p.get('cap')||'';setCap(/^\d+$/.test(c)&&Number(c)<=maxCap?Number(c):null);
      setPolicy(p.get('policy')==='baseline'?'baseline':'optimized');
    };
    restore();setReady(true);window.addEventListener('popstate',restore);
    return()=>window.removeEventListener('popstate',restore);
  },[]);
  useEffect(()=>{
    if(!ready)return;
    const p=new URLSearchParams({scenario:id,month:String(month),policy});if(cap!==null)p.set('cap',String(cap));
    history.replaceState(null,'',location.pathname+'?'+p+location.hash);
    if(moveFocus.current){focusStudyResult(resultRef.current);moveFocus.current=false;}
  },[id,month,policy,cap,ready]);
  const change=(key:keyof Parameters,value:number)=>{
    const next=index.scenarios.find(s=>(Object.keys(s.parameters) as (keyof Parameters)[]).every(k=>s.parameters[k]===(k===key?value:selected.parameters[k])));
    if(next)setId(next.id);
  };
  const reset=()=>{setId(reference.id);setMonth(1);setPolicy('optimized');setCap(null);};
  const show=(s:ScenarioSummary)=>{moveFocus.current=true;setId(s.id);if(s.id===id){focusStudyResult(resultRef.current);moveFocus.current=false;}};
  const scale=Math.max(1,...index.types.flatMap(t=>[scenario.optimized.fleet_by_type[t.id],scenario.baseline.fleet_by_type[t.id]]));
  const presets = [
    {label:'Reference',id:reference.id},
    {label:'Higher passenger target',id:index.scenarios.find(s=>s.parameters.passenger_multiplier===1.2&&s.parameters.frequency_fraction===.75&&s.parameters.daily_operating_hours===8)!.id},
    {label:'Fewer aircraft hours',id:index.scenarios.find(s=>s.parameters.passenger_multiplier===1&&s.parameters.frequency_fraction===.75&&s.parameters.daily_operating_hours===6)!.id},
  ];
  return <div>
    <p className="allocation-caption">The tool displays 27 precomputed, independently checked planning scenarios. The aircraft cap checks their certified minimum; it does not produce a new timetable. All targets are known retrospectively.</p>
    <StudyWorkbench>
    <StudyControlPanel summary={`${loading?(failure?'Result unavailable':'Loading result…'):feasible?`${policy==='optimized'?'Minimum':'Rule'}: ${plan.total_fleet} aircraft`:possible?'Rule exceeds cap':'Infeasible under cap'} · ${selected.parameters.passenger_multiplier*100}% passengers · ${selected.parameters.frequency_fraction*100}% frequency · ${selected.parameters.daily_operating_hours}h/day${cap===null?'':` · cap ${cap}`}`}>
    <fieldset className="study-control-fields" disabled={!ready}>
      <legend className="sr-only">Aircraft planning scenarios</legend>
      <div className="study-presets" role="group" aria-label="Aircraft scenario presets">{presets.map(p=><button type="button" key={p.id} aria-pressed={id===p.id} onClick={()=>setId(p.id)}>{p.label}</button>)}</div>
      <small>Presets change the service assumptions. Your aircraft cap and month detail stay selected.</small>
      <ChoiceControl label="Passenger coverage target" value={selected.parameters.passenger_multiplier} options={index.scenario_choices.passenger_multiplier.map(v=>({value:v,label:`${v*100}%`}))} onChange={v=>change('passenger_multiplier',v)} help="A scenario relative to recorded 2025 passengers, not a demand forecast." />
      <ChoiceControl label="Frequency floor" value={selected.parameters.frequency_fraction} options={index.scenario_choices.frequency_fraction.map(v=>({value:v,label:`${v*100}%`}))} onChange={v=>change('frequency_fraction',v)} help="Minimum paired service relative to recorded departures, on each route in every month." />
      <ChoiceControl label="Daily aircraft-hour allowance" value={selected.parameters.daily_operating_hours} options={index.scenario_choices.daily_operating_hours.map(v=>({value:v,label:`${v} hours`}))} onChange={v=>change('daily_operating_hours',v)} help="Block time plus assumed turnarounds; 10% is withheld as a reserve." />
      <label className="study-toggle"><input type="checkbox" checked={cap!==null} onChange={e=>setCap(e.target.checked?selected.optimized.total_fleet:null)} />Apply an aircraft cap</label>
      {cap!==null&&<StepControl label="Available aircraft cap" value={cap} options={Array.from({length:maxCap+1},(_,v)=>({value:v,label:`${v} aircraft`}))} onChange={setCap} help="An optional hypothetical ceiling. Below the proven minimum, the service target is infeasible." />}
      <ChoiceControl label="Plan to inspect" value={policy} options={(Object.keys(labels) as Policy[]).map(value=>({value,label:labels[value]}))} onChange={setPolicy} help="The simple rule keeps each route’s historical aircraft-type shares approximately, after integer rounding." />
      <button type="button" className="reset-button" onClick={reset}>Reset to reference</button>
    </fieldset>
    </StudyControlPanel>
    <div className="study-workbench-results">
    <section ref={resultRef} className="allocation-result" tabIndex={-1} aria-label="Aircraft planning result">
      {loading?<div className="allocation-error" role="status"><p>{failure||'Loading the selected evaluated scenario…'}</p>{failure&&<button className="button" onClick={retry}>Retry scenario</button>}</div>:<>
      <h3>{labels[policy]} · full-year fleet</h3>
      <p className="allocation-caption" role="status" aria-live="polite">{scenario.parameters.passenger_multiplier*100}% passenger target · {scenario.parameters.frequency_fraction*100}% frequency floor · {scenario.parameters.daily_operating_hours} hours/day · {cap===null?'uncapped':`${cap}-aircraft cap`} · {feasible?'feasible within the aggregate model':possible?'this rule exceeds the cap':'service target infeasible under this cap'}</p>
      {!feasible ? <div className="allocation-error"><h4>{possible?'The simple rule needs more aircraft than this cap allows.':'The available fleet cannot cover this service envelope.'}</h4><p>The proven minimum is {scenario.optimized.total_fleet} aircraft. The historical-share rule requires {scenario.baseline.total_fleet}. {possible?'A feasible minimum-fleet plan exists under the selected cap.':'Increase the cap, relax a service target or allow more aircraft hours.'}</p>{possible&&<button className="button" onClick={()=>setPolicy('optimized')}>Inspect the feasible plan</button>}</div> : <>
      <div className="metric-grid"><div><span>Aircraft across all months</span><strong>{format(plan.total_fleet)}</strong></div><div><span>Paired round trips in 2025</span><strong>{format(plan.total_roundtrips)}</strong></div><div><span>Model aircraft hours in 2025</span><strong>{format(plan.total_minutes/60)}</strong></div></div>
      <div className="allocation-interpretation"><p>Under these assumptions, the minimum-fleet plan requires {scenario.optimized.total_fleet} aircraft, compared with {scenario.baseline.total_fleet} for the historical-share rule: {scenario.baseline.total_fleet===scenario.optimized.total_fleet?'the same total fleet requirement':`${scenario.baseline.total_fleet-scenario.optimized.total_fleet} fewer aircraft in this model`}. This comparison changes the modelled service allocation; it does not estimate spare aircraft or savings at SkyWest.</p><p>One optimal mix is shown. Other mixes may achieve the same minimum. The secondary objectives reduce round trips, then model aircraft minutes.</p></div>
      <div className="allocation-chart" role="img" aria-label={`Aircraft counts by type. ${index.types.map(t=>`${t.label}: minimum plan ${scenario.optimized.fleet_by_type[t.id]}, historical-share rule ${scenario.baseline.fleet_by_type[t.id]}`).join('. ')}`}>
        <h4>Fleet composition · whole aircraft</h4>
        <div className="allocation-mini-legend" aria-hidden="true"><span><i />Minimum-fleet plan</span><span><i className="copper" />Historical-share rule</span></div>
        {index.types.map(t=><div key={t.id}>{(['optimized','baseline'] as Policy[]).map(p=><div className="allocation-bar-row" key={p} aria-hidden="true"><span>{t.label} · {p==='optimized'?'minimum':'rule'}</span><div className="allocation-bar-track"><div className={`allocation-bar ${p==='baseline'?'copper':''}`} style={{width:`${100*scenario[p].fleet_by_type[t.id]/scale}%`}} /></div><strong>{scenario[p].fleet_by_type[t.id]}</strong></div>)}</div>)}
      </div>
      <StepControl label="Month detail" value={month} options={Array.from({length:12},(_,i)=>({value:i+1,label:`${monthName(i+1)} 2025`}))} onChange={setMonth} disabled={!ready} help="Move through the monthly detail below. Aircraft counts cover all twelve months together." />
      <h4>How the selected fleet is used in {monthName(month)}</h4>
      <p className="allocation-caption">Available hours already exclude the 10% reserve. Usage includes both directions’ block time and two assumed 30-minute turnarounds per round trip. Zero aircraft means no capacity; its utilization is shown as unavailable.</p>
      <div className="table-wrap allocation-table" tabIndex={0} role="region" aria-label="Monthly aircraft hours"><table><caption>{labels[policy]} · {monthName(month)} 2025 · aggregate aircraft hours</caption><thead><tr><th>Aircraft type</th><th>Aircraft</th><th>Hours used</th><th>Hours available</th><th>Utilization</th></tr></thead><tbody>{index.types.map(t=>{const u=plan.utilization.find(r=>r.type_id===t.id&&r.month===month)!;return <tr key={t.id}><th scope="row">{t.label}</th><td>{plan.fleet_by_type[t.id]}</td><td>{format(u.used_minutes/60,1)}</td><td>{format(u.available_minutes/60,1)}</td><td>{u.available_minutes?`${format(u.utilization_fraction*100,1)}%`:'N/A'}</td></tr>;})}</tbody></table></div>
      <details className="data-details"><summary>Route assignments and service coverage</summary><p>Each paired round trip supplies the stated seats in each direction. The target uses the larger directional passenger count and departure count; seat capacity is not multiplied by two here.</p><div className="table-wrap allocation-table" tabIndex={0} role="region" aria-label="Route service allocation"><table><caption>{labels[policy]} · {monthName(month)} · round trips by aircraft type</caption><thead><tr><th>Route</th>{index.types.map(t=><th key={t.id}>{t.label}</th>)}<th>Trips / floor</th><th>Seats / target<br />per direction</th></tr></thead><tbody>{index.routes.map(r=>{const o=plan.route_outcomes.find(o=>o.route_id===r.id&&o.month===month)!;return <tr key={r.id}><th scope="row">DEN ↔ {r.destination}</th>{index.types.map(t=><td key={t.id}>{r.coefficients[t.id]?format(plan.assignments.find(a=>a.route_id===r.id&&a.month===month&&a.type_id===t.id)?.roundtrips||0):'Ineligible'}</td>)}<td>{format(o.roundtrips)} / {format(o.target_roundtrips)}</td><td>{format(o.seats)} / {format(o.target_passengers)}</td></tr>;})}</tbody></table></div></details>
      </>}
      </>}
    </section>
    <section className="period-panel" id="airline-scenarios"><h3>Every planning scenario</h3><p className="allocation-caption">All 27 combinations use the same eight routes and twelve months. Select a row to inspect its fleet composition. Counts below are uncapped requirements; the optional cap remains selected when you switch scenarios.</p><div className="table-wrap allocation-table" tabIndex={0} role="region" aria-label="All airline planning scenarios"><table><caption>Aircraft required across the full year · lower is better for the stated objective</caption><thead><tr><th>Scenario</th><th>Minimum fleet</th><th>Historical-share rule</th><th>Difference</th><th>Inspect</th></tr></thead><tbody>{index.scenarios.map(s=><tr key={s.id} className={s.id===id?'selected-row':''}><th scope="row">{s.parameters.passenger_multiplier*100}% passengers · {s.parameters.frequency_fraction*100}% frequency · {s.parameters.daily_operating_hours}h/day</th><td>{s.optimized.total_fleet}</td><td>{s.baseline.total_fleet}</td><td>{s.baseline.total_fleet-s.optimized.total_fleet}</td><td><button className="inline-button" disabled={!ready} aria-label={`Inspect ${s.parameters.passenger_multiplier*100}% passengers, ${s.parameters.frequency_fraction*100}% frequency, ${s.parameters.daily_operating_hours} hours`} onClick={()=>show(s)}>Inspect →</button></td></tr>)}</tbody></table></div></section>
    </div>
    </StudyWorkbench>
  </div>;
}
