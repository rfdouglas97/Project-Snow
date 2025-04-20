
import React from "react";

/**
 * Consistent Mira Logo overlay for upper left of modals
 */
export const MiraLogoOverlay: React.FC = () => (
  <div className="absolute top-4 left-4 z-20 pointer-events-none select-none">
    <img
      src="/lovable-uploads/62ec2fd6-86b9-484d-b076-a102d794019d.png"
      alt="Mira logo"
      className="h-20 w-auto"
      draggable={false}
      style={{ background: "transparent", borderRadius: 0, boxShadow: "none" }}
    />
  </div>
);
