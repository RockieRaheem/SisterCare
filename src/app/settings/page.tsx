"use client";

import { useState } from "react";
import Header from "@/components/layout/Header";
import Card from "@/components/ui/Card";
import Toggle from "@/components/ui/Toggle";
import Button from "@/components/ui/Button";

export default function SettingsPage() {
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [inAppNotifications, setInAppNotifications] = useState(false);
  const [encryption, setEncryption] = useState(true);

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col overflow-x-hidden bg-background-light dark:bg-background-dark">
      <Header variant="app" />

      <main className="flex-1 max-w-[960px] mx-auto w-full px-4 md:px-10 py-8">
        {/* Page Header */}
        <div className="flex flex-wrap justify-between gap-3 mb-8">
          <div className="flex min-w-72 flex-col gap-3">
            <h1 className="text-text-primary dark:text-white text-4xl font-black leading-tight tracking-tight">
              Settings & Privacy Controls
            </h1>
            <p className="text-text-secondary text-base font-normal leading-normal">
              Manage your preferences, cycle data, and security.
            </p>
          </div>
        </div>

        {/* Reminder Preferences */}
        <h2 className="text-text-primary dark:text-white text-[22px] font-bold leading-tight tracking-tight pb-3 pt-4">
          Reminder Preferences
        </h2>

        <div className="space-y-4 mb-8">
          <Card>
            <Toggle
              checked={emailNotifications}
              onChange={setEmailNotifications}
              label="Email Notifications"
              description="Receive monthly cycle predictions and health tips via email."
            />
          </Card>

          <Card>
            <Toggle
              checked={inAppNotifications}
              onChange={setInAppNotifications}
              label="In-App Notifications"
              description="Real-time alerts for symptom tracking and emotional check-ins."
            />
          </Card>
        </div>

        {/* Cycle Calibration */}
        <h2 className="text-text-primary dark:text-white text-[22px] font-bold leading-tight tracking-tight pb-3 pt-6">
          Cycle Calibration
        </h2>

        <Card className="mb-8">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <p className="text-text-primary dark:text-white text-base font-bold leading-tight">
                Data Adjustment
              </p>
              <p className="text-text-secondary text-base font-normal leading-normal">
                Recalculate your predictions based on your historical cycle data
                from the last 12 months.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 mt-2">
              <Button>Start Calibration</Button>
              <Button variant="secondary">Clear History</Button>
            </div>
          </div>
        </Card>

        {/* Privacy & Data */}
        <h2 className="text-red-600 dark:text-red-400 text-[22px] font-bold leading-tight tracking-tight pb-3 pt-6">
          Privacy & Data
        </h2>

        <div className="space-y-4">
          <Card>
            <Toggle
              checked={encryption}
              onChange={setEncryption}
              label="End-to-End Encryption"
              description="Ensure your health data is only visible to you. Key-based security."
            />
          </Card>

          <div className="flex flex-col gap-4 rounded-xl border border-red-200 dark:border-red-900/30 bg-red-50/50 dark:bg-red-900/10 p-5">
            <div className="flex flex-col gap-1">
              <p className="text-red-700 dark:text-red-400 text-base font-bold leading-tight">
                Dangerous Territory
              </p>
              <p className="text-text-secondary text-base font-normal leading-normal">
                Once deleted, your cycle history and account cannot be
                recovered. Please use caution.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                className="!border-red-200 dark:!border-red-900/40 !text-red-600 hover:!bg-red-50 dark:hover:!bg-red-900/20"
              >
                Delete My Account
              </Button>
              <Button variant="secondary">Download My Data</Button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-20 border-t border-border-light dark:border-border-dark py-10">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2 text-primary/60">
              <span className="material-symbols-outlined">verified_user</span>
              <span className="text-sm font-medium">
                HIPAA Compliant Data Storage
              </span>
            </div>
            <div className="flex gap-6">
              <a
                className="text-xs text-text-secondary hover:underline"
                href="#"
              >
                Privacy Policy
              </a>
              <a
                className="text-xs text-text-secondary hover:underline"
                href="#"
              >
                Terms of Service
              </a>
              <a
                className="text-xs text-text-secondary hover:underline"
                href="#"
              >
                Contact Support
              </a>
            </div>
            <p className="text-xs text-text-secondary">
              © 2026 SisterCare. All rights reserved.
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}
