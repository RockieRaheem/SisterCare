"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Card from "@/components/ui/Card";
import Link from "next/link";

interface Article {
  id: number;
  title: string;
  description: string;
  category: string;
  categoryId: string;
  readTime: string;
  tags: string[];
  content: string;
}

const categories = [
  { id: "all", label: "All Advice", icon: "library_books" },
  { id: "comfort", label: "Comfort & Hygiene", icon: "spa" },
  {
    id: "emotional",
    label: "Emotional Well-being",
    icon: "sentiment_satisfied",
  },
  { id: "medical", label: "When to See a Doctor", icon: "medical_services" },
  { id: "nutrition", label: "Nutrition & Diet", icon: "restaurant" },
];

const articles: Article[] = [
  {
    id: 1,
    title: "Managing Period Cramps: Natural Remedies",
    description:
      "Learn effective ways to soothe discomfort through heat therapy, gentle movement, and hydration. These techniques have been used by women for generations.",
    category: "Comfort & Hygiene",
    categoryId: "comfort",
    readTime: "5 min read",
    tags: ["Self-care Tips", "Beginner's Guide"],
    content:
      "Period cramps, medically known as dysmenorrhea, affect most women at some point. Here are proven natural remedies:\n\n1. Heat Therapy: Apply a hot water bottle or heating pad to your lower abdomen. Heat helps relax the uterine muscles and increase blood flow.\n\n2. Gentle Exercise: Light walking or yoga can release endorphins, your body's natural painkillers.\n\n3. Stay Hydrated: Drinking plenty of water can actually reduce bloating and ease cramps.\n\n4. Herbal Teas: Ginger, chamomile, and peppermint teas have anti-inflammatory properties.\n\n5. Massage: Gently massaging your lower abdomen with essential oils like lavender can provide relief.",
  },
  {
    id: 2,
    title: "Mindfulness Practices for PMS",
    description:
      "How to navigate emotional shifts with self-compassion and grounding techniques. Learn to manage mood swings effectively.",
    category: "Emotional Well-being",
    categoryId: "emotional",
    readTime: "8 min read",
    tags: ["Self-care Tips", "Most Popular"],
    content:
      "PMS can bring challenging emotional changes. Here's how mindfulness can help:\n\n1. Body Scan Meditation: Take 5-10 minutes to mentally scan your body, acknowledging sensations without judgment.\n\n2. Deep Breathing: When emotions feel overwhelming, try 4-7-8 breathing: inhale for 4 counts, hold for 7, exhale for 8.\n\n3. Journaling: Write down your feelings without editing. This can help process emotions.\n\n4. Self-Compassion: Remind yourself that mood changes are temporary and completely normal.\n\n5. Movement: Even a 10-minute walk can shift your emotional state.",
  },
  {
    id: 3,
    title: "Choosing the Right Menstrual Products",
    description:
      "A comprehensive guide to pads, tampons, cups, and period underwear. Find what works best for your lifestyle in Uganda.",
    category: "Comfort & Hygiene",
    categoryId: "comfort",
    readTime: "6 min read",
    tags: ["Beginner's Guide", "Latest"],
    content:
      "Finding the right menstrual products is important for your comfort:\n\n1. Disposable Pads: Most common and widely available in Uganda. Good for beginners and heavy flow days.\n\n2. Reusable Pads: Eco-friendly option, can save money long-term. Wash and reuse.\n\n3. Menstrual Cups: Silicone cups that collect blood. Can last up to 10 years with proper care.\n\n4. Period Underwear: Absorbent underwear that can be washed and reused.\n\n5. Tampons: Inserted internally, good for swimming and sports.\n\nConsider your lifestyle, budget, and comfort when choosing.",
  },
  {
    id: 4,
    title: "When to See a Doctor About Your Period",
    description:
      "Understanding your body's signals and when it's time to consult a healthcare professional about menstrual health.",
    category: "Medical",
    categoryId: "medical",
    readTime: "7 min read",
    tags: ["Most Popular"],
    content:
      "While some discomfort is normal, certain signs warrant medical attention:\n\n1. Very Heavy Bleeding: Soaking through a pad/tampon every hour for several hours.\n\n2. Severe Pain: Pain that doesn't improve with over-the-counter medication.\n\n3. Irregular Cycles: Periods that suddenly become very irregular after being regular.\n\n4. Missing Periods: No period for 3+ months (when not pregnant).\n\n5. Bleeding Between Periods: Unexpected spotting or bleeding.\n\n6. Periods Lasting More Than 7 Days: Unusually long periods.\n\nIn Uganda, visit your nearest health centre or hospital if you experience these symptoms.",
  },
  {
    id: 5,
    title: "Understanding Your Menstrual Cycle Phases",
    description:
      "Learn about the follicular, ovulatory, and luteal phases of your cycle and how they affect your body and mood.",
    category: "Emotional Well-being",
    categoryId: "emotional",
    readTime: "10 min read",
    tags: ["Beginner's Guide", "Latest"],
    content:
      "Your menstrual cycle has four main phases:\n\n1. Menstrual Phase (Days 1-5): Your period. Hormone levels are low. You may feel tired.\n\n2. Follicular Phase (Days 6-13): Energy rises as estrogen increases. Good time for new projects.\n\n3. Ovulation (Days 14-16): Peak energy and fertility. You may feel more social and confident.\n\n4. Luteal Phase (Days 17-28): Progesterone rises. Energy decreases, PMS symptoms may appear.\n\nTracking your cycle helps you understand your body and plan activities accordingly.",
  },
  {
    id: 6,
    title: "Foods That Help During Your Period",
    description:
      "Nutrition tips to reduce cramps, boost energy, and support your body during menstruation.",
    category: "Nutrition & Diet",
    categoryId: "nutrition",
    readTime: "5 min read",
    tags: ["Nutrition", "Self-care Tips"],
    content:
      "What you eat can affect how you feel during your period:\n\n1. Iron-Rich Foods: Dark leafy greens (sukuma wiki, spinach), beans, and meat help replace iron lost through bleeding.\n\n2. Omega-3 Foods: Fish, groundnuts, and seeds can reduce inflammation and cramps.\n\n3. Water-Rich Fruits: Watermelon, oranges, and cucumbers help with hydration.\n\n4. Complex Carbohydrates: Whole grains, sweet potatoes, and posho provide steady energy.\n\n5. Avoid: Excessive salt (causes bloating), caffeine (can worsen cramps), and sugary foods.\n\nEat regularly to maintain stable blood sugar levels.",
  },
  {
    id: 7,
    title: "Managing Stress and Anxiety",
    description:
      "Practical techniques for managing stress and anxiety that often accompany hormonal changes.",
    category: "Emotional Well-being",
    categoryId: "emotional",
    readTime: "6 min read",
    tags: ["Self-care Tips", "Most Popular"],
    content:
      "Stress and anxiety can worsen during certain phases of your cycle:\n\n1. Deep Breathing: Practice slow, deep breaths when feeling anxious.\n\n2. Physical Activity: Even a short walk can reduce stress hormones.\n\n3. Talk to Someone: Share your feelings with a trusted friend, family member, or counselor.\n\n4. Limit Caffeine: Too much coffee or tea can increase anxiety.\n\n5. Sleep: Aim for 7-9 hours of quality sleep.\n\n6. Create Routine: Regular meal times and sleep schedules help stabilize mood.\n\nRemember: If anxiety is severe, reach out to Sauti Helpline at 116.",
  },
  {
    id: 8,
    title: "Hygiene Tips During Your Period",
    description:
      "Essential hygiene practices to stay clean, comfortable, and healthy during menstruation.",
    category: "Comfort & Hygiene",
    categoryId: "comfort",
    readTime: "4 min read",
    tags: ["Beginner's Guide", "Latest"],
    content:
      "Good hygiene during your period prevents infections and keeps you comfortable:\n\n1. Change Products Regularly: Change pads every 4-6 hours, tampons every 4-8 hours.\n\n2. Wash Properly: Clean your genital area with water. Avoid harsh soaps.\n\n3. Wear Breathable Underwear: Cotton underwear allows air circulation.\n\n4. Dispose Properly: Wrap used pads in paper before disposing. Never flush.\n\n5. Wash Hands: Always wash hands before and after changing products.\n\n6. Store Products Correctly: Keep menstrual products in a clean, dry place.\n\nGood hygiene habits protect your reproductive health.",
  },
];

export default function LibraryPage() {
  const searchParams = useSearchParams();
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedArticle, setExpandedArticle] = useState<number | null>(null);

  // Handle search params from header search
  useEffect(() => {
    const searchFromUrl = searchParams.get("search");
    if (searchFromUrl) {
      setSearchQuery(searchFromUrl);
    }
  }, [searchParams]);

  // Get unique tags from articles
  const tags = useMemo(() => {
    const allTags = articles.flatMap((article) => article.tags);
    return ["All", ...Array.from(new Set(allTags))];
  }, []);

  // Handle category change
  const handleCategoryChange = (categoryId: string) => {
    setActiveCategory(categoryId);
    setExpandedArticle(null);
  };

  // Handle tag change
  const handleTagChange = (tag: string) => {
    setActiveTag(tag === "All" ? null : tag);
    setExpandedArticle(null);
  };

  // Filter articles based on category, tag, and search
  const filteredArticles = useMemo(() => {
    return articles.filter((article) => {
      const matchesCategory =
        activeCategory === "all" || article.categoryId === activeCategory;
      const matchesTag =
        !activeTag || activeTag === "All" || article.tags.includes(activeTag);
      const matchesSearch =
        !searchQuery ||
        article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.content.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesCategory && matchesTag && matchesSearch;
    });
  }, [activeCategory, activeTag, searchQuery]);

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-background-light dark:bg-background-dark">
      <Header variant="app" />

      <main className="main-content flex-1 flex max-w-[1440px] mx-auto w-full px-4 sm:px-6 md:px-10 lg:px-20 py-4 sm:py-6 md:py-8 pb-24 md:pb-8 gap-4 sm:gap-6 lg:gap-8">
        {/* Sidebar Navigation */}
        <aside className="hidden lg:flex flex-col w-64 gap-8 shrink-0">
          <div className="flex flex-col gap-2">
            <h3 className="text-text-primary dark:text-white text-base font-bold px-3 mb-2">
              Categories
            </h3>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleCategoryChange(cat.id)}
                className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${
                  activeCategory === cat.id
                    ? "bg-primary text-white shadow-primary-sm"
                    : "text-text-primary dark:text-white hover:bg-primary/5 dark:hover:bg-primary/10"
                }`}
              >
                <span
                  className={`material-symbols-outlined ${activeCategory === cat.id ? "" : "text-primary"}`}
                >
                  {cat.icon}
                </span>
                <p
                  className={`text-sm ${activeCategory === cat.id ? "font-semibold" : "font-medium"}`}
                >
                  {cat.label}
                </p>
              </button>
            ))}
          </div>

          {/* Support Card */}
          <div className="mt-auto p-4 bg-primary/10 dark:bg-primary/20 rounded-xl">
            <p className="text-primary font-bold text-sm mb-1">Need to talk?</p>
            <p className="text-xs text-text-secondary mb-3">
              Our AI support is available 24/7 to help you.
            </p>
            <Link href="/chat">
              <button className="w-full bg-primary text-white py-2 rounded-lg text-xs font-bold hover:bg-primary/90 transition-opacity">
                Chat with Sister
              </button>
            </Link>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col gap-4 sm:gap-5 md:gap-6">
          {/* Page Heading */}
          <div className="flex flex-col gap-1.5 sm:gap-2">
            <h1 className="text-text-primary dark:text-white text-2xl sm:text-3xl md:text-4xl font-black leading-tight tracking-tight">
              Health & Wellness Library
            </h1>
            <p className="text-text-secondary text-sm sm:text-base md:text-lg font-normal leading-normal max-w-2xl">
              Expert-backed articles to support your menstrual health and
              emotional well-being.
            </p>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-text-secondary text-xl sm:text-2xl">
              search
            </span>
            <input
              type="text"
              placeholder="Search articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 sm:pl-12 pr-4 py-3 sm:py-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-background-dark text-text-primary dark:text-white text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          {/* Mobile Category Selector */}
          <div className="lg:hidden">
            <select
              value={activeCategory}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="w-full px-3 sm:px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-background-dark text-text-primary dark:text-white text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-primary/20 touch-target"
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* Tags Filter */}
          <div className="flex gap-2 py-2 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap">
            {tags.map((tag) => (
              <button
                key={tag}
                onClick={() => handleTagChange(tag)}
                className={`flex h-8 sm:h-9 shrink-0 items-center justify-center rounded-full px-3 sm:px-4 cursor-pointer transition-all text-xs sm:text-sm ${
                  (tag === "All" && !activeTag) || activeTag === tag
                    ? "bg-primary text-white font-semibold"
                    : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-text-primary dark:text-white font-medium hover:border-primary active:bg-primary/10"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>

          {/* Results Count */}
          <p className="text-text-secondary text-xs sm:text-sm">
            {filteredArticles.length} article
            {filteredArticles.length !== 1 ? "s" : ""} found
          </p>

          {/* Content Grid / List */}
          {filteredArticles.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <span className="material-symbols-outlined text-5xl sm:text-6xl text-gray-300 dark:text-gray-600 mb-3 sm:mb-4">
                search_off
              </span>
              <p className="text-text-secondary text-base sm:text-lg">
                No articles found
              </p>
              <p className="text-text-secondary text-xs sm:text-sm mt-1">
                Try adjusting your filters or search term
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 md:gap-6 pt-2">
              {filteredArticles.map((article) => (
                <Card
                  key={article.id}
                  padding="none"
                  className={`flex flex-col overflow-hidden transition-all ${
                    expandedArticle === article.id ? "md:col-span-2" : ""
                  }`}
                >
                  <div className="p-4 sm:p-5">
                    {/* Category Badge */}
                    <div className="flex items-center justify-between mb-2 sm:mb-3">
                      <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 sm:py-1 rounded">
                        {article.category}
                      </span>
                      <span className="text-text-secondary text-[10px] sm:text-xs flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs sm:text-sm">
                          schedule
                        </span>
                        {article.readTime}
                      </span>
                    </div>

                    {/* Title & Description */}
                    <h3 className="text-text-primary dark:text-white text-base sm:text-lg font-bold leading-snug mb-1.5 sm:mb-2">
                      {article.title}
                    </h3>
                    <p className="text-text-secondary text-xs sm:text-sm leading-relaxed mb-3 sm:mb-4">
                      {article.description}
                    </p>

                    {/* Expanded Content */}
                    {expandedArticle === article.id && (
                      <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-200 dark:border-gray-700">
                        <div className="text-text-primary dark:text-white text-xs sm:text-sm leading-relaxed whitespace-pre-line">
                          {article.content}
                        </div>
                      </div>
                    )}

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-3 sm:mb-4">
                      {article.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-[10px] sm:text-xs text-primary/70 bg-primary/5 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    {/* Read More Button */}
                    <button
                      onClick={() =>
                        setExpandedArticle(
                          expandedArticle === article.id ? null : article.id,
                        )
                      }
                      className="text-primary font-semibold text-xs sm:text-sm flex items-center gap-1 hover:underline active:opacity-70 py-1"
                    >
                      {expandedArticle === article.id
                        ? "Show Less"
                        : "Read More"}
                      <span className="material-symbols-outlined text-xs sm:text-sm">
                        {expandedArticle === article.id
                          ? "expand_less"
                          : "expand_more"}
                      </span>
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer variant="app" />
    </div>
  );
}
