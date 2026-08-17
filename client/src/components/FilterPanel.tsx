import React from 'react';
import { Calendar, Clock, Info } from 'lucide-react';
import type { FilterState, IndexType } from '../types/dashboard';

interface FilterPanelProps {
  filters: FilterState;
  availableDates: string[];
  timeOptions: string[];
  onChangeFilter: (updated: Partial<FilterState>) => void;
  onApply: () => void;
  onReset: () => void;
  onQuickFilter: (period: '30min' | '1hour' | 'fullday') => void;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
  filters,
  availableDates,
  timeOptions,
  onChangeFilter,
  onApply,
  onReset,
  onQuickFilter,
}) => {
  return (
    <div className="filter-card">
      <div className="filter-grid">
        {/* Index Selector */}
        <div className="filter-field">
          <label className="filter-label">Index</label>
          <select
            className="filter-select"
            value={filters.selectedIndex}
            onChange={(e) => onChangeFilter({ selectedIndex: e.target.value as IndexType })}
          >
            <option value="NIFTY">Nifty</option>
            <option value="BANK NIFTY">Bank Nifty</option>
            <option value="SENSEX">Sensex</option>
          </select>
        </div>

        {/* Date Selector */}
        <div className="filter-field">
          <label className="filter-label">Date</label>
          <div className="input-with-icon">
            <Calendar className="field-icon" />
            <select
              className="filter-select select-icon-padded"
              value={filters.selectedDate}
              onChange={(e) => onChangeFilter({ selectedDate: e.target.value })}
            >
              {availableDates.map((date) => (
                <option key={date} value={date}>
                  {date}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Start Time */}
        <div className="filter-field">
          <label className="filter-label">Start Time</label>
          <div className="input-with-icon">
            <Clock className="field-icon" />
            <select
              className="filter-select select-icon-padded"
              value={filters.startTime}
              onChange={(e) => onChangeFilter({ startTime: e.target.value, quickFilter: 'custom' })}
            >
              {timeOptions.map((t) => (
                <option key={`start-${t}`} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* End Time */}
        <div className="filter-field">
          <label className="filter-label">End Time</label>
          <div className="input-with-icon">
            <Clock className="field-icon" />
            <select
              className="filter-select select-icon-padded"
              value={filters.endTime}
              onChange={(e) => onChangeFilter({ endTime: e.target.value, quickFilter: 'custom' })}
            >
              {timeOptions.map((t) => (
                <option key={`end-${t}`} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Filter Pills */}
        <div className="filter-field quick-filters-field">
          <label className="filter-label">&nbsp;</label>
          <div className="quick-filter-buttons">
            <button
              type="button"
              className={`btn-quick ${filters.quickFilter === '30min' ? 'active' : ''}`}
              onClick={() => onQuickFilter('30min')}
            >
              Last 30 Min
            </button>
            <button
              type="button"
              className={`btn-quick ${filters.quickFilter === '1hour' ? 'active' : ''}`}
              onClick={() => onQuickFilter('1hour')}
            >
              Last 1 Hour
            </button>
            <button
              type="button"
              className={`btn-quick ${filters.quickFilter === 'fullday' ? 'active' : ''}`}
              onClick={() => onQuickFilter('fullday')}
            >
              Full Day
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="filter-field action-buttons-field">
          <label className="filter-label">&nbsp;</label>
          <div className="action-buttons-group">
            <button type="button" className="btn-primary" onClick={onApply}>
              Apply
            </button>
            <button type="button" className="btn-secondary" onClick={onReset}>
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="frequency-banner">
        <div className="info-badge">
          <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        </div>
        <span className="banner-text">Data Frequency: Every 5 minutes (9:15 AM to 3:40 PM)</span>
      </div>
    </div>
  );
};
