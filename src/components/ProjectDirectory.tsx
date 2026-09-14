import { useEffect, useState } from 'react';
import { projects } from '../data/projects';
const facets = { sector: 'Sector', area: 'Decision area', method: 'Method', provenance: 'Evidence type' } as const;
type Facet = keyof typeof facets;
type Filters = Record<Facet, string[]>;
const legacyAnchors: Record<string, string> = { storage:'energy-asset-valuation', routing:'routing-and-logistics-modelling', fishing:'simulation-and-uncertainty', lng:'professional-analysis' };
const empty = (): Filters => ({sector:[],area:[],method:[],provenance:[]});
const options = Object.fromEntries(Object.keys(facets).map(key=>[key,[...new Set(projects.flatMap(p=>p[key as Facet]))]])) as Record<Facet,string[]>;
export default function ProjectDirectory() {
  const [filters,setFilters] = useState<Filters>(empty);
  const [query,setQuery] = useState('');
  const [ready,setReady] = useState(false);
  useEffect(()=>{
    const restore=()=>{const params=new URLSearchParams(window.location.search);const next=empty();(Object.keys(facets) as Facet[]).forEach(k=>next[k]=[...new Set(params.getAll(k).filter(v=>options[k].includes(v)))]);setFilters(next);setQuery(params.get('q')||'');};
    restore();setReady(true);window.addEventListener('popstate',restore);return()=>window.removeEventListener('popstate',restore);
  },[]);
  useEffect(()=>{if(!ready)return;const params=new URLSearchParams();if(query)params.set('q',query);(Object.keys(facets) as Facet[]).forEach(k=>filters[k].forEach(v=>params.append(k,v)));const s=params.toString();window.history.replaceState(null,'',window.location.pathname+(s?'?'+s:'')+window.location.hash);},[filters,query,ready]);
  const toggle=(key:Facet,value:string)=>setFilters(f=>({...f,[key]:f[key].includes(value)?f[key].filter(x=>x!==value):[...f[key],value]}));
  const matches=projects.filter(p=>(Object.keys(facets) as Facet[]).every(k=>!filters[k].length||filters[k].some(v=>[p[k]].flat().includes(v)))&&[p.title,p.question,p.source,...p.method,...p.area,...p.sector,p.provenance,p.status].join(' ').toLowerCase().includes(query.toLowerCase().trim()));
  const active=(Object.keys(facets) as Facet[]).flatMap(k=>filters[k].map(v=>({k,v})));
  return <div className="directory">
    <aside className="filters" aria-label="Filter projects"><label className="search-label" htmlFor="project-search">Search projects</label><input id="project-search" type="search" placeholder="Question, method or tool" value={query} onChange={e=>setQuery(e.target.value)} />
      {(Object.keys(facets) as Facet[]).map(k=><details key={k} open={k==='sector'||k==='area'}><summary>{facets[k]} {filters[k].length>0&&<span>({filters[k].length})</span>}</summary><fieldset><legend className="sr-only">{facets[k]}</legend>{options[k].map(v=><label key={v}><input type="checkbox" checked={filters[k].includes(v)} onChange={()=>toggle(k,v)} />{v}</label>)}</fieldset></details>)}
      <button className="reset-button" onClick={()=>{setFilters(empty());setQuery('');}} disabled={!query&&!active.length}>Reset filters</button>
    </aside>
    <div><div className="results-heading"><p role="status" aria-live="polite">{matches.length} of {projects.length} projects</p></div>
      {active.length>0&&<div className="active-filters" aria-label="Selected filters">{active.map(({k,v})=><button key={k+v} aria-label={`Remove ${v} filter`} onClick={()=>toggle(k,v)}>{v} ×</button>)}</div>}
      <div className="project-results">{matches.map(p=><article className="project-result" id={legacyAnchors[p.id]} key={p.id}><div className="result-meta"><span>{p.sector.join(' · ')}</span><span className={'status '+(p.status==='Planned study'?'planned':'')}>{p.status}</span></div><h2><a href={p.href}>{p.title}</a></h2><p>{p.question}</p>{p.authors && <p className="project-authors">{p.authors}</p>}<div className="tags">{p.method.map(m=><button key={m} aria-label={`Filter by ${m}`} onClick={()=>toggle('method',m)}>{m}</button>)}</div><div className="result-footer"><span>{p.provenance} · {p.source}</span><a href={p.href}>{p.action} ↗</a></div></article>)}</div>
      {!matches.length&&<div className="empty-state"><h2>No projects match these filters.</h2><p>Try a broader question or remove a selected filter.</p><button className="button" onClick={()=>{setFilters(empty());setQuery('');}}>Show all projects</button></div>}
    </div>
  </div>;
}
