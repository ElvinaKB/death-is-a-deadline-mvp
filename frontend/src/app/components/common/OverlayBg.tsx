import React from "react";
import placeDetailBackgroundImage from "../../../assets/place-details.png";

interface OverlayBgProps {
  children: React.ReactNode;
  opacity?: number; // 0 to 1
  imageUrl?: string;
}

export const OverlayBg: React.FC<OverlayBgProps> = ({
  children,
  opacity = 0.7,
  imageUrl = placeDetailBackgroundImage,
}) => {
  return (
    <div style={{ position: "relative", width: "100%" }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          backgroundImage: `url(${imageUrl})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          zIndex: 0,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            background: `rgba(0,0,0,${opacity})`,
            zIndex: 1,
            pointerEvents: "none",
          }}
        />
      </div>
      <div style={{ position: "relative", zIndex: 2 }}>{children}</div>
    </div>
  );
};
