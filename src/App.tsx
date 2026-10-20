import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar, NavTab } from './components/Sidebar';
import { Header } from './components/Header';
import { DepartmentDashboard } from './pages/DepartmentDashboard';
import { SubmissionWorkspace } from './pages/SubmissionWorkspace';
import { ManagementReview } from './pages/ManagementReview';
import { MinutesRecorder } from './pages/MinutesRecorder';
import { AllMeetings } from './pages/AllMeetings';
import { MeetingDetails } from './pages/MeetingDetails';
import { CreateMeeting } from './pages/CreateMeeting';
import { ActionTracker } from './pages/ActionTracker';
import { DepartmentsPage } from './pages/DepartmentsPage';
import { ReportsPage } from './pages/ReportsPage';
import { ExcelImportExport } from './pages/ExcelImportExport';
import { SettingsPage } from './pages/SettingsPage';
import {
  Department,
  Meeting,
  ActionItem,
  MeetingSubmission,
  ProposedAgendaItem,
  FollowUpUpdate,
  AppNotification
} from './types';
import {
  initializeDatabase,
  getMeetings,
  getDepartments,
  getActionItems,
  getMeetingSubmissions,
  getProposedItems,
  getFollowUpsForMeeting,
  getNotifications,
  markNotificationAsRead
} from './services/db';
import { testConnection } from './services/firebase';

function MainApp() {
  const { currentUser, allUsers } = useAuth();

  const [currentTab, setCurrentTab] = useState<NavTab | 'meeting-details'>('dashboard');
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Global database state
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [submissions, setSubmissions] = useState<MeetingSubmission[]>([]);
  const [proposedItems, setProposedItems] = useState<ProposedAgendaItem[]>([]);
  const [followUps, setFollowUps] = useState<FollowUpUpdate[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadAllData = async () => {
    try {
      await testConnection();
      await initializeDatabase();

      const [m, d, a, notifs] = await Promise.all([
        getMeetings(),
        getDepartments(),
        getActionItems(),
        getNotifications(currentUser.departmentIds[0])
      ]);

      setMeetings(m);
      setDepartments(d);
      setActionItems(a);
      setNotifications(notifs);

      // Load submissions, proposed items, and follow-ups across meetings
      const allSubs: MeetingSubmission[] = [];
      const allProps: ProposedAgendaItem[] = [];
      const allFups: FollowUpUpdate[] = [];

      for (const meet of m) {
        const subs = await getMeetingSubmissions(meet.id);
        allSubs.push(...subs);
        const props = await getProposedItems(meet.id);
        allProps.push(...props);
        const fups = await getFollowUpsForMeeting(meet.id);
        allFups.push(...fups);
      }

      setSubmissions(allSubs);
      setProposedItems(allProps);
      setFollowUps(allFups);
      setIsLoading(false);
    } catch (err) {
      console.warn('Error loading app state:', err);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, [currentUser]);

  const handleMarkNotifRead = async (id: string) => {
    await markNotificationAsRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const handleOpenMeetingDetails = (meetingId: string) => {
    setSelectedMeetingId(meetingId);
    setCurrentTab('meeting-details');
  };

  const selectedMeeting = meetings.find((m) => m.id === selectedMeetingId);

  return (
    <div className="flex h-screen bg-[#101014] text-[#F5F5F7] overflow-hidden font-sans">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab === 'meeting-details' ? 'meetings' : currentTab}
        onSelectTab={(tab) => {
          setCurrentTab(tab);
          if (tab !== 'meetings') setSelectedMeetingId(null);
        }}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <Header
          notifications={notifications}
          onMarkNotificationRead={handleMarkNotifRead}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onNavigateToPrep={() => setCurrentTab('submit-agenda')}
          onOpenMobileMenu={() => setMobileOpen(true)}
        />

        {/* Scrollable Viewport */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-[#8B5CF6] border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-[#A1A1B5]">Connecting to ABSS Cloud Firestore...</span>
              </div>
            </div>
          ) : (
            <>
              {currentTab === 'dashboard' && (
                <DepartmentDashboard
                  departments={departments}
                  meetings={meetings}
                  actionItems={actionItems}
                  submissions={submissions}
                  proposedItems={proposedItems}
                  followUps={followUps}
                  onNavigateToWorkspace={() => setCurrentTab('submit-agenda')}
                  onNavigateToReview={() => setCurrentTab('management-review')}
                />
              )}

              {currentTab === 'submit-agenda' && (
                <SubmissionWorkspace
                  departments={departments}
                  meetings={meetings}
                  actionItems={actionItems}
                  submissions={submissions}
                  proposedItems={proposedItems}
                  followUps={followUps}
                  onRefreshData={loadAllData}
                  onNavigateToDashboard={() => setCurrentTab('dashboard')}
                />
              )}

              {currentTab === 'management-review' && (
                <ManagementReview
                  departments={departments}
                  meetings={meetings}
                  actionItems={actionItems}
                  submissions={submissions}
                  proposedItems={proposedItems}
                  followUps={followUps}
                  onRefreshData={loadAllData}
                  onNavigateToWorkspace={() => setCurrentTab('submit-agenda')}
                />
              )}

              {currentTab === 'minutes-recorder' && (
                <MinutesRecorder
                  meetings={meetings}
                  departments={departments}
                  proposedItems={proposedItems}
                  actionItems={actionItems}
                  onRefreshData={loadAllData}
                  onNavigateToActions={() => setCurrentTab('actions')}
                />
              )}

              {currentTab === 'meetings' && (
                <AllMeetings
                  meetings={meetings}
                  departments={departments}
                  onSelectMeeting={handleOpenMeetingDetails}
                  onCreateMeeting={() => setCurrentTab('create-meeting')}
                />
              )}

              {currentTab === 'meeting-details' && selectedMeeting && (
                <MeetingDetails
                  meeting={selectedMeeting}
                  departments={departments}
                  actionItems={actionItems}
                  proposedItems={proposedItems}
                  onBack={() => setCurrentTab('meetings')}
                  onNavigateToPreparation={() => setCurrentTab('submit-agenda')}
                />
              )}

              {currentTab === 'create-meeting' && (
                <CreateMeeting
                  departments={departments}
                  onMeetingCreated={(newMeet) => {
                    setMeetings((prev) => [newMeet, ...prev]);
                    handleOpenMeetingDetails(newMeet.id);
                  }}
                  onCancel={() => setCurrentTab('meetings')}
                />
              )}

              {currentTab === 'actions' && (
                <ActionTracker
                  actionItems={actionItems}
                  departments={departments}
                  meetings={meetings}
                  onRefreshData={loadAllData}
                  onSelectMeeting={handleOpenMeetingDetails}
                />
              )}

              {currentTab === 'departments' && (
                <DepartmentsPage departments={departments} users={allUsers} />
              )}

              {currentTab === 'employees' && (
                <DepartmentsPage departments={departments} users={allUsers} />
              )}

              {currentTab === 'reports' && (
                <ReportsPage
                  departments={departments}
                  meetings={meetings}
                  actionItems={actionItems}
                  submissions={submissions}
                  proposedItems={proposedItems}
                />
              )}

              {currentTab === 'import-export' && (
                <ExcelImportExport
                  meetings={meetings}
                  departments={departments}
                  actionItems={actionItems}
                  proposedItems={proposedItems}
                  onRefreshData={loadAllData}
                />
              )}

              {currentTab === 'settings' && (
                <SettingsPage users={allUsers} onRefreshData={loadAllData} />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
