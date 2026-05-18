/** @format */

"use client";

import { useState } from "react";
import { UserRound } from "lucide-react";

export default function LecturerAvatar({
  lecturerId,
  name,
  size = "lg",
}: {
  lecturerId: string;
  name: string;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const [error, setError] = useState(false);

  const sizeClass = {
    sm: "h-10 w-10 rounded-2xl",
    md: "h-14 w-14 rounded-2xl",
    lg: "h-20 w-20 rounded-3xl",
    xl: "h-28 w-28 rounded-[2rem]",
  }[size];

  const iconSize = {
    sm: 18,
    md: 22,
    lg: 34,
    xl: 42,
  }[size];

  if (error) {
    return (
      <div
        className={`flex ${sizeClass} items-center justify-center bg-sky-100 text-sky-700`}
      >
        <UserRound size={iconSize} />
      </div>
    );
  }

  return (
    <div
      className={`overflow-hidden border border-slate-200 bg-slate-100 shadow-sm ${sizeClass}`}
    >
      {}
      <img
        src={`/api/files/profile-photo/${lecturerId}`}
        alt={`Foto ${name}`}
        className="h-full w-full object-cover"
        onError={() => setError(true)}
      />
    </div>
  );
}
