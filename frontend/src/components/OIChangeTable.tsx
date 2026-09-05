import React from 'react';
import { Info } from 'lucide-react';
import type { OIRow } from '../types/dashboard';

interface OIChangeTableProps {
  rows: OIRow[];
  startTime?: string;
}

const formatVal = (val: number): string => {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);
};

const formatSigned = (val: number | null): React.ReactNode => {
  if (val === null) return '—';
  if (val === 0) return '—';
  const isPos = val > 0;
  const isNeg = val < 0;
  return (
    <span className={isNeg ? 'txt-red' : isPos ? 'txt-green' : 'txt-neutral'}>
      {isPos ? `+${formatVal(val)}` : formatVal(val)}
    </span>
  );
};

export const OIChangeTable: React.FC<OIChangeTableProps> = ({ rows }) => {
  return (
    <div className="table-card">
      <div className="table-card-header">
        <h3 className="table-title">OPEN INTEREST CHANGE</h3>
        <Info className="w-4 h-4 text-purple-600 dark:text-purple-400 cursor-pointer" />
      </div>

      <div className="table-wrapper">
        <table className="oi-table">
          <thead>
            <tr>
              <th rowSpan={2} className="col-time">
                Time
              </th>
              <th colSpan={2} className="header-group group-call">
                CALL SIDE
              </th>
              <th colSpan={2} className="header-group group-put">
                PUT SIDE
              </th>
            </tr>
            <tr>
              <th className="sub-header">Call OI Change</th>
              <th className="sub-header">Call Difference</th>
              <th className="sub-header">Put OI Change</th>
              <th className="sub-header">Put Difference</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const callOIChange = row.callOIChange;
              const callDiff = row.callDifference;
              const putOIChange = row.putOIChange;
              const putDiff = row.putDifference;

              const isCallNeg = callOIChange < 0;
              const isCallPos = callOIChange > 0;
              const isPutNeg = putOIChange < 0;
              const isPutPos = putOIChange > 0;

              return (
                <tr
                  key={`oichg-row-${index}`}
                  className={`table-row ${row.isHighlighted ? 'highlighted-row' : ''}`}
                >
                  <td className="cell-time">{row.time}</td>

                  {/* Call OI Change */}
                  <td
                    className={`cell-num ${
                      isCallNeg ? 'txt-red' : isCallPos ? 'txt-green' : 'txt-neutral'
                    }`}
                  >
                    {isCallPos ? `+${formatVal(callOIChange)}` : formatVal(callOIChange)}
                  </td>

                  {/* Call Difference */}
                  <td className="cell-num">
                    {formatSigned(callDiff)}
                  </td>

                  {/* Put OI Change */}
                  <td
                    className={`cell-num ${
                      isPutNeg ? 'txt-red' : isPutPos ? 'txt-green' : 'txt-neutral'
                    }`}
                  >
                    {isPutPos ? `+${formatVal(putOIChange)}` : formatVal(putOIChange)}
                  </td>

                  {/* Put Difference */}
                  <td className="cell-num">
                    {formatSigned(putDiff)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
