import React from 'react';
import { NotificationsManager } from '@/components/notifications/NotificationsManager';

const AdminNotifications = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Notifications Management</h1>
        <p className="text-muted-foreground">
          Configure and monitor automated course reminder notifications
        </p>
      </div>
      
      <NotificationsManager />
    </div>
  );
};

export default AdminNotifications;