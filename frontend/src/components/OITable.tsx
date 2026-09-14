import React from 'react';
import { Info } from 'lucide-react';
import type { OIRow } from '../types/dashboard';

interface OITableProps {
  rows: OIRow[];
  startTime?: string;
}

const formatVal = (val: number): string => {
  if (val === 0) return '-';
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

export const OITable: React.FC<OITableProps> = ({ rows }) => {
  return (
    <div className="table-card">
      <div className="table-card-header">
        <h3 className="table-title">OPEN INTEREST (OI)</h3>
        <Info className="w-4 h-4 text-emerald-400 cursor-pointer" />
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
              <th rowSpan={2} className="sub-header font-bold text-center">
                PCR
              </th>
            </tr>
            <tr>
              <th className="sub-header">Total Call OI</th>
              <th className="sub-header">Call Difference</th>
              <th className="sub-header">Total Put OI</th>
              <th className="sub-header">Put Difference</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const pcrVal = row.pcr ?? (row.callOI > 0 ? Math.round((row.putOI / row.callOI) * 10000) / 10000 : 0);
              const callDiff = row.callDifference;
              const putDiff = row.putDifference;

              return (
                <tr
                  key={`oi-row-${index}`}
                  className={`table-row ${row.isHighlighted ? 'highlighted-row' : ''}`}
                >
                  <td className="cell-time">{row.time}</td>
                  
                  {/* Total Call OI */}
                  <td className="cell-num">{formatVal(row.callOI)}</td>

                  {/* Call Difference */}
                  <td className="cell-num">{formatSigned(callDiff)}</td>

                  {/* Total Put OI */}
                  <td className="cell-num">{formatVal(row.putOI)}</td>

                  {/* Put Difference */}
                  <td className="cell-num">{formatSigned(putDiff)}</td>

                  {/* PCR */}
                  <td className="cell-num text-center font-mono font-semibold text-emerald-400">
                    {pcrVal > 0 ? pcrVal.toFixed(4) : '-'}
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
