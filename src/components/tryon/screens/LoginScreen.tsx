
import React from "react";
import { Button } from "@/components/ui/button";
// Removed import of Google icon because it does not exist in lucide-react

interface LoginScreenProps {
  onNext: () => void;
  onClose: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onNext }) => {
  return (
    <div
      className="flex flex-col min-h-[580px] sm:min-h-[700px] w-full items-center justify-center px-2 sm:px-8 py-6"
      style={{
        background: "linear-gradient(120deg, #9b87f5 0%, #6E59A5 100%)",
        borderRadius: "1.25rem",
      }}
    >
      {/* Mira Logo */}
      <div className="w-full flex justify-start">
        <img
          src="/lovable-uploads/4a9e6bb2-27ae-42ad-9764-f1381ba11187.png"
          alt="Mira logo"
          className="w-28 mb-3 h-auto"
          style={{
            boxShadow: "0 2px 16px 0 rgba(106,28,248, 0.10)",
            borderRadius: 12,
          }}
        />
      </div>
      <div className="flex-1 flex flex-col items-center justify-center w-full">
        <h2 className="text-2xl sm:text-3xl mt-2 font-heading font-bold text-white [text-shadow:0_2px_6px_rgba(90,30,180,0.09)] text-center">
          Try Before you Buy
        </h2>
        <p className="pt-1 pb-4 text-[1.2rem] text-white opacity-80 text-center font-semibold">
          Sign in to use Mira
        </p>
        {/* Google Auth Button, styled */}
        <Button
          onClick={() => {
            // TODO: Replace with actual Supabase Google Auth
            onNext();
          }}
          variant="outline"
          className="w-[310px] h-12 bg-white text-mira-purple font-medium text-base border shadow-md gap-3 justify-center rounded-lg hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-mira-purple transition mb-4"
        >
          {/* Removed Google icon since it does not exist */}
          <span>Sign in with Google</span>
        </Button>
        <div className="text-white opacity-85 text-center mb-5 text-base">
          Or Create an Account - it only takes 2 minutes
        </div>
        {/* Create Account with gradient border */}
        <Button
          onClick={() => {
            // TODO: Open signup flow or modal
            onNext();
          }}
          variant="ghost"
          className="w-[310px] h-12 bg-gradient-to-r from-primary to-mira-pink text-white font-semibold border-0
            hover:from-mira-pink hover:to-primary active:scale-95 transition rounded-lg relative overflow-hidden"
          style={{
            boxShadow: "0 3px 24px 0 rgba(155,135,245,0.14)",
          }}
        >
          <span className="relative z-10">Create Account</span>
          {/* For better gradient border look */}
          <span
            className="absolute inset-0 rounded-lg pointer-events-none"
            style={{
              boxShadow:
                "0 0 0 2px rgba(106,28,248,0.10), 0 8px 32px 2px rgba(155,135,245,0.15)",
              background: "linear-gradient(90deg,#9b87f5 10%, #D63AFF 100%)",
              opacity: 0.28,
              zIndex: 1,
            }}
          ></span>
        </Button>
      </div>
      {/* Footer */}
      <div className="mt-auto text-center w-full pt-7 pb-2">
        <a
          href="https://www.trymira.xyz"
          target="_blank"
          rel="noopener noreferrer"
          className="block text-white/90 bg-mira-purple/80 hover:bg-mira-pink/90 font-semibold text-sm rounded px-4 py-1 transition"
        >
          www.trymira.xyz
        </a>
      </div>
    </div>
  );
};

