import React from 'react';

interface LegendProps {
  startTime?: string;
}

export const Legend: React.FC<LegendProps> = ({ startTime = '09:15 AM' }) => {
  return (
    <footer className="dashboard-legend">
      <div className="legend-items">
        <div className="legend-item">
          <span className="legend-box box-green" />
          <span className="legend-label">Green: Increase in Open Interest (Building)</span>
        </div>
        <div className="legend-item">
          <span className="legend-box box-red" />
          <span className="legend-label">Red: Decrease in Open Interest (Unwinding)</span>
        </div>
      </div>

      <div className="legend-note">
        <span>
          <strong>Baseline Rule:</strong> OI Change = Live OI − Previous Trading Day Closing OI. ({startTime} marks market session open boundary).
        </span>
      </div>
    </footer>
  );
};
