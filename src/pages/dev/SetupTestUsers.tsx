import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, AlertCircle, Users } from 'lucide-react';

const SetupTestUsers = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const setupUsers = async () => {
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const { data, error: functionError } = await supabase.functions.invoke('setup-test-users');
      
      if (functionError) {
        setError(functionError.message);
        return;
      }

      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Setup Test Users
          </CardTitle>
          <CardDescription>
            Create test accounts for different roles: Admin, Manager, and Staff
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={setupUsers} 
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Setting up users...' : 'Create Test Users'}
          </Button>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {results && (
            <div className="space-y-4">
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Test users setup completed successfully!
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <h4 className="font-medium">User Accounts Created:</h4>
                {results.results?.map((result: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <span className="font-medium">{result.email}</span>
                      {result.role && (
                        <Badge variant="secondary" className="ml-2">
                          {result.role}
                        </Badge>
                      )}
                    </div>
                    <Badge 
                      variant={result.status === 'created' || result.status === 'updated_to_admin' ? 'default' : 'secondary'}
                    >
                      {result.status}
                    </Badge>
                  </div>
                ))}
              </div>

              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-medium mb-2">Login Credentials:</h4>
                <div className="space-y-1 text-sm font-mono">
                  <div><strong>Admin:</strong> admin@skillbridge.com / admin123</div>
                  <div><strong>Manager:</strong> manager@skillbridge.com / manager123</div>
                  <div><strong>Staff:</strong> staff@skillbridge.com / staff123</div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SetupTestUsers;