import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const CreateTestAccounts = () => {
  const [isCreating, setIsCreating] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  const createAccounts = async () => {
    setIsCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-test-accounts');
      
      if (error) throw error;
      
      setResults(data.results || []);
      
      const successCount = data.results?.filter((r: any) => r.success).length || 0;
      toast.success(`Successfully created ${successCount} test accounts`);
      
    } catch (error) {
      console.error('Error creating accounts:', error);
      toast.error('Failed to create test accounts');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="container mx-auto py-10">
      <Card>
        <CardHeader>
          <CardTitle>Create Test Accounts</CardTitle>
          <CardDescription>
            Create admin and manager test accounts with proper roles
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={createAccounts} 
            disabled={isCreating}
            className="w-full"
          >
            {isCreating ? 'Creating Accounts...' : 'Create Test Accounts'}
          </Button>
          
          {results.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Results:</h3>
              {results.map((result, index) => (
                <div 
                  key={index} 
                  className={`p-3 rounded-md ${
                    result.success ? 'bg-primary/10 text-primary' : 'bg-red-100 text-red-800'
                  }`}
                >
                  <div className="font-medium">{result.email}</div>
                  {result.success ? (
                    <div className="text-sm">
                      Role: {result.role} | ID: {result.user_id}
                    </div>
                  ) : (
                    <div className="text-sm">Error: {result.error}</div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 p-4 bg-blue-50 rounded-md">
            <h3 className="font-semibold text-blue-900">Test Account Details:</h3>
            <div className="mt-2 space-y-1 text-sm text-blue-800">
              <div><strong>Admin:</strong> daviebiks@gmail.com (password: Steely123!!@)</div>
              <div><strong>Manager:</strong> info@rootsandorigin.com (password: Steely123!!@)</div>
              <div><strong>Worker:</strong> daviebik@gmail.com (existing account, updated to worker role)</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateTestAccounts;