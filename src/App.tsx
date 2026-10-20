import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, getSettings, getLocalDateString } from './db';
import type { AppSettings, ConsumptionEvent, CravingEvent, ReductionPlan } from './types';
import { Header } from './components/Header';
import { BottomNav, type TabType } from './components/BottomNav';
import { DashboardView } from './views/DashboardView';
import { CravingsView } from './views/CravingsView';
import { ReductionPlanView } from './views/ReductionPlanView';
import { AnalyticsView } from './views/AnalyticsView';
import { SettingsView } from './views/SettingsView';
import { LogNicotexModal } from './components/LogNicotexModal';
import { CravingInterceptionModal } from './components/CravingInterceptionModal';
import { PWAInstallGuideModal } from './components/PWAInstallGuideModal';
import { OnboardingModal } from './components/OnboardingModal';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  // Modals state
  const [isLogModalOpen, setIsLogModalOpen] = useState<boolean>(false);
  const [editingEvent, setEditingEvent] = useState<ConsumptionEvent | null>(null);
  const [isCravingModalOpen, setIsCravingModalOpen] = useState<boolean>(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState<boolean>(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(false);

  // Live query from Dexie IndexedDB
  const settings = useLiveQuery(() => db.settings.get(1));
  const currentPlan = useLiveQuery(async () => {
    if (!settings?.currentPlanId) {
      return (await db.plans.toArray())[0] || null;
    }
    return (await db.plans.get(settings.currentPlanId)) || null;
  }, [settings?.currentPlanId]);

  const consumption = useLiveQuery(() => db.consumption.orderBy('timestamp').toArray()) || [];
  const cravings = useLiveQuery(() => db.cravings.orderBy('timestamp').toArray()) || [];

  // Check onboarding status on initial load
  useEffect(() => {
    async function checkInit() {
      const s = await getSettings();
      if (!s.onboardingCompleted) {
        setIsOnboardingOpen(true);
      }
    }
    checkInit();
  }, [settings?.onboardingCompleted]);

  // Quick 1-tap piece logger using default settings
  const handleQuickLog = async () => {
    const now = Date.now();
    const newPiece: ConsumptionEvent = {
      id: `cons_${now}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: now,
      localDateStr: getLocalDateString(new Date(now)),
      product: 'Nicotex',
      strength: settings?.strength || '2mg',
      quantity: 1,
      trigger: 'Habit or automatic behaviour',
      contextualFactors: [],
      isScheduled: false
    };
    await db.consumption.put(newPiece);
  };

  const handleOpenLogModal = (existing: ConsumptionEvent | null = null) => {
    setEditingEvent(existing);
    setIsLogModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col font-sans select-none antialiased">
      {/* Top Mobile Header */}
      <Header
        settings={settings || null}
        currentPlan={currentPlan || null}
        onOpenInstallModal={() => setIsInstallModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 overflow-x-hidden">
        {activeTab === 'dashboard' && (
          <DashboardView
            settings={settings || null}
            currentPlan={currentPlan || null}
            consumption={consumption}
            cravings={cravings}
            onOpenLogModal={handleOpenLogModal}
            onOpenCravingModal={() => setIsCravingModalOpen(true)}
            onQuickLog={handleQuickLog}
            onNavigateToPlan={() => setActiveTab('plan')}
          />
        )}

        {activeTab === 'cravings' && (
          <CravingsView
            cravings={cravings}
            consumption={consumption}
            onOpenCravingModal={() => setIsCravingModalOpen(true)}
            onOpenLogModal={handleOpenLogModal}
          />
        )}

        {activeTab === 'plan' && (
          <ReductionPlanView
            currentPlan={currentPlan || null}
            settings={settings || null}
            onPlanUpdated={() => {}}
          />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsView
            consumption={consumption}
            cravings={cravings}
            settings={settings || null}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            settings={settings || null}
            onSettingsUpdated={() => {}}
            onOpenInstallGuide={() => setIsInstallModalOpen(true)}
          />
        )}
      </main>

      {/* iOS Floating Bottom Navigation */}
      <BottomNav
        activeTab={activeTab}
        onChangeTab={setActiveTab}
      />

      {/* Modals & Dialogs */}
      <LogNicotexModal
        isOpen={isLogModalOpen}
        onClose={() => {
          setIsLogModalOpen(false);
          setEditingEvent(null);
        }}
        defaultStrength={settings?.strength || '2mg'}
        existingEvent={editingEvent}
      />

      <CravingInterceptionModal
        isOpen={isCravingModalOpen}
        onClose={() => setIsCravingModalOpen(false)}
        settings={settings || null}
        onOpenLogGum={(cravingId) => {
          // Open log modal with craving ID linked
          setEditingEvent({
            id: `cons_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            timestamp: Date.now(),
            localDateStr: getLocalDateString(),
            product: 'Nicotex',
            strength: settings?.strength || '2mg',
            quantity: 1,
            trigger: 'Craving or physical withdrawal',
            contextualFactors: [],
            isScheduled: false,
            cravingEventId: cravingId
          });
          setIsLogModalOpen(true);
        }}
      />

      <PWAInstallGuideModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
      />

      <OnboardingModal
        isOpen={isOnboardingOpen}
        onComplete={() => setIsOnboardingOpen(false)}
      />
    </div>
  );
};
