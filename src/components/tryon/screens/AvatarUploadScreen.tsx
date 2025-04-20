
import React from "react";

interface AvatarUploadScreenProps {
  onNext: (file?: File) => void;
  onBack: () => void;
  onClose: () => void;
}

export const AvatarUploadScreen: React.FC<AvatarUploadScreenProps> = ({
  onNext, onBack
}) => {
  // TODO: Add photo upload/capture + handle upload to Supabase/storage
  return (
    <div className="flex flex-col min-h-[700px] px-8 pt-10 items-center justify-center">
      <h2 className="text-2xl font-bold mb-4 text-mira-purple text-center">Upload or Take a Photo</h2>
      <p className="mb-8 text-center text-gray-600">
        We'll use your photo to generate your virtual avatar.<br/>Make sure your face is visible!
      </p>
      {/* Placeholder for file input */}
      <input
        type="file"
        accept="image/*"
        className="mb-4"
        onChange={e => {
          // TODO: Handle image file (show preview, upload, etc.)
          const file = e.target.files?.[0];
          onNext(file);
        }}
      />
      <div className="flex gap-2 w-full mt-6">
        <button
          className="py-2 px-4 rounded bg-gray-100 border text-gray-700 flex-1 shadow"
          onClick={onBack}
        >
          Back
        </button>
        <button
          className="py-2 px-4 rounded bg-mira-purple text-white font-semibold flex-1 shadow hover:bg-mira-pink transition"
          onClick={() => onNext(undefined)}
        >
          Continue
        </button>
      </div>
      {/* TODO: Option to capture directly via camera for mobile */}
      {/* TODO: Show preview of uploaded image */}
    </div>
  );
};
