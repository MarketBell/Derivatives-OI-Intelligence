import React from 'react';
import { Target, ArrowUp, ArrowDown } from 'lucide-react';
import type { StrikeDetail } from '../types/dashboard';

interface StrikeWiseOITableProps {
  strikeDetails?: StrikeDetail[];
  atmStrike?: number;
  spotPrice?: number;
}

const formatNumber = (num?: number): string => {
  if (num === undefined || num === null) return '-';
  if (num === 0) return '0';
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 2,
  }).format(num);
};

export const StrikeWiseOITable: React.FC<StrikeWiseOITableProps> = ({
  strikeDetails = [],
  atmStrike,
  spotPrice,
}) => {
  if (!strikeDetails || strikeDetails.length === 0) {
    return null;
  }

  return (
    <div className="table-card strike-wise-card">
      <div className="table-card-header">
        <div className="strike-header-left">
          <div className="strike-icon-badge">
            <Target className="w-4 h-4" />
          </div>
          <div>
            <h3 className="table-title">STRIKE-WISE OPTION CHAIN</h3>
            <p className="table-subtitle">
              Dynamic Spot: <strong>₹{formatNumber(spotPrice)}</strong> | ATM Strike:{' '}
              <span className="atm-pill">₹{formatNumber(atmStrike)}</span>
            </p>
          </div>
        </div>
        <div className="strike-legend-pills">
          <span className="legend-pill pill-atm">ATM (At-The-Money)</span>
          <span className="legend-pill pill-otm-call">OTM Calls</span>
          <span className="legend-pill pill-otm-put">OTM Puts</span>
        </div>
      </div>

      <div className="table-wrapper">
        <table className="oi-table strike-table">
          <thead>
            <tr>
              <th colSpan={4} className="header-group group-call">
                CALL SIDE (CE)
              </th>
              <th rowSpan={2} className="col-strike-center">
                STRIKE PRICE
              </th>
              <th colSpan={4} className="header-group group-put">
                PUT SIDE (PE)
              </th>
            </tr>
            <tr>
              <th className="sub-header">Volume</th>
              <th className="sub-header">LTP (₹)</th>
              <th className="sub-header">OI Change (vs Prev Close)</th>
              <th className="sub-header">Open Interest</th>

              <th className="sub-header">Open Interest</th>
              <th className="sub-header">OI Change (vs Prev Close)</th>
              <th className="sub-header">LTP (₹)</th>
              <th className="sub-header">Volume</th>
            </tr>
          </thead>
          <tbody>
            {strikeDetails.map((item) => {
              const isATM = item.isATM;
              const isCeChangeNeg = (item.ceOIChange ?? 0) < 0;
              const isCeChangePos = (item.ceOIChange ?? 0) > 0;
              const isPeChangeNeg = (item.peOIChange ?? 0) < 0;
              const isPeChangePos = (item.peOIChange ?? 0) > 0;

              return (
                <tr
                  key={`strike-${item.strikePrice}`}
                  className={`strike-row ${isATM ? 'atm-highlight-row' : ''} ${
                    item.isCallOTM ? 'otm-call-row' : item.isPutOTM ? 'otm-put-row' : ''
                  }`}
                >
                  {/* CE Volume */}
                  <td className="cell-num">{formatNumber(item.ceVolume)}</td>

                  {/* CE LTP */}
                  <td className="cell-num font-mono">{formatNumber(item.ceLTP)}</td>

                  {/* CE OI Change vs Prev Close */}
                  <td className="cell-num">
                    <span
                      className={`flex-cell ${
                        isCeChangePos ? 'txt-green' : isCeChangeNeg ? 'txt-red' : 'txt-neutral'
                      }`}
                    >
                      {item.ceOIChange !== undefined && item.ceOIChange !== 0 ? (
                        <>
                          {isCeChangePos ? (
                            <ArrowUp className="w-3.5 h-3.5 inline mr-1" />
                          ) : (
                            <ArrowDown className="w-3.5 h-3.5 inline mr-1" />
                          )}
                          {formatNumber(item.ceOIChange)} ({item.ceOIChangePct?.toFixed(2)}%)
                        </>
                      ) : (
                        '-'
                      )}
                    </span>
                  </td>

                  {/* CE OI */}
                  <td className="cell-num font-semibold txt-call-oi">
                    {formatNumber(item.ceOI)}
                  </td>

                  {/* Strike Price Center */}
                  <td className="cell-strike-center">
                    <div className="strike-badge-box">
                      <span className="strike-number">{formatNumber(item.strikePrice)}</span>
                      {isATM && <span className="atm-tag">ATM</span>}
                    </div>
                  </td>

                  {/* PE OI */}
                  <td className="cell-num font-semibold txt-put-oi">
                    {formatNumber(item.peOI)}
                  </td>

                  {/* PE OI Change vs Prev Close */}
                  <td className="cell-num">
                    <span
                      className={`flex-cell ${
                        isPeChangePos ? 'txt-green' : isPeChangeNeg ? 'txt-red' : 'txt-neutral'
                      }`}
                    >
                      {item.peOIChange !== undefined && item.peOIChange !== 0 ? (
                        <>
                          {isPeChangePos ? (
                            <ArrowUp className="w-3.5 h-3.5 inline mr-1" />
                          ) : (
                            <ArrowDown className="w-3.5 h-3.5 inline mr-1" />
                          )}
                          {formatNumber(item.peOIChange)} ({item.peOIChangePct?.toFixed(2)}%)
                        </>
                      ) : (
                        '-'
                      )}
                    </span>
                  </td>

                  {/* PE LTP */}
                  <td className="cell-num font-mono">{formatNumber(item.peLTP)}</td>

                  {/* PE Volume */}
                  <td className="cell-num">{formatNumber(item.peVolume)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
