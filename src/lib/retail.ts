// Exact separable allocation, independently reconciled with the Python study.
export type Product = {code:string;name:string;segment:string};
export type Week = {week:string;actual:number[];history:number[][];seasonal:number[]};
export type Policy = 'scenario'|'mean'|'seasonal'|'equal'|'hindsight';
export const policies: Policy[] = ['scenario','mean','seasonal','equal','hindsight'];
export const policyNames: Record<Policy,string> = {scenario:'Scenario allocation',mean:'Eight-week mean',seasonal:'Same week last year',equal:'Equal allocation',hindsight:'Perfect-information bound'};
export type Outcome = {allocation:number[];loss:number;shortfall:number;leftover:number;coverage:number|null;unused:number;expected_loss:number};
export type SettingSummary = {factor:number;priority:number;policy:string;mean_loss:number;mean_shortfall:number;mean_leftover:number;mean_unused:number;coverage:number|null};
export type Comparison = {factor:number;priority:number;baseline:string;mean_difference:number;median_difference:number;better:number;tied:number;worse:number;interval:number[]};
export type RetailIndex = {
 meta:{selected_window:number;default_week:string;default_factor:number;default_priority:number;budget_factors:number[];priorities:number[]};
 products:Product[];weeks:Week[];validation:{window:number;mean_loss:number}[];
 summaries:SettingSummary[];comparisons:Comparison[];
 sensitivities:(SettingSummary&{variant:string})[];
};
export const roundHalfUp = (n:number,d=1) => Math.floor((2*n+d)/(2*d));
const lexical = (a:string,b:string) => a<b?-1:a>b?1:0;
function validate(history:number[][],budget:number,priority:number,minima:number[],codes:string[]) {
 if (!Number.isSafeInteger(budget)||budget<0) throw new Error('The budget must be a nonnegative whole number.');
 if (![0.5,0.8,0.95].includes(priority)) throw new Error('Choose one of the evaluated priorities.');
 if (!history.length || history.some(row=>row.length!==codes.length || row.some(x=>!Number.isSafeInteger(x)||x<0))) throw new Error('Invalid weekly history.');
 if (minima.length!==codes.length||minima.some(x=>!Number.isSafeInteger(x)||x<0)) throw new Error('Minimum units must be a nonnegative whole number.');
 if (minima.reduce((s,x)=>s+x,0)>budget) throw new Error('This minimum needs more units than the current budget. Reduce it or increase the budget.');
}
export function scenarioAllocation(history:number[][],budget:number,priority:number,minima:number[],codes:string[]):number[] {
 validate(history,budget,priority,minima,codes);
 const allocation=[...minima],W=history.length,a=Math.round(priority*20);
 const segments:{i:number;score:number;length:number}[]=[];
 for(let i=0;i<codes.length;i++) {
  const observations=history.map(row=>row[i]);
  const levels=[...new Set(observations.filter(x=>x>minima[i]))].sort((x,y)=>x-y);
  let lower=minima[i];
  for(const upper of levels) {
   const score=a*W-20*observations.filter(x=>x<=lower).length;
   if(score>0) segments.push({i,score,length:upper-lower});
   lower=upper;
  }
 }
 segments.sort((x,y)=>y.score-x.score||lexical(codes[x.i],codes[y.i]));
 let remaining=budget-minima.reduce((s,x)=>s+x,0);
 for(const segment of segments) {
  if(remaining===0) break;
  const take=Math.min(segment.length,remaining);allocation[segment.i]+=take;remaining-=take;
 }
 return allocation;
}
export function proportionalAllocation(rawTargets:number[],budget:number,minima:number[],codes:string[]):number[] {
 const targets=rawTargets.map((x,i)=>Math.max(x,minima[i]));
 if(targets.reduce((s,x)=>s+x,0)<=budget) return targets;
 const weights=targets.map((x,i)=>x-minima[i]);
 const weightTotal=weights.reduce((s,x)=>s+x,0),available=budget-minima.reduce((s,x)=>s+x,0);
 const extras=weights.map(w=>Math.floor(available*w/weightTotal));
 let remaining=available-extras.reduce((s,x)=>s+x,0);
 const order=codes.map((code,i)=>({i,code,remainder:(available*weights[i])%weightTotal})).sort((a,b)=>b.remainder-a.remainder||lexical(a.code,b.code));
 for(const item of order) if(remaining>0&&weights[item.i]>0){extras[item.i]++;remaining--;}
 return extras.map((x,i)=>x+minima[i]);
}
export function equalAllocation(meanTargets:number[],budget:number,minima:number[],codes:string[]):number[] {
 const targetTotal=Math.min(budget,meanTargets.reduce((s,x,i)=>s+Math.max(x,minima[i]),0));
 let low=0,high=targetTotal;
 while(low<high){const middle=Math.ceil((low+high)/2);if(minima.reduce((s,x)=>s+Math.max(x,middle),0)<=targetTotal)low=middle;else high=middle-1;}
 const q=minima.map(x=>Math.max(x,low));let left=targetTotal-q.reduce((s,x)=>s+x,0);
 const order=codes.map((code,i)=>({code,i})).sort((a,b)=>lexical(a.code,b.code));
 for(const item of order) if(left>0&&q[item.i]===low){q[item.i]++;left--;}
 return q;
}
export function metrics(q:number[],actual:number[],history:number[][],budget:number,priority:number):Outcome {
 const shortfall=actual.reduce((s,d,i)=>s+Math.max(d-q[i],0),0),leftover=q.reduce((s,x,i)=>s+Math.max(x-actual[i],0),0);
 const total=actual.reduce((s,x)=>s+x,0);
 const expected=history.reduce((s,row)=>s+row.reduce((v,d,i)=>v+priority*Math.max(d-q[i],0)+(1-priority)*Math.max(q[i]-d,0),0),0)/history.length;
 return {allocation:q,shortfall,leftover,loss:priority*shortfall+(1-priority)*leftover,coverage:total?(total-shortfall)/total:null,unused:budget-q.reduce((s,x)=>s+x,0),expected_loss:expected};
}
export function evaluateWeek(week:Week,factor:number,priority:number,window:number,codes:string[],minima:number[]=codes.map(()=>0)) {
 if(![0.5,0.75,1,1.25].includes(factor))throw new Error('Choose one of the evaluated budgets.');
 const h8=week.history.slice(-8),sums=codes.map((_,i)=>h8.reduce((s,row)=>s+row[i],0));
 const budget=roundHalfUp(sums.reduce((s,x)=>s+x,0)*Math.round(factor*4),32);
 const history=week.history.slice(-window);validate(history,budget,priority,minima,codes);
 const means=sums.map(x=>roundHalfUp(x,8));
 const allocations:Record<Policy,number[]>={
  scenario:scenarioAllocation(history,budget,priority,minima,codes),
  mean:proportionalAllocation(means,budget,minima,codes),
  seasonal:proportionalAllocation(week.seasonal,budget,minima,codes),
  equal:equalAllocation(means,budget,minima,codes),
  hindsight:scenarioAllocation([week.actual],budget,priority,minima,codes)
 };
 const results=Object.fromEntries(policies.map(policy=>[policy,metrics(allocations[policy],week.actual,history,budget,priority)])) as Record<Policy,Outcome>;
 return {budget,results};
}
