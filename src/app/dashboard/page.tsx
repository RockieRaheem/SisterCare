"use client";

import { useState } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Link from "next/link";

const moods = [
  { emoji: "😊", label: "Good" },
  { emoji: "😴", label: "Tired" },
  { emoji: "😔", label: "Low" },
  { emoji: "🤩", label: "Energetic" },
];

export default function DashboardPage() {
  const [selectedMood, setSelectedMood] = useState<string | null>("Tired");

  // Mock data - in production this would come from Firebase
  const cycleData = {
    daysUntilPeriod: 5,
    hours: 14,
    minutes: 22,
    phase: "Luteal",
    nextDate: "March 15th",
    progress: 82,
  };

  return (
    <div className="layout-container flex flex-col min-h-screen">
      <Header variant="app" />

      <main className="flex-1 max-w-[1200px] mx-auto w-full px-6 py-8 pb-24 md:pb-8">
        {/* Page Heading */}
        <div className="flex flex-wrap justify-between gap-3 mb-8">
          <div className="flex min-w-72 flex-col gap-1">
            <p className="text-text-primary dark:text-white text-4xl font-black leading-tight tracking-tight">
              Welcome back, Sarah
            </p>
            <p className="text-text-secondary text-lg font-normal leading-normal">
              Your health and emotional well-being at a glance.
            </p>
          </div>
          <div className="flex items-end">
            <Link href="/chat">
              <Button icon="chat_bubble">Support Chat</Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Tracking Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Timer & Status Section */}
            <Card padding="lg">
              <div className="flex flex-col items-center text-center">
                <span className="bg-primary/10 text-primary px-4 py-1 rounded-full text-sm font-bold mb-4 uppercase tracking-wider">
                  Current Phase: {cycleData.phase}
                </span>
                <h2 className="text-text-primary dark:text-white text-2xl font-bold mb-6">
                  Days until your next period
                </h2>

                {/* Timer Component */}
                <div className="flex gap-4 w-full max-w-md mx-auto">
                  <div className="flex grow basis-0 flex-col items-stretch gap-2">
                    <div className="flex h-16 items-center justify-center rounded-xl bg-border-light dark:bg-border-dark">
                      <p className="text-primary text-2xl font-black">
                        {String(cycleData.daysUntilPeriod).padStart(2, "0")}
                      </p>
                    </div>
                    <p className="text-text-secondary text-xs font-bold uppercase">
                      Days
                    </p>
                  </div>
                  <div className="flex grow basis-0 flex-col items-stretch gap-2">
                    <div className="flex h-16 items-center justify-center rounded-xl bg-border-light dark:bg-border-dark">
                      <p className="text-text-primary dark:text-white text-2xl font-black">
                        {String(cycleData.hours).padStart(2, "0")}
                      </p>
                    </div>
                    <p className="text-text-secondary text-xs font-bold uppercase">
                      Hours
                    </p>
                  </div>
                  <div className="flex grow basis-0 flex-col items-stretch gap-2">
                    <div className="flex h-16 items-center justify-center rounded-xl bg-border-light dark:bg-border-dark">
                      <p className="text-text-primary dark:text-white text-2xl font-black">
                        {String(cycleData.minutes).padStart(2, "0")}
                      </p>
                    </div>
                    <p className="text-text-secondary text-xs font-bold uppercase">
                      Mins
                    </p>
                  </div>
                </div>

                <p className="text-text-secondary text-base font-medium mt-6">
                  Next cycle expected on {cycleData.nextDate}
                </p>
                <div className="w-full bg-border-light dark:bg-border-dark h-2 rounded-full mt-6 overflow-hidden">
                  <div
                    className="bg-primary h-full transition-all"
                    style={{ width: `${cycleData.progress}%` }}
                  />
                </div>
              </div>
            </Card>

            {/* Daily Check-in */}
            <Card>
              <h2 className="text-text-primary dark:text-white text-xl font-bold mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">
                  edit_note
                </span>
                Your Daily Check-in
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {moods.map((mood) => (
                  <button
                    key={mood.label}
                    onClick={() => setSelectedMood(mood.label)}
                    className={`flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                      selectedMood === mood.label
                        ? "border-primary bg-primary/10"
                        : "border-transparent bg-background-light dark:bg-background-dark hover:border-primary"
                    }`}
                  >
                    <span className="text-3xl">{mood.emoji}</span>
                    <span className="text-sm font-semibold">{mood.label}</span>
                  </button>
                ))}
              </div>
              <div className="mt-6">
                <Button variant="secondary" fullWidth>
                  Log Detailed Symptoms
                </Button>
              </div>
            </Card>
          </div>

          {/* Side Column */}
          <div className="space-y-8">
            {/* Daily Tip Card */}
            <div className="bg-border-light dark:bg-border-dark p-6 rounded-2xl relative overflow-hidden group">
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-3">
                  <span className="material-symbols-outlined text-primary">
                    lightbulb
                  </span>
                  <span className="text-primary font-bold uppercase text-xs tracking-widest">
                    Daily Tip
                  </span>
                </div>
                <h3 className="text-text-primary dark:text-white text-lg font-bold mb-2">
                  Rest and Hydrate
                </h3>
                <p className="text-text-secondary text-sm leading-relaxed">
                  During the luteal phase, your body temperature rises slightly.
                  Drinking more water and ensuring 8 hours of sleep can help
                  manage PMS symptoms effectively.
                </p>
              </div>
              <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-8xl">spa</span>
              </div>
            </div>

            {/* Mood Progress */}
            <Card>
              <h3 className="text-text-primary dark:text-white font-bold mb-4">
                Weekly Mood Summary
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-text-secondary">Calm</span>
                    <span className="font-bold">65%</span>
                  </div>
                  <div className="w-full bg-background-light dark:bg-background-dark h-2 rounded-full">
                    <div className="bg-emerald-400 h-full w-[65%] rounded-full" />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-text-secondary">Active</span>
                    <span className="font-bold">20%</span>
                  </div>
                  <div className="w-full bg-background-light dark:bg-background-dark h-2 rounded-full">
                    <div className="bg-orange-400 h-full w-[20%] rounded-full" />
                  </div>
                </div>
              </div>
              <button className="w-full mt-6 text-sm text-primary font-semibold hover:underline">
                View detailed insights
              </button>
            </Card>

            {/* Community Highlight */}
            <div className="bg-primary p-6 rounded-2xl text-white shadow-primary-lg">
              <div className="flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined">groups</span>
                <span className="font-bold uppercase text-xs tracking-widest">
                  Community
                </span>
              </div>
              <p className="text-sm italic mb-4">
                &quot;You&apos;re not alone. Join over 500 sisters discussing
                &apos;Managing Work-Life Balance&apos; today.&quot;
              </p>
              <button className="w-full bg-white text-primary py-2 rounded-lg font-bold text-sm">
                Join the Conversation
              </button>
            </div>
          </div>
        </div>
      </main>

      <Footer variant="app" />
    </div>
  );
}
