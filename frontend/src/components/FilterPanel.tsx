import React from 'react';
import { Calendar, Clock, Info, SlidersHorizontal } from 'lucide-react';
import { buildSortedTimeOptions } from '../utils/timeUtils';
import type { FilterState, IndexType } from '../types/dashboard';

interface FilterPanelProps {
  filters: FilterState;
  availableDates: string[];
  timeOptions: string[];
  validationError?: string | null;
  onChangeFilter: (updated: Partial<FilterState>) => void;
  onApply: () => void;
  onReset: () => void;
  onQuickFilter: (period: '30min' | '1hour' | 'fullday') => void;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
  filters,
  availableDates,
  timeOptions,
  validationError,
  onChangeFilter,
  onApply,
  onReset,
  onQuickFilter,
}) => {
  const currentFrequency = filters.frequency || '3min';

  const getFrequencyText = () => {
    switch (currentFrequency) {
      case '1min':
        return '1 Minute';
      case '3min':
      default:
        return '3 Minutes (Default)';
      case '5min':
        return '5 Minutes';
    }
  };


  const displayTimeOptions = buildSortedTimeOptions([
    ...timeOptions,
    filters.startTime,
    filters.endTime,
  ]);

  return (
    <div className="filter-card">
      {/* Primary Select Fields Grid */}
      <div className="filter-grid-primary">
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
            <Calendar className="field-icon text-purple-500" />
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
            <Clock className="field-icon text-purple-500" />
            <select
              className="filter-select select-icon-padded"
              value={filters.startTime}
              onChange={(e) => onChangeFilter({ startTime: e.target.value, quickFilter: 'custom' })}
            >
              {displayTimeOptions.map((t) => (
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
            <Clock className="field-icon text-purple-500" />
            <select
              className="filter-select select-icon-padded"
              value={filters.endTime}
              onChange={(e) => onChangeFilter({ endTime: e.target.value, quickFilter: 'custom' })}
            >
              {displayTimeOptions.map((t) => (
                <option key={`end-${t}`} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Frequency Selector */}
        <div className="filter-field">
          <label className="filter-label">Data Frequency</label>
          <div className="input-with-icon">
            <SlidersHorizontal className="field-icon text-purple-500" />
            <select
              className="filter-select select-icon-padded"
              value={currentFrequency}
              onChange={(e) =>
                onChangeFilter({ frequency: e.target.value as '1min' | '3min' | '5min' })
              }
            >
              <option value="1min">1 Minute</option>
              <option value="3min">3 Minutes</option>
              <option value="5min">5 Minutes</option>
            </select>
          </div>
        </div>
      </div>

      {/* Secondary Controls & Action Row */}
      <div className="filter-controls-row">
        {/* Quick Filter Pills */}
        <div className="quick-filters-container">
          <span className="controls-label">Quick Ranges:</span>
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
        <div className="action-buttons-group">
          <button type="button" className="btn-primary" onClick={onApply}>
            Apply Filters
          </button>
          <button type="button" className="btn-secondary" onClick={onReset}>
            Reset
          </button>
        </div>
      </div>

      {/* Validation Error Banner */}
      {validationError && (
        <div className="filter-validation-alert">
          <Info className="w-4 h-4 text-red-600 dark:text-red-400 mr-2" />
          <span>{validationError}</span>
        </div>
      )}

      {/* Dynamic Info Banner */}
      <div className="frequency-banner">

        <div className="info-badge">
          <Info className="w-4 h-4 text-purple-600 dark:text-purple-400" />
        </div>
        <span className="banner-text">
          Data Frequency: Every {getFrequencyText()} (9:15 AM to 3:40 PM)
        </span>
      </div>
    </div>
  );
};

