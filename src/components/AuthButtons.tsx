
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { FaGoogle, FaApple } from "react-icons/fa";
import { supabase } from "@/integrations/supabase/client";

export const AuthButtons = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState<{google: boolean, apple: boolean}>({
    google: false,
    apple: false
  });

  const handleGoogleSignIn = async () => {
    setIsLoading({...isLoading, google: true});
    try {
      // Use redirectTo that matches the site URL in Supabase Auth settings
      // This properly handles both localhost and preview environments
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      });
      
      if (error) {
        console.error("Auth error:", error);
        toast({
          title: "Authentication Error",
          description: error.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Unexpected error:", error);
      toast({
        title: "Authentication Error",
        description: "Failed to initiate Google sign-in",
        variant: "destructive",
      });
    } finally {
      setIsLoading({...isLoading, google: false});
    }
  };

  const handleAppleSignIn = async () => {
    setIsLoading({...isLoading, apple: true});
    try {
      // This would connect to our Flask backend in a real implementation
      toast({
        title: "Supabase Integration Required",
        description: "Please connect your project to Supabase to enable Apple authentication.",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Authentication Error",
        description: "Failed to initiate Apple sign-in",
        variant: "destructive",
      });
    } finally {
      setIsLoading({...isLoading, apple: false});
    }
  };

  return (
    <div className="flex flex-col space-y-4">
      <Button 
        onClick={handleGoogleSignIn} 
        variant="outline" 
        disabled={isLoading.google}
        className="flex items-center justify-center gap-2"
      >
        <FaGoogle className="h-4 w-4" />
        {isLoading.google ? "Signing in..." : "Sign in with Google"}
      </Button>
      
      <Button 
        onClick={handleAppleSignIn} 
        variant="outline" 
        disabled={isLoading.apple}
        className="flex items-center justify-center gap-2 bg-black text-white hover:bg-gray-800"
      >
        <FaApple className="h-4 w-4" />
        {isLoading.apple ? "Signing in..." : "Sign in with Apple"}
      </Button>
      
      <div className="text-center pt-2">
        <p className="text-sm text-gray-500">
          Authentication powered by Supabase
        </p>
      </div>
    </div>
  );
};
