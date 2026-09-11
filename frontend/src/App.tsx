import { useState, useEffect, useCallback, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { DashboardHeader } from './components/DashboardHeader';
import { FilterPanel } from './components/FilterPanel';
import { SummaryCardContainer } from './components/SummaryCard';
import { StrikeWiseOITable } from './components/StrikeWiseOITable';
import { OITable } from './components/OITable';
import { OIChangeTable } from './components/OIChangeTable';
import { Legend } from './components/Legend';
import { AdminDashboard } from './components/AdminDashboard';
import { SettingsPanel } from './components/SettingsPanel';
import { LoginPage } from './components/LoginPage';
import { subtractMinutesFromTime } from './utils/timeUtils';
import type { FilterState, IndexDataset, UserProfile } from './types/dashboard';
import { API_BASE_URL } from './config/api';

const initialEmptyDataset: IndexDataset = {
  index: 'NIFTY',
  availableDates: [],
  selectedDate: '',
  timeOptions: ['09:15 AM'],
  summary: {
    startTime: '09:15 AM',
    endTime: '--:--',
    startCallOI: 0,
    startPutOI: 0,
    endCallOI: 0,
    endPutOI: 0,
    callOIChangeVal: 0,
    callOIChangePct: 0,
    putOIChangeVal: 0,
    putOIChangePct: 0,
  },
  rows: [],
  strikeDetails: [],
};

export function App() {
  // Authentication State
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    try {
      const savedUser = localStorage.getItem('oi_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const [authToken, setAuthToken] = useState<string | null>(() => {
    return localStorage.getItem('oi_token') || null;
  });

  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const [filters, setFilters] = useState<FilterState>({
    selectedIndex: 'NIFTY',
    selectedDate: '',
    startTime: '09:15 AM',
    endTime: '',
    quickFilter: 'fullday',
    frequency: '3min',
  });

  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('oi_theme') === 'dark';
  });

  const [dataset, setDataset] = useState<IndexDataset>(initialEmptyDataset);

  // Sync theme class to document element and body
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
      document.documentElement.setAttribute('data-theme', 'dark');
      document.body.classList.add('dark');
      document.body.classList.remove('light');
      document.body.setAttribute('data-theme', 'dark');
      localStorage.setItem('oi_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
      document.documentElement.setAttribute('data-theme', 'light');
      document.body.classList.remove('dark');
      document.body.classList.add('light');
      document.body.setAttribute('data-theme', 'light');
      localStorage.setItem('oi_theme', 'light');
    }
  }, [isDarkMode]);

  const handleToggleTheme = () => {
    setIsDarkMode((prev) => !prev);
  };

  // Active ref to prevent stale responses during rapid index switching
  const activeFetchIndexRef = useRef<string>(filters.selectedIndex);

  // Handle Login Success
  const handleLoginSuccess = (user: UserProfile, token: string, redirectTo: string) => {
    setCurrentUser(user);
    setAuthToken(token);
    localStorage.setItem('oi_user', JSON.stringify(user));
    localStorage.setItem('oi_token', token);

    if (user.role === 'admin' && redirectTo === '/admin') {
      setActiveTab('admin');
    } else {
      setActiveTab('dashboard');
    }
  };

  // Handle User Profile Update
  const handleUpdateUser = (updated: UserProfile) => {
    setCurrentUser(updated);
    localStorage.setItem('oi_user', JSON.stringify(updated));
  };

  // Handle Logout
  const handleLogout = () => {
    setCurrentUser(null);
    setAuthToken(null);
    localStorage.removeItem('oi_user');
    localStorage.removeItem('oi_token');
    setActiveTab('dashboard');
  };

  // Validate token on mount to ensure server-verified authorization and role integrity
  useEffect(() => {
    if (!authToken) return;

    fetch(`${API_BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${authToken}` },
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error('Session invalid or revoked');
        }
        return res.json();
      })
      .then((json) => {
        if (json.success && json.user) {
          setCurrentUser(json.user);
          localStorage.setItem('oi_user', JSON.stringify(json.user));
        }
      })
      .catch(() => {
        handleLogout();
      });
  }, [authToken]);

  // Fetch backend data with active index and frequency
  const fetchBackendData = useCallback(
    async (
      overrideFilters?: Partial<FilterState>,
      isImmediate = false
    ) => {
      const activeFilters = { ...filters, ...overrideFilters };
      activeFetchIndexRef.current = activeFilters.selectedIndex;

      try {
        if (isImmediate) setIsLoading(true);
        const query = new URLSearchParams();
        query.set('index', activeFilters.selectedIndex);
        if (activeFilters.selectedDate) query.set('date', activeFilters.selectedDate);
        if (activeFilters.startTime) query.set('startTime', activeFilters.startTime);
        if (activeFilters.endTime) query.set('endTime', activeFilters.endTime);
        if (activeFilters.frequency) query.set('frequency', activeFilters.frequency);

        const headers: Record<string, string> = {};
        if (authToken) {
          headers['Authorization'] = `Bearer ${authToken}`;
        }

        const res = await fetch(
          `${API_BASE_URL}/api/option-chain/time-series?${query.toString()}`,
          { headers }
        );
        const json = await res.json();

        // Avoid race conditions when switching indices rapidly
        if (activeFetchIndexRef.current !== activeFilters.selectedIndex) {
          return;
        }

        if (res.ok && json.success && json.data) {
          setValidationError(null);
          setDataset(json.data);
          setFilters((prev) => {
            const updated = { ...prev, ...overrideFilters };
            if (!prev.selectedDate && json.data.selectedDate) {
              updated.selectedDate = json.data.selectedDate;
            }
            if (!prev.startTime) {
              updated.startTime = '09:15 AM';
            }
            if (!prev.endTime) {
              updated.endTime =
                json.data.summary?.endTime ||
                (json.data.timeOptions.length > 0
                  ? json.data.timeOptions[json.data.timeOptions.length - 1]
                  : '03:40 PM');
            }
            return updated;
          });
        } else if (!res.ok) {
          setValidationError(json.message || 'Error fetching data with selected time range.');
        }
      } catch (err: any) {
        console.error('Failed to fetch backend data:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [filters, authToken]
  );

  // Initial fetch and auto-polling
  useEffect(() => {
    if (!currentUser || !authToken) return;

    fetchBackendData();
    const timer = setInterval(() => {
      fetchBackendData();
    }, 10000);
    return () => clearInterval(timer);
  }, [currentUser, authToken, fetchBackendData]);

  // Route security guard: prevent non-admins from viewing Admin Portal
  useEffect(() => {
    if (activeTab === 'admin' && currentUser?.role !== 'admin') {
      setActiveTab('dashboard');
    }
  }, [activeTab, currentUser]);

  // Index and Frequency Filter Change Handler
  const handleFilterChange = (updated: Partial<FilterState>) => {
    setValidationError(null);

    // If changing index, clear old dataset and trigger immediate fetch
    if (updated.selectedIndex && updated.selectedIndex !== filters.selectedIndex) {
      setIsLoading(true);
      setDataset({
        ...initialEmptyDataset,
        index: updated.selectedIndex,
      });
      const newFilters: FilterState = {
        ...filters,
        selectedIndex: updated.selectedIndex,
        selectedDate: '',
        startTime: '09:15 AM',
        endTime: '',
        quickFilter: 'fullday',
      };
      setFilters(newFilters);
      fetchBackendData(newFilters, true);
      return;
    }

    // If changing date, update state and trigger immediate fetch
    if (updated.selectedDate && updated.selectedDate !== filters.selectedDate) {
      const newFilters = { ...filters, selectedDate: updated.selectedDate };
      setFilters(newFilters);
      fetchBackendData(newFilters, true);
      return;
    }

    // If changing frequency, update state and trigger immediate fetch
    if (updated.frequency && updated.frequency !== filters.frequency) {
      const newFilters = { ...filters, frequency: updated.frequency };
      setFilters(newFilters);
      fetchBackendData(newFilters, true);

      // Also trigger backend collector interval update
      const intervalMap: Record<string, number> = {
        '1min': 1,
        '3min': 3,
        '5min': 5,
      };
      const interval = intervalMap[updated.frequency] || 3;
      fetch(`${API_BASE_URL}/api/option-chain/collector/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({
          interval,
          index: filters.selectedIndex,
          bypassMarketHours: true,
        }),
      }).catch((err) => {
        console.error('Failed to update collector frequency:', err);
      });
      return;
    }

    setFilters((prev) => ({ ...prev, ...updated }));
  };

  // Quick Filters Handler (30min, 1hour, fullday) using REAL timestamp arithmetic
  const handleQuickFilter = (period: '30min' | '1hour' | 'fullday') => {
    setValidationError(null);

    // End time is latest available snapshot time, summary end time, or default market close
    const latestTime =
      dataset.summary.endTime && dataset.summary.endTime !== '--:--'
        ? dataset.summary.endTime
        : dataset.timeOptions && dataset.timeOptions.length > 0
        ? dataset.timeOptions[dataset.timeOptions.length - 1]
        : '03:40 PM';

    let startTime = '09:15 AM';
    let endTime = latestTime;

    if (period === '30min') {
      endTime = latestTime;
      startTime = subtractMinutesFromTime(endTime, 30);
    } else if (period === '1hour') {
      endTime = latestTime;
      startTime = subtractMinutesFromTime(endTime, 60);
    } else if (period === 'fullday') {
      startTime = '09:15 AM';
      endTime = latestTime;
    }

    const updatedFilters: FilterState = {
      ...filters,
      startTime,
      endTime,
      quickFilter: period,
    };

    setFilters(updatedFilters);
    fetchBackendData(updatedFilters, true);
  };

  const handleApply = () => {
    fetchBackendData(filters, true);
  };

  const handleReset = () => {
    setValidationError(null);
    const latestTime =
      dataset.summary.endTime !== '--:--'
        ? dataset.summary.endTime
        : dataset.timeOptions.length > 0
        ? dataset.timeOptions[dataset.timeOptions.length - 1]
        : '03:40 PM';

    const resetFilters: FilterState = {
      selectedIndex: filters.selectedIndex,
      selectedDate: dataset.availableDates[0] || '',
      startTime: '09:15 AM',
      endTime: latestTime,
      quickFilter: 'fullday',
      frequency: '3min',
    };
    setFilters(resetFilters);
    fetchBackendData(resetFilters, true);
  };

  const handleRefresh = async () => {
    try {
      setIsLoading(true);
      const headers: Record<string, string> = {};
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }
      await fetch(
        `${API_BASE_URL}/api/option-chain/fetch?index=${filters.selectedIndex}`,
        {
          method: 'POST',
          headers,
        }
      );
      await fetchBackendData(filters, false);
    } catch (err) {
      console.error('Error refreshing live data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // If not authenticated, render Login Page
  if (!currentUser || !authToken) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  const effectiveStartTime = filters.startTime || dataset.summary.startTime || '09:15 AM';
  const effectiveEndTime = filters.endTime || dataset.summary.endTime || '03:40 PM';

  return (
    <div className="app-container">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        isDarkMode={isDarkMode}
        onToggleTheme={handleToggleTheme}
        onLogout={handleLogout}
      />

      <main className="main-content">
        {activeTab === 'admin' && currentUser.role === 'admin' ? (
          <AdminDashboard
            authToken={authToken}
            isDarkMode={isDarkMode}
            onRefreshData={() => fetchBackendData(filters, true)}
          />
        ) : activeTab === 'settings' ? (
          <SettingsPanel
            currentUser={currentUser}
            authToken={authToken}
            onUpdateUser={handleUpdateUser}
          />
        ) : (
          <>
            <DashboardHeader
              lastUpdated={
                dataset.summary.endTime !== '--:--'
                  ? dataset.summary.endTime
                  : 'Live Upstox Active'
              }
              selectedIndex={filters.selectedIndex}
              currentExpiry={dataset.currentExpiry || dataset.summary.currentExpiry}
              spotPrice={dataset.spotPrice || dataset.summary.spotPrice}
              atmStrike={dataset.atmStrike || dataset.summary.atmStrike}
              onRefresh={handleRefresh}
            />

            <FilterPanel
              filters={filters}
              availableDates={dataset.availableDates}
              timeOptions={dataset.timeOptions}
              validationError={validationError}
              onChangeFilter={handleFilterChange}
              onApply={handleApply}
              onReset={handleReset}
              onQuickFilter={handleQuickFilter}
            />

            <SummaryCardContainer summary={dataset.summary} />

            {/* Strike-Wise ATM + 4 OTM Table */}
            {dataset.strikeDetails && dataset.strikeDetails.length > 0 && (
              <StrikeWiseOITable
                strikeDetails={dataset.strikeDetails}
                atmStrike={dataset.atmStrike || dataset.summary.atmStrike}
                spotPrice={dataset.spotPrice || dataset.summary.spotPrice}
              />
            )}

            {/* Time-Series Snapshots Table */}
            {dataset.rows.length === 0 ? (
              <div className="empty-state-card">
                <p style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {isLoading
                    ? `Fetching live Upstox Option Chain for ${filters.selectedIndex}...`
                    : `No snapshots recorded for ${filters.selectedIndex} between ${effectiveStartTime} and ${effectiveEndTime}`}
                </p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                  Click <strong>Refresh</strong> in the header or apply a different time filter to view option chain snapshots.
                </p>
              </div>
            ) : (
              <div className="tables-grid">
                <OITable
                  rows={dataset.rows}
                  startTime={filters.startTime || dataset.summary.startTime}
                />
                <OIChangeTable
                  rows={dataset.rows}
                  startTime={filters.startTime || dataset.summary.startTime}
                />
              </div>
            )}

            <Legend startTime={filters.startTime || dataset.summary.startTime} />
          </>
        )}
      </main>
    </div>
  );
}

export default App;


