
import React from "react";
import { Button } from "@/components/ui/button";
import { MiraLogoOverlay } from "../common/MiraLogoOverlay";
import { PopupCloseButton } from "../common/PopupCloseButton";

interface LoginScreenProps {
  onNext: () => void;
  onClose: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onNext, onClose }) => {
  return (
    <div className="relative w-[500px] h-[600px] rounded-2xl bg-white overflow-hidden flex items-center justify-center">
      <MiraLogoOverlay />
      <PopupCloseButton onClick={onClose} />
      <div
        className="flex flex-col items-center justify-center w-full h-full rounded-2xl"
        style={{
          background: "linear-gradient(135deg, #b89af7 0%, #6E59A5 100%)"
        }}
      >
        <h2 className="text-3xl font-heading font-bold text-white [text-shadow:0_2px_6px_rgba(90,30,180,0.09)] text-center mb-3 mt-10">
          Try Before you Buy
        </h2>
        <p className="mb-8 text-[1.18rem] text-white opacity-90 text-center font-semibold">
          Sign in to use Mira
        </p>
        <Button
          onClick={onNext}
          variant="outline"
          className="w-[310px] h-12 bg-white text-mira-purple font-medium text-base border shadow-md gap-3 justify-center rounded-lg hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-mira-purple transition mb-6"
          style={{ color: "#6A1CF8" }}
        >
          <span>Sign in with Google</span>
        </Button>
        <div className="text-white opacity-95 text-center mb-6 text-base">
          Or Create an Account - it only takes 2 minutes
        </div>
        <Button
          onClick={onNext}
          variant="ghost"
          className="w-[310px] h-12 bg-gradient-to-r from-primary to-mira-pink text-white font-semibold border-0
            hover:from-mira-pink hover:to-primary active:scale-95 transition rounded-lg relative overflow-hidden"
          style={{
            boxShadow: "0 3px 24px 0 rgba(155,135,245,0.14)",
          }}
        >
          <span className="relative z-10">Create Account</span>
          <span
            className="absolute inset-0 rounded-lg pointer-events-none"
            style={{
              boxShadow:
                "0 0 0 2px rgba(106,28,248,0.12), 0 8px 32px 2px rgba(155,135,245,0.10)",
              background: "linear-gradient(90deg,#9b87f5 10%, #D63AFF 100%)",
              opacity: 0.22,
              zIndex: 1,
            }}
          ></span>
        </Button>
        <div className="mt-auto text-center w-full pt-8 pb-3">
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
    </div>
  );
};
