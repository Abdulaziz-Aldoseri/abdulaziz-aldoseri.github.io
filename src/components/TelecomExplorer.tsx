import { useEffect, useRef, useState } from 'react';
import { useEvaluatedScenario, focusStudyResult } from '../lib/useEvaluatedScenario';
import { ChoiceControl, StepControl, StudyWorkbench, StudyControlPanel } from './StudyControls';

type Vector=number[];
type WeekResult={allocation:Vector;dedicated:Vector;availableStaff:number;capacity:Vector;openingBacklog:Vector;projectedScaled:Vector;actualIntake:Vector;processed:Vector;endBacklog:Vector;olderBacklog:Vector;oldestAge:number;unprocessedShares:Vector;maxUnprocessedShare:number;unusedCapacity:Vector;reallocated:number};
type Summary={cumulativeBacklog:number;endingBacklog:number;endingByQueue:Vector;totalProcessed:number;unusedCapacity:number;meanWorstShare:number;worstShare:number;oldestAge:number;reallocated:number};
type Policy='fixed'|'adaptive'|'optimized'|'hindsight';
type Scenario={id:string;staff:number;crossTrainedPercent:number;capacityPercent:number;dedicated:Vector;flex:number;policies:Record<Policy,{weeks:WeekResult[];summary:Summary}>;comparisons:Record<string,{cumulativeBacklogDifference:number;endingBacklogDifference:number;meanWorstShareDifference:number;higherBacklogWeeks:number;higherWorstShareWeeks:number}>};
export type TelecomIndex={
  queues:{id:string;label:string}[];weeks:string[];observed:Vector[];forecastScaled:Vector[];forecastScale:number;
  selectedForecastWindow:number;controls:{staff:number[];crossTrainedPercent:number[];capacityPercent:number[]};
  default:{scenarioId:string;weekIndex:number};scenarios:{id:string;sha256:string;staff:number;crossTrainedPercent:number;capacityPercent:number}[];default_case:Scenario;
  assumptions:{baseCasesPerSpecialistWeek:number[];specialistSharePercent:number[];crossTrainedEfficiencyPercent:number};
};
const labels:Record<Policy,string>={optimized:'Balance queue coverage',adaptive:'Adaptive workload share',fixed:'Fixed training-workload share',hindsight:'Current-week hindsight'};
const policies:Policy[]=['optimized','adaptive','fixed','hindsight'];
const shortLabels:Record<Policy,string>={optimized:'Coverage',adaptive:'Adaptive',fixed:'Fixed',hindsight:'Hindsight'};
const sum=(x:Vector)=>x.reduce((a,b)=>a+b,0);
const fmt=(v:number,d=0)=>new Intl.NumberFormat('en-GB',{maximumFractionDigits:d}).format(v);
const date=(s:string)=>new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',timeZone:'UTC'}).format(new Date(s+'T00:00:00Z'));

export default function TelecomExplorer({index}:{index:TelecomIndex}){
  const reference=index.default_case;
  if(!reference||index.scenarios.length!==72||index.weeks.length!==12)throw new Error('The reviewed telecom scenario grid is incomplete.');
  const [id,setId]=useState(reference.id);const [week,setWeek]=useState(index.default.weekIndex);const [policy,setPolicy]=useState<Policy>('optimized');const [ready,setReady]=useState(false);
  const resultRef=useRef<HTMLElement>(null);const moveFocus=useRef(false);
  const selected=index.scenarios.find(s=>s.id===id)!;
  const {scenario,loading,failure,retry}=useEvaluatedScenario(id,reference,'/data/telecom',selected.sha256,
    (v):v is Scenario=>!!v&&typeof v==='object'&&'policies' in v&&policies.every(p=>Array.isArray((v as Scenario).policies[p]?.weeks)&&(v as Scenario).policies[p].weeks.length===12));
  const trajectory=scenario.policies[policy];const current=trajectory.weeks[week];const comparison=scenario.comparisons.adaptive;
  useEffect(()=>{const restore=()=>{const p=new URLSearchParams(location.search);setId(index.scenarios.some(s=>s.id===p.get('scenario'))?p.get('scenario')!:reference.id);const i=index.weeks.indexOf(p.get('week')||'');setWeek(i<0?index.default.weekIndex:i);setPolicy(policies.includes(p.get('policy') as Policy)?p.get('policy') as Policy:'optimized');};restore();setReady(true);window.addEventListener('popstate',restore);return()=>window.removeEventListener('popstate',restore);},[]);
  useEffect(()=>{if(!ready)return;const p=new URLSearchParams({scenario:id,week:index.weeks[week],policy});history.replaceState(null,'',location.pathname+'?'+p+location.hash);if(moveFocus.current){focusStudyResult(resultRef.current);moveFocus.current=false;}},[id,week,policy,ready]);
  const change=(key:'staff'|'crossTrainedPercent'|'capacityPercent',value:number)=>{const s=index.scenarios.find(s=>(['staff','crossTrainedPercent','capacityPercent'] as const).every(k=>s[k]===(k===key?value:selected[k])));if(s)setId(s.id);};
  const selectWeek=(i:number)=>{moveFocus.current=true;setWeek(i);if(i===week){focusStudyResult(resultRef.current);moveFocus.current=false;}};
  const staffScale=Math.max(1,...current.dedicated.map((v,i)=>v+current.allocation[i]));
  const chartMax=Math.max(1,...policies.flatMap(p=>scenario.policies[p].weeks.map(w=>sum(w.endBacklog))));
  const line=(p:Policy)=>scenario.policies[p].weeks.map((w,i)=>`${85+i*615/11},${205-175*sum(w.endBacklog)/chartMax}`).join(' ');
  const colors:Record<Policy,string>={optimized:'#0d605a',adaptive:'#b25834',fixed:'#718b7c',hindsight:'#546382'};
  const presets = [
    {label:'Reference',id:reference.id},
    {label:'No staff',id:index.scenarios.find(s=>s.staff===0&&s.crossTrainedPercent===25&&s.capacityPercent===100)!.id},
    {label:'Larger team',id:index.scenarios.find(s=>s.staff===72&&s.crossTrainedPercent===25&&s.capacityPercent===100)!.id},
  ];
  const weekOptions=index.weeks.map((w,i)=>({value:i,label:`Week of ${date(w)} 2025`}));
  return <div>
    <p className="allocation-caption">The controls select one of 72 precomputed staffing scenarios. Observed intake comes from FCC consumer complaints; every capacity, staff allocation and backlog below is hypothetical. The forecast uses the preceding {index.selectedForecastWindow} completed {index.selectedForecastWindow===1?'week':'weeks'}.</p>
    <StudyWorkbench>
    <StudyControlPanel summary={`${selected.staff} staff · ${selected.crossTrainedPercent}% flexible · ${selected.capacityPercent}% rates · ${loading?(failure?'result unavailable':'loading result…'):`${shortLabels[policy]}: ${fmt(sum(current.endBacklog))} simulated backlog, ${date(index.weeks[week])}`}`}>
    <fieldset className="study-control-fields" disabled={!ready}><legend className="sr-only">Telecom staffing scenarios</legend>
      <div className="study-presets" role="group" aria-label="Staffing scenario presets">{presets.map(p=><button type="button" key={p.id} aria-pressed={id===p.id} onClick={()=>setId(p.id)}>{p.label}</button>)}</div>
      <small>Presets change the staffing assumptions. Your selected policy and week stay selected.</small>
      <StepControl label="Team size" value={selected.staff} options={index.controls.staff.map(v=>({value:v,label:`${v} staff`}))} onChange={v=>change('staff',v)} help="Hypothetical whole-person workforce, fixed across the twelve-week scenario." />
      <ChoiceControl label="Cross-trained share" value={selected.crossTrainedPercent} options={index.controls.crossTrainedPercent.map(v=>({value:v,label:`${v}%`}))} onChange={v=>change('crossTrainedPercent',v)} help="Flexible staff can move between queues but process at 80% of specialist capacity. More flexibility also changes the team’s processing capacity." />
      <ChoiceControl label="Processing capacity" value={selected.capacityPercent} options={index.controls.capacityPercent.map(v=>({value:v,label:`${v}%`}))} onChange={v=>change('capacityPercent',v)} help="Rates are scenarios: 60 billing, 40 technical and 30 privacy cases per specialist-week at 100%." />
      <ChoiceControl label="Policy to inspect" value={policy} options={policies.map(p=>({value:p,label:labels[p]}))} onChange={setPolicy} help={policy==='hindsight'?'Uses this week’s observed intake in advance. It is an unattainable weekly reference, not a whole-period lower bound.':policy==='fixed'?'Uses fixed training-workload weights. Its backlog carries forward without changing those shares.':'Allocations use earlier intake and that policy’s own simulated opening backlog.'} />
      <button type="button" className="reset-button" onClick={()=>{setId(reference.id);setWeek(index.default.weekIndex);setPolicy('optimized');}}>Reset to reference</button>
    </fieldset>
    </StudyControlPanel>
    <div className="study-workbench-results">
    <section ref={resultRef} tabIndex={-1} className="allocation-result" aria-label="Telecom staffing result">
      {loading?<div className="allocation-error" role="status"><p>{failure||'Loading the selected evaluated scenario…'}</p>{failure&&<button className="button" onClick={retry}>Retry scenario</button>}</div>:<>
      <StepControl label="Week detail" value={week} options={weekOptions} onChange={setWeek} disabled={!ready} help="Move through this complete trajectory. Earlier simulated backlogs carry forward." />
      <h3>{labels[policy]} · week of {date(index.weeks[week])}</h3>
      <p className="allocation-caption" role="status" aria-live="polite">{scenario.staff} staff · {scenario.flex} cross-trained · {scenario.capacityPercent}% processing capacity · {fmt(sum(current.endBacklog))} simulated cases remaining this week</p>
      <div className="metric-grid"><div><span>Observed new complaints</span><strong>{fmt(sum(current.actualIntake))}</strong></div><div><span>Simulated cases remaining</span><strong>{fmt(sum(current.endBacklog))}</strong></div><div><span>Worst unprocessed share</span><strong>{fmt(current.maxUnprocessedShare*100,1)}%</strong></div></div>
      <div className={`allocation-interpretation ${sum(current.endBacklog)?'adverse':''}`}><p>{scenario.staff===0?'With no staff, all admitted cases carry forward. This zero-resource case checks that the model cannot process work without capacity.':`The selected plan assigns ${current.allocation.map((n,i)=>`${n} cross-trained staff to ${index.queues[i].label.toLowerCase()}`).join(', ')}. Specialist assignments stay fixed.`}</p><p>Of the {fmt(sum(current.openingBacklog))} simulated opening cases plus {fmt(sum(current.actualIntake))} new observed complaints, the model processes {fmt(sum(current.processed))} and carries {fmt(sum(current.endBacklog))} forward. {fmt(sum(current.olderBacklog))} remaining cases came from earlier model weeks. These are processing slots and simulated case counts, not observed resolutions.</p></div>
      <div className="allocation-chart" role="img" aria-label={`Staff composition. ${index.queues.map((q,i)=>`${q.label}: ${current.dedicated[i]} specialists and ${current.allocation[i]} cross-trained staff`).join('. ')}`}><h4>Where the team is allocated · whole staff</h4><div className="allocation-mini-legend" aria-hidden="true"><span><i />Specialists</span><span><i className="copper" />Cross-trained staff</span></div>{index.queues.map((q,i)=><div className="allocation-bar-row" key={q.id} aria-hidden="true"><span>{q.label}</span><div className="allocation-bar-track"><div className="allocation-bar" style={{width:`${100*current.dedicated[i]/staffScale}%`}}/><div className="allocation-bar copper" style={{width:`${100*current.allocation[i]/staffScale}%`}}/></div><strong>{current.dedicated[i]} + {current.allocation[i]}</strong></div>)}</div>
      <div className="table-wrap allocation-table" tabIndex={0} role="region" aria-label="Weekly casework balance"><table><caption>Week of {date(index.weeks[week])} · cases except forecast estimates · {labels[policy]}</caption><thead><tr><th>Work queue</th><th>Opening backlog<br/>simulated</th><th>Intake forecast</th><th>New complaints<br/>observed</th><th>Processing slots<br/>assumed</th><th>Processed<br/>simulated</th><th>Ending backlog<br/>simulated</th></tr></thead><tbody>{index.queues.map((q,i)=><tr key={q.id}><th scope="row">{q.label}</th><td>{fmt(current.openingBacklog[i])}</td><td>{fmt(index.forecastScaled[week][i]/index.forecastScale,1)}</td><td>{fmt(current.actualIntake[i])}</td><td>{fmt(current.capacity[i])}</td><td>{fmt(current.processed[i])}</td><td>{fmt(current.endBacklog[i])}</td></tr>)}</tbody></table></div>
      <p className="allocation-chart-note">For hindsight, the decision uses observed current-week intake instead of the displayed forecast. Processing is pooled over a week, oldest model cohorts first. An empty queue has a zero unprocessed share; no response-time or service-level target is represented.</p>
      </>}
    </section>
    <section className="period-panel" id="telecom-period"><h3>Follow the backlog through all twelve weeks</h3><p className="allocation-caption">All policies start with zero simulated backlog and retain their own later state. Changing staffing assumptions selects a different complete trajectory; changing the week only changes the point you inspect.</p>
      {!loading&&<>
      <div className="allocation-result"><div className="allocation-chart">
      <StepControl label="Week on the backlog plot" value={week} options={weekOptions} onChange={setWeek} disabled={!ready} help="Use the slider or select a point on the plot. The selected week is also shown in the detailed result above." />
      <p className="allocation-chart-note" role="status" aria-live="polite">Week of {date(index.weeks[week])} · {labels[policy]} · <strong>{fmt(sum(current.endBacklog))} simulated cases remaining</strong></p>
      <svg viewBox="0 0 750 250" role="group" aria-label="Interactive simulated weekly end backlog for four policies; select a week to inspect it"><line x1="85" x2="710" y1="205" y2="205" stroke="#bcc6b7"/>{[0,.5,1].map(v=><g key={v}><line x1="85" x2="710" y1={205-175*v} y2={205-175*v} stroke="#d9ddcf"/><text x="77" y={209-175*v} textAnchor="end" className="axis-label">{fmt(chartMax*v)}</text></g>)}{policies.map(p=><polyline key={p} points={line(p)} fill="none" stroke={colors[p]} strokeWidth={p===policy?3.5:2} strokeDasharray={p==='hindsight'?'6 4':undefined}/>)}{index.weeks.map((w,i)=><g key={w} role="button" tabIndex={ready?0:-1} aria-label={`Select week of ${date(w)}: ${fmt(sum(trajectory.weeks[i].endBacklog))} simulated cases remaining for ${labels[policy]}`} aria-pressed={week===i} onClick={()=>{if(ready)setWeek(i);}} onKeyDown={e=>{if(ready&&(e.key==='Enter'||e.key===' ')){e.preventDefault();setWeek(i);}}}><rect x={85+i*615/11-22} y="14" width="44" height="199" fill="transparent"/><line x1={85+i*615/11} x2={85+i*615/11} y1="22" y2="205" stroke={week===i?colors[policy]:'transparent'} strokeDasharray="3 5"/><circle cx={85+i*615/11} cy={205-175*sum(trajectory.weeks[i].endBacklog)/chartMax} r={week===i?7:4} fill={colors[policy]} stroke="var(--paper)" strokeWidth="2"/></g>)}<text x="85" y="233" className="axis-label">{date(index.weeks[0])}</text><text x="700" y="233" textAnchor="end" className="axis-label">{date(index.weeks[11])}</text></svg><div className="allocation-mini-legend">{policies.map(p=><span key={p}><i style={{background:colors[p]}}/>{labels[p]}</span>)}</div><p className="allocation-chart-note">Vertical axis: simulated end-of-week backlog, cases. Lines share the same scale. The weekly hindsight reference is not a globally optimal trajectory.</p></div>
      <div className={`allocation-interpretation ${comparison.cumulativeBacklogDifference>0?'adverse':''}`}><p>Against the adaptive workload rule, coverage balancing produces {comparison.cumulativeBacklogDifference===0?'the same cumulative backlog':`${fmt(Math.abs(comparison.cumulativeBacklogDifference))} ${comparison.cumulativeBacklogDifference<0?'fewer':'more'} backlog case-weeks`} across the twelve weeks. Its backlog is higher on {comparison.higherBacklogWeeks} weeks. A case remaining across several weeks is counted in several censuses; this total is not a count of unique complaints or measured waiting time.</p><p>The objective balances the worst projected unprocessed share each week. It does not minimize total backlog over the whole period. Forecast errors and different opening backlogs can change the comparison.</p></div>
      <div className="table-wrap allocation-table" tabIndex={0} role="region" aria-label="Full-period staffing comparison"><table><caption>All twelve test weeks · {scenario.staff} staff · {scenario.crossTrainedPercent}% cross-trained · {scenario.capacityPercent}% rates</caption><thead><tr><th>Policy</th><th>End-backlog census sum<br/>case-weeks</th><th>Final backlog<br/>cases</th><th>Mean worst<br/>unprocessed share</th><th>Flex staff<br/>reallocations</th></tr></thead><tbody>{policies.map(p=>{const s=scenario.policies[p].summary;return <tr key={p}><th scope="row">{labels[p]}</th><td>{fmt(s.cumulativeBacklog)}</td><td>{fmt(s.endingBacklog)}</td><td>{fmt(s.meanWorstShare*100,1)}%</td><td>{fmt(s.reallocated)}</td></tr>;})}</tbody></table></div>
      <div className="allocation-grid">{index.weeks.map((w,i)=><button key={w} disabled={!ready} aria-pressed={week===i} aria-label={`Inspect week of ${date(w)}: ${fmt(sum(trajectory.weeks[i].endBacklog))} simulated cases remaining`} onClick={()=>selectWeek(i)}><span>Week of {date(w)}</span><strong>{fmt(sum(trajectory.weeks[i].endBacklog))}</strong><small>simulated cases remaining</small></button>)}</div>
      <details className="data-details"><summary>Exact weekly backlog comparison</summary><div className="table-wrap allocation-table" tabIndex={0} role="region" aria-label="Weekly backlog by policy"><table><caption>Simulated end-of-week cases remaining · each policy has its own backlog</caption><thead><tr><th>Week starting</th>{policies.map(p=><th key={p}>{labels[p]}</th>)}</tr></thead><tbody>{index.weeks.map((w,i)=><tr key={w}><th scope="row">{date(w)}</th>{policies.map(p=><td key={p}>{fmt(sum(scenario.policies[p].weeks[i].endBacklog))}</td>)}</tr>)}</tbody></table></div></details>
      </div>
      </>}
    </section>
    </div>
    </StudyWorkbench>
  </div>;
}
