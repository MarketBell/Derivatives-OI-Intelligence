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
              <th className="col-time">Time</th>
              <th className="sub-header group-call">Total Call OI</th>
              <th className="sub-header group-put">Total Put OI</th>
              <th className="sub-header font-bold text-center">PCR</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const pcrVal = row.pcr ?? (row.callOI > 0 ? Math.round((row.putOI / row.callOI) * 10000) / 10000 : 0);

              return (
                <tr
                  key={`oi-row-${index}`}
                  className={`table-row ${row.isHighlighted ? 'highlighted-row' : ''}`}
                >
                  <td className="cell-time">{row.time}</td>
                  
                  {/* Total Call OI */}
                  <td className="cell-num">{formatVal(row.callOI)}</td>

                  {/* Total Put OI */}
                  <td className="cell-num">{formatVal(row.putOI)}</td>

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
