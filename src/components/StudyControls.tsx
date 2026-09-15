import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import '../styles/study-controls.css';

type Option<T> = { value: T; label: string };
type ControlProps<T extends string | number> = {
  label: string; value: T; options: Option<T>[]; onChange: (value: T) => void;
  help?: string; disabled?: boolean;
};

export function ChoiceControl<T extends string | number>({label,value,options,onChange,help,disabled}:ControlProps<T>) {
  const id=useId();
  return <fieldset className="study-choice study-control-field" disabled={disabled} aria-describedby={help?id:undefined}>
    <legend>{label}</legend>
    <div className="study-choice-options">{options.map(option=><button type="button" key={option.value} aria-pressed={value===option.value} onClick={()=>onChange(option.value)}>{option.label}</button>)}</div>
    {help&&<p className="study-control-help" id={id}>{help}</p>}
  </fieldset>;
}

/** The slider moves through evaluated values, never interpolates a scenario. */
export function StepControl<T extends string | number>({label,value,options,onChange,help,disabled}:ControlProps<T>) {
  const id=useId();
  const position=options.findIndex(option=>option.value===value);
  if(position<0)throw new Error(`Missing admitted control value: ${label}`);
  const move=(i:number)=>{if(Number.isInteger(i)&&i>=0&&i<options.length)onChange(options[i].value);};
  return <div className="study-step study-control-field">
    <div className="study-control-label"><label htmlFor={id}>{label}</label><output htmlFor={id}>{options[position].label}</output></div>
    <div className="study-step-track">
      <button type="button" aria-label={`Previous ${label.toLowerCase()}`} disabled={disabled||position===0} onClick={()=>move(position-1)}>−</button>
      <input id={id} type="range" min={0} max={options.length-1} step={1} value={position} disabled={disabled||options.length===1} aria-valuetext={options[position].label} aria-describedby={help?`${id}-help`:undefined} onChange={e=>move(Number(e.currentTarget.value))}/>
      <button type="button" aria-label={`Next ${label.toLowerCase()}`} disabled={disabled||position===options.length-1} onClick={()=>move(position+1)}>+</button>
    </div>
    <div className="study-range-ends" aria-hidden="true"><span>{options[0].label}</span><span>{options[options.length-1].label}</span></div>
    {help&&<p className="study-control-help" id={`${id}-help`}>{help}</p>}
  </div>;
}

/** Visible, bounded search results replace long station/product dropdowns. */
export function SearchChoice({label,value,options,onChange,help,disabled}:ControlProps<string>) {
  const id=useId();const [query,setQuery]=useState('');const [page,setPage]=useState(0);
  const normalized=query.trim().toLocaleLowerCase();
  const matches=options.filter(option=>!normalized||`${option.label} ${option.value}`.toLocaleLowerCase().includes(normalized));
  const lastPage=Math.max(0,Math.ceil(matches.length/6)-1),currentPage=Math.min(page,lastPage);
  const shown=matches.slice(currentPage*6,currentPage*6+6);
  const selected=options.find(option=>option.value===value);
  return <div className="study-search study-control-field">
    <label htmlFor={id}>{label}</label>
    {selected&&<p className="study-search-current">Selected: <strong>{selected.label}</strong></p>}
    <input id={id} type="search" value={query} disabled={disabled} placeholder="Search by name or code" aria-describedby={`${id}-count`} onChange={e=>{setQuery(e.currentTarget.value);setPage(0);}}/>
    <p className="study-control-help" id={`${id}-count`} role="status">{matches.length?`${currentPage*6+1}–${Math.min((currentPage+1)*6,matches.length)} of ${matches.length} matches`:'No matches. Try another name or code.'}</p>
    <div className="study-search-results" role="group" aria-label={`${label} search results`}>{shown.map(option=><button type="button" key={option.value} disabled={disabled} aria-pressed={value===option.value} onClick={()=>onChange(option.value)}>{option.label}</button>)}</div>
    {matches.length>6&&<div className="study-search-pages"><button type="button" disabled={disabled||currentPage===0} onClick={()=>setPage(currentPage-1)} aria-label={`Previous ${label.toLowerCase()} matches`}>← Previous</button><button type="button" disabled={disabled||currentPage===lastPage} onClick={()=>setPage(currentPage+1)} aria-label={`Next ${label.toLowerCase()} matches`}>Next →</button></div>}
    {help&&<p className="study-control-help">{help}</p>}
  </div>;
}

export function StudyWorkbench({children}:{children:ReactNode}) {
  return <div className="study-workbench">{children}</div>;
}

export function StudyControlPanel({children,summary}:{children:ReactNode;summary:string}) {
  const id=useId();const [expanded,setExpanded]=useState(false);
  const panel=useRef<HTMLElement>(null);
  useEffect(()=>{
    const workbench=panel.current?.closest('.study-workbench');
    const closeForInspection=()=>{if(window.matchMedia('(max-width:760px)').matches)setExpanded(false);};
    workbench?.addEventListener('study:focus-result',closeForInspection);
    return()=>workbench?.removeEventListener('study:focus-result',closeForInspection);
  },[]);
  return <aside ref={panel} className={`study-control-panel ${expanded?'is-expanded':''}`} aria-label="Scenario controls">
    <div className="study-controls-heading"><span className="eyebrow">Adjust the scenario</span><button type="button" className="study-mobile-toggle" aria-expanded={expanded} aria-controls={id} onClick={()=>setExpanded(!expanded)}>{expanded?'Close controls':'Adjust scenario'} <span aria-hidden="true">{expanded?'−':'+'}</span></button></div>
    <p className="study-current-outcome" role="status" aria-live="polite" aria-atomic="true">{summary}</p>
    <div className="study-controls-body" id={id}>{children}</div>
  </aside>;
}
