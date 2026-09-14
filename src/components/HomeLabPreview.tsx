import { useEffect, useState } from 'react';

type Scenario = { duration: number; meanRelief: number; worsened: number; days: number };
const number = (value: number) => new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 }).format(value);

export default function HomeLabPreview({ scenarios }: { scenarios: Scenario[] }) {
  const [duration, setDuration] = useState(2);
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const result = scenarios.find(scenario => scenario.duration === duration)!;
  return <aside className="lab-window" aria-labelledby="lab-question">
    <div className="lab-window-heading"><span>From the Decision Lab</span><span>Energy</span></div>
    <h2 id="lab-question">Can electricity storage<br className="optional-break" /> reduce daily peaks?</h2>
    <p className="window-intro">Storage draws electricity when charging and supplies it when discharging. This model schedules an ideal store using a forecast, then tests whether it reduces Great Britain’s actual daily peak.</p>
    <p className="window-context" id="duration-context">Power limit: 1,000 MW. Duration is how long a full store can discharge at that rate.</p>
    <fieldset className="duration-choices" disabled={!ready} aria-describedby="duration-context">
      <legend>Storage duration</legend>
      <div>{scenarios.map(scenario => <label key={scenario.duration}>
        <input type="radio" name="storage-duration" value={scenario.duration} checked={duration === scenario.duration} onChange={() => setDuration(scenario.duration)} />
        <span><strong>{scenario.duration} {scenario.duration === 1 ? 'hour' : 'hours'}</strong><small>{number(1000 * scenario.duration)} MWh</small></span>
      </label>)}</div>
    </fieldset>
    <noscript><p className="window-note">Enable JavaScript to change the duration. The two-hour result is shown below.</p></noscript>
    <div className="window-results" aria-live="polite" aria-atomic="true">
      <p className="result-caption">Average daily peak reduction</p>
      <p className="window-result"><strong>{number(result.meanRelief)}</strong><span>MW</span></p>
      <p className="window-downside"><strong>{result.worsened} of {result.days} days</strong> had a higher peak than without added storage.</p>
    </div>
    <div className="window-study-link"><span>May–December 2025</span><a href={`/projects/energy-flexibility/?power=1000&duration=${duration}&policy=forecast_lp`}>Explore this study <span aria-hidden="true">↗</span></a></div>
    <details className="window-details"><summary>Study context &amp; data</summary>
      <p>Independent retrospective model results for ideal, hypothetical storage, empty at the start and end of each day. This is an exploration of capacity and scheduling, with no costs or operating losses.</p>
      <p>Figures use one fixed schedule selection. <a href="/projects/energy-flexibility/#tie-sensitivity">Other equally optimal schedules can perform differently.</a></p>
      <p>GB metered-generation requirement. Supported by <a href="https://www.neso.energy/data-portal/historic-demand-data">National Energy SO Open Data</a> (2024/2025 revised snapshots). <a href="https://www.neso.energy/data-portal/neso-open-licence">NESO Open Data Licence</a>. Model: Abdulaziz Aldoseri.</p>
    </details>
    <p className="window-note">Retrospective model · Hypothetical storage<br />One fixed schedule selection · NESO open data</p>
  </aside>;
}
