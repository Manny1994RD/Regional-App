import React, { useState, useEffect } from 'react';
import BranchPicker from '@/components/BranchPicker';
import Dashboard from '@/components/Dashboard';
// NOTE: Reports is no longer imported here; it lives inside the Admin section now.
import PinAccess from '@/components/PinAccess';

// Keep 'reports' in the union type so existing calls like onNavigate('reports')
// don't break. We'll route 'reports' -> 'pin' in the render switch.
type View = 'entry' | 'dashboard' | 'reports' | 'pin';

export default function Index() {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [refreshKey, setRefreshKey] = useState(0);

  // Handle navigation between views
  const handleNavigate = (view: View) => {
    setCurrentView(view);
  };

  // Handle data updates to trigger re-renders
  const handleDataUpdate = () => {
    setRefreshKey(prev => prev + 1);
  };

  // Auto-refresh data every 60 seconds when on dashboard
  useEffect(() => {
    if (currentView === 'dashboard') {
      const interval = setInterval(() => {
        setRefreshKey(prev => prev + 1);
      }, 60000);
      return () => clearInterval(interval);
    }
  }, [currentView]);

  const renderCurrentView = () => {
    switch (currentView) {
      case 'entry':
        return (
          <BranchPicker
            onEntryAdded={handleDataUpdate}
            onNavigate={handleNavigate}
          />
        );

      case 'dashboard':
        return (
          <Dashboard
            key={refreshKey}
            onNavigate={handleNavigate}
          />
        );

      // Any attempt to go to 'reports' now shows the Admin (PinAccess) screen,
      // where Reports is embedded for admins only.
      case 'reports':
      case 'pin':
        return (
          <PinAccess
            onNavigate={handleNavigate}
          />
        );

      default:
        return (
          <Dashboard
            key={refreshKey}
            onNavigate={handleNavigate}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="container mx-auto py-4">
        {renderCurrentView()}
      </div>
    </div>
  );
}
