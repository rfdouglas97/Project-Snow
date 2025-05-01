
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { FaGoogle } from "react-icons/fa";

export const LoginScreen: React.FC<{
  onNext: () => void;
  onClose: () => void;
  onSignUp: () => void;
}> = ({ onNext, onClose, onSignUp }) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const handleAuthMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      
      if (event.data?.type === "SUPABASE_AUTH_COMPLETE") {
        setIsLoading(false);
        if (event.data?.success) {
          console.log("Auth success received in LoginScreen", event.data);
          onNext();
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
  }, [onNext, toast]);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      const currentUrl = new URL(window.location.href);
      const redirectUrl = `${currentUrl.protocol}//${currentUrl.host}/auth/callback`;

      localStorage.setItem('mira_popup_flow', 'active');
      localStorage.setItem('mira_popup_next_step', 'intro');

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        throw error;
      }

      if (!data?.url) {
        throw new Error("No authentication URL returned");
      }

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
        setIsLoading(false);
        return;
      }

      const checkClosed = setInterval(() => {
        if (authWindow.closed) {
          clearInterval(checkClosed);
          setIsLoading(false);
        }
      }, 500);

    } catch (error) {
      toast({
        title: "Authentication Error",
        description: error instanceof Error ? error.message : "Failed to initiate Google sign-in",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };
  
  return (
    <div className="relative w-full h-full overflow-hidden flex flex-col items-stretch shadow-2xl rounded-lg">
      {/* Background image and overlay */}
      <img
        src="/lovable-uploads/0b2e6419-bd11-4aa6-a1ab-2a4711010279.png"
        alt="Login Background"
        className="absolute inset-0 w-full h-full object-cover z-0"
      />
      <div className="absolute inset-0 bg-black/30 z-10" />
      
      {/* Logo Container - Bigger size with proper positioning */}
      <div className="absolute top-4 left-4 z-30 w-40">
        <img 
          src="/lovable-uploads/26499bdc-6454-479a-8425-ccd317141be5.png" 
          alt="Mira Logo" 
          className="w-full h-auto object-contain"
        />
      </div>
      
      {/* Main Content Container - With extra top padding to avoid overlapping the logo */}
      <div className="relative z-20 flex-1 flex flex-col items-center justify-between px-8">
        {/* Upper spacer to prevent content from overlapping with logo */}
        <div className="h-28" />
        
        {/* Center content container */}
        <div className="flex flex-col items-center justify-center flex-1 w-full">
          <h2 className="text-4xl font-heading font-bold text-white [text-shadow:0_2px_8px_rgba(90,30,180,0.09)] text-center mb-4" style={{letterSpacing:0}}>
            Try Before you Buy
          </h2>
          
          <p className="mb-12 text-xl text-white opacity-90 text-center font-semibold">
            Sign in to use Mira
          </p>
          
          <button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            type="button"
            className="w-full max-w-[320px] h-14 mb-12 flex items-center justify-center rounded-2xl bg-[#f7f4ee] border border-[#e7e3db] hover:bg-[#f1ece4] transition shadow-sm text-black text-lg font-semibold gap-3 outline-none focus-visible:ring-2 focus-visible:ring-mira-purple select-none"
            style={{ boxShadow: "0px 2px 12px 0 rgba(155,135,245,0.06)" }}
          >
            <FaGoogle className="text-black text-2xl" style={{ flexShrink: 0 }} />
            {isLoading ? (
              <span className="ml-2 font-medium">Signing in...</span>
            ) : (
              <span className="ml-2 font-medium">Sign in with Google</span>
            )}
          </button>
          
          <div className="text-white opacity-95 text-center mb-8 text-lg font-medium">
            Or Create an Account - it only takes 2 minutes
          </div>
          
          <Button
            onClick={onSignUp}
            type="button"
            variant="ghost"
            className="w-full max-w-[320px] h-14 text-lg font-semibold rounded-[18px] border-0 shadow-none relative overflow-hidden flex justify-center items-center transition"
            style={{
              background: "linear-gradient(90deg, #9b87f5 15%, #D63AFF 90%)",
              color: "#fff",
              boxShadow: "0 3px 18px 0 rgba(155,135,245,0.12)",
            }}
          >
            <span className="relative z-10">Create Account</span>
            <span
              className="absolute inset-0 rounded-[18px] pointer-events-none"
              style={{
                opacity: 0.13,
                background: "linear-gradient(180deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0) 100%)"
              }}
            ></span>
          </Button>
        </div>
        
        <div className="mb-6 text-center w-full">
          <a
            href="https://www.getmira.xyz"
            target="_blank"
            rel="noopener noreferrer"
            className="block text-white font-semibold text-sm rounded px-4 py-1 transition"
          >
            www.getmira.xyz
          </a>
        </div>
      </div>
    </div>
  );
};
