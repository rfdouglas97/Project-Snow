
import React, { useState, useEffect } from "react";
import { LoginScreen } from "./screens/LoginScreen";
import { SignUpScreen } from "./screens/SignUpScreen";
import { IntroScreen } from "./screens/IntroScreen";
import { OnboardingScreen } from "./screens/OnboardingScreen";
import { AvatarUploadScreen } from "./screens/AvatarUploadScreen";
import { AvatarResultScreen } from "./screens/AvatarResultScreen";
import { TryOnScreen } from "./screens/TryOnScreen";
import { supabase } from "@/integrations/supabase/client";

type Step =
  | "login"
  | "signup"
  | "intro"
  | "onboarding"
  | "avatar-upload"
  | "avatar-result"
  | "tryon";

interface TryOnRouterProps {
  onClose: () => void;
  defaultStep?: Step;
  onStepChange?: (step: Step) => void; // Notifies popup wrapper of step for header logo logic
}

export const TryOnRouter: React.FC<TryOnRouterProps> = ({
  onClose,
  defaultStep = "login",
  onStepChange,
}) => {
  const [step, setStep] = useState<Step>(defaultStep);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    if (onStepChange) {
      onStepChange(step);
    }
  }, [step, onStepChange]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        console.log("Auth state change detected: SIGNED_IN", session);
        const wasInPopupFlow = localStorage.getItem('mira_popup_flow') === 'active';
        const nextStep = localStorage.getItem('mira_popup_next_step');
        
        // Check if this is a signup flow
        const isSignupFlow = localStorage.getItem('mira_signup_flow') === 'true';
        
        if (wasInPopupFlow) {
          console.log("Detected popup flow, moving to next step:", nextStep);
          localStorage.removeItem('mira_popup_flow');
          localStorage.removeItem('mira_popup_next_step');
          localStorage.removeItem('mira_signup_flow');
          
          // If it's a signup flow, go directly to avatar upload
          if (isSignupFlow) {
            setStep('avatar-upload');
          } else {
            setStep(nextStep as Step || 'intro');
          }
        }
      }
    });
    
    const wasInPopupFlow = localStorage.getItem('mira_popup_flow') === 'active';
    const nextStep = localStorage.getItem('mira_popup_next_step');
    
    if (wasInPopupFlow && nextStep) {
      console.log("Initial check detected popup flow, moving to:", nextStep);
      localStorage.removeItem('mira_popup_flow');
      localStorage.removeItem('mira_popup_next_step');
      setStep(nextStep as Step);
    }
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const nextStep = () => {
    setStep((prev) => {
      switch (prev) {
        case "login":
          return "signup";
        case "signup":
          return "intro";
        case "intro":
          return "onboarding";
        case "onboarding":
          return "avatar-upload";
        case "avatar-upload":
          return "avatar-result";
        case "avatar-result":
          return "tryon";
        case "tryon":
          return "tryon";
        default:
          return prev;
      }
    });
  };

  const prevStep = () => {
    setStep((prev) => {
      switch (prev) {
        case "signup":
          return "login";
        case "intro":
          return "signup";
        case "onboarding":
          return "intro";
        case "avatar-upload":
          return "onboarding";
        case "avatar-result":
          return "avatar-upload";
        case "tryon":
          return "avatar-result";
        default:
          return prev;
      }
    });
  };

  const goToStep = (to: Step) => setStep(to);

  const handleTryAgain = () => {
    setStep("avatar-upload");
  };

  const handleReturnToIntro = () => {
    setStep("intro");
  };

  const handleAvatarUploadComplete = (generatedAvatarUrl?: string) => {
    if (generatedAvatarUrl) {
      setAvatarUrl(generatedAvatarUrl);
    }
    setStep("avatar-result");
  };

  const handleSignUpClick = () => {
    localStorage.setItem('mira_signup_flow', 'true');
    setStep("signup");
  };

  const handleBackToLogin = () => {
    setStep("login");
  };

  const handleLoginSuccess = () => {
    console.log("Login success triggered, moving to onboarding screen");
    setStep("onboarding");
  };

  const handleSignupSuccess = () => {
    console.log("Signup success triggered, moving to onboarding screen");
    setStep("onboarding");
  };

  // Ensure all screen components properly pass through the onClose handler
  switch (step) {
    case "login":
      return <LoginScreen onNext={handleLoginSuccess} onClose={onClose} onSignUp={handleSignUpClick} />;
    case "signup":
      return <SignUpScreen onNext={handleSignupSuccess} onBack={handleBackToLogin} onClose={onClose} />;
    case "intro":
      return <IntroScreen onNext={() => setStep("onboarding")} onBack={() => setStep("login")} onClose={onClose} />;
    case "onboarding":
      return <OnboardingScreen 
        onNext={async (data) => {
          if (data) {
            try {
              const { error } = await supabase
                .from('profiles')
                .upsert({
                  id: (await supabase.auth.getUser()).data.user?.id,
                  height: data.height,
                  gender: data.gender,
                  updated_at: new Date().toISOString(),
                });
              
              if (error) throw error;
              
              setStep("avatar-upload");
            } catch (error) {
              console.error('Error saving profile:', error);
              setStep("avatar-upload");
            }
          } else {
            setStep("avatar-upload");
          }
        }} 
        onBack={() => setStep("intro")} 
        onClose={onClose} 
      />;
    case "avatar-upload":
      return <AvatarUploadScreen onNext={handleAvatarUploadComplete} onBack={() => setStep("onboarding")} onClose={onClose} />;
    case "avatar-result":
      return (
        <AvatarResultScreen
          onNext={() => setStep("tryon")}
          onBack={() => setStep("avatar-upload")}
          onClose={onClose}
          avatarUrl={avatarUrl}
          onTryAgain={handleTryAgain}
          onReturnToIntro={handleReturnToIntro}
        />
      );
    case "tryon":
      return <TryOnScreen onBack={() => setStep("avatar-result")} onClose={onClose} />;
    default:
      return null;
  }
};
