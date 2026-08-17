import React from 'react';
import { Info, ArrowDown, ArrowUp } from 'lucide-react';
import type { OIRow } from '../types/dashboard';

interface OITableProps {
  rows: OIRow[];
  startTime: string;
}

const formatVal = (val: number): string => {
  if (val === 0) return '-';
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);
};

export const OITable: React.FC<OITableProps> = ({ rows, startTime }) => {
  return (
    <div className="table-card">
      <div className="table-card-header">
        <h3 className="table-title">OPEN INTEREST (OI)</h3>
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
              <th className="sub-header">(Value)</th>
              <th className="sub-header">Change from {startTime}</th>
              <th className="sub-header">(Value)</th>
              <th className="sub-header">Change from {startTime}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const isCallNeg = row.callChangeVal < 0;
              const isPutNeg = row.putChangeVal < 0;

              return (
                <tr
                  key={`oi-row-${index}`}
                  className={`table-row ${row.isHighlighted ? 'highlighted-row' : ''}`}
                >
                  <td className="cell-time">{row.time}</td>
                  
                  {/* Call side value */}
                  <td className="cell-num">{formatVal(row.callOI)}</td>
                  
                  {/* Call side change */}
                  <td className="cell-num">
                    {row.callChangeVal === 0 ? (
                      '-'
                    ) : (
                      <span className={`flex-cell ${isCallNeg ? 'txt-red' : 'txt-green'}`}>
                        {formatVal(row.callChangeVal)}
                        {isCallNeg ? <ArrowDown className="w-3.5 h-3.5" /> : <ArrowUp className="w-3.5 h-3.5" />}
                      </span>
                    )}
                  </td>

                  {/* Put side value */}
                  <td className="cell-num">{formatVal(row.putOI)}</td>

                  {/* Put side change */}
                  <td className="cell-num">
                    {row.putChangeVal === 0 ? (
                      '-'
                    ) : (
                      <span className={`flex-cell ${isPutNeg ? 'txt-red' : 'txt-green'}`}>
                        {formatVal(row.putChangeVal)}
                        {isPutNeg ? <ArrowDown className="w-3.5 h-3.5" /> : <ArrowUp className="w-3.5 h-3.5" />}
                      </span>
                    )}
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
