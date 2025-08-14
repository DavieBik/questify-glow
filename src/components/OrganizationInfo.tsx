import React from 'react';
import { Building2, Globe, Mail, Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getOrganizationConfig } from '@/config/organization';

export function OrganizationInfo() {
  const organization = getOrganizationConfig();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="w-5 h-5" />
          Organization Information
        </CardTitle>
        <CardDescription>
          Current organization details and configuration
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Organization Name</label>
            <p className="text-base font-medium">{organization.name}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Contact Email</label>
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <p className="text-base">{organization.contact_email}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Subscription Plan</label>
            <div className="mt-1">
              <Badge variant="secondary" className="capitalize">
                {organization.subscription_plan}
              </Badge>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Max Users</label>
            <div className="flex items-center gap-2 mt-1">
              <Users className="w-4 h-4 text-muted-foreground" />
              <p className="text-base">{organization.max_users} users</p>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Status</label>
            <div className="mt-1">
              <Badge variant={organization.is_active ? "default" : "destructive"}>
                {organization.is_active ? "Active" : "Inactive"}
              </Badge>
            </div>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-muted-foreground">Application URL</label>
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-muted-foreground" />
            <a 
              href={organization.app_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              {organization.app_url}
            </a>
          </div>
        </div>

        <div className="pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Single-tenant deployment • Organization ID: {organization.id.slice(0, 8)}...
          </p>
        </div>
      </CardContent>
    </Card>
  );
}