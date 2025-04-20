
import React, { useState } from "react";
import { LoginScreen } from "./screens/LoginScreen";
import { IntroScreen } from "./screens/IntroScreen";
import { OnboardingScreen } from "./screens/OnboardingScreen";
import { AvatarUploadScreen } from "./screens/AvatarUploadScreen";
import { AvatarResultScreen } from "./screens/AvatarResultScreen";
import { TryOnScreen } from "./screens/TryOnScreen";

type Step =
  | "login"
  | "intro"
  | "onboarding"
  | "avatar-upload"
  | "avatar-result"
  | "tryon";

interface TryOnRouterProps {
  onClose: () => void;
  defaultStep?: Step;
}

export const TryOnRouter: React.FC<TryOnRouterProps> = ({ onClose, defaultStep = "login" }) => {
  const [step, setStep] = useState<Step>(defaultStep);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const nextStep = () => {
    setStep((prev) => {
      switch (prev) {
        case "login": return "intro";
        case "intro": return "onboarding";
        case "onboarding": return "avatar-upload";
        case "avatar-upload": return "avatar-result";
        case "avatar-result": return "tryon";
        case "tryon": return "tryon";
        default: return prev;
      }
    });
  };

  const prevStep = () => {
    setStep((prev) => {
      switch (prev) {
        case "intro": return "login";
        case "onboarding": return "intro";
        case "avatar-upload": return "onboarding";
        case "avatar-result": return "avatar-upload";
        case "tryon": return "avatar-result";
        default: return prev;
      }
    });
  };

  // Easily allow custom step navigation if needed
  const goToStep = (to: Step) => setStep(to);

  // For the Try Again function required by AvatarResultScreen
  const handleTryAgain = () => {
    setStep("avatar-upload");
  };

  // For returning to the intro screen from avatar result
  const handleReturnToIntro = () => {
    setStep("intro");
  };

  switch (step) {
    case "login":
      return <LoginScreen onNext={nextStep} onClose={onClose} />;
    case "intro":
      return <IntroScreen onNext={nextStep} onBack={prevStep} onClose={onClose} />;
    case "onboarding":
      return <OnboardingScreen onNext={nextStep} onBack={prevStep} onClose={onClose} />;
    case "avatar-upload":
      return <AvatarUploadScreen onNext={nextStep} onBack={prevStep} onClose={onClose} />;
    case "avatar-result":
      return <AvatarResultScreen 
        onNext={nextStep} 
        onBack={prevStep} 
        onClose={onClose} 
        avatarUrl={avatarUrl}
        onTryAgain={handleTryAgain}
        onReturnToIntro={handleReturnToIntro}
      />;
    case "tryon":
      return <TryOnScreen onBack={prevStep} onClose={onClose} />;
    default:
      return null;
  }
};
