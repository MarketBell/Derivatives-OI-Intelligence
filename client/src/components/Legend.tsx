import React from 'react';

interface LegendProps {
  startTime: string;
}

export const Legend: React.FC<LegendProps> = ({ startTime }) => {
  return (
    <footer className="dashboard-legend">
      <div className="legend-items">
        <div className="legend-item">
          <span className="legend-box box-green" />
          <span className="legend-label">Green: Increase in OI</span>
        </div>
        <div className="legend-item">
          <span className="legend-box box-red" />
          <span className="legend-label">Red: Decrease in OI</span>
        </div>
      </div>

      <div className="legend-note">
        <span>
          <strong>Note:</strong> OI Change is calculated as (Current Reading - {startTime} Reading)
        </span>
      </div>
    </footer>
  );
};
