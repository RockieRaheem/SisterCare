"use client";

import { useState, useEffect, useRef, useId } from "react";
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

  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const titleId = useId();

  // Handle escape key and focus management
  useEffect(() => {
    if (!isOpen) return;

    // Store the currently focused element to restore later
    previousActiveElement.current = document.activeElement as HTMLElement;

    // Focus the modal
    modalRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }

      // Trap focus within modal
      if (e.key === "Tab") {
        const focusableElements =
          modalRef.current?.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
          );
        if (!focusableElements || focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    // Prevent body scroll when modal is open
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
      // Restore focus when modal closes
      previousActiveElement.current?.focus();
    };
  }, [isOpen, onClose]);

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
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="presentation"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative bg-white dark:bg-card-dark rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden animate-fade-in focus:outline-none"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-card-dark border-b border-gray-200 dark:border-gray-700 px-6 py-4 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2
                id={titleId}
                className="text-xl font-bold text-text-primary dark:text-white flex items-center gap-2"
              >
                <span
                  className="material-symbols-outlined text-primary"
                  aria-hidden="true"
                >
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
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              aria-label="Close dialog"
            >
              <span className="material-symbols-outlined" aria-hidden="true">
                close
              </span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-140px)] p-6 space-y-6">
          {/* Overall Mood */}
          <section aria-labelledby="mood-heading">
            <h3
              id="mood-heading"
              className="text-sm font-semibold text-text-primary dark:text-white mb-3 flex items-center gap-2"
            >
              <span
                className="material-symbols-outlined text-lg text-primary"
                aria-hidden="true"
              >
                mood
              </span>
              Overall Mood
            </h3>
            <div
              className="flex flex-wrap gap-2"
              role="radiogroup"
              aria-labelledby="mood-heading"
            >
              {moodOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setMood(option.value)}
                  role="radio"
                  aria-checked={mood === option.value}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full border-2 transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                    mood === option.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-gray-200 dark:border-gray-700 hover:border-primary/50"
                  }`}
                >
                  <span className="text-xl" aria-hidden="true">
                    {option.emoji}
                  </span>
                  <span className="text-sm font-medium">{option.label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Flow Level (for menstrual phase) */}
          <section aria-labelledby="flow-heading">
            <h3
              id="flow-heading"
              className="text-sm font-semibold text-text-primary dark:text-white mb-3 flex items-center gap-2"
            >
              <span
                className="material-symbols-outlined text-lg text-primary"
                aria-hidden="true"
              >
                water_drop
              </span>
              Flow Level
            </h3>
            <div
              className="flex flex-wrap gap-2"
              role="radiogroup"
              aria-labelledby="flow-heading"
            >
              {flowLevels.map((level) => (
                <button
                  key={level.id}
                  onClick={() =>
                    setFlowLevel(level.id as SymptomLogData["flowLevel"])
                  }
                  role="radio"
                  aria-checked={flowLevel === level.id}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full border-2 transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                    flowLevel === level.id
                      ? "border-primary bg-primary/10"
                      : "border-gray-200 dark:border-gray-700 hover:border-primary/50"
                  }`}
                >
                  <span
                    className={`w-3 h-3 rounded-full ${level.color}`}
                    aria-hidden="true"
                  />
                  <span className="text-sm font-medium">{level.label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Pain Level */}
          <section aria-labelledby="pain-heading">
            <h3
              id="pain-heading"
              className="text-sm font-semibold text-text-primary dark:text-white mb-3 flex items-center gap-2"
            >
              <span
                className="material-symbols-outlined text-lg text-primary"
                aria-hidden="true"
              >
                healing
              </span>
              Pain Level
              <span
                className="ml-auto text-primary font-bold"
                aria-hidden="true"
              >
                {painLevel}/10
              </span>
            </h3>
            <div className="flex items-center gap-3">
              <span className="text-xl" aria-hidden="true">
                😊
              </span>
              <input
                type="range"
                min="0"
                max="10"
                value={painLevel}
                onChange={(e) => setPainLevel(Number(e.target.value))}
                aria-label={`Pain level: ${painLevel} out of 10`}
                aria-valuemin={0}
                aria-valuemax={10}
                aria-valuenow={painLevel}
                aria-valuetext={
                  painLevel === 0
                    ? "No pain"
                    : painLevel <= 3
                      ? "Mild pain"
                      : painLevel <= 6
                        ? "Moderate pain"
                        : "Severe pain"
                }
                className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              />
              <span className="text-xl" aria-hidden="true">
                😣
              </span>
            </div>
            <div
              className="flex justify-between text-xs text-text-secondary mt-1 px-6"
              aria-hidden="true"
            >
              <span>No pain</span>
              <span>Moderate</span>
              <span>Severe</span>
            </div>
          </section>

          {/* Symptoms by Category */}
          <section aria-labelledby="symptoms-heading">
            <h3
              id="symptoms-heading"
              className="text-sm font-semibold text-text-primary dark:text-white mb-3 flex items-center gap-2"
            >
              <span
                className="material-symbols-outlined text-lg text-primary"
                aria-hidden="true"
              >
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
            <div
              className="flex gap-2 mb-4 overflow-x-auto pb-2"
              role="tablist"
              aria-label="Symptom categories"
            >
              {symptomCategories.map((category, index) => (
                <button
                  key={category.name}
                  onClick={() => setActiveCategory(index)}
                  role="tab"
                  aria-selected={activeCategory === index}
                  aria-controls={`symptoms-panel-${index}`}
                  id={`symptoms-tab-${index}`}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                    activeCategory === index
                      ? "bg-primary text-white"
                      : "bg-gray-100 dark:bg-gray-800 text-text-secondary hover:bg-gray-200 dark:hover:bg-gray-700"
                  }`}
                >
                  <span
                    className="material-symbols-outlined text-sm"
                    aria-hidden="true"
                  >
                    {category.icon}
                  </span>
                  {category.name}
                </button>
              ))}
            </div>

            {/* Symptoms Grid */}
            <div
              role="tabpanel"
              id={`symptoms-panel-${activeCategory}`}
              aria-labelledby={`symptoms-tab-${activeCategory}`}
              className="grid grid-cols-2 sm:grid-cols-3 gap-2"
            >
              {symptomCategories[activeCategory].symptoms.map((symptom) => (
                <button
                  key={symptom.id}
                  onClick={() => toggleSymptom(symptom.id)}
                  role="checkbox"
                  aria-checked={selectedSymptoms.includes(symptom.id)}
                  className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all text-left focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                    selectedSymptoms.includes(symptom.id)
                      ? "border-primary bg-primary/10"
                      : "border-gray-200 dark:border-gray-700 hover:border-primary/50"
                  }`}
                >
                  <span className="text-xl" aria-hidden="true">
                    {symptom.emoji}
                  </span>
                  <span className="text-sm font-medium">{symptom.label}</span>
                  {selectedSymptoms.includes(symptom.id) && (
                    <span
                      className="material-symbols-outlined text-primary text-sm ml-auto"
                      aria-hidden="true"
                    >
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
              <h3
                id="sleep-heading"
                className="text-sm font-semibold text-text-primary dark:text-white mb-3 flex items-center gap-2"
              >
                <span
                  className="material-symbols-outlined text-lg text-primary"
                  aria-hidden="true"
                >
                  bedtime
                </span>
                Sleep Quality
              </h3>
              <div
                className="flex gap-1"
                role="radiogroup"
                aria-labelledby="sleep-heading"
              >
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setSleepQuality(star)}
                    role="radio"
                    aria-checked={sleepQuality === star}
                    aria-label={`${star} star${star > 1 ? "s" : ""}`}
                    className="p-1 transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded"
                  >
                    <span
                      className={`material-symbols-outlined text-2xl ${
                        star <= sleepQuality
                          ? "text-amber-400"
                          : "text-gray-300 dark:text-gray-600"
                      }`}
                      aria-hidden="true"
                    >
                      {star <= sleepQuality ? "star" : "star"}
                    </span>
                  </button>
                ))}
              </div>
              <p className="sr-only">
                Current sleep quality: {sleepQuality} out of 5 stars
              </p>
            </div>

            <div>
              <h3
                id="energy-heading"
                className="text-sm font-semibold text-text-primary dark:text-white mb-3 flex items-center gap-2"
              >
                <span
                  className="material-symbols-outlined text-lg text-primary"
                  aria-hidden="true"
                >
                  bolt
                </span>
                Energy Level
              </h3>
              <div
                className="flex gap-1"
                role="radiogroup"
                aria-labelledby="energy-heading"
              >
                {[1, 2, 3, 4, 5].map((level) => (
                  <button
                    key={level}
                    onClick={() => setEnergyLevel(level)}
                    role="radio"
                    aria-checked={energyLevel === level}
                    aria-label={`Energy level ${level}`}
                    className="p-1 transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded"
                  >
                    <span
                      className={`material-symbols-outlined text-2xl ${
                        level <= energyLevel
                          ? "text-green-500"
                          : "text-gray-300 dark:text-gray-600"
                      }`}
                      aria-hidden="true"
                    >
                      bolt
                    </span>
                  </button>
                ))}
              </div>
              <p className="sr-only">
                Current energy level: {energyLevel} out of 5
              </p>
            </div>
          </section>

          {/* Notes */}
          <section>
            <label
              htmlFor="additional-notes"
              className="text-sm font-semibold text-text-primary dark:text-white mb-3 flex items-center gap-2"
            >
              <span
                className="material-symbols-outlined text-lg text-primary"
                aria-hidden="true"
              >
                edit_note
              </span>
              Additional Notes
            </label>
            <textarea
              id="additional-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any other observations, triggers, or things you want to remember..."
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-background-light dark:bg-background-dark text-text-primary dark:text-white placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 resize-none"
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
