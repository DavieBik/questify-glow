import React from 'react';
import { ApprovalsQueue } from '@/components/approvals/ApprovalsQueue';

const AdminApprovals = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Approval Management</h1>
        <p className="text-muted-foreground">
          Review and process course enrollment requests
        </p>
      </div>
      
      <ApprovalsQueue />
    </div>
  );
};

export default AdminApprovals;