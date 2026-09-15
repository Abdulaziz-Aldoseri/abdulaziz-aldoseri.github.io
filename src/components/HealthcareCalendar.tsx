import { useId } from 'react';
import '../styles/healthcare-calendar.css';

export interface HealthcareCalendarDay {
  id: number;
  label: string;
}

export interface HealthcareCalendarWard {
  id: number;
  label: string;
  capacity: number;
}

export interface WardOccupancyCalendarProps {
  days: HealthcareCalendarDay[];
  wards: HealthcareCalendarWard[];
  /** Rows follow wards; columns follow days. Values are whole occupied beds. */
  occupancy: number[][];
  selectedDay: number;
  selectedWard: number;
  onSelect: (wardId: number, dayId: number) => void;
  disabled?: boolean;
  /** Optional inherited occupancy, on the same axes and included in occupancy. */
  initialOccupancy?: number[][];
}

const isBedCount = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;

function occupancyBand(occupied: number, capacity: number): string {
  if (occupied > capacity) return 'over';
  if (capacity === 0) return 'unavailable';
  if (occupied === 0) return 'empty';
  if (occupied === capacity) return 'full';
  if (occupied / capacity >= 0.8) return 'high';
  if (occupied / capacity >= 0.5) return 'medium';
  return 'low';
}

/** A controlled whole-day occupancy view, not an individual-bed schedule. */
export function WardOccupancyCalendar({
  days,
  wards,
  occupancy,
  selectedDay,
  selectedWard,
  onSelect,
  disabled = false,
  initialOccupancy,
}: WardOccupancyCalendarProps) {
  const id = useId();
  const hasInvalidData = wards.some((ward, row) =>
    !isBedCount(ward.capacity) || days.some((_, column) =>
      !isBedCount(occupancy[row]?.[column]) ||
      (initialOccupancy !== undefined &&
        (!isBedCount(initialOccupancy[row]?.[column]) ||
          initialOccupancy[row][column] > occupancy[row]?.[column]))));
  const hasOverCapacity = wards.some((ward, row) =>
    isBedCount(ward.capacity) && days.some((_, column) =>
      isBedCount(occupancy[row]?.[column]) && occupancy[row][column] > ward.capacity));

  return (
    <div className="healthcare-calendar">
      <div className="healthcare-calendar-heading">
        <h4 id={`${id}-title`}>Whole-day bed occupancy</h4>
        <span>Occupied / available beds</span>
      </div>
      <p className="healthcare-calendar-help" id={`${id}-help`}>
        Select a ward and day to inspect its bed use. Each tile is one daily occupancy count,
        not an individual-bed schedule. Scroll the calendar sideways to see further days.
      </p>
      {hasOverCapacity && <p className="healthcare-calendar-warning" role="status">
        Capacity exceeded: the red tiles show more occupied beds than available beds.
      </p>}
      {hasInvalidData && <p className="healthcare-calendar-warning" role="status">
        Some bed counts are missing or invalid. Those tiles are marked unavailable;
        an invalid inherited count is labelled separately.
      </p>}
      {!days.length || !wards.length ? (
        <p className="healthcare-calendar-empty" role="status">No ward occupancy is available.</p>
      ) : (
        <div className="healthcare-calendar-scroll" tabIndex={0} role="region"
          aria-labelledby={`${id}-title`} aria-describedby={`${id}-help`}>
          <table className="healthcare-calendar-table">
            <caption className="sr-only">Whole-day occupied beds and ward capacities; select a day to inspect it.</caption>
            <thead>
              <tr>
                <th scope="col" className="healthcare-calendar-corner">Ward</th>
                {days.map(day => <th scope="col" key={day.id}>{day.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {wards.map((ward, row) => <tr key={ward.id}>
                <th scope="row" className="healthcare-calendar-ward">
                  <span>{ward.label}</span>
                  <small>{isBedCount(ward.capacity) ? `${ward.capacity} beds` : 'Capacity unavailable'}</small>
                </th>
                {days.map((day, column) => {
                  const occupied = occupancy[row]?.[column];
                  const inherited = initialOccupancy?.[row]?.[column];
                  const valid = isBedCount(occupied) && isBedCount(ward.capacity);
                  const inheritedValid = isBedCount(inherited) && inherited <= occupied;
                  const band = valid ? occupancyBand(occupied, ward.capacity) : 'invalid';
                  const selected = selectedWard === ward.id && selectedDay === day.id;
                  const status = !valid ? 'Data unavailable' : band === 'over'
                    ? `${occupied - ward.capacity} over capacity` : band === 'unavailable'
                      ? 'No beds available' : band === 'full' ? 'At capacity' : `${ward.capacity - occupied} beds free`;
                  const inheritedLabel = initialOccupancy === undefined ? '' : inheritedValid
                    ? ` ${inherited} occupied beds are inherited from before the planning horizon.`
                    : ' Inherited occupancy is unavailable or invalid.';
                  const label = valid
                    ? `${ward.label}, ${day.label}: ${occupied} occupied beds out of ${ward.capacity} available. ${status}.${inheritedLabel}`
                    : `${ward.label}, ${day.label}: occupancy or capacity data unavailable.`;
                  return <td key={day.id}>
                    <button type="button" className={`healthcare-calendar-cell healthcare-calendar-cell--${band}`}
                      aria-label={label} aria-pressed={selected} disabled={disabled || !valid}
                      onClick={() => onSelect(ward.id, day.id)}>
                      <span className="healthcare-calendar-selected" aria-hidden="true">{selected ? 'Selected' : '\u00a0'}</span>
                      <span className="healthcare-calendar-count" aria-hidden="true">
                        {valid ? <><strong>{occupied}</strong><span> / {ward.capacity}</span></> : <strong>—</strong>}
                      </span>
                      <span className="healthcare-calendar-cell-note" aria-hidden="true">{status}</span>
                      {initialOccupancy !== undefined && <span className="healthcare-calendar-inherited" aria-hidden="true">
                        {inheritedValid ? `${inherited} inherited` : 'Inherited: unavailable'}
                      </span>}
                    </button>
                  </td>;
                })}
              </tr>)}
            </tbody>
          </table>
        </div>
      )}
      <div className="healthcare-calendar-legend" aria-label="Occupancy colour scale, as a share of available beds">
        <span><i className="healthcare-calendar-key--empty" aria-hidden="true" />Empty</span>
        <span><i className="healthcare-calendar-key--low" aria-hidden="true" />Below 50%</span>
        <span><i className="healthcare-calendar-key--medium" aria-hidden="true" />50–&lt;80%</span>
        <span><i className="healthcare-calendar-key--high" aria-hidden="true" />80–&lt;100%</span>
        <span><i className="healthcare-calendar-key--full" aria-hidden="true" />Full</span>
        <span><i className="healthcare-calendar-key--unavailable" aria-hidden="true" />No capacity</span>
        {hasOverCapacity && <span><i className="healthcare-calendar-key--over" aria-hidden="true" />Over capacity</span>}
      </div>
    </div>
  );
}

export default WardOccupancyCalendar;
