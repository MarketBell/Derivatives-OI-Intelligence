import React from 'react';

interface LegendProps {
  startTime?: string;
}

export const Legend: React.FC<LegendProps> = () => {
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
    </footer>
  );
};
