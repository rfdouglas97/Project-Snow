
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { FaGoogle, FaApple } from "react-icons/fa";
import { supabase } from "@/integrations/supabase/client";

export const AuthButtons = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState<{google: boolean, apple: boolean}>({
    google: false,
    apple: false
  });

  useEffect(() => {
    const handleAuthMessage = (event: MessageEvent) => {
      // Make sure the message is from our domain for security
      if (event.origin !== window.location.origin) return;
      
      if (event.data?.type === "SUPABASE_AUTH_COMPLETE") {
        setIsLoading({...isLoading, google: false});
        if (event.data?.success) {
          toast({
            title: "Success",
            description: "You have successfully signed in",
          });
          // Refresh the page or update state as needed
          setTimeout(() => window.location.reload(), 500);
        } else if (event.data?.error) {
          toast({
            title: "Authentication Error",
            description: event.data.error,
            variant: "destructive",
          });
        }
      }
    };
    
    window.addEventListener("message", handleAuthMessage);
    
    return () => {
      window.removeEventListener("message", handleAuthMessage);
    };
  }, [isLoading, toast]);

  const handleGoogleSignIn = async () => {
    setIsLoading({...isLoading, google: true});
    try {
      const currentUrl = new URL(window.location.href);
      const redirectUrl = `${currentUrl.protocol}//${currentUrl.host}/auth/callback`;
      
      console.log("Redirecting to:", redirectUrl);
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
          skipBrowserRedirect: true,
        }
      });
      
      if (error) {
        console.error("Auth error:", error);
        toast({
          title: "Authentication Error",
          description: error.message,
          variant: "destructive",
        });
        setIsLoading({...isLoading, google: false});
        return;
      }

      if (!data?.url) {
        throw new Error("No authentication URL returned");
      }

      // Open the authentication URL in a popup window
      const authWindow = window.open(
        data.url,
        "oauth",
        "width=500,height=800,left=100,top=100"
      );

      if (!authWindow) {
        toast({
          title: "Popup Blocked",
          description: "Please allow popups for this site to sign in with Google",
          variant: "destructive",
        });
        setIsLoading({...isLoading, google: false});
      }

      // Poll to check if the popup was closed before completion
      const checkClosed = setInterval(() => {
        if (authWindow.closed) {
          clearInterval(checkClosed);
          setIsLoading({...isLoading, google: false});
        }
      }, 500);
    } catch (error) {
      console.error("Unexpected error:", error);
      toast({
        title: "Authentication Error",
        description: "Failed to initiate Google sign-in",
        variant: "destructive",
      });
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
