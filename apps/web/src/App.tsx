import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { AuthProvider } from '@/context/AuthContext';

import { ToastProvider } from '@/context/ToastContext';

import { ProtectedRoute } from '@/components/layout/ProtectedRoute';

import { RouteProgress } from '@/components/layout/RouteProgress';



import LandingPage from '@/pages/public/LandingPage';

import PricingPage from '@/pages/public/PricingPage';

import AboutPage from '@/pages/public/AboutPage';

import FeedbackPage from '@/pages/public/FeedbackPage';

import LoginPage from '@/pages/auth/LoginPage';

import RegisterPage from '@/pages/auth/RegisterPage';

import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage';

import ResetPasswordPage from '@/pages/auth/ResetPasswordPage';

import VerifyEmailPage from '@/pages/auth/VerifyEmailPage';



import StudentDashboardPage from '@/pages/student/DashboardPage';

import SubjectsPage from '@/pages/student/SubjectsPage';

import SubjectPricingPage from '@/pages/student/SubjectPricingPage';

import LessonPage from '@/pages/student/LessonPage';

import ProgressPage from '@/pages/student/ProgressPage';

import SettingsPage from '@/pages/student/SettingsPage';

import PastPapersPage from '@/pages/student/PastPapersPage';



import CmsDashboardPage from '@/pages/teacher/CmsDashboardPage';

import CmsLessonsPage from '@/pages/teacher/CmsLessonsPage';

import LessonWizardPage from '@/pages/teacher/LessonWizardPage';

import LessonVisualPage from '@/pages/teacher/LessonVisualPage';
import LessonEditPage from '@/pages/teacher/LessonEditPage';
import QuestionBuilderPage from '@/pages/teacher/QuestionBuilderPage';
import LessonEditorPage from '@/pages/teacher/LessonEditorPage';

void LessonWizardPage;
void LessonEditPage;

import CmsQuestionsPage from '@/pages/teacher/CmsQuestionsPage';
import CmsStudentsPage from '@/pages/teacher/CmsStudentsPage';

import TeacherPastPapersPage from '@/pages/teacher/PastPapersPage';



import ParentDashboard from '@/pages/parent/ParentDashboard';

import ParentChildrenPage from '@/pages/parent/ParentChildrenPage';

import ParentStudentProgressPage from '@/pages/parent/ParentStudentProgressPage';

import ParentSettingsPage from '@/pages/parent/ParentSettingsPage';



import AdminOverviewPage from '@/pages/admin/AdminOverviewPage';

import AdminTeachersPage from '@/pages/admin/AdminTeachersPage';

import AdminStudentsPage from '@/pages/admin/AdminStudentsPage';

import AdminSubscriptionsPage from '@/pages/admin/AdminSubscriptionsPage';

import AdminPricingPage from '@/pages/admin/AdminPricingPage';

import AdminContentPage from '@/pages/admin/AdminContentPage';

import AdminSettingsPage from '@/pages/admin/AdminSettingsPage';
import AdminSubjectsPage from '@/pages/admin/AdminSubjectsPage';
import AdminAnnouncementsPage from '@/pages/admin/AdminAnnouncementsPage';
import AdminFeedbackPage from '@/pages/admin/AdminFeedbackPage';



const queryClient = new QueryClient({

  defaultOptions: {

    queries: { retry: 1, staleTime: 30000 },

  },

});



function AppRoutes() {

  const location = useLocation();



  return (

    <div key={location.pathname} className="page-enter">

      <Routes location={location}>

        {/* Public */}

        <Route path="/" element={<LandingPage />} />

        <Route path="/pricing" element={<PricingPage />} />

        <Route path="/about" element={<AboutPage />} />

        <Route path="/feedback" element={<FeedbackPage />} />

        <Route path="/login" element={<LoginPage />} />

        <Route path="/register" element={<RegisterPage />} />

        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

        <Route path="/reset-password" element={<ResetPasswordPage />} />

        <Route path="/verify-email" element={<VerifyEmailPage />} />



        {/* Student */}

        <Route

          path="/dashboard"

          element={

            <ProtectedRoute roles={['STUDENT']}>

              <StudentDashboardPage />

            </ProtectedRoute>

          }

        />

        <Route

          path="/subjects"

          element={

            <ProtectedRoute roles={['STUDENT']}>

              <SubjectsPage />

            </ProtectedRoute>

          }

        />

        <Route

          path="/subjects/:boardSlug"

          element={

            <ProtectedRoute roles={['STUDENT']}>

              <SubjectsPage />

            </ProtectedRoute>

          }

        />

        <Route

          path="/subjects/:boardSlug/:categorySlug"

          element={

            <ProtectedRoute roles={['STUDENT']}>

              <SubjectsPage />

            </ProtectedRoute>

          }

        />

        <Route

          path="/subjects/:boardSlug/:categorySlug/:gradeSlug"

          element={

            <ProtectedRoute roles={['STUDENT']}>

              <SubjectsPage />

            </ProtectedRoute>

          }

        />

        <Route

          path="/subjects/:boardSlug/:categorySlug/:gradeSlug/:subjectSlug"

          element={

            <ProtectedRoute roles={['STUDENT']}>

              <SubjectsPage />

            </ProtectedRoute>

          }

        />

        <Route

          path="/subjects/:boardSlug/:categorySlug/:gradeSlug/:subjectSlug/pricing"

          element={

            <ProtectedRoute roles={['STUDENT']}>

              <SubjectPricingPage />

            </ProtectedRoute>

          }

        />

        <Route

          path="/subjects/:boardSlug/:categorySlug/:gradeSlug/:subjectSlug/:unitSlug"

          element={

            <ProtectedRoute roles={['STUDENT']}>

              <SubjectsPage />

            </ProtectedRoute>

          }

        />

        <Route

          path="/lessons/:lessonSlug"

          element={

            <ProtectedRoute roles={['STUDENT']}>

              <LessonPage />

            </ProtectedRoute>

          }

        />

        <Route

          path="/past-papers"

          element={

            <ProtectedRoute roles={['STUDENT']}>

              <PastPapersPage />

            </ProtectedRoute>

          }

        />

        <Route

          path="/progress"

          element={

            <ProtectedRoute roles={['STUDENT']}>

              <ProgressPage />

            </ProtectedRoute>

          }

        />

        <Route

          path="/settings"

          element={

            <ProtectedRoute roles={['STUDENT']}>

              <SettingsPage />

            </ProtectedRoute>

          }

        />



        {/* Teacher */}

        <Route

          path="/cms"

          element={

            <ProtectedRoute roles={['TEACHER']}>

              <CmsDashboardPage />

            </ProtectedRoute>

          }

        />

        <Route

          path="/cms/lessons"

          element={

            <ProtectedRoute roles={['TEACHER']}>

              <CmsLessonsPage />

            </ProtectedRoute>

          }

        />

        <Route

          path="/cms/lessons/new"

          element={

            <ProtectedRoute roles={['TEACHER']}>

              <LessonEditorPage />

            </ProtectedRoute>

          }

        />

        <Route

          path="/cms/lessons/:id/edit"

          element={

            <ProtectedRoute roles={['TEACHER']}>

              <LessonEditorPage />

            </ProtectedRoute>

          }

        />

        <Route

          path="/cms/lessons/:id/visual"

          element={

            <ProtectedRoute roles={['TEACHER']}>

              <LessonVisualPage />

            </ProtectedRoute>

          }

        />

        <Route

          path="/cms/lessons/:lessonId/questions"

          element={

            <ProtectedRoute roles={['TEACHER', 'ADMIN']}>

              <QuestionBuilderPage />

            </ProtectedRoute>

          }

        />

        <Route

          path="/cms/questions"

          element={

            <ProtectedRoute roles={['TEACHER']}>

              <CmsQuestionsPage />

            </ProtectedRoute>

          }

        />

        <Route

          path="/cms/past-papers"

          element={

            <ProtectedRoute roles={['TEACHER']}>

              <TeacherPastPapersPage />

            </ProtectedRoute>

          }

        />

        <Route

          path="/cms/students"

          element={

            <ProtectedRoute roles={['TEACHER']}>

              <CmsStudentsPage />

            </ProtectedRoute>

          }

        />



        {/* Parent */}

        <Route

          path="/parent"

          element={

            <ProtectedRoute roles={['PARENT']}>

              <ParentDashboard />

            </ProtectedRoute>

          }

        />

        <Route path="/parent/dashboard" element={<Navigate to="/parent" replace />} />

        <Route

          path="/parent/children"

          element={

            <ProtectedRoute roles={['PARENT']}>

              <ParentChildrenPage />

            </ProtectedRoute>

          }

        />

        <Route

          path="/parent/children/:studentId"

          element={

            <ProtectedRoute roles={['PARENT']}>

              <ParentStudentProgressPage />

            </ProtectedRoute>

          }

        />

        <Route

          path="/parent/settings"

          element={

            <ProtectedRoute roles={['PARENT']}>

              <ParentSettingsPage />

            </ProtectedRoute>

          }

        />



        {/* Admin */}

        <Route

          path="/admin"

          element={

            <ProtectedRoute roles={['ADMIN']}>

              <AdminOverviewPage />

            </ProtectedRoute>

          }

        />

        <Route

          path="/admin/teachers"

          element={

            <ProtectedRoute roles={['ADMIN']}>

              <AdminTeachersPage />

            </ProtectedRoute>

          }

        />

        <Route

          path="/admin/students"

          element={

            <ProtectedRoute roles={['ADMIN']}>

              <AdminStudentsPage />

            </ProtectedRoute>

          }

        />

        <Route path="/admin/subscriptions" element={<ProtectedRoute roles={['ADMIN']}><AdminSubscriptionsPage /></ProtectedRoute>} />

        <Route path="/admin/pricing" element={<ProtectedRoute roles={['ADMIN']}><AdminPricingPage /></ProtectedRoute>} />

        <Route path="/admin/content" element={<ProtectedRoute roles={['ADMIN']}><AdminContentPage /></ProtectedRoute>} />

        <Route path="/admin/settings" element={<ProtectedRoute roles={['ADMIN']}><AdminSettingsPage /></ProtectedRoute>} />
        <Route path="/admin/subjects" element={<ProtectedRoute roles={['ADMIN']}><AdminSubjectsPage /></ProtectedRoute>} />
        <Route path="/admin/announcements" element={<ProtectedRoute roles={['ADMIN']}><AdminAnnouncementsPage /></ProtectedRoute>} />
        <Route path="/admin/feedback" element={<ProtectedRoute roles={['ADMIN']}><AdminFeedbackPage /></ProtectedRoute>} />



        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>

    </div>

  );

}



export default function App() {

  return (

    <QueryClientProvider client={queryClient}>

      <AuthProvider>

        <ToastProvider>

          <BrowserRouter>

            <RouteProgress />

            <AppRoutes />

          </BrowserRouter>

        </ToastProvider>

      </AuthProvider>

    </QueryClientProvider>

  );

}

