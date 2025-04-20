
import React from "react";

interface LoginScreenProps {
  onNext: () => void;
  onClose: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onNext }) => {
  return (
    <div className="flex flex-col min-h-[700px] px-8 pt-10 items-center justify-center">
      <h2 className="text-2xl font-semibold mb-6 text-center">Sign In to Mira</h2>
      <p className="mb-8 text-center text-gray-700">Sign in with Google or create an account to continue.</p>
      <button
        className="w-full bg-mira-purple text-white py-3 mb-4 rounded-lg shadow hover:bg-mira-pink transition text-lg font-medium"
        // TODO: Call Supabase Google auth
        onClick={onNext}
      >
        Continue with Google
      </button>
      <button
        className="w-full bg-gray-200 text-gray-700 py-3 rounded-lg shadow hover:bg-gray-300 transition"
        // TODO: Call Supabase Email auth
        onClick={onNext}
      >
        Continue with Email
      </button>
      {/* TODO: Show error/success feedback */}
    </div>
  );
};
