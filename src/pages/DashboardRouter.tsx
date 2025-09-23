import { useAuth } from '@/contexts/AuthContext';
import { usePreviewRole } from '@/lib/rolePreview';
import AdminDashboard from './AdminDashboard';
import ManagerDashboard from './ManagerDashboard';
import WorkerDashboard from './WorkerDashboard';
import Dashboard from './Dashboard';

const DashboardRouter = () => {
  const { userRole, user, loading } = useAuth();
  
  // Use preview role if available
  let effectiveRole = userRole;
  
  try {
    const { effectiveRole: previewEffectiveRole } = usePreviewRole();
    effectiveRole = previewEffectiveRole;
  } catch (error) {
    // Preview context not available, use regular role
    effectiveRole = userRole;
  }

  console.log('DashboardRouter DEBUG:', {
    loading,
    user: !!user,
    userRole,
    effectiveRole,
    willRenderComponent: effectiveRole === 'admin' ? 'AdminDashboard' :
                       effectiveRole === 'manager' ? 'ManagerDashboard' :
                       effectiveRole === 'worker' ? 'WorkerDashboard' : 'Dashboard'
  });

  // Route to appropriate dashboard based on role
  switch (effectiveRole) {
    case 'admin':
      return <AdminDashboard />;
    case 'manager':
      return <ManagerDashboard />;
    case 'worker':
      return <WorkerDashboard />;
    case 'staff':
    case 'student':
    default:
      return <Dashboard />;
  }
};

export default DashboardRouter;