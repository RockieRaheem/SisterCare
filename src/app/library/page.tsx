"use client";

import { useState } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Card from "@/components/ui/Card";

const categories = [
  { id: "all", label: "All Advice", icon: "library_books", active: true },
  { id: "comfort", label: "Comfort & Hygiene", icon: "spa", active: false },
  {
    id: "emotional",
    label: "Emotional Well-being",
    icon: "sentiment_satisfied",
    active: false,
  },
  {
    id: "medical",
    label: "When to See a Doctor",
    icon: "medical_services",
    active: false,
  },
  { id: "saved", label: "Saved Articles", icon: "bookmark", active: false },
];

const filters = [
  "Latest",
  "Most Popular",
  "Beginner's Guide",
  "Self-care Tips",
  "Nutrition",
];

const articles = [
  {
    id: 1,
    title: "Managing Period Cramps: Natural Remedies",
    description:
      "Learn effective ways to soothe discomfort through heat therapy, gentle movement, and hydration.",
    category: "Comfort",
    readTime: "5 min read",
    image:
      "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&h=300&fit=crop",
  },
  {
    id: 2,
    title: "Mindfulness Practices for PMS",
    description:
      "How to navigate emotional shifts with self-compassion and grounding techniques.",
    category: "Well-being",
    readTime: "8 min read",
    image:
      "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400&h=300&fit=crop",
  },
  {
    id: 3,
    title: "Choosing the Right Sustainable Products",
    description:
      "A comprehensive guide to cups, discs, and period underwear for every lifestyle.",
    category: "Hygiene",
    readTime: "4 min read",
    image:
      "https://images.unsplash.com/photo-1526256262350-7da7584cf5eb?w=400&h=300&fit=crop",
  },
  {
    id: 4,
    title: "Signs of Hormonal Imbalance",
    description:
      "Understanding your body's signals and when it's time to consult a specialist.",
    category: "Medical",
    readTime: "10 min read",
    image:
      "https://images.unsplash.com/photo-1559757175-5700dde675bc?w=400&h=300&fit=crop",
  },
  {
    id: 5,
    title: "The Science of Menstrual Cycles",
    description:
      "Deep dive into the follicular, ovulatory, and luteal phases of your cycle.",
    category: "Education",
    readTime: "12 min read",
    image:
      "https://images.unsplash.com/photo-1532153975070-2e9ab71f1b14?w=400&h=300&fit=crop",
  },
  {
    id: 6,
    title: "Journaling for Mental Clarity",
    description:
      "Daily prompts to help track your mood and identify patterns in your emotional health.",
    category: "Self-Care",
    readTime: "6 min read",
    image:
      "https://images.unsplash.com/photo-1517842645767-c639042777db?w=400&h=300&fit=crop",
  },
];

export default function LibraryPage() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeFilter, setActiveFilter] = useState("Latest");

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden">
      <Header variant="app" />

      <main className="flex-1 flex max-w-[1440px] mx-auto w-full px-6 md:px-20 py-8 gap-10">
        {/* Sidebar Navigation */}
        <aside className="hidden lg:flex flex-col w-64 gap-8 shrink-0">
          <div className="flex flex-col gap-2">
            <h3 className="text-text-primary dark:text-white text-base font-bold px-3 mb-2">
              Library
            </h3>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${
                  activeCategory === cat.id
                    ? "bg-primary text-white shadow-primary-sm"
                    : "hover:bg-primary/5 dark:hover:bg-primary/10"
                }`}
              >
                <span
                  className={`material-symbols-outlined ${activeCategory === cat.id ? "" : "text-primary"}`}
                >
                  {cat.icon}
                </span>
                <p
                  className={`text-sm font-${activeCategory === cat.id ? "semibold" : "medium"}`}
                >
                  {cat.label}
                </p>
              </button>
            ))}
          </div>

          <div className="mt-auto p-4 bg-primary/10 dark:bg-primary/20 rounded-xl">
            <p className="text-primary font-bold text-sm mb-1">
              Need urgent help?
            </p>
            <p className="text-xs text-text-secondary mb-3">
              Our 24/7 support line is always available for you.
            </p>
            <button className="w-full bg-primary text-white py-2 rounded-lg text-xs font-bold hover:bg-primary/90 transition-opacity">
              Contact Support
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col gap-6">
          {/* Page Heading */}
          <div className="flex flex-col gap-2">
            <h1 className="text-text-primary dark:text-white text-4xl font-black leading-tight tracking-tight">
              Guidance & Advice Library
            </h1>
            <p className="text-text-secondary text-lg font-normal leading-normal max-w-2xl">
              Explore expert-backed articles and daily tips designed to support
              your menstrual health and emotional well-being.
            </p>
          </div>

          {/* Chips Filter */}
          <div className="flex gap-3 py-2 flex-wrap">
            {filters.map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`flex h-10 shrink-0 items-center justify-center gap-x-2 rounded-full px-5 cursor-pointer transition-all ${
                  activeFilter === filter
                    ? "bg-primary/10 dark:bg-primary/20 border border-primary/20 text-primary font-bold"
                    : "bg-white dark:bg-background-dark border border-gray-200 dark:border-white/10 text-text-primary dark:text-white font-medium hover:bg-primary/5"
                }`}
              >
                <p className="text-sm">{filter}</p>
              </button>
            ))}
          </div>

          {/* Content Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pt-4">
            {articles.map((article) => (
              <Card
                key={article.id}
                padding="none"
                hover
                className="flex flex-col gap-4 overflow-hidden"
              >
                <div className="relative overflow-hidden aspect-[16/10] bg-center bg-no-repeat bg-cover bg-gradient-to-br from-primary/20 to-purple-200 dark:from-primary/30 dark:to-purple-900/50">
                  <div className="absolute top-4 left-4 bg-white/90 dark:bg-black/50 backdrop-blur-md px-3 py-1 rounded-lg">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                      {article.category}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-2 p-4 pt-0">
                  <h3 className="text-text-primary dark:text-white text-lg font-bold leading-snug group-hover:text-primary transition-colors">
                    {article.title}
                  </h3>
                  <p className="text-text-secondary text-sm font-normal line-clamp-2">
                    {article.description}
                  </p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-primary/60 text-xs font-semibold flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">
                        schedule
                      </span>{" "}
                      {article.readTime}
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Load More Button */}
          <div className="flex justify-center py-10">
            <button className="px-8 py-3 rounded-xl border-2 border-primary text-primary font-bold hover:bg-primary hover:text-white transition-all">
              Load More Articles
            </button>
          </div>
        </div>
      </main>

      <Footer variant="app" />
    </div>
  );
}
