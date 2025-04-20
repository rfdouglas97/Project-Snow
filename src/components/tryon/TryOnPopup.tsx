
import React from "react";

interface TryOnPopupProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export const TryOnPopup: React.FC<TryOnPopupProps> = ({
  open,
  onClose,
  children,
}) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      {/* Fixed-size container with no scrolling */}
      <div className="relative bg-white rounded-xl shadow-xl w-[500px] h-[600px] overflow-hidden">
        {/* Content container */}
        <div className="w-full h-full">{children}</div>
      </div>
    </div>
  );
};
