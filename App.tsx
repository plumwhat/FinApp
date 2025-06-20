
import React, { useState, useCallback } from 'react';
import { BudgetingSection } from './components/BudgetingSection';
import { SuperannuationSection } from './components/SuperannuationSection';
import { AppView } from './types';
import { DollarSignIcon, BriefcaseIcon, TrendingUpIcon } from './components/common/Icons';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.BUDGETING);

  const renderView = useCallback(() => {
    switch (currentView) {
      case AppView.BUDGETING:
        return <BudgetingSection />;
      case AppView.SUPERANNUATION:
        return <SuperannuationSection />;
      default:
        return <BudgetingSection />;
    }
  }, [currentView]);

  const NavItem: React.FC<{ view: AppView; label: string; icon: React.ReactNode }> = ({ view, label, icon }) => (
    <button
      onClick={() => setCurrentView(view)}
      className={`flex items-center space-x-2 px-4 py-3 rounded-lg transition-all duration-200 ease-in-out
                  ${currentView === view ? 'bg-indigo-600 text-white shadow-md' : 'hover:bg-indigo-100 text-gray-700 hover:text-indigo-700'}`}
      aria-current={currentView === view ? 'page' : undefined}
    >
      {icon}
      <span className="font-medium">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 flex flex-col items-center p-4 selection:bg-indigo-500 selection:text-white">
      <div className="w-full max-w-7xl mx-auto">
        <header className="py-6 mb-8 text-center">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <TrendingUpIcon className="w-12 h-12 text-indigo-500" />
            <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500">
              FinTrack AU
            </h1>
          </div>
          <p className="text-lg text-gray-500">Your Personal Finance & Superannuation Forecaster</p>
        </header>

        <nav className="mb-8 p-3 bg-white/70 backdrop-blur-md rounded-xl shadow-lg border border-gray-200 flex justify-center space-x-2 md:space-x-4" aria-label="Main navigation">
          <NavItem view={AppView.BUDGETING} label="Budgeting" icon={<DollarSignIcon className="w-5 h-5" />} />
          <NavItem view={AppView.SUPERANNUATION} label="Superannuation" icon={<BriefcaseIcon className="w-5 h-5" />} />
        </nav>

        <main id="main-content" className="bg-white/60 backdrop-blur-lg p-6 sm:p-8 rounded-xl shadow-xl border border-gray-200">
          {renderView()}
        </main>

        <footer className="mt-12 text-center text-sm text-gray-500">
          <p>&copy; {new Date().getFullYear()} Sophie Plumridge & Brad Whatman. All calculations are estimates and for informational purposes only. Consult a financial advisor for professional advice.</p>
          <p className="mt-1">Built with React, TypeScript, and Tailwind CSS.</p>
        </footer>
      </div>
    </div>
  );
};

export default App;