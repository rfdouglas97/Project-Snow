import React, { useState, useEffect } from "react";
import { LoginScreen } from "./screens/LoginScreen";
import { SignUpScreen } from "./screens/SignUpScreen";
import { IntroScreen } from "./screens/IntroScreen";
import { OnboardingScreen } from "./screens/OnboardingScreen";
import { AvatarUploadScreen } from "./screens/AvatarUploadScreen";
import { AvatarResultScreen } from "./screens/AvatarResultScreen";
import { TryOnScreen } from "./screens/TryOnScreen";

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
    nextStep();
  };

  const handleSignUpClick = () => {
    setStep("signup");
  };

  const handleBackToLogin = () => {
    setStep("login");
  };

  switch (step) {
    case "login":
      return <LoginScreen onNext={handleSignUpClick} onClose={onClose} />;
    case "signup":
      return <SignUpScreen onNext={nextStep} onBack={handleBackToLogin} onClose={onClose} />;
    case "intro":
      return <IntroScreen onNext={nextStep} onBack={prevStep} onClose={onClose} />;
    case "onboarding":
      return <OnboardingScreen onNext={nextStep} onBack={prevStep} onClose={onClose} />;
    case "avatar-upload":
      return <AvatarUploadScreen onNext={handleAvatarUploadComplete} onBack={prevStep} onClose={onClose} />;
    case "avatar-result":
      return (
        <AvatarResultScreen
          onNext={nextStep}
          onBack={prevStep}
          onClose={onClose}
          avatarUrl={avatarUrl}
          onTryAgain={handleTryAgain}
          onReturnToIntro={handleReturnToIntro}
        />
      );
    case "tryon":
      return <TryOnScreen onBack={prevStep} onClose={onClose} />;
    default:
      return null;
  }
};
