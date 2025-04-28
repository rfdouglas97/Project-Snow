
import React from "react";

export const MiraLogoOverlay: React.FC = () => (
  <div className="absolute top-4 left-4 z-30 w-[56px] h-[56px] bg-[#f7f5f0] rounded-md flex items-center justify-center shadow-sm">
    <img
      src="/lovable-uploads/mira-logo-symbol.png"
      alt="Mira"
      className="w-8 h-8 object-contain"
      draggable={false}
    />
  </div>
);
