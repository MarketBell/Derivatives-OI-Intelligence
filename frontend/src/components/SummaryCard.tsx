import React from 'react';
import { Target, ArrowDownRight, ArrowUpRight, Percent, Zap } from 'lucide-react';
import type { SummaryMetrics } from '../types/dashboard';

interface SummaryCardProps {
  summary: SummaryMetrics;
}

const formatNumber = (num?: number): string => {
  if (num === undefined || num === null || isNaN(num)) return '-';
  if (num === 0) return '0';
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 2,
  }).format(num);
};

export const SummaryCardContainer: React.FC<SummaryCardProps> = ({ summary }) => {
  const isCallChangePos = summary.callOIChangeVal >= 0;
  const isPutChangePos = summary.putOIChangeVal >= 0;

  const pcr = summary.pcr ?? (summary.endCallOI > 0 ? summary.endPutOI / summary.endCallOI : 0);
  const pcrSentiment = pcr >= 1.2 ? 'Bullish (Put Heavy)' : pcr <= 0.8 ? 'Bearish (Call Heavy)' : 'Neutral / Range';
  const pcrBadgeClass = pcr >= 1.2 ? 'pct-green' : pcr <= 0.8 ? 'pct-red' : 'pct-neutral';

  return (
    <div className="summary-cards-grid">
      {/* Card 1: Spot Price & Dynamic ATM Strike */}
      <div className="summary-card">
        <div className="card-top-row">
          <span className="card-title">Underlying Spot & ATM Strike</span>
          <div className="card-icon-pill icon-purple">
            <Zap className="w-4 h-4 text-amber-500" />
          </div>
        </div>
        <div className="card-metrics-row">
          <div className="metric-group">
            <span className="metric-label">Live Spot Price</span>
            <span className="metric-value val-spot font-bold">
              {summary.spotPrice ? `₹${formatNumber(summary.spotPrice)}` : '-'}
            </span>
          </div>
          <div className="metric-group">
            <span className="metric-label">Dynamic ATM Strike</span>
            <span className="metric-value atm-badge font-bold">
              {summary.atmStrike ? `₹${formatNumber(summary.atmStrike)}` : '-'}
            </span>
          </div>
        </div>
      </div>

      {/* Card 2: Open Interest (ATM + 4 OTM) */}
      <div className="summary-card">
        <div className="card-top-row">
          <span className="card-title">Live Open Interest (ATM + 4 OTM)</span>
          <div className="card-icon-pill icon-purple">
            <Target className="w-4 h-4 text-purple-600 dark:text-purple-300" />
          </div>
        </div>
        <div className="card-metrics-row">
          <div className="metric-group">
            <span className="metric-label">Total Call OI (5 Strikes)</span>
            <span className="metric-value val-green">{formatNumber(summary.endCallOI)}</span>
          </div>
          <div className="metric-group">
            <span className="metric-label">Total Put OI (5 Strikes)</span>
            <span className="metric-value val-red">{formatNumber(summary.endPutOI)}</span>
          </div>
        </div>
      </div>

      {/* Card 3: PCR (Put / Call Ratio) */}
      <div className="summary-card">
        <div className="card-top-row">
          <span className="card-title">PCR (Put / Call Ratio)</span>
          <div className="card-icon-pill icon-purple">
            <Percent className="w-4 h-4 text-purple-600 dark:text-purple-300" />
          </div>
        </div>
        <div className="card-metrics-row">
          <div className="metric-group">
            <span className="metric-label">Ratio (PE OI / CE OI)</span>
            <span className="metric-value font-mono font-bold">{pcr.toFixed(2)}</span>
          </div>
          <div className="metric-group">
            <span className="metric-label">Sentiment Bias</span>
            <span className={`metric-pct ${pcrBadgeClass} font-semibold`}>{pcrSentiment}</span>
          </div>
        </div>
      </div>

      {/* Card 4: OI Change vs Previous Day Close */}
      <div className="summary-card">
        <div className="card-top-row">
          <span className="card-title">OI Change (vs Prev Day Close)</span>
          <div className={`card-icon-pill ${isCallChangePos ? 'icon-green' : 'icon-red'}`}>
            {isCallChangePos ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
          </div>
        </div>
        <div className="card-metrics-row">
          <div className="metric-group">
            <span className="metric-label">Call OI Change</span>
            <span className={`metric-value ${isCallChangePos ? 'val-green' : 'val-red'}`}>
              {formatNumber(summary.callOIChangeVal)}
            </span>
            <span className={`metric-pct ${isCallChangePos ? 'pct-green' : 'pct-red'}`}>
              {summary.callOIChangePct > 0 ? '+' : ''}
              {summary.callOIChangePct.toFixed(2)}%
            </span>
          </div>
          <div className="metric-group">
            <span className="metric-label">Put OI Change</span>
            <span className={`metric-value ${isPutChangePos ? 'val-green' : 'val-red'}`}>
              {formatNumber(summary.putOIChangeVal)}
            </span>
            <span className={`metric-pct ${isPutChangePos ? 'pct-green' : 'pct-red'}`}>
              {summary.putOIChangePct > 0 ? '+' : ''}
              {summary.putOIChangePct.toFixed(2)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

