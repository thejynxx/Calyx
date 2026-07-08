import React from "react";
import Image from "next/image";
import "./logo-error.css";

export interface KeepLogoErrorProps {
  width?: number;
  height?: number;
}

export const KeepLogoError = () => {
  return (
    <div className="flex items-center justify-center -my-4">
      <div className="text-6xl animate-spin" style={{ animationDuration: '3s' }}>🌀</div>
    </div>
  );
};
