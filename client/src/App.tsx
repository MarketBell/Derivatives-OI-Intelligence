import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { DashboardHeader } from './components/DashboardHeader';
import { FilterPanel } from './components/FilterPanel';
import { SummaryCardContainer } from './components/SummaryCard';
import { OITable } from './components/OITable';
import { OIChangeTable } from './components/OIChangeTable';
import { Legend } from './components/Legend';
import { mockDatasets } from './mock/mockData';
import type { FilterState } from './types/dashboard';

export function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isDarkMode, setIsDarkMode] = useState(false);

  const [filters, setFilters] = useState<FilterState>({
    selectedIndex: 'NIFTY',
    selectedDate: '16 May 2026',
    startTime: '03:00 PM',
    endTime: '03:30 PM',
    quickFilter: '30min',
  });

  const currentDataset = mockDatasets[filters.selectedIndex] || mockDatasets['NIFTY'];

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const handleToggleDarkMode = () => {
    setIsDarkMode((prev) => !prev);
  };

  const handleFilterChange = (updated: Partial<FilterState>) => {
    setFilters((prev) => ({ ...prev, ...updated }));
  };

  const handleQuickFilter = (period: '30min' | '1hour' | 'fullday') => {
    if (period === '30min') {
      setFilters((prev) => ({
        ...prev,
        startTime: '03:00 PM',
        endTime: '03:30 PM',
        quickFilter: '30min',
      }));
    } else if (period === '1hour') {
      setFilters((prev) => ({
        ...prev,
        startTime: '02:00 PM',
        endTime: '03:30 PM',
        quickFilter: '1hour',
      }));
    } else if (period === 'fullday') {
      setFilters((prev) => ({
        ...prev,
        startTime: '09:15 AM',
        endTime: '03:30 PM',
        quickFilter: 'fullday',
      }));
    }
  };

  const handleApply = () => {
    console.log('Applied filters:', filters);
  };

  const handleReset = () => {
    setFilters({
      selectedIndex: 'NIFTY',
      selectedDate: '16 May 2026',
      startTime: '03:00 PM',
      endTime: '03:30 PM',
      quickFilter: '30min',
    });
  };

  const handleRefresh = () => {
    console.log('Refreshing OI dashboard data...');
  };

  return (
    <div className={`app-container ${isDarkMode ? 'dark' : ''}`}>
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isDarkMode={isDarkMode}
        onToggleDarkMode={handleToggleDarkMode}
      />

      <main className="main-content">
        <DashboardHeader
          lastUpdated={currentDataset.summary.endTime}
          onRefresh={handleRefresh}
        />

        <FilterPanel
          filters={filters}
          availableDates={currentDataset.availableDates}
          timeOptions={currentDataset.timeOptions}
          onChangeFilter={handleFilterChange}
          onApply={handleApply}
          onReset={handleReset}
          onQuickFilter={handleQuickFilter}
        />

        <SummaryCardContainer summary={currentDataset.summary} />

        <div className="tables-grid">
          <OITable
            rows={currentDataset.rows}
            startTime={filters.startTime}
          />
          <OIChangeTable
            rows={currentDataset.rows}
            startTime={filters.startTime}
          />
        </div>

        <Legend startTime={filters.startTime} />
      </main>
    </div>
  );
}

export default App;
