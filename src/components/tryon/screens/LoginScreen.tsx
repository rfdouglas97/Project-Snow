
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { PopupCloseButton } from "../common/PopupCloseButton";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

/**
 * Try-on login modal, matching supplied screenshot and UX requirements.
 */
export const LoginScreen: React.FC<{
  onNext: () => void;
  onClose: () => void;
}> = ({ onNext, onClose }) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // The same login logic as in AuthButtons
  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      const currentUrl = new URL(window.location.href);
      const redirectUrl = `${currentUrl.protocol}//${currentUrl.host}`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (error) {
        toast({
          title: "Authentication Error",
          description: error.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Authentication Error",
        description: "Failed to initiate Google sign-in",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="relative w-[420px] h-[600px] rounded-2xl bg-[#b89af7] overflow-hidden flex flex-col items-stretch shadow-2xl"
      style={{
        background:
          "linear-gradient(135deg,#b89af7 0%,#6E59A5 100%)",
      }}
    >
      <PopupCloseButton onClick={onClose} />
      {/* Mira logo in white square like navbar */}
      <img
        src="/lovable-uploads/62ec2fd6-86b9-484d-b076-a102d794019d.png"
        alt="Mira"
        className="absolute top-7 left-7 h-16 w-16 rounded-xl bg-white shadow border object-cover z-20"
        style={{
          backgroundColor: "white", // force white bg
        }}
        draggable={false}
      />
      {/* Content */}
      <div className="flex-1 flex flex-col items-center pt-[72px] justify-start">
        <h2 className="text-3xl font-heading font-bold text-white [text-shadow:0_2px_8px_rgba(90,30,180,0.09)] text-center mb-2" style={{letterSpacing:0}}>
          Try Before you Buy
        </h2>
        <p className="mb-8 text-[1.15rem] text-white opacity-90 text-center font-semibold">
          Sign in to use Mira
        </p>
        <Button
          onClick={handleGoogleSignIn}
          type="button"
          disabled={isLoading}
          className="w-[320px] h-14 rounded-[18px] text-lg font-semibold bg-white text-[#6A1CF8] border-0 shadow-md flex justify-center items-center transition mb-6 hover:bg-gray-100 active:scale-97"
          style={{
            boxShadow: "0px 5px 36px 0 rgba(155,135,245,0.10)",
          }}
        >
          {isLoading ? (
            <span>Signing in...</span>
          ) : (
            <span>Sign in with Google</span>
          )}
        </Button>
        <div className="text-white opacity-95 text-center mb-7 text-base font-medium">
          Or Create an Account - it only takes 2 minutes
        </div>
        <Button
          onClick={onNext}
          type="button"
          variant="ghost"
          className="w-[320px] h-14 text-lg font-semibold rounded-[18px] border-0 shadow-none relative overflow-hidden flex justify-center items-center transition"
          style={{
            background: "linear-gradient(90deg, #9b87f5 15%, #D63AFF 90%)",
            color: "#fff",
            boxShadow: "0 3px 18px 0 rgba(155,135,245,0.12)",
          }}
        >
          <span className="relative z-10">Create Account</span>
          {/* Subtle animated overlay highlight */}
          <span
            className="absolute inset-0 rounded-[18px] pointer-events-none"
            style={{
              opacity: 0.13,
            }}
          ></span>
        </Button>
      </div>
      <div className="mt-auto mb-2 text-center w-full">
        <a
          href="https://www.trymira.xyz"
          target="_blank"
          rel="noopener noreferrer"
          className="block text-white font-semibold text-sm rounded px-4 py-1 transition"
        >
          www.trymira.xyz
        </a>
      </div>
    </div>
  );
};
