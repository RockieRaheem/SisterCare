"use client";

import { useState } from "react";
import Button from "./Button";

interface SymptomLoggerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: SymptomLogData) => Promise<void>;
  currentPhase?: string;
}

export interface SymptomLogData {
  date: Date;
  symptoms: string[];
  painLevel: number;
  flowLevel?: "light" | "medium" | "heavy" | "spotting" | "none";
  mood: string;
  notes: string;
  sleepQuality?: number;
  energyLevel?: number;
}

const symptomCategories = [
  {
    name: "Physical",
    icon: "body_system",
    symptoms: [
      { id: "cramps", label: "Cramps", emoji: "😣" },
      { id: "bloating", label: "Bloating", emoji: "🫃" },
      { id: "headache", label: "Headache", emoji: "🤕" },
      { id: "backache", label: "Back Pain", emoji: "😮‍💨" },
      { id: "breast_tenderness", label: "Breast Tenderness", emoji: "💔" },
      { id: "fatigue", label: "Fatigue", emoji: "😴" },
      { id: "nausea", label: "Nausea", emoji: "🤢" },
      { id: "acne", label: "Acne/Skin Issues", emoji: "😖" },
    ],
  },
  {
    name: "Digestive",
    icon: "gastroenterology",
    symptoms: [
      { id: "appetite_increase", label: "Increased Appetite", emoji: "🍽️" },
      { id: "appetite_decrease", label: "Decreased Appetite", emoji: "🚫" },
      { id: "cravings", label: "Food Cravings", emoji: "🍫" },
      { id: "constipation", label: "Constipation", emoji: "😬" },
      { id: "diarrhea", label: "Diarrhea", emoji: "💨" },
    ],
  },
  {
    name: "Emotional",
    icon: "psychology",
    symptoms: [
      { id: "mood_swings", label: "Mood Swings", emoji: "🎭" },
      { id: "anxiety", label: "Anxiety", emoji: "😰" },
      { id: "irritability", label: "Irritability", emoji: "😤" },
      { id: "sadness", label: "Sadness", emoji: "😢" },
      { id: "sensitivity", label: "Emotional Sensitivity", emoji: "🥺" },
      { id: "brain_fog", label: "Brain Fog", emoji: "🌫️" },
    ],
  },
];

const flowLevels = [
  { id: "none", label: "None", color: "bg-gray-200 dark:bg-gray-700" },
  { id: "spotting", label: "Spotting", color: "bg-pink-200" },
  { id: "light", label: "Light", color: "bg-red-300" },
  { id: "medium", label: "Medium", color: "bg-red-500" },
  { id: "heavy", label: "Heavy", color: "bg-red-700" },
];

const moodOptions = [
  { value: "great", emoji: "🤩", label: "Great" },
  { value: "good", emoji: "😊", label: "Good" },
  { value: "okay", emoji: "😐", label: "Okay" },
  { value: "low", emoji: "😔", label: "Low" },
  { value: "stressed", emoji: "😰", label: "Stressed" },
];

export default function SymptomLoggerModal({
  isOpen,
  onClose,
  onSave,
  currentPhase,
}: SymptomLoggerModalProps) {
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [painLevel, setPainLevel] = useState(0);
  const [flowLevel, setFlowLevel] =
    useState<SymptomLogData["flowLevel"]>("none");
  const [mood, setMood] = useState("");
  const [notes, setNotes] = useState("");
  const [sleepQuality, setSleepQuality] = useState(3);
  const [energyLevel, setEnergyLevel] = useState(3);
  const [saving, setSaving] = useState(false);
  const [activeCategory, setActiveCategory] = useState(0);

  const toggleSymptom = (symptomId: string) => {
    setSelectedSymptoms((prev) =>
      prev.includes(symptomId)
        ? prev.filter((s) => s !== symptomId)
        : [...prev, symptomId],
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        date: new Date(),
        symptoms: selectedSymptoms,
        painLevel,
        flowLevel,
        mood,
        notes,
        sleepQuality,
        energyLevel,
      });
      // Reset form
      setSelectedSymptoms([]);
      setPainLevel(0);
      setFlowLevel("none");
      setMood("");
      setNotes("");
      setSleepQuality(3);
      setEnergyLevel(3);
      onClose();
    } catch (error) {
      console.error("Error saving symptoms:", error);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-card-dark rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-card-dark border-b border-gray-200 dark:border-gray-700 px-6 py-4 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-text-primary dark:text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">
                  medical_information
                </span>
                Log Your Symptoms
              </h2>
              <p className="text-sm text-text-secondary mt-1">
                {currentPhase && (
                  <span className="capitalize">
                    Current phase:{" "}
                    <span className="font-medium text-primary">
                      {currentPhase}
                    </span>
                  </span>
                )}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-140px)] p-6 space-y-6">
          {/* Overall Mood */}
          <section>
            <h3 className="text-sm font-semibold text-text-primary dark:text-white mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-lg text-primary">
                mood
              </span>
              Overall Mood
            </h3>
            <div className="flex flex-wrap gap-2">
              {moodOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setMood(option.value)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full border-2 transition-all ${
                    mood === option.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-gray-200 dark:border-gray-700 hover:border-primary/50"
                  }`}
                >
                  <span className="text-xl">{option.emoji}</span>
                  <span className="text-sm font-medium">{option.label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Flow Level (for menstrual phase) */}
          <section>
            <h3 className="text-sm font-semibold text-text-primary dark:text-white mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-lg text-primary">
                water_drop
              </span>
              Flow Level
            </h3>
            <div className="flex flex-wrap gap-2">
              {flowLevels.map((level) => (
                <button
                  key={level.id}
                  onClick={() =>
                    setFlowLevel(level.id as SymptomLogData["flowLevel"])
                  }
                  className={`flex items-center gap-2 px-4 py-2 rounded-full border-2 transition-all ${
                    flowLevel === level.id
                      ? "border-primary bg-primary/10"
                      : "border-gray-200 dark:border-gray-700 hover:border-primary/50"
                  }`}
                >
                  <span className={`w-3 h-3 rounded-full ${level.color}`} />
                  <span className="text-sm font-medium">{level.label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Pain Level */}
          <section>
            <h3 className="text-sm font-semibold text-text-primary dark:text-white mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-lg text-primary">
                healing
              </span>
              Pain Level
              <span className="ml-auto text-primary font-bold">
                {painLevel}/10
              </span>
            </h3>
            <div className="flex items-center gap-3">
              <span className="text-xl">😊</span>
              <input
                type="range"
                min="0"
                max="10"
                value={painLevel}
                onChange={(e) => setPainLevel(Number(e.target.value))}
                className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <span className="text-xl">😣</span>
            </div>
            <div className="flex justify-between text-xs text-text-secondary mt-1 px-6">
              <span>No pain</span>
              <span>Moderate</span>
              <span>Severe</span>
            </div>
          </section>

          {/* Symptoms by Category */}
          <section>
            <h3 className="text-sm font-semibold text-text-primary dark:text-white mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-lg text-primary">
                checklist
              </span>
              Symptoms
              {selectedSymptoms.length > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs">
                  {selectedSymptoms.length} selected
                </span>
              )}
            </h3>

            {/* Category Tabs */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
              {symptomCategories.map((category, index) => (
                <button
                  key={category.name}
                  onClick={() => setActiveCategory(index)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all ${
                    activeCategory === index
                      ? "bg-primary text-white"
                      : "bg-gray-100 dark:bg-gray-800 text-text-secondary hover:bg-gray-200 dark:hover:bg-gray-700"
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">
                    {category.icon}
                  </span>
                  {category.name}
                </button>
              ))}
            </div>

            {/* Symptoms Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {symptomCategories[activeCategory].symptoms.map((symptom) => (
                <button
                  key={symptom.id}
                  onClick={() => toggleSymptom(symptom.id)}
                  className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all text-left ${
                    selectedSymptoms.includes(symptom.id)
                      ? "border-primary bg-primary/10"
                      : "border-gray-200 dark:border-gray-700 hover:border-primary/50"
                  }`}
                >
                  <span className="text-xl">{symptom.emoji}</span>
                  <span className="text-sm font-medium">{symptom.label}</span>
                  {selectedSymptoms.includes(symptom.id) && (
                    <span className="material-symbols-outlined text-primary text-sm ml-auto">
                      check
                    </span>
                  )}
                </button>
              ))}
            </div>
          </section>

          {/* Sleep & Energy */}
          <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-semibold text-text-primary dark:text-white mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-lg text-primary">
                  bedtime
                </span>
                Sleep Quality
              </h3>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setSleepQuality(star)}
                    className="p-1 transition-transform hover:scale-110"
                  >
                    <span
                      className={`material-symbols-outlined text-2xl ${
                        star <= sleepQuality
                          ? "text-amber-400"
                          : "text-gray-300 dark:text-gray-600"
                      }`}
                    >
                      {star <= sleepQuality ? "star" : "star"}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-text-primary dark:text-white mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-lg text-primary">
                  bolt
                </span>
                Energy Level
              </h3>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((level) => (
                  <button
                    key={level}
                    onClick={() => setEnergyLevel(level)}
                    className="p-1 transition-transform hover:scale-110"
                  >
                    <span
                      className={`material-symbols-outlined text-2xl ${
                        level <= energyLevel
                          ? "text-green-500"
                          : "text-gray-300 dark:text-gray-600"
                      }`}
                    >
                      bolt
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Notes */}
          <section>
            <h3 className="text-sm font-semibold text-text-primary dark:text-white mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-lg text-primary">
                edit_note
              </span>
              Additional Notes
            </h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any other observations, triggers, or things you want to remember..."
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-background-light dark:bg-background-dark text-text-primary dark:text-white placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
              rows={3}
            />
          </section>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white dark:bg-card-dark border-t border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex gap-3">
            <Button variant="secondary" onClick={onClose} fullWidth>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} fullWidth>
              {saving ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-sm">
                    save
                  </span>
                  Save Symptoms
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
