import React from 'react';
import { OrganizationSetup } from '@/components/organization/OrganizationSetup';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function OrganizationSetupPage() {
  const navigate = useNavigate();
  const { organization } = useAuth();

  // If organization already exists, redirect to dashboard
  React.useEffect(() => {
    if (organization) {
      navigate('/', { replace: true });
    }
  }, [organization, navigate]);

  const handleComplete = () => {
    navigate('/', { replace: true });
  };

  return <OrganizationSetup onComplete={handleComplete} />;
}