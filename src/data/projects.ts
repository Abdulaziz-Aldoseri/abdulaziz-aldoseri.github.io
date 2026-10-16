import { studies, isHidden, type StudyDisplay } from './studies';
export type Project = { id: string; title: string; question: string; sector: string[]; area: string[]; method: string[]; provenance: 'Independent study' | 'MSc project' | 'Professional work'; status: 'Planned study' | 'Interactive study' | 'Decision case' | 'Applied model' | 'Industry report'; source: string; href: string; action: string; authors?: string };
export const projects: Project[] = [
  { id:'energy', title:'Can electricity storage reduce daily peaks?', question:'Decide when an ideal electricity store should charge and discharge. Compare a simple rule with optimization, and see how storage size and forecast errors affect daily peaks.', sector:['Energy & infrastructure'], area:['Capacity planning','Uncertainty'], method:['Linear optimization','Scenario analysis'], provenance:'Independent study', status:'Interactive study', source:'Great Britain · NESO · 2024–25', href:'/projects/energy-flexibility/', action:'Explore the study' },
  { id:'healthcare', title:'When should surgical patients be admitted?', question:'Coordinate admission timing, daily surgery capacity and complete recovery stays. Compare earlier admissions with less extra theatre time through linked ward and theatre calendars.', sector:['Healthcare'], area:['Scheduling','Capacity planning'], method:['Integer optimization','Multi-objective optimization'], provenance:'Independent study', status:'Interactive study', source:'Generated hospital benchmark · Smet · 2023', href:'/projects/healthcare-scheduling/', action:'Explore the study' },
  { id:'storage', title:'Valuing operating flexibility in gas storage', question:'Value the flexibility to buy, store and sell gas as prices move, using reinforcement learning. The learned policy did not hold up on 2023 data, which marks the limits of the approach.', sector:['Energy & infrastructure'], area:['Valuation','Uncertainty'], method:['Reinforcement learning'], provenance:'MSc project', status:'Applied model', source:'Boğaziçi University · 2024', href:'/projects/evidence/#energy-asset-valuation', action:'Read the findings' },
  { id:'lng', title:'Assessing changing LNG markets', question:'Market structure, supply and demand, pricing scenarios and regional competitiveness for LNG.', sector:['Energy & infrastructure'], area:['Market analysis'], method:['Scenario analysis','Comparative analysis'], provenance:'Professional work', status:'Industry report', source:'DERASAT · 2019', href:'https://www.derasat.org.bh/en/the-future-of-lng-markets/', action:'Read the published study', authors:'Abdulaziz Aldoseri' },
  { id:'electricity', title:'Preparing for GCC electricity trading', question:'Commercial and regulatory barriers to cross-border power trading, with recommendations for market preparedness. Coauthored.', sector:['Energy & infrastructure'], area:['Market analysis','Policy evaluation'], method:['Comparative analysis'], provenance:'Professional work', status:'Industry report', source:'DERASAT · 2018', href:'https://derasat.org.bh/wp-content/uploads/2019/01/Energy-Report-1-EN.pdf', action:'Read the published report', authors:'Abdulla Al-Abbasi and Abdulaziz Al-Dosari' },
];

// Display identity and evidence status have one owner. New planned work cannot
// acquire an interactive badge or method filters by copying an evaluated card.
for (const project of projects) {
  if (project.provenance !== 'Independent study') continue;
  const study = (studies as Record<string, StudyDisplay>)[project.id];
  if (!study) throw new Error(`Missing study display contract: ${project.id}`);
  if (isHidden(study)) throw new Error(`Retired or held study must not be listed: ${project.id}`);
  project.title = study.title;
  project.sector = [study.sector];
  project.href = study.route;
  if (study.evidence.stage === 'planned') {
    project.status = 'Planned study';
    project.method = [];
    project.action = 'Read the proposed scope';
  } else {
    if (!study.evidence.evidenceVersion || !study.evidence.independentlyReviewed) {
      throw new Error(`Study evidence has not passed its review gate: ${project.id}`);
    }
    project.status = study.kind === 'case' ? 'Decision case' : 'Interactive study';
    project.action = study.kind === 'case' ? 'Read the case' : 'Explore the study';
  }
}
