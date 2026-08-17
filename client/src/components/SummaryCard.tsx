import React from 'react';
import { Clock, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import type { SummaryMetrics } from '../types/dashboard';

interface SummaryCardProps {
  summary: SummaryMetrics;
}

const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
};

export const SummaryCardContainer: React.FC<SummaryCardProps> = ({ summary }) => {
  return (
    <div className="summary-cards-grid">
      {/* Card 1: Start OI */}
      <div className="summary-card">
        <div className="card-top-row">
          <span className="card-title">OI at {summary.startTime}</span>
          <div className="card-icon-pill icon-blue">
            <Clock className="w-4 h-4" />
          </div>
        </div>
        <div className="card-metrics-row">
          <div className="metric-group">
            <span className="metric-label">Call</span>
            <span className="metric-value val-green">{formatNumber(summary.startCallOI)}</span>
          </div>
          <div className="metric-group">
            <span className="metric-label">Put</span>
            <span className="metric-value val-red">{formatNumber(summary.startPutOI)}</span>
          </div>
        </div>
      </div>

      {/* Card 2: End OI */}
      <div className="summary-card">
        <div className="card-top-row">
          <span className="card-title">OI at {summary.endTime}</span>
          <div className="card-icon-pill icon-purple">
            <Clock className="w-4 h-4" />
          </div>
        </div>
        <div className="card-metrics-row">
          <div className="metric-group">
            <span className="metric-label">Call</span>
            <span className="metric-value val-green">{formatNumber(summary.endCallOI)}</span>
          </div>
          <div className="metric-group">
            <span className="metric-label">Put</span>
            <span className="metric-value val-red">{formatNumber(summary.endPutOI)}</span>
          </div>
        </div>
      </div>

      {/* Card 3: Interim OI Change */}
      <div className="summary-card">
        <div className="card-top-row">
          <span className="card-title">
            OI Change ({summary.interimTime || '03:27 PM'} vs {summary.startTime})
          </span>
          <div
            className={`card-icon-pill ${
              (summary.interimCallOIChangeVal || summary.callOIChangeVal) >= 0 ? 'icon-green' : 'icon-red'
            }`}
          >
            {(summary.interimCallOIChangeVal || summary.callOIChangeVal) >= 0 ? (
              <ArrowUpRight className="w-4 h-4" />
            ) : (
              <ArrowDownRight className="w-4 h-4" />
            )}
          </div>
        </div>
        <div className="card-metrics-row">
          <div className="metric-group">
            <span className="metric-label">Call</span>
            <span
              className={`metric-value ${
                (summary.interimCallOIChangeVal ?? summary.callOIChangeVal) >= 0 ? 'val-green' : 'val-red'
              }`}
            >
              {formatNumber(summary.interimCallOIChangeVal ?? summary.callOIChangeVal)}
            </span>
            <span
              className={`metric-pct ${
                (summary.interimCallOIChangePct ?? summary.callOIChangePct) >= 0 ? 'pct-green' : 'pct-red'
              }`}
            >
              {(summary.interimCallOIChangePct ?? summary.callOIChangePct) > 0 ? '+' : ''}
              {(summary.interimCallOIChangePct ?? summary.callOIChangePct).toFixed(2)}%
            </span>
          </div>
          <div className="metric-group">
            <span className="metric-label">Put</span>
            <span
              className={`metric-value ${
                (summary.interimPutOIChangeVal ?? summary.putOIChangeVal) >= 0 ? 'val-green' : 'val-red'
              }`}
            >
              {formatNumber(summary.interimPutOIChangeVal ?? summary.putOIChangeVal)}
            </span>
            <span
              className={`metric-pct ${
                (summary.interimPutOIChangePct ?? summary.putOIChangePct) >= 0 ? 'pct-green' : 'pct-red'
              }`}
            >
              {(summary.interimPutOIChangePct ?? summary.putOIChangePct) > 0 ? '+' : ''}
              {(summary.interimPutOIChangePct ?? summary.putOIChangePct).toFixed(2)}%
            </span>
          </div>
        </div>
      </div>

      {/* Card 4: End OI Change */}
      <div className="summary-card">
        <div className="card-top-row">
          <span className="card-title">
            OI Change at {summary.endTime} (vs {summary.startTime})
          </span>
          <div className={`card-icon-pill ${summary.callOIChangeVal >= 0 ? 'icon-green' : 'icon-red'}`}>
            {summary.callOIChangeVal >= 0 ? (
              <ArrowUpRight className="w-4 h-4" />
            ) : (
              <ArrowDownRight className="w-4 h-4" />
            )}
          </div>
        </div>
        <div className="card-metrics-row">
          <div className="metric-group">
            <span className="metric-label">Call</span>
            <span className={`metric-value ${summary.callOIChangeVal >= 0 ? 'val-green' : 'val-red'}`}>
              {formatNumber(summary.callOIChangeVal)}
            </span>
            <span className={`metric-pct ${summary.callOIChangePct >= 0 ? 'pct-green' : 'pct-red'}`}>
              {summary.callOIChangePct > 0 ? '+' : ''}
              {summary.callOIChangePct.toFixed(2)}%
            </span>
          </div>
          <div className="metric-group">
            <span className="metric-label">Put</span>
            <span className={`metric-value ${summary.putOIChangeVal >= 0 ? 'val-green' : 'val-red'}`}>
              {formatNumber(summary.putOIChangeVal)}
            </span>
            <span className={`metric-pct ${summary.putOIChangePct >= 0 ? 'pct-green' : 'pct-red'}`}>
              {summary.putOIChangePct > 0 ? '+' : ''}
              {summary.putOIChangePct.toFixed(2)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
