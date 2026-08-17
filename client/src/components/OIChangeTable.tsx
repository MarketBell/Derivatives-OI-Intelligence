import React from 'react';
import { Info } from 'lucide-react';
import type { OIRow } from '../types/dashboard';

interface OIChangeTableProps {
  rows: OIRow[];
  startTime: string;
}

const formatVal = (val: number): string => {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);
};

export const OIChangeTable: React.FC<OIChangeTableProps> = ({ rows, startTime }) => {
  return (
    <div className="table-card">
      <div className="table-card-header">
        <h3 className="table-title">OI CHANGE (DIFFERENCE FROM {startTime})</h3>
        <Info className="w-4 h-4 text-blue-500 cursor-pointer" />
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
              <th className="sub-header">OI Change (Value)</th>
              <th className="sub-header">OI Change (%)</th>
              <th className="sub-header">OI Change (Value)</th>
              <th className="sub-header">OI Change (%)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const isCallNeg = row.callChangeVal < 0;
              const isCallPos = row.callChangeVal > 0;
              const isPutNeg = row.putChangeVal < 0;
              const isPutPos = row.putChangeVal > 0;

              return (
                <tr
                  key={`oichg-row-${index}`}
                  className={`table-row ${row.isHighlighted ? 'highlighted-row' : ''}`}
                >
                  <td className="cell-time">{row.time}</td>

                  {/* Call side change value */}
                  <td
                    className={`cell-num ${
                      isCallNeg ? 'txt-red' : isCallPos ? 'txt-green' : 'txt-neutral'
                    }`}
                  >
                    {formatVal(row.callChangeVal)}
                  </td>

                  {/* Call side change pct */}
                  <td
                    className={`cell-num ${
                      isCallNeg ? 'txt-red' : isCallPos ? 'txt-green' : 'txt-neutral'
                    }`}
                  >
                    {row.callChangePct > 0 ? '+' : ''}
                    {row.callChangePct.toFixed(2)}%
                  </td>

                  {/* Put side change value */}
                  <td
                    className={`cell-num ${
                      isPutNeg ? 'txt-red' : isPutPos ? 'txt-green' : 'txt-neutral'
                    }`}
                  >
                    {formatVal(row.putChangeVal)}
                  </td>

                  {/* Put side change pct */}
                  <td
                    className={`cell-num ${
                      isPutNeg ? 'txt-red' : isPutPos ? 'txt-green' : 'txt-neutral'
                    }`}
                  >
                    {row.putChangePct > 0 ? '+' : ''}
                    {row.putChangePct.toFixed(2)}%
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
