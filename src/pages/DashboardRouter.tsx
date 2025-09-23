import { useAuth } from '@/contexts/AuthContext';
import { usePreviewRole } from '@/lib/rolePreview';
import AdminDashboard from './AdminDashboard';
import ManagerDashboard from './ManagerDashboard';
import WorkerDashboard from './WorkerDashboard';
import Dashboard from './Dashboard';

const DashboardRouter = () => {
  const { userRole, user, loading } = useAuth();
  
  console.log('DashboardRouter - loading:', loading, 'user:', !!user, 'userRole:', userRole);
  
  // Use preview role if available
  let effectiveRole = userRole;
  
  try {
    const { effectiveRole: previewEffectiveRole } = usePreviewRole();
    effectiveRole = previewEffectiveRole;
    console.log('DashboardRouter - using preview role:', effectiveRole);
  } catch (error) {
    // Preview context not available, use regular role
    effectiveRole = userRole;
    console.log('DashboardRouter - using regular role:', effectiveRole, 'preview error:', error);
  }

  console.log('DashboardRouter - final effectiveRole:', effectiveRole);

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