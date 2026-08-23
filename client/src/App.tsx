import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { DashboardHeader } from './components/DashboardHeader';
import { FilterPanel } from './components/FilterPanel';
import { SummaryCardContainer } from './components/SummaryCard';
import { OITable } from './components/OITable';
import { OIChangeTable } from './components/OIChangeTable';
import { Legend } from './components/Legend';
import { mockDatasets } from './mock/mockData';
import type { FilterState, IndexDataset } from './types/dashboard';

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

  const [dataset, setDataset] = useState<IndexDataset>(
    () => mockDatasets[filters.selectedIndex] || mockDatasets['NIFTY']
  );

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    let isMounted = true;
    const fetchBackendData = async () => {
      try {
        const query = new URLSearchParams({
          index: filters.selectedIndex,
          date: filters.selectedDate,
          startTime: filters.startTime,
          endTime: filters.endTime,
        });
        const res = await fetch(`http://localhost:5000/api/option-chain/time-series?${query.toString()}`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data && json.data.rows && json.data.rows.length > 0 && isMounted) {
            setDataset(json.data);
            return;
          }
        }
      } catch (err) {
        // Fallback to local dataset on server offline
      }
      if (isMounted) {
        setDataset(mockDatasets[filters.selectedIndex] || mockDatasets['NIFTY']);
      }
    };

    fetchBackendData();
    return () => {
      isMounted = false;
    };
  }, [filters.selectedIndex, filters.selectedDate, filters.startTime, filters.endTime]);

  const currentDataset = dataset;

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
