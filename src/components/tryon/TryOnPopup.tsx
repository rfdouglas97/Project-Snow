
import React from "react";
import { X } from "lucide-react";

interface TryOnPopupProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  header?: React.ReactNode; // Still allow for extensibility if needed
}

export const TryOnPopup: React.FC<TryOnPopupProps> = ({
  open,
  onClose,
  children,
}) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-[600px] max-h-[90vh] overflow-y-auto p-0 sm:p-6">
        <button
          className="absolute top-3 right-3 p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition"
          onClick={onClose}
          aria-label="Close"
        >
          <X className="h-5 w-5 text-gray-500" />
        </button>
        {/* Always show Mira logo in the header (upper left) */}
        <div className="w-full flex items-center justify-start pl-5 pt-4 pb-2">
          <img
            src="/lovable-uploads/987cf6d3-d5d8-4d02-b4eb-088715115d64.png"
            alt="Mira logo"
            className="w-28 h-auto"
            style={{ borderRadius: 12 }}
          />
        </div>
        <div className="pt-0 pb-6 sm:pt-0 sm:pb-0">
          {children}
        </div>
      </div>
    </div>
  );
};
