/**
 * SisterCare Health Knowledge Base
 *
 * Comprehensive health information database for the AI agent to query.
 * Contains evidence-based information on menstrual health, reproductive health,
 * symptoms, conditions, and treatments.
 */

export interface HealthArticle {
  id: string;
  title: string;
  category: string;
  keywords: string[];
  content: string;
  severity?: "info" | "warning" | "urgent";
  sources?: string[];
}

export const HEALTH_KNOWLEDGE_BASE: HealthArticle[] = [
  // MENSTRUAL HEALTH
  {
    id: "menstrual-cycle-basics",
    title: "Understanding Your Menstrual Cycle",
    category: "menstrual_health",
    keywords: ["period", "cycle", "menstruation", "phases", "how it works"],
    content: `The menstrual cycle typically lasts 21-35 days and has four phases:

MENSTRUAL PHASE (Days 1-5): Your period. The uterine lining sheds, causing bleeding for 3-7 days. You may experience cramps, fatigue, and mood changes.

FOLLICULAR PHASE (Days 6-13): After your period, estrogen rises. Energy increases, mood improves. An egg begins maturing in the ovary.

OVULATION (Days 14-16): The egg is released. This is your fertile window. You may notice clear, stretchy discharge and mild cramping.

LUTEAL PHASE (Days 17-28): Post-ovulation. Progesterone rises. PMS symptoms may occur in the last week. If no pregnancy, hormone levels drop, triggering your next period.

Every woman's cycle is unique. Tracking your cycle helps you understand your body's patterns.`,
  },
  {
    id: "period-pain",
    title: "Menstrual Cramps (Dysmenorrhea)",
    category: "symptoms",
    keywords: ["cramps", "pain", "dysmenorrhea", "period pain", "abdomen"],
    content: `Menstrual cramps are caused by prostaglandins - chemicals that make the uterus contract to shed its lining.

TYPES:
- Primary dysmenorrhea: Common period cramps with no underlying condition
- Secondary dysmenorrhea: Pain caused by conditions like endometriosis, fibroids, or adenomyosis

RELIEF METHODS:
1. Heat therapy - hot water bottle or heating pad on abdomen (as effective as ibuprofen)
2. Pain medication - ibuprofen or naproxen work best when taken early
3. Gentle exercise - walking, yoga, swimming
4. Dietary changes - reduce salt, caffeine, alcohol
5. Supplements - magnesium, omega-3 fatty acids

WHEN TO SEE A DOCTOR:
- Pain that doesn't respond to medication
- Sudden change in pain severity
- Pain accompanied by fever
- Heavy bleeding with large clots
- Pain outside of your period`,
  },
  {
    id: "heavy-periods",
    title: "Heavy Menstrual Bleeding (Menorrhagia)",
    category: "conditions",
    keywords: ["heavy", "bleeding", "menorrhagia", "clots", "flooding"],
    content: `Heavy menstrual bleeding is defined as:
- Soaking through a pad/tampon every 1-2 hours
- Bleeding for more than 7 days
- Passing clots larger than a 10-shilling coin
- Needing to change protection during the night
- Restricting daily activities due to bleeding

CAUSES:
- Hormonal imbalance (common in teens and perimenopause)
- Uterine fibroids or polyps
- Adenomyosis
- Intrauterine devices (IUDs)
- Bleeding disorders
- Certain medications

MANAGEMENT:
- Iron supplements to prevent anemia
- Hormonal contraceptives to regulate cycles
- Tranexamic acid to reduce bleeding
- NSAIDs like ibuprofen

SEEK MEDICAL HELP IF:
- You're soaking through protection hourly
- You pass clots larger than a golf ball
- You feel dizzy, weak, or short of breath
- This is a new or worsening symptom`,
    severity: "warning",
  },
  {
    id: "irregular-periods",
    title: "Irregular Periods",
    category: "conditions",
    keywords: ["irregular", "missed", "late", "early", "unpredictable"],
    content: `A cycle is irregular if it varies by more than 7-9 days from month to month, or if periods come less than 21 days or more than 35 days apart.

COMMON CAUSES:
- Stress (affects hormones significantly)
- Weight changes (rapid gain or loss)
- Excessive exercise
- Polycystic ovary syndrome (PCOS)
- Thyroid disorders
- Starting/stopping birth control
- Perimenopause
- Breastfeeding

WHEN IT'S NORMAL:
- First 2 years after starting periods (teens)
- After pregnancy or breastfeeding
- Approaching menopause (40s)

WHEN TO SEE A DOCTOR:
- No period for 3+ months (not pregnant)
- Cycles suddenly become irregular
- Periods are extremely painful
- Heavy bleeding between periods`,
  },
  {
    id: "pms-pmdd",
    title: "PMS and PMDD",
    category: "conditions",
    keywords: ["pms", "pmdd", "premenstrual", "mood swings", "irritability"],
    content: `PMS (Premenstrual Syndrome) affects up to 75% of menstruating women. Symptoms appear 1-2 weeks before your period and resolve when bleeding starts.

COMMON PMS SYMPTOMS:
Physical: bloating, breast tenderness, headaches, fatigue, food cravings
Emotional: mood swings, irritability, anxiety, sadness, difficulty concentrating

MANAGEMENT:
- Regular exercise (reduces symptoms significantly)
- Balanced diet (reduce salt, sugar, caffeine, alcohol)
- Adequate sleep (7-9 hours)
- Stress management
- Calcium supplements (1200mg daily)
- Vitamin B6 and magnesium

PMDD (Premenstrual Dysphoric Disorder) is severe PMS affecting 3-8% of women:
- Severe depression, anxiety, or mood swings
- Feeling out of control
- Difficulty functioning at work/school
- Relationship problems

PMDD requires medical treatment - see a doctor if PMS severely impacts your life.`,
    severity: "warning",
  },
  // REPRODUCTIVE HEALTH
  {
    id: "fertility-basics",
    title: "Understanding Fertility",
    category: "reproductive_health",
    keywords: [
      "fertility",
      "ovulation",
      "conception",
      "pregnancy",
      "fertile window",
    ],
    content: `FERTILE WINDOW:
You can get pregnant for about 6 days per cycle - the 5 days before ovulation and the day of ovulation itself. The egg survives 12-24 hours after release.

SIGNS OF OVULATION:
- Clear, stretchy, egg-white cervical mucus
- Mild one-sided abdominal pain (mittelschmerz)
- Slight temperature rise (0.5-1°F after ovulation)
- Increased sex drive
- Breast tenderness

CALCULATING YOUR FERTILE WINDOW:
For a 28-day cycle, ovulation typically occurs around day 14. Your fertile window would be days 9-14. For different cycle lengths, subtract 14 from your cycle length to estimate ovulation day.

FACTORS AFFECTING FERTILITY:
- Age (fertility declines after 35)
- Weight (both underweight and overweight affect fertility)
- Smoking and alcohol
- Stress
- Underlying conditions (PCOS, endometriosis)`,
  },
  {
    id: "pregnancy-signs",
    title: "Early Signs of Pregnancy",
    category: "reproductive_health",
    keywords: ["pregnant", "pregnancy", "signs", "symptoms", "missed period"],
    content: `EARLY PREGNANCY SIGNS (before missed period):
- Implantation bleeding (light spotting 6-12 days after conception)
- Breast changes (tenderness, fullness, darkening nipples)
- Fatigue
- Nausea (can start as early as 2 weeks after conception)
- Frequent urination
- Mood changes

SIGNS AFTER MISSED PERIOD:
- Missed period (most reliable early sign)
- Increased nausea/morning sickness
- Food aversions or cravings
- Heightened sense of smell
- Bloating

WHEN TO TAKE A TEST:
- Most accurate: first day of missed period
- Some tests detect pregnancy 4-5 days before missed period
- Use first morning urine for best accuracy,
- False negatives are possible if tested too early

WHAT TO DO IF POSITIVE:
- Confirm with a healthcare provider
- Start prenatal vitamins (especially folic acid)
- Avoid alcohol, smoking, certain medications
- Schedule prenatal care`,
  },
  // SYMPTOMS ANALYSIS
  {
    id: "abnormal-bleeding",
    title: "Abnormal Vaginal Bleeding",
    category: "symptoms",
    keywords: [
      "spotting",
      "bleeding between periods",
      "abnormal bleeding",
      "breakthrough",
    ],
    content: `Bleeding outside your normal period can have many causes:

LESS CONCERNING CAUSES:
- Ovulation bleeding (mid-cycle spotting)
- Starting or changing birth control
- Stress
- Recent vigorous sexual activity
- Cervical irritation

POTENTIALLY CONCERNING CAUSES:
- Sexually transmitted infections
- Uterine fibroids or polyps
- Endometriosis
- Hormonal imbalances
- Early pregnancy or miscarriage

SEEK IMMEDIATE MEDICAL CARE IF:
- Heavy bleeding soaking through protection hourly
- Bleeding with severe pain
- Bleeding after menopause
- Bleeding during pregnancy
- Signs of anemia (dizziness, rapid heartbeat, pale skin)`,
    severity: "warning",
  },
  {
    id: "vaginal-discharge",
    title: "Understanding Vaginal Discharge",
    category: "symptoms",
    keywords: ["discharge", "vaginal", "white", "yellow", "smell", "odor"],
    content: `Normal discharge changes throughout your cycle:

NORMAL VARIATIONS:
- After period: Little to no discharge
- Approaching ovulation: Wet, clear, stretchy (like egg white)
- After ovulation: Thicker, white or cloudy
- Before period: Thick, white

ABNORMAL DISCHARGE - SEE A DOCTOR:
- Gray or green discharge
- Cottage cheese-like texture (possible yeast infection)
- Strong fishy odor (possible bacterial vaginosis)
- Accompanied by itching, burning, or pain
- Yellow/green with bad smell (possible STI)

MAINTAINING VAGINAL HEALTH:
- The vagina is self-cleaning - don't douche
- Wear breathable cotton underwear
- Avoid scented products near the vagina
- Practice safe sex
- Wipe front to back`,
    severity: "info",
  },
  // NUTRITION
  {
    id: "period-nutrition",
    title: "Nutrition During Your Period",
    category: "nutrition",
    keywords: ["food", "diet", "nutrition", "eating", "period", "cramps"],
    content: `FOODS THAT HELP:
Iron-Rich Foods (replace lost iron):
- Dark leafy greens (spinach, kale)
- Red meat, chicken, fish
- Beans and lentils
- Fortified cereals

Anti-Inflammatory Foods (reduce cramps):
- Fatty fish (salmon, sardines) - omega-3s
- Ginger and turmeric
- Berries
- Nuts and seeds

Hydrating Foods (reduce bloating):
- Watermelon, cucumber
- Plenty of water
- Herbal teas (ginger, chamomile)

Magnesium-Rich Foods (muscle relaxation):
- Dark chocolate (70%+)
- Bananas
- Avocados
- Almonds

FOODS TO LIMIT:
- Excess salt (increases bloating)
- Caffeine (can worsen cramps and anxiety)
- Alcohol (disrupts hormones, dehydrates)
- Processed foods (often high in sodium)`,
  },
  // MENTAL HEALTH
  {
    id: "period-anxiety",
    title: "Anxiety During Your Period",
    category: "mental_health",
    keywords: ["anxiety", "worried", "panic", "nervous", "stress", "period"],
    content: `Hormonal fluctuations can significantly impact anxiety levels, especially in the luteal phase (week before your period).

WHY IT HAPPENS:
- Estrogen and progesterone drop affects serotonin (mood chemical)
- Sleep disruption worsens anxiety
- Physical discomfort increases stress

IMMEDIATE RELIEF TECHNIQUES:

BOX BREATHING:
1. Inhale for 4 counts
2. Hold for 4 counts
3. Exhale for 4 counts
4. Hold for 4 counts
Repeat 4 times

5-4-3-2-1 GROUNDING:
- 5 things you can see
- 4 things you can touch
- 3 things you can hear
- 2 things you can smell
- 1 thing you can taste

LONG-TERM MANAGEMENT:
- Regular exercise (releases endorphins)
- Adequate sleep (7-9 hours)
- Limit caffeine (especially before period)
- Mindfulness or meditation practice
- Talk to a professional if anxiety is severe`,
  },
  // HYGIENE
  {
    id: "menstrual-hygiene",
    title: "Menstrual Hygiene Practices",
    category: "hygiene",
    keywords: ["hygiene", "clean", "wash", "pad", "tampon", "cup", "sanitary"],
    content: `PRODUCT GUIDELINES:

PADS:
- Change every 4-6 hours
- Use unscented varieties
- Dispose of properly (wrap and bin, don't flush)

TAMPONS:
- Change every 4-8 hours (NEVER longer than 8 hours)
- Use lowest absorbency needed
- Risk of Toxic Shock Syndrome if left too long

MENSTRUAL CUPS:
- Empty every 8-12 hours
- Sterilize between cycles (boil for 5 minutes)
- Can last up to 10 years
- More economical and eco-friendly

DAILY HYGIENE:
- Bathe or shower daily
- Wash external genital area with water or mild unscented soap
- Never douche - vagina is self-cleaning
- Wear breathable cotton underwear
- Change underwear daily or more if needed
- Wipe front to back after using the bathroom

WARNING SIGNS (see doctor):
- Unusual odor that persists
- Itching or irritation
- Unusual discharge color/texture`,
  },
];

// Uganda-specific healthcare resources
export const UGANDA_HEALTHCARE_RESOURCES = {
  emergency: {
    police: "999 or 112",
    ambulance: "911",
    sauti_helpline: "116 (toll-free, 24/7)",
  },
  helplines: [
    {
      name: "Sauti 116 Helpline",
      number: "116",
      description:
        "National toll-free 24/7 helpline for child and family support, mental health, and crisis intervention",
      services: [
        "mental health",
        "abuse reporting",
        "family support",
        "crisis intervention",
      ],
    },
    {
      name: "FIDA Uganda",
      number: "0414 530 848",
      description: "Free legal support for women and girls",
      services: ["legal aid", "women's rights", "domestic violence"],
    },
    {
      name: "Marie Stopes Uganda",
      number: "0800 100 110",
      description: "Reproductive health services and family planning",
      services: ["family planning", "reproductive health", "pregnancy support"],
    },
    {
      name: "Butabika National Mental Hospital",
      number: "0414 504 379",
      description: "National referral mental health facility",
      services: ["mental health", "psychiatric care"],
    },
  ],
  hospitals: {
    kampala: [
      {
        name: "Mulago National Referral Hospital",
        location: "Mulago Hill",
        specialty: "General, Maternal Health",
      },
      {
        name: "Kawempe National Referral Hospital",
        location: "Kawempe",
        specialty: "Maternal Health, Pediatrics",
      },
      {
        name: "Kiruddu National Referral Hospital",
        location: "Kiruddu",
        specialty: "General",
      },
      {
        name: "Nsambya Hospital",
        location: "Nsambya",
        specialty: "General, Maternal Health",
      },
      { name: "Mengo Hospital", location: "Mengo", specialty: "General" },
    ],
    regional: [
      {
        name: "Mbarara Regional Referral Hospital",
        location: "Mbarara",
        specialty: "General",
      },
      {
        name: "Jinja Regional Referral Hospital",
        location: "Jinja",
        specialty: "General",
      },
      {
        name: "Gulu Regional Referral Hospital",
        location: "Gulu",
        specialty: "General",
      },
      {
        name: "Fort Portal Regional Referral Hospital",
        location: "Fort Portal",
        specialty: "General",
      },
      {
        name: "Mbale Regional Referral Hospital",
        location: "Mbale",
        specialty: "General",
      },
      {
        name: "Arua Regional Referral Hospital",
        location: "Arua",
        specialty: "General",
      },
      {
        name: "Soroti Regional Referral Hospital",
        location: "Soroti",
        specialty: "General",
      },
      {
        name: "Hoima Regional Referral Hospital",
        location: "Hoima",
        specialty: "General",
      },
      {
        name: "Lira Regional Referral Hospital",
        location: "Lira",
        specialty: "General",
      },
      {
        name: "Kabale Regional Referral Hospital",
        location: "Kabale",
        specialty: "General",
      },
      {
        name: "Moroto Regional Referral Hospital",
        location: "Moroto",
        specialty: "General",
      },
    ],
  },
  support_organizations: [
    {
      name: "Reproductive Health Uganda",
      services: ["family planning", "sexual health", "youth services"],
      contact: "info@rhu.or.ug",
    },
    {
      name: "THETA Uganda",
      services: ["HIV/AIDS", "traditional medicine", "community health"],
      contact: "info@thetaug.org",
    },
    {
      name: "UHMG (Uganda Health Marketing Group)",
      services: ["health products", "family planning", "community health"],
      contact: "info@uhmg.org",
    },
  ],
};

// Symptom risk assessment data
export const SYMPTOM_RISK_DATA = {
  urgent_symptoms: [
    "heavy bleeding soaking pad/tampon hourly",
    "severe abdominal pain",
    "fainting",
    "high fever with pelvic pain",
    "bleeding during pregnancy",
    "sudden severe headache",
    "signs of shock (rapid heartbeat, pale, cold sweat)",
  ],
  warning_symptoms: [
    "bleeding between periods (new symptom)",
    "pain during intercourse",
    "unusual discharge with odor",
    "persistent pelvic pain",
    "missed periods for 3+ months",
    "very heavy periods (new or worsening)",
    "severe mood changes affecting daily life",
  ],
  monitor_symptoms: [
    "mild cramps during period",
    "light spotting mid-cycle",
    "mild PMS symptoms",
    "slight cycle length variation",
    "mild fatigue during period",
  ],
};

// Search function for knowledge base
export function searchHealthKnowledge(
  query: string,
  category?: string,
): HealthArticle[] {
  const searchTerms = query.toLowerCase().split(/\s+/);

  let articles = HEALTH_KNOWLEDGE_BASE;

  // Filter by category if specified
  if (category) {
    articles = articles.filter((a) => a.category === category);
  }

  // Score and rank articles by relevance
  const scored = articles.map((article) => {
    let score = 0;
    const searchText =
      `${article.title} ${article.keywords.join(" ")} ${article.content}`.toLowerCase();

    for (const term of searchTerms) {
      if (article.title.toLowerCase().includes(term)) score += 10;
      if (article.keywords.some((k) => k.includes(term))) score += 5;
      if (article.content.toLowerCase().includes(term)) score += 1;
    }

    return { article, score };
  });

  // Return top matches
  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((s) => s.article);
}

// Risk assessment function
export function assessSymptomRisk(symptoms: string[]): {
  level: "urgent" | "warning" | "monitor" | "normal";
  recommendation: string;
  details: string;
} {
  const symptomsLower = symptoms.map((s) => s.toLowerCase());

  // Check for urgent symptoms
  for (const urgent of SYMPTOM_RISK_DATA.urgent_symptoms) {
    if (symptomsLower.some((s) => s.includes(urgent) || urgent.includes(s))) {
      return {
        level: "urgent",
        recommendation: "Seek immediate medical attention",
        details: `The symptom "${urgent}" requires urgent medical evaluation. Please go to the nearest hospital or call emergency services (999).`,
      };
    }
  }

  // Check for warning symptoms
  const matchedWarnings: string[] = [];
  for (const warning of SYMPTOM_RISK_DATA.warning_symptoms) {
    if (symptomsLower.some((s) => s.includes(warning) || warning.includes(s))) {
      matchedWarnings.push(warning);
    }
  }

  if (matchedWarnings.length >= 2) {
    return {
      level: "warning",
      recommendation: "Schedule a doctor's appointment soon",
      details: `Multiple concerning symptoms detected: ${matchedWarnings.join(", ")}. These warrant medical evaluation within the next few days.`,
    };
  }

  if (matchedWarnings.length === 1) {
    return {
      level: "warning",
      recommendation: "Monitor and consider seeing a doctor",
      details: `The symptom "${matchedWarnings[0]}" should be monitored. If it persists or worsens, see a healthcare provider.`,
    };
  }

  // Check for common symptoms to monitor
  const matchedMonitor = SYMPTOM_RISK_DATA.monitor_symptoms.some((m) =>
    symptomsLower.some((s) => s.includes(m) || m.includes(s)),
  );

  if (matchedMonitor) {
    return {
      level: "monitor",
      recommendation: "Continue monitoring, these symptoms are common",
      details:
        "These symptoms are common during menstruation. Track them in your symptom log and seek care if they worsen significantly.",
    };
  }

  return {
    level: "normal",
    recommendation: "No immediate concerns detected",
    details:
      "The reported symptoms appear to be within normal range. Continue tracking your symptoms and maintain good self-care practices.",
  };
}
