import { useAuth } from '@/contexts/AuthContext';
import { usePreviewRole } from '@/lib/rolePreview';
import AdminDashboard from './AdminDashboard';
import ManagerDashboard from './ManagerDashboard';
import WorkerDashboard from './WorkerDashboard';
import Dashboard from './Dashboard';

const DashboardRouter = () => {
  const { userRole } = useAuth();
  
  // Use preview role if available
  let effectiveRole = userRole;
  
  try {
    const { effectiveRole: previewEffectiveRole } = usePreviewRole();
    effectiveRole = previewEffectiveRole;
  } catch {
    // Preview context not available, use regular role
    effectiveRole = userRole;
  }

  console.log('DashboardRouter - userRole:', userRole, 'effectiveRole:', effectiveRole);

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