
import React from "react";

export const MiraLogoOverlay: React.FC = () => (
  <div className="absolute top-4 left-4 z-20 pointer-events-none select-none">
    <img
      src="/lovable-uploads/aa9a914e-077a-4c57-b8f4-a66c0d337df2.png"
      alt="Mira"
      className="h-8 w-auto"
      draggable={false}
      style={{ background: "transparent", borderRadius: 0, boxShadow: "none" }}
    />
  </div>
);
