
import React, { useState } from "react";

interface OnboardingScreenProps {
  onNext: (data?: { height?: string; gender?: string }) => void;
  onBack: () => void;
  onClose: () => void;
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onNext, onBack }) => {
  const [height, setHeight] = useState<string>("");
  const [gender, setGender] = useState<string>("");

  // TODO: Validate/collect more info as needed

  return (
    <div className="flex flex-col min-h-[700px] px-8 pt-10 items-center justify-center">
      <h2 className="text-2xl font-bold mb-6 text-mira-purple text-center">Quick Onboarding</h2>
      <form
        className="w-full max-w-xs mx-auto flex flex-col gap-4"
        onSubmit={e => {
          e.preventDefault();
          onNext({ height, gender });
        }}
      >
        <label className="text-sm font-medium text-gray-700">
          Height (cm or inches)
          <input
            type="text"
            className="mt-2 w-full border rounded py-2 px-3"
            value={height}
            onChange={e => setHeight(e.target.value)}
            placeholder="e.g. 172 cm or 5'8&quot;"
          />
        </label>
        <label className="text-sm font-medium text-gray-700">
          Gender (optional)
          <select
            className="mt-2 w-full border rounded py-2 px-3"
            value={gender}
            onChange={e => setGender(e.target.value)}
          >
            <option value="">Select…</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
            <option value="nonbinary">Non-binary</option>
            <option value="prefer-not-say">Prefer not to say</option>
          </select>
        </label>
        <div className="flex gap-2 mt-4">
          <button
            type="button"
            className="py-2 px-4 rounded bg-gray-100 border text-gray-700 flex-1 shadow"
            onClick={onBack}
          >
            Back
          </button>
          <button
            type="submit"
            className="py-2 px-4 rounded bg-mira-purple text-white font-semibold flex-1 shadow hover:bg-mira-pink transition"
          >
            Continue
          </button>
        </div>
      </form>
    </div>
  );
};
