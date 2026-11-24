import React from 'react';
import { Routes, Route, Outlet } from 'react-router-dom';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import ProtectedRoute from './components/ProtectedRoute';

// Public Pages
import ContestDiscovery from './pages/public/ContestDiscovery';
import ContestDetails from './pages/public/ContestDetails';
import JoinWithPin from './pages/public/JoinWithPin';

// Auth Pages
import OrganizerLogin from './pages/auth/OrganizerLogin';
import OrganizerRegister from './pages/auth/OrganizerRegister';
import StudentLogin from './pages/auth/StudentLogin';
import AdminLogin from './pages/auth/AdminLogin';

// Organizer Pages
import OrganizerDashboard from './pages/organizer/OrganizerDashboard';
import MyContests from './pages/organizer/MyContests';
import CreateContest from './pages/organizer/CreateContest';
import ContestOverview from './pages/organizer/ContestOverview';
import ParticipantManagement from './pages/organizer/ParticipantManagement';
import CoOrganizerManagement from './pages/organizer/CoOrganizerManagement';
import CodeLibrary from './pages/organizer/CodeLibrary';
import RoundManager from './pages/organizer/RoundManager';
import ManualAssignments from './pages/organizer/ManualAssignments';
import SwapManager from './pages/organizer/SwapManager';
import OrganizerSubmissions from './pages/organizer/OrganizerSubmissions';
import OrganizerEvaluations from './pages/organizer/OrganizerEvaluations';
import ContestLeaderboard from './pages/organizer/ContestLeaderboard';
import ContestSettings from './pages/organizer/ContestSettings';
import ProfileSettings from './pages/organizer/ProfileSettings';

// Student Pages
import StudentDashboard from './pages/student/StudentDashboard';
import BugIntroWorkspace from './pages/student/BugIntroWorkspace';
import DebugWorkspace from './pages/student/DebugWorkspace';
import StudentResults from './pages/student/StudentResults';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminOrganizers from './pages/admin/AdminOrganizers';
import AdminContests from './pages/admin/AdminContests';
import AdminAuditLogs from './pages/admin/AdminAuditLogs';
import AdminSettings from './pages/admin/AdminSettings';

// Layout with Navbar and Sidebar for portal areas
function PortalLayout() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

// Simple Public Layout with Navbar
function PublicLayout() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      {/* Public Pages */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<ContestDiscovery />} />
        <Route path="/contests" element={<ContestDiscovery />} />
        <Route path="/contests/:id" element={<ContestDetails />} />
        <Route path="/join-pin" element={<JoinWithPin />} />

        {/* Auth Pages */}
        <Route path="/login" element={<OrganizerLogin />} />
        <Route path="/register" element={<OrganizerRegister />} />
        <Route path="/student/login" element={<StudentLogin />} />
        <Route path="/admin/login" element={<AdminLogin />} />

        {/* Student Distraction-free Workspaces */}
        <Route
          path="/student/dashboard"
          element={
            <ProtectedRoute allowedRoles={['participant']}>
              <StudentDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/bug-intro"
          element={
            <ProtectedRoute allowedRoles={['participant']}>
              <BugIntroWorkspace />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/debug"
          element={
            <ProtectedRoute allowedRoles={['participant']}>
              <DebugWorkspace />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/results"
          element={
            <ProtectedRoute allowedRoles={['participant']}>
              <StudentResults />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Organizer Portal Pages (with Sidebar) */}
      <Route
        element={
          <ProtectedRoute allowedRoles={['organizer', 'admin']}>
            <PortalLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/organizer/dashboard" element={<OrganizerDashboard />} />
        <Route path="/organizer/contests" element={<MyContests />} />
        <Route path="/organizer/create-contest" element={<CreateContest />} />
        <Route path="/organizer/profile" element={<ProfileSettings />} />

        {/* Contest-Specific Routes */}
        <Route path="/organizer/contests/:id" element={<ContestOverview />} />
        <Route path="/organizer/contests/:id/participants" element={<ParticipantManagement />} />
        <Route path="/organizer/contests/:id/co-organizers" element={<CoOrganizerManagement />} />
        <Route path="/organizer/contests/:id/code-blocks" element={<CodeLibrary />} />
        <Route path="/organizer/contests/:id/rounds" element={<RoundManager />} />
        <Route path="/organizer/contests/:id/assignments" element={<ManualAssignments />} />
        <Route path="/organizer/contests/:id/swaps" element={<SwapManager />} />
        <Route path="/organizer/contests/:id/submissions" element={<OrganizerSubmissions />} />
        <Route path="/organizer/contests/:id/evaluations" element={<OrganizerEvaluations />} />
        <Route path="/organizer/contests/:id/leaderboard" element={<ContestLeaderboard />} />
        <Route path="/organizer/contests/:id/settings" element={<ContestSettings />} />
      </Route>

      {/* Admin Portal Pages (with Sidebar) */}
      <Route
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <PortalLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/organizers" element={<AdminOrganizers />} />
        <Route path="/admin/contests" element={<AdminContests />} />
        <Route path="/admin/audit-logs" element={<AdminAuditLogs />} />
        <Route path="/admin/settings" element={<AdminSettings />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<PublicLayout />}>
        <Route path="*" element={<ContestDiscovery />} />
      </Route>
    </Routes>
  );
}
