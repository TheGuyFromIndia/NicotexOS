import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, getSettings, getLocalDateString } from './db';
import type {
  AppSettings,
  ConsumptionEvent,
  CravingEvent,
  ReductionPlan,
  DailyWakeSession,
  PlannedDoseWindow,
  MealDrinkEvent
} from './types';
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
import { MealPlannerModal } from './components/MealPlannerModal';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  // Modals state
  const [isLogModalOpen, setIsLogModalOpen] = useState<boolean>(false);
  const [isScheduledDefault, setIsScheduledDefault] = useState<boolean>(false);
  const [targetWindow, setTargetWindow] = useState<PlannedDoseWindow | null>(null);
  const [editingEvent, setEditingEvent] = useState<ConsumptionEvent | null>(null);

  const [isCravingModalOpen, setIsCravingModalOpen] = useState<boolean>(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState<boolean>(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(false);
  const [isMealModalOpen, setIsMealModalOpen] = useState<boolean>(false);

  const todayStr = getLocalDateString();

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

  // Wake session, planned windows, and meal events for today
  const wakeSession = useLiveQuery(() => db.wakeSessions.get(`wake_${todayStr}`)) || null;
  const plannedWindows = useLiveQuery(() =>
    db.plannedWindows.where('dateStr').equals(todayStr).sortBy('originalPlannedTimestamp')
  ) || [];
  const mealEvents = useLiveQuery(() =>
    db.mealEvents.where('dateStr').equals(todayStr).sortBy('timestamp')
  ) || [];

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
      localDateStr: todayStr,
      product: 'Nicotex',
      strength: settings?.strength || '2mg',
      quantity: 1,
      trigger: 'Habit or automatic behaviour',
      contextualFactors: [],
      isScheduled: false,
      isUnplanned: true,
      sessionStatus: 'completed'
    };
    await db.consumption.put(newPiece);
  };

  const handleOpenLogModal = (
    isScheduled: boolean = false,
    window: PlannedDoseWindow | null = null,
    existing: ConsumptionEvent | null = null
  ) => {
    setIsScheduledDefault(isScheduled);
    setTargetWindow(window);
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
            wakeSession={wakeSession}
            plannedWindows={plannedWindows}
            mealEvents={mealEvents}
            onOpenLogModal={handleOpenLogModal}
            onOpenCravingModal={() => setIsCravingModalOpen(true)}
            onQuickLog={handleQuickLog}
            onNavigateToPlan={() => setActiveTab('plan')}
            onOpenMealModal={() => setIsMealModalOpen(true)}
            onWakeSessionUpdated={() => {}}
          />
        )}

        {activeTab === 'cravings' && (
          <CravingsView
            cravings={cravings}
            consumption={consumption}
            onOpenCravingModal={() => setIsCravingModalOpen(true)}
            onOpenLogModal={(existing) => handleOpenLogModal(false, null, existing)}
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
          setTargetWindow(null);
        }}
        defaultStrength={settings?.strength || '2mg'}
        existingEvent={editingEvent}
        targetWindow={targetWindow}
        isScheduledDefault={isScheduledDefault}
      />

      <CravingInterceptionModal
        isOpen={isCravingModalOpen}
        onClose={() => setIsCravingModalOpen(false)}
        settings={settings || null}
        onOpenLogGum={(cravingId) => {
          setEditingEvent({
            id: `cons_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            timestamp: Date.now(),
            localDateStr: todayStr,
            product: 'Nicotex',
            strength: settings?.strength || '2mg',
            quantity: 1,
            trigger: 'Craving or physical withdrawal',
            contextualFactors: [],
            isScheduled: false,
            isUnplanned: true,
            sessionStatus: 'completed',
            cravingEventId: cravingId
          });
          setIsScheduledDefault(false);
          setTargetWindow(null);
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

      <MealPlannerModal
        isOpen={isMealModalOpen}
        onClose={() => setIsMealModalOpen(false)}
        onMealSaved={() => {}}
      />
    </div>
  );
};
