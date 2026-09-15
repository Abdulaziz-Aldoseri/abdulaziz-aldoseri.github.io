import { useEffect, useRef, useState } from 'react';
import { ChoiceControl, StepControl, StudyWorkbench, StudyControlPanel } from './StudyControls';
import { focusStudyResult } from '../lib/useEvaluatedScenario';
type Policy = 'no_action'|'rule'|'forecast_lp'|'hindsight_lp';
type Schedule = {peak_mw:number;reduction_mw:number;reduction_pct:number;throughput_mwh:number;flow_mw:number[];energy_mwh:number[];adjusted_mw:number[];binding_power:boolean;binding_energy:boolean};
type Day = {labels:{period:number;local_time:string;utc_offset:string;fold:number}[];actual_mw:number[];forecast_mw:number[];forecast_mae_mw:number;scenarios:Record<string,{policies:Record<Policy,Schedule>}>};
type Summary = {policy:Policy;power_mw:number;duration_h:number;days:number;mean_reduction_mw:number;median_reduction_mw:number;worsened_days:number;worst_date:string;worst_reduction_mw:number;month?:number};
type Index = {meta:{default_date:string;default_power_mw:number;default_duration_h:number;powers_mw:number[];durations_h:number[]};dates:string[];default_case:Day;summary:Summary[];monthly_summary:Summary[]};
const policies: Policy[]=['no_action','rule','forecast_lp','hindsight_lp'];
const names: Record<Policy,string>={no_action:'No additional flexibility',rule:'Forecast-window rule',forecast_lp:'Forecast optimization',hindsight_lp:'Perfect-information bound'};
const colors: Record<Policy,string>={no_action:'#687985',rule:'#b74320',forecast_lp:'#00766c',hindsight_lp:'#285dd1'};
const fmt=(v:number,decimals=0)=>new Intl.NumberFormat('en-GB',{maximumFractionDigits:decimals,minimumFractionDigits:decimals}).format(Math.abs(v)<.00001?0:v);
const dateLabel=(v:string)=>new Date(v+'T12:00:00Z').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});
function validDay(value: unknown, index: Index): value is Day {
  const object = (v: unknown): v is Record<string, any> => !!v && typeof v === 'object' && !Array.isArray(v);
  const numbers = (v: unknown, length: number) => Array.isArray(v) && v.length === length && v.every(Number.isFinite);
  if (!object(value) || !Array.isArray(value.labels) || ![46,48,50].includes(value.labels.length)) return false;
  const count = value.labels.length;
  if (!numbers(value.actual_mw,count) || !numbers(value.forecast_mw,count) || !Number.isFinite(value.forecast_mae_mw) || !object(value.scenarios)) return false;
  if (!value.labels.every((label: unknown,i: number) => object(label) && label.period === i+1 && typeof label.local_time === 'string' && typeof label.utc_offset === 'string' && [0,1].includes(label.fold))) return false;
  return index.meta.powers_mw.every(power => index.meta.durations_h.every(duration => {
    const scenario = value.scenarios[`${power}_${duration}`];
    return object(scenario) && object(scenario.policies) && policies.every(policy => {
      const schedule = scenario.policies[policy];
      return object(schedule) && ['peak_mw','reduction_mw','reduction_pct','throughput_mwh'].every(key => Number.isFinite(schedule[key])) && typeof schedule.binding_power === 'boolean' && typeof schedule.binding_energy === 'boolean' && numbers(schedule.flow_mw,count) && numbers(schedule.adjusted_mw,count) && numbers(schedule.energy_mwh,count+1);
    });
  }));
}
function LineChart({series,labels,unit,title}:{series:{name:string;values:number[];color:string;dash?:string}[];labels:string[];unit:string;title:string}){
  const ref=useRef<HTMLDivElement>(null);const [width,setWidth]=useState(700);
  useEffect(()=>{if(!ref.current)return;const observer=new ResizeObserver(entries=>setWidth(Math.max(260,entries[0].contentRect.width)));observer.observe(ref.current);return()=>observer.disconnect();},[]);
  const values=series.flatMap(s=>s.values),lo=Math.min(...values),hi=Math.max(...values);const range=Math.max(1,hi-lo);const min=lo-range*.12,max=hi+range*.12;
  const left=58,right=16,top=20,bottom=42,height=280;const x=(i:number,n:number)=>left+i/(Math.max(1,n-1))*(width-left-right);const y=(v:number)=>top+(max-v)/(max-min)*(height-top-bottom);
  return <div className="line-chart" ref={ref}><svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={title}><title>{title}</title><text x={left} y={13} className="axis-label">{unit}</text>{[0,1,2,3].map(i=>{const v=lo+i*(hi-lo)/3;return <g key={i}><line x1={left} x2={width-right} y1={y(v)} y2={y(v)} stroke="#d9e2e5"/><text x={left-8} y={y(v)+4} textAnchor="end" className="axis-label">{fmt(v)}</text></g>;})}{series.map(s=><path key={s.name} d={s.values.map((v,i)=>(i?'L':'M')+x(i,s.values.length).toFixed(2)+','+y(v).toFixed(2)).join(' ')} fill="none" stroke={s.color} strokeWidth="2.5" strokeDasharray={s.dash}/>) }{[0,Math.floor((labels.length-1)/2),labels.length-1].map((i,j)=><text key={i} x={x(i,labels.length)} y={height-15} textAnchor={j===0?'start':j===2?'end':'middle'} className="axis-label">{labels[i]}</text>)}</svg><ul className="legend">{series.map(s=><li key={s.name}><span style={{borderColor:s.color,borderTopStyle:s.dash?'dashed':'solid'}} />{s.name}</li>)}</ul></div>;
}
export default function EnergyExplorer({index}:{index:Index}){
  const dailyRef=useRef<HTMLDivElement>(null);
  const [date,setDate]=useState(index.meta.default_date);const [power,setPower]=useState(index.meta.default_power_mw);const [duration,setDuration]=useState(index.meta.default_duration_h);const [policy,setPolicy]=useState<Policy>('forecast_lp');const [day,setDay]=useState<Day>(index.default_case);const [loadedDate,setLoadedDate]=useState(index.meta.default_date);const [failure,setFailure]=useState<{date:string;message:string}|null>(null);const [ready,setReady]=useState(false);
  useEffect(()=>{
    const restore=()=>{
      const p=new URLSearchParams(window.location.search);
      setDate(index.dates.includes(p.get('date')||'') ? p.get('date')! : index.meta.default_date);
      setPower(index.meta.powers_mw.map(String).includes(p.get('power')||'') ? Number(p.get('power')) : index.meta.default_power_mw);
      setDuration(index.meta.durations_h.map(String).includes(p.get('duration')||'') ? Number(p.get('duration')) : index.meta.default_duration_h);
      setPolicy(policies.includes(p.get('policy') as Policy) ? p.get('policy') as Policy : 'forecast_lp');
    };
    restore();setReady(true);window.addEventListener('popstate',restore);
    return()=>window.removeEventListener('popstate',restore);
  },[]);
  useEffect(()=>{if(!ready)return;const p=new URLSearchParams({date,power:String(power),duration:String(duration),policy});window.history.replaceState(null,'',window.location.pathname+'?'+p.toString()+window.location.hash);},[ready,date,power,duration,policy]);
  useEffect(()=>{
    setFailure(null);
    if(date===index.meta.default_date){setDay(index.default_case);setLoadedDate(date);return;}
    const controller=new AbortController();
    fetch(`/data/energy/days/${date}.json`,{signal:controller.signal})
      .then(r=>{if(!r.ok)throw new Error('Daily result unavailable');return r.json();})
      .then(data=>{if(!validDay(data,index))throw new Error('Invalid daily result');if(controller.signal.aborted)return;setDay(data);setLoadedDate(date);})
      .catch(e=>{if(e.name!=='AbortError'&&!controller.signal.aborted)setFailure({date,message:'The daily result could not be loaded. Choose another date or reload the page.'});});
    return()=>controller.abort();
  },[date]);
  const error=failure?.date===date ? failure.message : '';
  const loading=loadedDate!==date&&!error;
  const schedules=day.scenarios[`${power}_${duration}`].policies,selected=schedules[policy];const selectedSummary=index.summary.find(s=>s.policy===policy&&s.power_mw===power&&s.duration_h===duration)!;const summaryRows=policies.map(p=>index.summary.find(s=>s.policy===p&&s.power_mw===power&&s.duration_h===duration)!);const labels=day.labels.map(l=>l.local_time);const months=index.monthly_summary.filter(s=>s.policy===policy&&s.power_mw===power&&s.duration_h===duration);
  const reset=()=>{setDate(index.meta.default_date);setPower(index.meta.default_power_mw);setDuration(index.meta.default_duration_h);setPolicy('forecast_lp');};
  const inspectDate=(value:string)=>{setDate(value);focusStudyResult(dailyRef.current);};
  const outcome=loading?`Loading ${dateLabel(date)}…`:error?'Daily result unavailable. Choose another date.':`${dateLabel(date)} · ${fmt(Math.abs(selected.reduction_mw),1)} MW ${selected.reduction_mw<-.0001?'peak increase':'peak relief'} · ${fmt(power)} MW / ${duration} h`;
  return <div className="energy-explorer"><StudyWorkbench>
    <StudyControlPanel summary={outcome}>
      <fieldset className="study-control-fields" disabled={!ready}><legend className="sr-only">Storage scenarios</legend>
        <div className="study-presets" role="group" aria-label="Storage scenario presets">
          <button type="button" onClick={reset}>Reference</button>
          <button type="button" onClick={()=>{setPower(index.meta.powers_mw[0]);setDuration(index.meta.durations_h[0]);}}>Smallest store</button>
          <button type="button" onClick={()=>{setPower(index.meta.powers_mw[index.meta.powers_mw.length-1]);setDuration(index.meta.durations_h[index.meta.durations_h.length-1]);}}>Largest store</button>
        </div>
        <StepControl label="Study date" value={date} options={index.dates.map(d=>({value:d,label:dateLabel(d)}))} onChange={setDate} help="Move one evaluated day at a time, or drag through May–December 2025."/>
        <ChoiceControl label="Power capacity" value={power} options={index.meta.powers_mw.map(v=>({value:v,label:`${fmt(v)} MW`}))} onChange={setPower}/>
        <ChoiceControl label="Storage duration" value={duration} options={index.meta.durations_h.map(v=>({value:v,label:`${v} ${v===1?'hour':'hours'}`}))} onChange={setDuration}/>
        <ChoiceControl label="Inspect strategy" value={policy} options={policies.map(p=>({value:p,label:names[p]}))} onChange={setPolicy}/>
        <p className="study-control-help">Evaluated capacity: {fmt(power*duration)} MWh. An ideal lossless store, empty at the start and end of each day.</p>
      </fieldset>
    </StudyControlPanel>
    <div className="study-workbench-results">
    <div className="daily-panel" ref={dailyRef} tabIndex={-1} aria-busy={loading}>

    {loading?<p className="load-state" role="status">Loading {dateLabel(date)}…</p>:error?<p className="load-state" role="alert">{error}</p>:<>
      <div className="experiment-title"><div><p className="eyebrow">The selected day</p><h2>{dateLabel(date)}</h2></div><span className="status">{day.labels.length} half-hour periods</span></div>
      <div className="metric-grid" aria-live="polite"><div><span>Observed peak without action</span><strong>{fmt(schedules.no_action.peak_mw)} <small>MW</small></strong></div><div><span>Peak with {policy==='hindsight_lp'?'perfect information':'selected strategy'}</span><strong>{fmt(selected.peak_mw)} <small>MW</small></strong></div><div className={selected.reduction_mw<-.0001?'negative':'positive'}><span>{selected.reduction_mw<-.0001?'Peak increase':'Peak relief'}</span><strong>{fmt(Math.abs(selected.reduction_mw))} <small>MW</small></strong></div></div>
      {policy==='hindsight_lp'&&<p className="interpretation">This bound uses the day’s actual demand in advance. It shows ideal potential with perfect information, not a strategy available before the day.</p>}
      {selected.reduction_mw<-.0001&&<p className="interpretation downside">On this day the selected schedule increases the actual peak. Optimizing an imperfect forecast can move charging into the wrong periods.</p>}
      <div className="chart-grid"><section className="chart-panel"><h3>What happens to the peak?</h3><p className="chart-subtitle">GB metered-generation requirement · MW</p><LineChart title={`Observed and adjusted demand on ${dateLabel(date)}`} unit="MW" labels={labels} series={[{name:'Observed, no action',values:day.actual_mw,color:colors.no_action},{name:names[policy],values:selected.adjusted_mw,color:colors[policy],dash:policy==='no_action'?'6 4':undefined}]} /></section><section className="chart-panel"><h3>How is flexibility used?</h3><p className="chart-subtitle">Positive = charging · Negative = discharging</p><LineChart title={`Charging and discharging for ${names[policy]}`} unit="MW" labels={labels} series={[{name:names[policy],values:selected.flow_mw,color:colors[policy]}]} /></section></div>
      <p className="chart-note">Half-hour settlement sequence in Europe/London local time. Clock changes retain every period; the detailed table includes UTC offsets. Read the lines alongside the values below.</p><p className="mobile-table-hint">Scroll tables horizontally to see every column →</p>
      <div className="table-wrap" tabIndex={0} role="region" aria-label="Scrollable comparison table"><table><caption>Four strategies, the same day and capacity</caption><thead><tr><th>Strategy</th><th>Realized peak (MW)</th><th>Relief (MW)</th><th>Throughput (MWh)</th></tr></thead><tbody>{policies.map(p=><tr key={p} className={p===policy?'selected-row':''}><th scope="row">{names[p]}{p==='hindsight_lp'&&<small>Perfect information</small>}</th><td>{fmt(schedules[p].peak_mw,1)}</td><td>{fmt(schedules[p].reduction_mw,1)}</td><td>{fmt(schedules[p].throughput_mwh,1)}</td></tr>)}</tbody></table></div>
      <p className="chart-note">Negative relief means a higher peak. Throughput counts both charging and discharging. Forecast error on this day: {fmt(day.forecast_mae_mw)} MW mean absolute error.</p>
      <details className="data-details"><summary>Inspect forecast, schedule and state of charge</summary><p>State of charge is shown at the end of each half-hour; the initial state is zero. This schedule {selected.binding_power?'reaches':'does not reach'} a power bound and {selected.binding_energy?'reaches':'does not reach'} the energy-capacity bound. Reaching a bound does not establish its marginal value.</p><div className="table-wrap detail-table" tabIndex={0} role="region" aria-label="Scrollable half-hour data table"><table><caption>{names[policy]} · {dateLabel(date)} · {fmt(power)} MW / {duration} h</caption><thead><tr><th>Period / local time</th><th>Observed MW</th><th>Forecast MW</th><th>Net charging MW</th><th>End charge MWh</th></tr></thead><tbody>{day.labels.map((l,i)=><tr key={i}><th scope="row">{l.period} / {l.local_time} {l.utc_offset}</th><td>{fmt(day.actual_mw[i],1)}</td><td>{fmt(day.forecast_mw[i],1)}</td><td>{fmt(selected.flow_mw[i],1)}</td><td>{fmt(selected.energy_mwh[i+1],1)}</td></tr>)}</tbody></table></div></details>
    </>}
    </div>
    <p className="control-note">Forecast optimization uses one fixed solver selection among minimum-throughput solutions. Other equally optimal schedules can behave differently. <a href="#tie-sensitivity">See the schedule-selection sensitivity check.</a></p>
    <section className="period-panel"><div className="experiment-title"><div><p className="eyebrow">Beyond one day</p><h2>Does it hold across the period?</h2></div><span>May–December 2025 · 245 days</span></div><p>For {fmt(power)} MW and {duration} h, <strong>{names[policy].toLowerCase()}</strong> has a modelled mean daily peak relief of {fmt(selectedSummary.mean_reduction_mw,1)} MW. It raises the peak on {selectedSummary.worsened_days} of 245 days.</p>
    <div className="table-wrap" tabIndex={0} role="region" aria-label="Scrollable comparison table"><table><caption>All 245 test days · current capacity · negative values are worse</caption><thead><tr><th>Strategy</th><th>Mean relief (MW)</th><th>Median relief (MW)</th><th>Days worsened</th></tr></thead><tbody>{summaryRows.map(s=><tr key={s.policy} className={s.policy===policy?'selected-row':''}><th scope="row">{names[s.policy]}</th><td>{fmt(s.mean_reduction_mw,1)}</td><td>{fmt(s.median_reduction_mw,1)}</td><td>{s.worsened_days} / {s.days}</td></tr>)}</tbody></table></div>
    <div className="month-grid" aria-label="Mean daily peak relief by month">{months.map(m=><button key={m.month} disabled={!ready} aria-pressed={Number(date.slice(5,7))===m.month} onClick={()=>inspectDate(`2025-${String(m.month).padStart(2,'0')}-01`)} aria-label={`Inspect 1 ${new Date(2025,m.month!-1,1).toLocaleString('en-GB',{month:'long'})} 2025`}><span>{new Date(2025,m.month!-1,1).toLocaleString('en-GB',{month:'short'})}</span><strong>{fmt(m.mean_reduction_mw)}</strong><span>MW mean relief</span><small>{m.worsened_days} {m.worsened_days===1?'day':'days'} worse</small></button>)}</div>
    <p className="chart-note">Each month opens its first day. The default, 3 November, is the first weekday of November, chosen before inspecting results.</p>
    {selectedSummary.worst_reduction_mw<-.0001&&<p className="interpretation downside">The worst day for this strategy and capacity increased the peak by {fmt(-selectedSummary.worst_reduction_mw,1)} MW. <button className="inline-button" disabled={!ready} onClick={()=>inspectDate(selectedSummary.worst_date)}>Inspect {dateLabel(selectedSummary.worst_date)} →</button></p>}
    </section>
    </div>
  </StudyWorkbench></div>;
}
