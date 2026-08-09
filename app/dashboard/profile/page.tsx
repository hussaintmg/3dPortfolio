"use client";

import { UserRound } from "lucide-react";
import ProfileEditor from "@/Components/profile/ProfileEditor";
import PasskeyManager from "@/Components/auth/PasskeyManager";
import FaceUnlockManager from "@/Components/auth/FaceUnlockManager";

export default function DashboardProfilePage() {
  return (
    <div className="min-h-screen p-4 sm:p-6 md:p-10">
      <div className="max-w-3xl mx-auto space-y-8">
        <header className="space-y-2">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight flex items-center gap-4">
            <div className="size-12 rounded-xl bg-card flex items-center justify-center text-accent border border-white/10">
              <UserRound size={24} />
            </div>
            My Profile
          </h1>
          <p className="text-gray-400 font-medium text-sm">
            Your photo, name, password and sign-in devices. This is your own
            account — site branding lives under Settings.
          </p>
        </header>

        <ProfileEditor />

        {/*
          Enrolling a fingerprint lived only under Site Settings, which is
          owner-only and sits below a wall of branding fields — so for an
          admin there was no way to add one at all. It belongs with the
          account it protects.
        */}
        <PasskeyManager />
        <FaceUnlockManager />
      </div>
    </div>
  );
}
