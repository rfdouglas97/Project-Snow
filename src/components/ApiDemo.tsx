
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent } from "@/components/ui/card";

export const ApiDemo = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState<{[key: string]: boolean}>({
    users: false,
    health: false,
    storage: false
  });
  const [response, setResponse] = useState<string | null>(null);

  const testEndpoint = async (endpoint: string) => {
    setIsLoading({...isLoading, [endpoint]: true});
    try {
      // This would connect to our Flask backend in a real implementation
      const mockResponses: {[key: string]: any} = {
        health: { status: "healthy", version: "1.0.0", timestamp: new Date().toISOString() },
        users: { message: "Authentication required", code: "auth_required" },
        storage: { buckets: ["public", "private"], count: 2 }
      };
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setResponse(JSON.stringify(mockResponses[endpoint], null, 2));
      
      toast({
        title: "API Endpoint Tested",
        description: `Endpoint: /api/${endpoint}`,
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "API Test Failed",
        description: "There was an error testing the endpoint",
        variant: "destructive",
      });
    } finally {
      setIsLoading({...isLoading, [endpoint]: false});
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <Button 
          onClick={() => testEndpoint('health')} 
          disabled={isLoading.health}
          variant="outline"
          className="flex-1"
        >
          Test /health
        </Button>
        <Button 
          onClick={() => testEndpoint('users')} 
          disabled={isLoading.users}
          variant="outline"
          className="flex-1"
        >
          Test /users
        </Button>
        <Button 
          onClick={() => testEndpoint('storage')} 
          disabled={isLoading.storage}
          variant="outline"
          className="flex-1"
        >
          Test /storage
        </Button>
      </div>
      
      {response && (
        <Card className="mt-4">
          <CardContent className="pt-6">
            <pre className="bg-gray-100 p-4 rounded-md overflow-auto text-left text-sm max-h-60">
              {response}
            </pre>
          </CardContent>
        </Card>
      )}
      
      <div className="text-center pt-2">
        <p className="text-sm text-gray-500">
          Requires Flask backend connection for actual implementation
        </p>
      </div>
    </div>
  );
};
