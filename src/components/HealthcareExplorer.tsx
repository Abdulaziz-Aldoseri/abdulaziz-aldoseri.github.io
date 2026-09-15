import { useEffect, useRef, useState } from 'react';
import { ChoiceControl, StepControl, SearchChoice, StudyWorkbench, StudyControlPanel } from './StudyControls';
import { useEvaluatedScenario, focusStudyResult } from '../lib/useEvaluatedScenario';
import WardOccupancyCalendar from './HealthcareCalendar';
import '../styles/healthcare-study.css';

type Policy = 'delay_first' | 'overtime_first' | 'baseline';
type Patient = { id: string; specialty: string; earliest: number; latest: number; los: number; duration: number };
type Assignment = { patient_id: string; ward_id: string; day: number };
type Metrics = { delay_days: number; overtime_minutes: number; additional_session_minutes: number; minor_assignments: number; delayed_patients: number };
type ScheduleSummary = { status: string; metrics: Metrics | null; verification: { complete: boolean; feasible: boolean } };
type Schedule = ScheduleSummary & { assignments: Assignment[] | null; metrics: Metrics | null; occupancy: number[][] | null; or_minutes: number[][] | null; solver_stages?: unknown[] };
type StrictCalendar = { status: string; [key: string]: unknown };
type Parameters = { seed: number; m: number; closed_beds: number };
export type HealthcareCase = {
  id: string; parameters: Parameters;
  instance: { days: number; wards: { id: string; capacity: number; major: string; minors: string[]; carryover: number[] }[]; specialties: { id: string; minutes: number[] }[]; patients: Patient[] };
  schedules: Record<Policy, Schedule>; strict_calendar: StrictCalendar;
};
type CaseSummary = Parameters & { id: string; sha256: string; summaries: Record<Policy, ScheduleSummary>; strict_calendar: StrictCalendar };
export type HealthcareIndex = { version: string; source: { creator: string; url: string; [key: string]: unknown }; cohorts: { seed: number; label: string; patient_count: number }[]; scenarios: CaseSummary[]; default_case: HealthcareCase };

const policies: Policy[] = ['delay_first', 'overtime_first', 'baseline'];
const labels: Record<Policy, string> = { delay_first: 'Earlier admissions', overtime_first: 'Less extra theatre time', baseline: 'Deadline-first rule' };
const fmt = (n: number) => new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 }).format(n);
const statusLabels: Record<string, string> = { lexicographic_optimal: 'Both stages optimal', verified_baseline: 'Complete rule-based schedule', primary_optimal_secondary_unresolved: 'First priority optimal; second unresolved', feasible_incumbent_primary_unresolved: 'Feasible schedule; optimum unresolved', proven_infeasible: 'Proven infeasible', unknown_no_incumbent: 'Unresolved; no complete schedule', baseline_search_limit: 'Rule reached search limit', baseline_time_limit: 'Rule reached time limit', invalid_result: 'Result rejected by verification' };
const statusText = (status: string) => statusLabels[status] || status.replaceAll('_', ' ');
const feasibleStatuses = ['verified_baseline', 'lexicographic_optimal', 'primary_optimal_secondary_unresolved', 'feasible_incumbent_primary_unresolved'];
const hasMetrics = (s: ScheduleSummary) => feasibleStatuses.includes(s.status) && s.verification?.complete === true && s.verification?.feasible === true && !!s.metrics && ['delay_days', 'overtime_minutes', 'additional_session_minutes', 'delayed_patients'].every(k => Number.isSafeInteger(s.metrics![k as keyof Metrics]) && s.metrics![k as keyof Metrics] >= 0);
const available = (s: Schedule, patientCount: number) => hasMetrics(s) && Array.isArray(s.assignments) && s.assignments.length === patientCount && [s.occupancy, s.or_minutes].every(matrix => Array.isArray(matrix) && matrix.length === 4 && matrix.every(row => Array.isArray(row) && row.length === 7 && row.every(n => Number.isSafeInteger(n) && n >= 0)));
const validCase = (v: unknown): v is HealthcareCase => {
  if (!v || typeof v !== 'object') return false;
  const c = v as HealthcareCase;
  return c.instance?.days === 7 && c.instance.wards?.length === 4 && Array.isArray(c.instance.patients) && policies.every(p => c.schedules?.[p] && typeof c.schedules[p].status === 'string');
};

export default function HealthcareExplorer({ index }: { index: HealthcareIndex }) {
  const reference = index.default_case;
  if (!validCase(reference) || index.scenarios.length !== 40) throw new Error('The reviewed healthcare case grid is incomplete.');
  const [id, setId] = useState(reference.id);
  const [policy, setPolicy] = useState<Policy>('delay_first');
  const [day, setDay] = useState(0);
  const [ward, setWard] = useState(0);
  const [patientId, setPatientId] = useState('');
  const [ready, setReady] = useState(false);
  const resultRef = useRef<HTMLElement>(null);
  const selected = index.scenarios.find(s => s.id === id)!;
  const { scenario, loading, failure, retry } = useEvaluatedScenario(id, reference, '/data/healthcare', selected.sha256, validCase);
  const schedule = scenario.schedules[policy];
  const instance = scenario.instance;
  const usable = !loading && available(schedule, instance.patients.length);
  const days = Array.from({ length: instance.days }, (_, d) => d);
  const currentWard = instance.wards[ward];
  const patient = instance.patients.find(p => p.id === patientId);
  const assignment = usable && patient ? schedule.assignments!.find(a => a.patient_id === patient.id) : undefined;
  const occupied = usable ? schedule.assignments!.filter(a => a.ward_id === currentWard.id && a.day <= day && day < a.day + instance.patients.find(p => p.id === a.patient_id)!.los) : [];
  const patientOptions = instance.patients.map(p => ({ value: p.id, label: `${p.id} · ${p.specialty} · ${p.los}-day stay` }));
  useEffect(() => {
    const restore = () => {
      const q = new URLSearchParams(location.search);
      setId(index.scenarios.some(s => s.id === q.get('scenario')) ? q.get('scenario')! : reference.id);
      setPolicy(policies.includes(q.get('policy') as Policy) ? q.get('policy') as Policy : 'delay_first');
      const d = Number(q.get('day')); setDay(Number.isInteger(d) && d >= 0 && d < 7 ? d : 0);
      const w = Number(q.get('ward')); setWard(Number.isInteger(w) && w >= 0 && w < 4 ? w : 0);
      setPatientId(q.get('patient') || '');
    };
    restore(); setReady(true); window.addEventListener('popstate', restore);
    return () => window.removeEventListener('popstate', restore);
  }, []);
  useEffect(() => {
    if (!ready) return;
    const q = new URLSearchParams({ scenario: id, policy, day: String(day), ward: String(ward) });
    if (patientId) q.set('patient', patientId);
    history.replaceState(null, '', location.pathname + '?' + q + location.hash);
  }, [id, policy, day, ward, patientId, ready]);
  const changeCase = (next: string) => { setId(next); setPatientId(''); };
  const changeParameter = (key: keyof Parameters, value: number) => {
    const next = index.scenarios.find(s => (['seed', 'm', 'closed_beds'] as const).every(k => s[k] === (k === key ? value : selected[k])));
    if (next) changeCase(next.id);
  };
  const reset = () => { changeCase(reference.id); setPolicy('delay_first'); setDay(0); setWard(0); };
  const inspect = (next: string) => { changeCase(next); focusStudyResult(resultRef.current); };
  const shortOutcome = loading ? (failure ? 'result unavailable' : 'loading result…') : usable ? `${fmt(schedule.metrics!.delay_days)} delay days · ${fmt(schedule.metrics!.overtime_minutes)} extra minutes` : statusText(schedule.status);
  return <div className="healthcare-study">
    <p className="allocation-caption">Choose from 40 evaluated cases: five complete generated cohorts, four supplied ward-compatibility configurations and two bed-capacity assumptions. The browser displays frozen schedules; it does not solve a new clinical plan.</p>
    <StudyWorkbench>
      <StudyControlPanel summary={`Cohort ${selected.seed} · ${selected.m} extra specialties · ${selected.closed_beds} closed beds/ward · ${labels[policy]} · ${shortOutcome}`}>
        <fieldset className="study-control-fields" disabled={!ready}><legend className="sr-only">Healthcare scheduling scenarios</legend>
          <StepControl label="Generated cohort" value={selected.seed} options={index.cohorts.map(c => ({ value: c.seed, label: `Cohort ${c.seed} · ${c.patient_count} patients` }))} onChange={v => changeParameter('seed', v)} help="The first five numeric cohorts, selected before optimization. Each includes every supplied new patient." />
          <ChoiceControl label="Additional specialties per ward" value={selected.m} options={[0, 1, 2, 3].map(v => ({ value: v, label: String(v) }))} onChange={v => changeParameter('m', v)} help="Selects a supplied ward-eligibility configuration. These are benchmark assumptions, not changes to real clinical qualifications." />
          <ChoiceControl label="Beds unavailable in each ward" value={selected.closed_beds} options={[{ value: 0, label: 'None' }, { value: 1, label: 'One per ward' }]} onChange={v => changeParameter('closed_beds', v)} help="The closure is hypothetical and lasts all seven days. Existing occupants keep their beds." />
          <ChoiceControl label="Plan to inspect" value={policy} options={policies.map(p => ({ value: p, label: labels[p] }))} onChange={setPolicy} help={policy === 'baseline' ? 'A deterministic deadline-first rule, with bounded backtracking, finds the first complete bed-feasible schedule. It does not optimize either total.' : policy === 'delay_first' ? 'First minimize total admission delay; then minimize extra theatre minutes without increasing that proven minimum delay.' : 'First minimize extra theatre minutes; then minimize total admission delay without increasing that proven minimum extra time.'} />
          <button type="button" className="reset-button" onClick={reset}>Reset to reference</button>
        </fieldset>
      </StudyControlPanel>
      <div className="study-workbench-results">
        <section ref={resultRef} tabIndex={-1} className="allocation-result" aria-label="Healthcare scheduling result">
          {loading ? <div className="allocation-error" role="status"><p>{failure || 'Loading the selected evaluated schedule…'}</p>{failure && <button className="button" onClick={retry}>Retry scenario</button>}</div> : <>
            <h3>{labels[policy]} · cohort {selected.seed}</h3>
            <p className="allocation-caption" role="status">{instance.patients.length} generated patients · {statusText(schedule.status)}</p>
            {usable ? <>
              <div className="metric-grid"><div><span>Total admission delay</span><strong>{fmt(schedule.metrics!.delay_days)} <small>days</small></strong></div><div><span>Extra theatre time required</span><strong>{fmt(schedule.metrics!.overtime_minutes)} <small>min</small></strong></div><div><span>Patients admitted after earliest day</span><strong>{fmt(schedule.metrics!.delayed_patients)} <small>patients</small></strong></div></div>
              <p className="allocation-chart-note">Delay is measured from each patient’s earliest allowed admission. Extra minutes are summed across separate discipline/day budgets; they cannot be pooled freely. They are capacity requirements, not available resources.</p>
              <WardOccupancyCalendar days={days.map(d => ({ id: d, label: `Day ${d + 1}` }))} wards={instance.wards.map((w, i) => ({ id: i, label: `Ward ${w.id}`, capacity: w.capacity - selected.closed_beds }))} occupancy={schedule.occupancy!} initialOccupancy={instance.wards.map(w => w.carryover)} selectedDay={day} selectedWard={ward} onSelect={(w, d) => { setWard(w); setDay(d); }} disabled={!ready} />
              <div className="healthcare-day-detail">
                <StepControl label="Day to inspect" value={day} options={days.map(d => ({ value: d, label: `Day ${d + 1}` }))} onChange={setDay} disabled={!ready} help="This day is shared by the ward and theatre views below." />
                <ChoiceControl label="Ward detail" value={ward} options={instance.wards.map((w, i) => ({ value: i, label: w.id }))} onChange={setWard} disabled={!ready} />
                <h4>Ward {currentWard.id} · Day {day + 1}</h4>
                <p><strong>{schedule.occupancy![ward][day]} of {currentWard.capacity - selected.closed_beds} beds occupied.</strong> {currentWard.carryover[day]} are occupied by patients present before the planning week; {occupied.length} belong to the new cohort. Admission today uses a bed for the patient’s whole recovery stay.</p>
                <p className="allocation-chart-note">Eligible specialties: {[currentWard.major, ...currentWard.minors].join(', ')}. Codes are preserved from the source.</p>
                <div className="healthcare-patient-chips" role="group" aria-label="Patients occupying the selected ward and day">{occupied.slice(0, 8).map(a => <button type="button" key={a.patient_id} disabled={!ready} aria-pressed={patientId === a.patient_id} onClick={() => setPatientId(a.patient_id)}>{a.patient_id}</button>)}</div>
                {occupied.length > 8 && <p className="allocation-chart-note">Showing the first eight of {occupied.length} new patients in this cell. Search the complete cohort below.</p>}
              </div>
              <div className="healthcare-theatre"><h4>Theatre minutes · Day {day + 1}</h4><p className="allocation-chart-note">Copper shows time beyond that discipline’s supplied daily calendar. A zero calendar means any assigned surgery needs an additional session.</p>
                {instance.specialties.map((s, i) => { const used = schedule.or_minutes![i][day], cap = s.minutes[day], extra = Math.max(0, used - cap), scale = Math.max(1, ...instance.specialties.map((q, j) => Math.max(q.minutes[day], schedule.or_minutes![j][day]))); return <div className="healthcare-theatre-row" key={s.id}><span>{s.id}</span><div className="healthcare-theatre-bars" role="img" aria-label={`${s.id}: ${used} assigned minutes, ${cap} scheduled, ${extra} extra required`}><div style={{ width: `${100 * Math.min(used, cap) / scale}%` }} /><div className="extra" style={{ width: `${100 * extra / scale}%` }} /><i style={{ left: `${100 * cap / scale}%` }} /></div><small><strong>{fmt(used)}</strong> / {fmt(cap)}<br />{fmt(extra)} extra</small></div>; })}
                <p className="allocation-chart-note">Assigned / scheduled minutes. The vertical marker is scheduled capacity. The exact table below preserves unused scheduled minutes too.</p>
              </div>
              <details className="data-details"><summary>Exact seven-day theatre calendar</summary><div className="table-wrap" tabIndex={0} role="region" aria-label="All theatre minutes"><table><caption>Minutes by discipline and day · all four separate budgets</caption><thead><tr><th>Day</th><th>Discipline</th><th>Scheduled</th><th>Assigned</th><th>Extra required</th></tr></thead><tbody>{days.flatMap(d => instance.specialties.map((s, i) => <tr key={`${d}-${s.id}`}><th scope="row">{d + 1}</th><td>{s.id}</td><td>{fmt(s.minutes[d])}</td><td>{fmt(schedule.or_minutes![i][d])}</td><td>{fmt(Math.max(0, schedule.or_minutes![i][d] - s.minutes[d]))}</td></tr>))}</tbody></table></div></details>
              <details className="data-details" open={!!patientId}><summary>Follow one patient’s full stay</summary>
                <SearchChoice label="Generated patient" value={patientId} options={patientOptions} onChange={setPatientId} disabled={!ready} help="Generated benchmark IDs, not real patient identities. Choosing a patient only inspects this frozen schedule." />
                {patient && assignment ? <div className="healthcare-patient-detail" role="status"><h4>{patient.id} · {patient.specialty}</h4><p>Allowed admission: {patient.earliest === patient.latest ? `fixed on Day ${patient.earliest + 1}` : `Days ${patient.earliest + 1}–${patient.latest + 1}`}. Surgery: {patient.duration} minutes. Recovery stay: {patient.los} days.</p><p><strong>Assigned: Ward {assignment.ward_id}, admitted on Day {assignment.day + 1}.</strong> Delay: {assignment.day - patient.earliest} days. Last occupied day: Day {assignment.day + patient.los}.</p><ol className="healthcare-stay-strip">{days.map(d => <li key={d} className={d >= assignment.day && d < assignment.day + patient.los ? 'occupied' : ''}><span>Day {d + 1}</span><strong>{d === assignment.day ? 'Surgery' : d > assignment.day && d < assignment.day + patient.los ? 'Recovery' : '—'}</strong></li>)}</ol><p className="allocation-chart-note">Surgery occurs on admission day. The patient stays in one ward, with no transfer or shortened recovery assumed.</p></div> : <p>Select a patient to see how one admission occupies beds across several days.</p>}
              </details>
            </> : <div className="allocation-error"><p>No complete verified schedule is available for this plan: {statusText(schedule.status)}. No partial schedule or substitute result is displayed.</p></div>}
            <div className="table-wrap allocation-table" tabIndex={0} role="region" aria-label="Three scheduling plans"><table><caption>Same complete cohort and resources · two priorities and one rule</caption><thead><tr><th>Plan</th><th>Delay<br />patient-days</th><th>Extra theatre<br />minutes</th><th>Status</th></tr></thead><tbody>{policies.map(p => { const s = scenario.schedules[p]; return <tr key={p}><th scope="row">{labels[p]}</th><td>{hasMetrics(s) ? fmt(s.metrics!.delay_days) : 'Unavailable'}</td><td>{hasMetrics(s) ? fmt(s.metrics!.overtime_minutes) : 'Unavailable'}</td><td>{statusText(s.status)}</td></tr>; })}</tbody></table></div>
            <p className="scope-note"><strong>Within the supplied theatre calendar: {statusText(scenario.strict_calendar.status)}.</strong> Fixed-day patients alone exceed at least one discipline/day budget in every selected cohort. Moving flexible admissions cannot remove that requirement. The study permits and reports extra time; it does not establish that staff, rooms or extra sessions are available.</p>
          </>}
        </section>
        <section className="period-panel" id="healthcare-cases"><h3>Every evaluated case</h3><p className="allocation-caption">All 40 predetermined combinations remain in this comparison, including ties, unavailable baselines and solver limits. These are two priority endpoints, not a complete trade-off frontier.</p><details className="data-details"><summary>Compare all cohorts and capacity settings</summary><div className="table-wrap allocation-table" tabIndex={0} role="region" aria-label="Complete healthcare scenario comparison"><table><caption>Delay days / extra theatre minutes · all patients retained</caption><thead><tr><th>Cohort</th><th>Additional<br />specialties</th><th>Closed beds<br />per ward</th>{policies.map(p => <th key={p}>{labels[p]}</th>)}<th>Inspect</th></tr></thead><tbody>{index.scenarios.map(s => <tr key={s.id}><th scope="row">{s.seed}</th><td>{s.m}</td><td>{s.closed_beds}</td>{policies.map(p => <td key={p}>{hasMetrics(s.summaries[p]) ? `${fmt(s.summaries[p].metrics!.delay_days)} / ${fmt(s.summaries[p].metrics!.overtime_minutes)}` : statusText(s.summaries[p].status)}<small className="healthcare-table-status">{hasMetrics(s.summaries[p]) && statusText(s.summaries[p].status)}</small></td>)}<td><button type="button" className="text-link" disabled={!ready} aria-label={`Inspect cohort ${s.seed}, ${s.m} additional specialties, ${s.closed_beds} beds closed per ward`} onClick={() => inspect(s.id)}>Inspect ↑</button></td></tr>)}</tbody></table></div></details></section>
      </div>
    </StudyWorkbench>
  </div>;
}
