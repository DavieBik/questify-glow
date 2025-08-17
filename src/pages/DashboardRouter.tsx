import { useAuth } from '@/contexts/AuthContext';
import { usePreviewRole } from '@/lib/rolePreview';
import AdminDashboard from './AdminDashboard';
import ManagerDashboard from './ManagerDashboard';
import Dashboard from './Dashboard';

const DashboardRouter = () => {
  const { userRole } = useAuth();
  
  // Check if role preview is enabled
  const isPreviewEnabled = import.meta.env.VITE_ENABLE_ROLE_PREVIEW === 'true';
  
  let effectiveRole = userRole;
  
  // Use preview role if enabled and available
  if (isPreviewEnabled) {
    try {
      const { effectiveRole: previewEffectiveRole } = usePreviewRole();
      effectiveRole = previewEffectiveRole;
    } catch {
      // Preview context not available, use regular role
      effectiveRole = userRole;
    }
  }

  // Route to appropriate dashboard based on role
  switch (effectiveRole) {
    case 'admin':
      return <AdminDashboard />;
    case 'manager':
      return <ManagerDashboard />;
    case 'staff':
    case 'student':
    default:
      return <Dashboard />;
  }
};

export default DashboardRouter;