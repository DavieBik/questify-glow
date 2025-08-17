import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { AuthProvider } from "@/contexts/AuthContext";
import { BrandingProvider } from "@/contexts/BrandingContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Layout } from "@/components/Layout";

// Pages
import Dashboard from "./routes/Dashboard";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import PasswordReset from "./pages/PasswordReset";
import Courses from "./pages/Courses";
import CourseDetail from "./pages/CourseDetail";
import CourseForums from "./pages/CourseForums";
import ForumDetail from "./pages/ForumDetail";
import CourseGroups from "./pages/CourseGroups";
import CourseSessions from "./pages/CourseSessions";
import SessionDetail from "./pages/SessionDetail";
import ModuleDetail from "./pages/ModuleDetail";
import Quiz from "./pages/Quiz";
import Messages from "./pages/Messages";
import Announcements from "./pages/Announcements";
import GroupProjects from "./pages/GroupProjects";
import Certificates from "./pages/Certificates";
import CertificateDetail from "./pages/CertificateDetail";

import AdminDashboard from "./pages/AdminDashboard";
import ManagerDashboard from "./pages/ManagerDashboard";
import BrandingSettings from "./pages/BrandingSettings";
import AdminUsers from "./pages/AdminUsers";
import AdminCourses from "./pages/AdminCourses";
import AdminCourseCreate from "./pages/AdminCourseCreate";
import AdminCourseEdit from "./pages/AdminCourseEdit";
import AdminModuleCreate from "./pages/AdminModuleCreate";
import AdminModuleEdit from "./pages/AdminModuleEdit";
import AdminAnalytics from "./pages/AdminAnalytics";
import AdminApprovals from "./pages/AdminApprovals";
import AdminNotifications from "./pages/AdminNotifications";
import AdminImportCoursesModules from "./pages/AdminImportCoursesModules";
import AdminCurricula from "./pages/AdminCurricula";
import CurriculaProgress from "./pages/CurriculaProgress";
// Organization setup/settings removed in single-tenant mode
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <BrandingProvider>
              <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/auth/reset-password" element={<PasswordReset />} />
            {/* Organization setup/settings removed in single-tenant mode */}
            <Route path="/profile" element={
              <ProtectedRoute>
                <Layout>
                  <Profile />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/" element={
              <ProtectedRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/courses" element={
              <ProtectedRoute>
                <Layout>
                  <Courses />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/courses/:id" element={
              <ProtectedRoute>
                <Layout>
                  <CourseDetail />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/courses/:courseId/forums" element={
              <ProtectedRoute>
                <Layout>
                  <CourseForums />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/forums/:forumId" element={
              <ProtectedRoute>
                <Layout>
                  <ForumDetail />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/courses/:courseId/groups" element={
              <ProtectedRoute>
                <Layout>
                  <CourseGroups />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/courses/:courseId/sessions" element={
              <ProtectedRoute>
                <Layout>
                  <CourseSessions />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/sessions/:sessionId" element={
              <ProtectedRoute>
                <Layout>
                  <SessionDetail />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/modules/:id" element={
              <ProtectedRoute>
                <Layout>
                  <ModuleDetail />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/modules/:moduleId/quiz" element={
              <ProtectedRoute>
                <Layout>
                  <Quiz />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/messages" element={
              <ProtectedRoute>
                <Layout>
                  <Messages />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/announcements" element={
              <ProtectedRoute>
                <Layout>
                  <Announcements />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/projects" element={
              <ProtectedRoute>
                <Layout>
                  <GroupProjects />
                </Layout>
              </ProtectedRoute>
            } />
              <Route path="/certificates" element={
                <ProtectedRoute>
                  <Layout>
                    <Certificates />
                  </Layout>
                </ProtectedRoute>
              } />
              <Route path="/certificates/:id" element={
                <ProtectedRoute>
                  <Layout>
                    <CertificateDetail />
                  </Layout>
                </ProtectedRoute>
              } />
            <Route path="/curricula" element={
              <ProtectedRoute>
                <Layout>
                  <CurriculaProgress />
                </Layout>
              </ProtectedRoute>
            } />
              <Route path="/admin/dashboard" element={
                <ProtectedRoute requireRole={['admin']}>
                  <Layout>
                    <AdminDashboard />
                  </Layout>
                </ProtectedRoute>
              } />
              <Route path="/manager/dashboard" element={
                <ProtectedRoute requireRole={['admin', 'manager']}>
                  <Layout>
                    <ManagerDashboard />
                  </Layout>
                </ProtectedRoute>
              } />
              <Route path="/admin/users" element={
                <ProtectedRoute requireRole={['admin', 'manager']}>
                  <Layout>
                    <AdminUsers />
                  </Layout>
                </ProtectedRoute>
              } />
              <Route path="/admin/courses" element={
                <ProtectedRoute requireRole={['admin', 'manager']}>
                  <Layout>
                    <AdminCourses />
                  </Layout>
                </ProtectedRoute>
              } />
              <Route path="/admin/courses/new" element={
                <ProtectedRoute requireRole={['admin', 'manager']}>
                  <Layout>
                    <AdminCourseCreate />
                  </Layout>
                </ProtectedRoute>
              } />
              <Route path="/admin/courses/:id/edit" element={
                <ProtectedRoute requireRole={['admin', 'manager']}>
                  <Layout>
                    <AdminCourseEdit />
                  </Layout>
                </ProtectedRoute>
              } />
              <Route path="/admin/courses/:courseId/modules/new" element={
                <ProtectedRoute requireRole={['admin', 'manager']}>
                  <Layout>
                    <AdminModuleCreate />
                  </Layout>
                </ProtectedRoute>
              } />
              <Route path="/admin/modules/:id/edit" element={
                <ProtectedRoute requireRole={['admin', 'manager']}>
                  <Layout>
                    <AdminModuleEdit />
                  </Layout>
                </ProtectedRoute>
              } />
              <Route path="/admin/analytics" element={
                <ProtectedRoute requireRole={['admin', 'manager']}>
                  <Layout>
                    <AdminAnalytics />
                  </Layout>
                </ProtectedRoute>
              } />
              <Route path="/admin/approvals" element={
                <ProtectedRoute requireRole={['admin', 'manager']}>
                  <Layout>
                    <AdminApprovals />
                  </Layout>
                </ProtectedRoute>
              } />
              <Route path="/admin/notifications" element={
                <ProtectedRoute requireRole={['admin', 'manager']}>
                  <Layout>
                    <AdminNotifications />
                  </Layout>
                </ProtectedRoute>
              } />
              <Route path="/admin/branding" element={
                <ProtectedRoute requireRole={['admin']}>
                  <Layout>
                    <BrandingSettings />
                  </Layout>
                </ProtectedRoute>
              } />
              <Route path="/admin/curricula" element={
                <ProtectedRoute requireRole={['admin', 'manager']}>
                  <Layout>
                    <AdminCurricula />
                  </Layout>
                </ProtectedRoute>
              } />
              <Route path="/admin/imports/courses-modules" element={
                <ProtectedRoute requireRole={['admin', 'manager']}>
                  <Layout>
                    <AdminImportCoursesModules />
                  </Layout>
                </ProtectedRoute>
              } />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
            </BrandingProvider>
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
