
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

  useEffect(() => {
    const handleAuthMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      
      if (event.data?.type === "SUPABASE_AUTH_COMPLETE") {
        setIsLoading(false);
        if (event.data?.success) {
          console.log("Auth success received in SignUpScreen");
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

      localStorage.setItem('mira_popup_flow', 'active');
      localStorage.setItem('mira_popup_next_step', 'avatar-upload');
      localStorage.setItem('mira_signup_flow', 'true');

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
          description: "Please allow popups for this site to sign up with Google",
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
      <div className="absolute top-4 left-4 z-30 w-[56px] h-[56px] bg-[#f7f5f0] rounded-md flex items-center justify-center shadow-sm">
        <img
          src="/lovable-uploads/mira-logo-symbol.png"
          alt="Mira Logo"
          className="w-8 h-8 object-contain"
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
