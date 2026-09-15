import { useEffect, useRef, useState } from 'react';

export function focusStudyResult(element:HTMLElement|null) {
  if(!element)return;
  element.closest('.study-workbench')?.dispatchEvent(new CustomEvent('study:focus-result'));
  // Allow the compact mobile control tray to close before placing the result.
  requestAnimationFrame(()=>{
    element.focus({preventScroll:true});
    const panel=element.closest('.study-workbench')?.querySelector('.study-control-panel');
    const inset=window.matchMedia('(max-width:760px)').matches?(panel?.getBoundingClientRect().height||0)+16:24;
    window.scrollTo({top:Math.max(0,window.scrollY+element.getBoundingClientRect().top-inset),behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
  });
}

/** Loads one immutable evaluated case; keeps the server-rendered reference useful without JavaScript. */
export function useEvaluatedScenario<T extends {id:string}>(id:string, reference:T, root:string, sha256:string, validate:(value:unknown)=>value is T) {
  const [scenario,setScenario]=useState(reference);
  const [failure,setFailure]=useState<{id:string;message:string}|null>(null);
  const [attempt,setAttempt]=useState(0);
  const cache=useRef(new Map<string,T>([[reference.id,reference]]));
  useEffect(()=>{
    const saved=cache.current.get(id);
    if(saved){setScenario(saved);setFailure(null);return;}
    const controller=new AbortController();setFailure(null);
    fetch(`${root}/${encodeURIComponent(id)}.json`,{signal:controller.signal})
      .then(async response=>{
        if(!response.ok)throw new Error('The evaluated scenario could not be loaded.');
        const bytes=await response.arrayBuffer();
        const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(v=>v.toString(16).padStart(2,'0')).join('');
        if(digest!==sha256)throw new Error('The scenario file does not match the reviewed data.');
        return JSON.parse(new TextDecoder().decode(bytes));
      })
      .then(value=>{if(!validate(value)||value.id!==id)throw new Error('The scenario file does not match the selected case.');if(!controller.signal.aborted){cache.current.set(id,value);setScenario(value);}})
      .catch(error=>{if(!controller.signal.aborted)setFailure({id,message:error instanceof Error?error.message:'The evaluated scenario could not be loaded.'});});
    return()=>controller.abort();
  },[id,attempt]);
  return {scenario,loading:scenario.id!==id,failure:failure?.id===id?failure.message:null,retry:()=>setAttempt(n=>n+1)};
}
