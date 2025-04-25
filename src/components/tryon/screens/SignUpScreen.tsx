
import React, { useState, useEffect } from "react";
import { FaGoogle } from "react-icons/fa";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { PopupCloseButton } from "../common/PopupCloseButton";

export const SignUpScreen: React.FC<{
  onNext: () => void;
  onClose: () => void;
  onBack: () => void;
}> = ({ onNext, onClose, onBack }) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // Add effect to listen for auth completion messages
  useEffect(() => {
    const handleAuthMessage = (event: MessageEvent) => {
      // Make sure the message is from our domain for security
      if (event.origin !== window.location.origin) return;
      
      if (event.data?.type === "SUPABASE_AUTH_COMPLETE") {
        setIsLoading(false);
        if (event.data?.success) {
          console.log("Auth success received in SignUpScreen");
          // Successfully signed up, proceed to next step
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

  const handleGoogleSignUp = async () => {
    setIsLoading(true);
    try {
      const currentUrl = new URL(window.location.href);
      const redirectUrl = `${currentUrl.protocol}//${currentUrl.host}/auth/callback`;

      // Set a flag in localStorage that we're in a popup flow
      localStorage.setItem('mira_popup_flow', 'active');
      localStorage.setItem('mira_popup_next_step', 'intro');

      // Configure auth with popup method instead of redirect
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
          skipBrowserRedirect: true, // This prevents automatic redirect
        },
      });

      if (error) {
        throw error;
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
          description: "Please allow popups for this site to sign up with Google",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Poll to check if the popup was closed before completion
      const checkClosed = setInterval(() => {
        if (authWindow.closed) {
          clearInterval(checkClosed);
          setIsLoading(false);
        }
      }, 500);

    } catch (error) {
      toast({
        title: "Authentication Error",
        description: error instanceof Error ? error.message : "Failed to initiate Google sign-up",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  return (
    <div
      className="relative w-full h-full overflow-hidden flex flex-col items-stretch shadow-2xl"
      style={{
        background: "linear-gradient(135deg, #b89af7 0%, #6E59A5 100%)",
        minHeight: "600px",
        borderRadius: "16px",
      }}
    >
      <div className="absolute top-6 left-6 w-24 h-auto">
        <img
          src="/lovable-uploads/26499bdc-6454-479a-8425-ccd317141be5.png"
          alt="Mira Logo"
          className="w-full h-full object-contain"
        />
      </div>

      <PopupCloseButton onClick={onClose} />

      <div className="flex-1 flex flex-col items-center justify-center px-4 pt-16">
        <h2 className="text-3xl font-heading font-bold text-white mb-12">
          Create an Account
        </h2>

        <button
          onClick={handleGoogleSignUp}
          disabled={isLoading}
          className="w-full max-w-[280px] h-12 flex items-center justify-center bg-white rounded-full shadow-md hover:shadow-lg transition-shadow duration-200 text-gray-700 text-base font-medium"
        >
          <FaGoogle className="mr-3 text-xl" />
          {isLoading ? "Signing up..." : "Sign up with Google"}
        </button>

        <button
          onClick={onBack}
          className="mt-6 text-white/90 hover:text-white transition-colors text-sm font-medium"
        >
          Back to Sign In
        </button>
      </div>
    </div>
  );
};
