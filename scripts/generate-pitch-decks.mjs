import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";

const require = createRequire(import.meta.url);
const modulePath = process.env.PPTXGENJS_MODULE
  || path.join(os.tmpdir(), "sistercare-pptx-tools", "node_modules", "pptxgenjs");
const PptxGenJS = require(modulePath);

const ROOT = process.cwd();
const OUT = path.join(ROOT, "docs", "pitch");
const ASSETS = path.join(OUT, "assets");
const IMG = {
  hero: path.join(ASSETS, "sistercare-hero-adolescent.png"),
  privatePhone: path.join(ASSETS, "sistercare-private-phone.png"),
  supportedPhone: path.join(ASSETS, "sistercare-supported-phone.png"),
  counsellor: path.join(ASSETS, "sistercare-counsellor.png"),
  community: path.join(ASSETS, "sistercare-community-workshop.png"),
  logo: path.join(ROOT, "public", "icons", "sistercare-pink-v3-512x512.png"),
};

const C = {
  pink: "FF00FF",
  pinkDark: "A600A6",
  pinkDeep: "750075",
  pinkSoft: "FFF1FD",
  pinkPale: "FCE3F8",
  ink: "19151B",
  muted: "675F69",
  line: "E9DDE8",
  paper: "FFFFFF",
  wash: "FAF7FA",
  green: "13795B",
  greenSoft: "EAF8F2",
  amber: "B66A00",
  amberSoft: "FFF3DF",
  blue: "315A8C",
  blueSoft: "EAF3FB",
  danger: "9A294A",
};

const FONT_HEAD = "Aptos Display";
const FONT_BODY = "Aptos";
const W = 13.333;
const H = 7.5;

function newDeck(title, subject) {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "SisterCare founding team";
  pptx.company = "SisterCares";
  pptx.subject = subject;
  pptx.title = title;
  pptx.lang = "en-GB";
  pptx.theme = {
    headFontFace: FONT_HEAD,
    bodyFontFace: FONT_BODY,
    lang: "en-GB",
  };
  pptx.defineSlideMaster({
    title: "CLEAN",
    background: { color: C.paper },
    objects: [],
  });
  return pptx;
}

function addText(slide, text, x, y, w, h, opts = {}) {
  slide.addText(text, {
    x, y, w, h,
    margin: 0,
    fontFace: FONT_BODY,
    fontSize: 16,
    color: C.ink,
    breakLine: false,
    valign: "mid",
    ...opts,
  });
}

function addImage(slide, image, x, y, w, h, altText = "") {
  slide.addImage({ path: image, x, y, w, h, sizing: "cover", altText });
}

function addLogo(slide, x = 0.52, y = 0.36, size = 0.38, label = "SisterCare") {
  slide.addImage({ path: IMG.logo, x, y, w: size, h: size, altText: "SisterCare pink heart logo" });
  addText(slide, label, x + size + 0.12, y - 0.01, 2.4, size + 0.02, {
    fontFace: FONT_HEAD,
    fontSize: 17,
    bold: true,
    color: C.ink,
  });
}

function addChrome(slide, number, section, brand = "SisterCare") {
  addLogo(slide, 0.5, 0.26, 0.34, brand);
  addText(slide, section.toUpperCase(), 9.0, 0.28, 3.75, 0.28, {
    fontSize: 9,
    bold: true,
    color: C.pinkDark,
    charSpacing: 1.8,
    align: "right",
  });
  slide.addShape(slide._pptx.ShapeType.line, { x: 0.5, y: 0.78, w: 12.3, h: 0, line: { color: C.line, width: 1 } });
  addText(slide, String(number).padStart(2, "0"), 12.18, 7.05, 0.52, 0.2, { fontSize: 8, color: "998E99", align: "right" });
}

function addTitle(slide, eyebrow, title, subtitle = "") {
  addText(slide, eyebrow.toUpperCase(), 0.62, 1.02, 3.9, 0.28, {
    fontSize: 10,
    bold: true,
    color: C.pinkDark,
    charSpacing: 1.9,
  });
  addText(slide, title, 0.62, 1.34, 11.8, 0.92, {
    fontFace: FONT_HEAD,
    fontSize: 28,
    bold: true,
    color: C.ink,
    valign: "top",
    fit: "shrink",
  });
  if (subtitle) {
    addText(slide, subtitle, 0.62, 2.26, 11.45, 0.56, {
      fontSize: 14,
      color: C.muted,
      valign: "top",
      breakLine: true,
      fit: "shrink",
    });
  }
}

function addPill(slide, text, x, y, w, fill = C.pinkSoft, color = C.pinkDark) {
  slide.addShape(slide._pptx.ShapeType.roundRect, {
    x, y, w, h: 0.34,
    rectRadius: 0.08,
    fill: { color: fill },
    line: { color: fill },
  });
  addText(slide, text, x + 0.12, y + 0.01, w - 0.24, 0.3, {
    fontSize: 9,
    bold: true,
    color,
    align: "center",
  });
}

function addCard(slide, { x, y, w, h, number, title, body, fill = C.paper, accent = C.pink, titleSize = 16, bodySize = 11.5 }) {
  slide.addShape(slide._pptx.ShapeType.roundRect, {
    x, y, w, h,
    rectRadius: 0.08,
    fill: { color: fill },
    line: { color: fill === C.paper ? C.line : fill, width: 1 },
    shadow: { type: "outer", color: "B8AEB8", opacity: 0.12, blur: 1.5, angle: 45, distance: 0.6 },
  });
  if (number) {
    slide.addShape(slide._pptx.ShapeType.ellipse, {
      x: x + 0.22, y: y + 0.22, w: 0.42, h: 0.42,
      fill: { color: accent }, line: { color: accent },
    });
    addText(slide, number, x + 0.22, y + 0.22, 0.42, 0.42, { fontSize: 10, bold: true, color: C.paper, align: "center" });
  }
  const titleX = number ? x + 0.78 : x + 0.25;
  addText(slide, title, titleX, y + 0.2, w - (titleX - x) - 0.22, 0.48, {
    fontFace: FONT_HEAD,
    fontSize: titleSize,
    bold: true,
    color: C.ink,
    valign: "top",
    fit: "shrink",
  });
  addText(slide, body, x + 0.25, y + 0.82, w - 0.5, h - 1.02, {
    fontSize: bodySize,
    color: C.muted,
    valign: "top",
    breakLine: true,
    fit: "shrink",
  });
}

function addStat(slide, x, y, w, value, label, source = "") {
  slide.addShape(slide._pptx.ShapeType.roundRect, {
    x, y, w, h: 1.06,
    rectRadius: 0.08,
    fill: { color: C.pinkSoft },
    line: { color: C.pinkPale },
  });
  addText(slide, value, x + 0.18, y + 0.14, w - 0.36, 0.4, { fontFace: FONT_HEAD, fontSize: 23, bold: true, color: C.pinkDark });
  addText(slide, label, x + 0.18, y + 0.56, w - 0.36, 0.25, { fontSize: 10.5, color: C.ink, bold: true });
  if (source) addText(slide, source, x + 0.18, y + 0.82, w - 0.36, 0.14, { fontSize: 6.8, color: C.muted });
}

function addSource(slide, text, url, x = 0.62, y = 6.87, w = 11.7) {
  slide.addText([
    { text: "Source: ", options: { bold: true, color: C.muted } },
    { text, options: { color: C.muted, hyperlink: { url } } },
  ], { x, y, w, h: 0.18, margin: 0, fontFace: FONT_BODY, fontSize: 7.2, valign: "mid" });
}

function addPath(slide, items, y = 4.1) {
  const x0 = 0.74;
  const gap = 0.32;
  const w = (11.85 - gap * (items.length - 1)) / items.length;
  items.forEach((item, i) => {
    const x = x0 + i * (w + gap);
    addCard(slide, { x, y, w, h: 1.5, number: String(i + 1), title: item.title, body: item.body, fill: i === items.length - 1 ? C.pinkSoft : C.paper });
    if (i < items.length - 1) {
      addText(slide, "→", x + w + 0.03, y + 0.53, gap - 0.06, 0.34, { fontSize: 17, bold: true, color: C.pinkDark, align: "center" });
    }
  });
}

function addFakeChat(slide, x, y, w, h) {
  slide.addShape(slide._pptx.ShapeType.roundRect, {
    x, y, w, h,
    rectRadius: 0.16,
    fill: { color: C.ink },
    line: { color: C.ink },
    shadow: { type: "outer", color: "000000", opacity: 0.22, blur: 3, angle: 45, distance: 1.2 },
  });
  slide.addShape(slide._pptx.ShapeType.roundRect, { x: x + 0.15, y: y + 0.16, w: w - 0.3, h: h - 0.32, rectRadius: 0.11, fill: { color: C.paper }, line: { color: C.paper } });
  addText(slide, "Private conversation", x + 0.36, y + 0.34, w - 0.72, 0.3, { fontSize: 11, bold: true, color: C.ink });
  slide.addShape(slide._pptx.ShapeType.roundRect, { x: x + 0.38, y: y + 0.93, w: w - 1.05, h: 0.72, rectRadius: 0.08, fill: { color: C.wash }, line: { color: C.line } });
  addText(slide, "Something happened and I do not know who I can tell.", x + 0.55, y + 1.02, w - 1.39, 0.54, { fontSize: 10.5, color: C.ink, breakLine: true, fit: "shrink" });
  slide.addShape(slide._pptx.ShapeType.roundRect, { x: x + 0.82, y: y + 1.87, w: w - 1.2, h: 0.92, rectRadius: 0.08, fill: { color: C.pinkSoft }, line: { color: C.pinkPale } });
  addText(slide, "You can begin with one sentence. We can take the next step together.", x + 1.01, y + 1.98, w - 1.58, 0.68, { fontSize: 10.2, color: C.pinkDeep, breakLine: true, fit: "shrink" });
  slide.addShape(slide._pptx.ShapeType.roundRect, { x: x + 0.38, y: y + h - 0.76, w: w - 0.76, h: 0.42, rectRadius: 0.08, fill: { color: C.paper }, line: { color: C.line } });
  addText(slide, "Message Sister", x + 0.56, y + h - 0.71, w - 1.12, 0.3, { fontSize: 9.5, color: "938A93" });
}

function addTeam(slide, y = 3.25) {
  const people = [
    { initials: "KR", name: "Kamwanga Raheem", note: "Product and engineering" },
    { initials: "KA", name: "Kisakye Abigail", note: "Founding team" },
    { initials: "KI", name: "Kaboggoza Ivan", note: "Founding team" },
  ];
  people.forEach((person, i) => {
    const x = 0.75 + i * 3.95;
    slide.addShape(slide._pptx.ShapeType.ellipse, { x, y, w: 0.82, h: 0.82, fill: { color: i === 0 ? C.pink : C.pinkSoft }, line: { color: i === 0 ? C.pink : C.pinkPale } });
    addText(slide, person.initials, x, y, 0.82, 0.82, { fontFace: FONT_HEAD, fontSize: 16, bold: true, color: i === 0 ? C.paper : C.pinkDark, align: "center" });
    addText(slide, person.name, x + 1.02, y + 0.02, 2.72, 0.34, { fontFace: FONT_HEAD, fontSize: 15, bold: true, color: C.ink });
    addText(slide, person.note, x + 1.02, y + 0.39, 2.72, 0.28, { fontSize: 10, color: C.muted });
  });
}

function addFundingRow(slide, { x, y, w, label, percent, amount, color = C.pink }) {
  addText(slide, label, x, y, 2.5, 0.28, { fontSize: 9.5, bold: true, color: C.ink, fit: "shrink" });
  slide.addShape(slide._pptx.ShapeType.roundRect, {
    x: x + 2.58, y: y + 0.07, w: w - 4.17, h: 0.14,
    rectRadius: 0.04,
    fill: { color: C.line },
    line: { color: C.line },
  });
  slide.addShape(slide._pptx.ShapeType.roundRect, {
    x: x + 2.58, y: y + 0.07, w: (w - 4.17) * (percent / 100), h: 0.14,
    rectRadius: 0.04,
    fill: { color },
    line: { color },
  });
  addText(slide, `${percent}%`, x + w - 1.48, y, 0.48, 0.28, { fontSize: 9.5, bold: true, color: C.pinkDark, align: "right" });
  addText(slide, amount, x + w - 0.93, y, 0.93, 0.28, { fontSize: 9.5, bold: true, color: C.ink, align: "right" });
}

function buildAppDeck() {
  const pptx = newDeck("SisterCare App Pitch Deck", "The SisterCare private support application");

  // 1 — Cover
  {
    const slide = pptx.addSlide("CLEAN");
    slide._pptx = pptx;
    slide.background = { color: C.paper };
    addImage(slide, IMG.privatePhone, 7.28, 0, 6.053, 7.5, "Young woman seeking private support on her phone");
    slide.addShape(pptx.ShapeType.rect, { x: 6.92, y: 0, w: 0.72, h: 7.5, fill: { color: C.paper, transparency: 4 }, line: { color: C.paper, transparency: 100 } });
    addLogo(slide, 0.68, 0.58, 0.52, "SisterCare");
    addPill(slide, "PRODUCT PITCH · 2026", 0.72, 1.55, 1.82, C.pinkSoft, C.pinkDark);
    addText(slide, "A private first step when a question feels too hard to ask.", 0.72, 2.15, 5.95, 1.75, { fontFace: FONT_HEAD, fontSize: 32, bold: true, color: C.ink, valign: "top", fit: "shrink" });
    addText(slide, "SisterCare helps girls and women speak privately, keep useful body context and reach verified human support without shame.", 0.72, 4.08, 5.72, 1.0, { fontSize: 15, color: C.muted, valign: "top", breakLine: true, fit: "shrink" });
    addPill(slide, "PRIVATE CONVERSATION", 0.72, 5.45, 1.82);
    addPill(slide, "CYCLE CONTEXT", 2.68, 5.45, 1.46);
    addPill(slide, "HUMAN SUPPORT", 4.28, 5.45, 1.55);
    addText(slide, "sister-care.vercel.app", 0.72, 6.66, 3.5, 0.3, { fontSize: 11, bold: true, color: C.pinkDark, hyperlink: { url: "https://sister-care.vercel.app/" } });
  }

  // 2 — Problem
  {
    const slide = pptx.addSlide("CLEAN");
    slide._pptx = pptx;
    addChrome(slide, 2, "The problem");
    addTitle(slide, "The problem", "Many important questions are never asked.", "Stigma, fear of exposure and uncertainty about where to turn can delay support until a situation becomes harder.");
    addImage(slide, IMG.hero, 0.65, 3.0, 5.38, 3.58, "Young woman sitting alone while distressed");
    addCard(slide, { x: 6.35, y: 3.0, w: 2.0, h: 1.52, number: "1", title: "Silence", body: "Fear of judgment keeps sensitive questions private.", bodySize: 10.5 });
    addCard(slide, { x: 8.55, y: 3.0, w: 2.0, h: 1.52, number: "2", title: "Confusion", body: "Search offers information without context or accountability.", bodySize: 10.5 });
    addCard(slide, { x: 10.75, y: 3.0, w: 1.94, h: 1.52, number: "3", title: "Delay", body: "Concerns grow while professional support is delayed.", bodySize: 10.5 });
    addStat(slide, 6.35, 4.82, 3.0, "1 in 7", "10–19-year-olds experience a mental health condition", "WHO, 2025");
    addStat(slide, 9.58, 4.82, 3.11, "1.8B", "people menstruate every month worldwide", "UNICEF");
    addSource(slide, "WHO, Mental health of adolescents (2025)", "https://www.who.int/news-room/fact-sheets/detail/adolescent-mental-health", 6.35, 6.25, 3.0);
    addSource(slide, "UNICEF, Menstrual hygiene", "https://www.unicef.org/wash/menstrual-hygiene", 9.58, 6.25, 3.1);
    slide.addNotes("Sources: WHO Mental health of adolescents, 1 September 2025; UNICEF Menstrual hygiene. Global context only. These figures are not SisterCare traction.");
  }

  // 3 — Solution
  {
    const slide = pptx.addSlide("CLEAN");
    slide._pptx = pptx;
    addChrome(slide, 3, "The solution");
    addTitle(slide, "The solution", "From silence to a safe next step.", "A member can begin with one sentence, keep control of what is shared, and involve a real counsellor when ready.");
    addImage(slide, IMG.supportedPhone, 8.26, 2.93, 4.43, 2.95, "Woman receiving support through her phone");
    addPath(slide, [
      { title: "Begin privately", body: "Talk to Sister without first finding the perfect words." },
      { title: "Keep context", body: "Use saved conversation, wellbeing and cycle context where consent allows." },
      { title: "Choose human help", body: "Request a verified available counsellor by text or private audio." },
    ], 3.18);
    slide.addShape(pptx.ShapeType.roundRect, { x: 0.75, y: 5.18, w: 7.06, h: 0.7, rectRadius: 0.08, fill: { color: C.ink }, line: { color: C.ink } });
    addText(slide, "The product does not diagnose. It helps the user ask, understand and reach the right next step.", 1.0, 5.31, 6.56, 0.42, { fontSize: 12, bold: true, color: C.paper, align: "center", fit: "shrink" });
  }

  // 4 — Product
  {
    const slide = pptx.addSlide("CLEAN");
    slide._pptx = pptx;
    addChrome(slide, 4, "The product");
    addTitle(slide, "The product", "One app, three connected forms of support.", "Mental wellbeing leads the experience. Menstrual tracking remains useful context rather than the identity of the product.");
    addCard(slide, { x: 0.72, y: 3.12, w: 3.02, h: 2.75, number: "1", title: "Private conversation", body: "Text or speak in supported languages. Sister remembers the current conversation, explains uncertainty and can carry out safe in-app actions." });
    addFakeChat(slide, 4.15, 2.96, 4.75, 3.34);
    addCard(slide, { x: 9.3, y: 3.12, w: 3.02, h: 1.28, number: "2", title: "Body context", body: "Accurate cycle dates and symptoms remain separate, transparent and optional to share.", bodySize: 10.4 });
    addCard(slide, { x: 9.3, y: 4.59, w: 3.02, h: 1.28, number: "3", title: "Human support", body: "See verified counsellors, request one person, message in real time or join private audio.", bodySize: 10.4, fill: C.pinkSoft });
    addText(slide, "Designed for mobile, low bandwidth and private use", 4.15, 6.48, 4.75, 0.26, { fontSize: 10, bold: true, color: C.pinkDark, align: "center" });
  }

  // 5 — Handoff
  {
    const slide = pptx.addSlide("CLEAN");
    slide._pptx = pptx;
    addChrome(slide, 5, "Human handoff");
    addTitle(slide, "Human handoff", "The product stays responsible after someone asks for help.", "SisterCare does not treat a button tap as a completed support outcome.");
    const stages = [
      { title: "Requested", body: "The member is waiting. No claim of connection." },
      { title: "Assigned", body: "One eligible counsellor is notified and accountable." },
      { title: "Accepted", body: "Both people are told that human contact is ready." },
      { title: "Followed up", body: "A next step, referral or interrupted session remains visible." },
    ];
    addPath(slide, stages, 3.18);
    const safeguards = [
      ["Truthful states", "“Connected” appears only after acceptance."],
      ["Durable updates", "Acceptance, decline, messages and completion survive refreshes."],
      ["Low-bandwidth fallback", "Private text remains available when audio cannot connect."],
    ];
    safeguards.forEach((item, i) => {
      const x = 0.77 + i * 4.12;
      slide.addShape(pptx.ShapeType.roundRect, { x, y: 5.12, w: 3.72, h: 1.0, rectRadius: 0.06, fill: { color: i === 0 ? C.greenSoft : C.wash }, line: { color: i === 0 ? "B8E8D7" : C.line } });
      addText(slide, item[0], x + 0.18, 5.23, 3.36, 0.27, { fontSize: 11, bold: true, color: i === 0 ? C.green : C.ink });
      addText(slide, item[1], x + 0.18, 5.52, 3.36, 0.4, { fontSize: 9.3, color: C.muted, breakLine: true, fit: "shrink" });
    });
  }

  // 6 — Users and opportunity
  {
    const slide = pptx.addSlide("CLEAN");
    slide._pptx = pptx;
    addChrome(slide, 6, "Who we serve");
    addTitle(slide, "Who we serve", "Start where privacy and trust are hardest to find.", "The first software pilot is supervised and adult-only. Access for minors requires a separate safeguarding, consent and legal pathway.");
    addImage(slide, IMG.privatePhone, 7.46, 2.9, 5.23, 3.49, "Woman using SisterCare privately on a phone");
    addCard(slide, { x: 0.72, y: 3.03, w: 3.08, h: 1.42, number: "1", title: "Young women", body: "People navigating anxiety, relationships, loss, harassment or private health questions." });
    addCard(slide, { x: 4.02, y: 3.03, w: 3.08, h: 1.42, number: "2", title: "Underserved communities", body: "People facing stigma, limited trusted information or few accessible support options." });
    addCard(slide, { x: 0.72, y: 4.7, w: 3.08, h: 1.42, number: "3", title: "Support partners", body: "Universities, NGOs, clinics and community programmes seeking a safer first contact." });
    addCard(slide, { x: 4.02, y: 4.7, w: 3.08, h: 1.42, number: "4", title: "Verified counsellors", body: "Professionals who need clear assignments, consented context and accountable follow-up." });
  }

  // 7 — Business model
  {
    const slide = pptx.addSlide("CLEAN");
    slide._pptx = pptx;
    addChrome(slide, 7, "Business model");
    addTitle(slide, "Business model", "Free tracking builds trust. Premium support funds care.", "Users can pay directly, while institutions and funders can sponsor access for people who cannot.");
    const models = [
      { x: 0.72, tag: "FREE", title: "Cycle tracking", body: "Record period dates, understand the current cycle and receive useful reminders.", footer: "Entry and trust" },
      { x: 4.48, tag: "PREMIUM", title: "AI + counsellor access", body: "Private AI support, verified counsellor messaging and in-app audio during staffed hours.", footer: "Primary revenue", highlight: true },
      { x: 8.24, tag: "SPONSORED", title: "Partner access", body: "Universities, NGOs, clinics and funders cover premium access for defined groups.", footer: "Institutional revenue" },
    ];
    models.forEach((model) => {
      slide.addShape(pptx.ShapeType.roundRect, { x: model.x, y: 3.05, w: 3.35, h: 2.88, rectRadius: 0.08, fill: { color: model.highlight ? C.ink : C.paper }, line: { color: model.highlight ? C.ink : C.line }, shadow: { type: "outer", color: "B8AEB8", opacity: 0.14, blur: 1.4, angle: 45, distance: 0.7 } });
      addPill(slide, model.tag, model.x + 0.25, 3.3, 1.02, model.highlight ? C.pink : C.pinkSoft, model.highlight ? C.paper : C.pinkDark);
      addText(slide, model.title, model.x + 0.25, 3.93, 2.85, 0.5, { fontFace: FONT_HEAD, fontSize: 18, bold: true, color: model.highlight ? C.paper : C.ink, fit: "shrink" });
      addText(slide, model.body, model.x + 0.25, 4.55, 2.85, 0.82, { fontSize: 11, color: model.highlight ? "E6E0E6" : C.muted, valign: "top", breakLine: true, fit: "shrink" });
      addText(slide, model.footer, model.x + 0.25, 5.53, 2.85, 0.22, { fontSize: 9.4, bold: true, color: model.highlight ? C.pink : C.pinkDark });
    });
    addText(slide, "No advertising. No sale of private health data. Pilot pricing will be tested for affordability and service capacity.", 0.72, 6.3, 10.87, 0.32, { fontSize: 10.5, bold: true, color: C.ink, align: "center" });
  }

  // 8 — Evidence
  {
    const slide = pptx.addSlide("CLEAN");
    slide._pptx = pptx;
    addChrome(slide, 8, "Stage and evidence");
    addTitle(slide, "Stage and evidence", "The working platform is ready for supervised learning, not inflated claims.", "Engineering evidence is strong for an early product. User value, pricing and support operations must now be proven through a controlled pilot.");
    addImage(slide, IMG.counsellor, 7.64, 2.96, 5.05, 3.37, "Counsellor providing private remote support");
    addStat(slide, 0.72, 3.03, 1.88, "528", "automated tests passed", "22 Aug 2026");
    addStat(slide, 2.83, 3.03, 1.88, "3", "role-specific workspaces", "member · counsellor · admin");
    addStat(slide, 4.94, 3.03, 1.88, "1", "connected care platform", "web application");
    addCard(slide, { x: 0.72, y: 4.36, w: 6.1, h: 1.97, title: "What the pilot must prove", body: "Can a user ask a difficult question? Does a requested counsellor actually respond? Does the user feel heard and leave with a clear next step? Can the team safely operate the service every day?", fill: C.pinkSoft, bodySize: 12 });
    addText(slide, "No registration, revenue or health-outcome traction is claimed before the pilot.", 7.64, 6.46, 5.05, 0.25, { fontSize: 9.4, color: C.muted, italic: true, align: "center" });
  }

  // 9 — Future
  {
    const slide = pptx.addSlide("CLEAN");
    slide._pptx = pptx;
    addChrome(slide, 9, "The future");
    addTitle(slide, "The future", "Prove trust in Uganda, then grow with the same discipline.", "SisterCare's future is a trusted private front door to emotional and menstrual support across underserved communities.");
    const phases = [
      ["YEAR 1", "Prove safe value", "Run a supervised adult pilot in Uganda. Validate human handoffs, user outcomes, pricing and daily care operations."],
      ["YEAR 2", "Grow through partners", "Expand through universities, NGOs and clinics. Improve local-language quality and funded counsellor coverage."],
      ["YEAR 3", "Replicate responsibly", "Prepare for new markets only after country-specific clinical, legal, language and emergency-resource approval."],
    ];
    phases.forEach((phase, i) => {
      const x = 0.74 + i * 4.12;
      slide.addShape(pptx.ShapeType.roundRect, { x, y: 3.12, w: 3.72, h: 2.18, rectRadius: 0.08, fill: { color: i === 0 ? C.ink : C.paper }, line: { color: i === 0 ? C.ink : C.line } });
      addText(slide, phase[0], x + 0.25, 3.34, 3.2, 0.28, { fontSize: 10, bold: true, color: i === 0 ? C.pink : C.pinkDark });
      addText(slide, phase[1], x + 0.25, 3.77, 3.2, 0.42, { fontFace: FONT_HEAD, fontSize: 18, bold: true, color: i === 0 ? C.paper : C.ink });
      addText(slide, phase[2], x + 0.25, 4.31, 3.2, 0.74, { fontSize: 10.1, color: i === 0 ? "E7E1E7" : C.muted, valign: "top", breakLine: true, fit: "shrink" });
    });
    slide.addShape(pptx.ShapeType.roundRect, { x: 0.74, y: 5.62, w: 12.0, h: 0.82, rectRadius: 0.08, fill: { color: C.pinkSoft }, line: { color: C.pinkPale } });
    addText(slide, "What never changes", 1.02, 5.79, 1.65, 0.28, { fontSize: 10, bold: true, color: C.pinkDark });
    addText(slide, "Privacy, truthful availability, accountable human ownership and a clear next step after every serious request.", 2.82, 5.73, 9.35, 0.4, { fontFace: FONT_HEAD, fontSize: 14, bold: true, color: C.ink, fit: "shrink" });
  }

  // 10 — Funding ask
  {
    const slide = pptx.addSlide("CLEAN");
    slide._pptx = pptx;
    addChrome(slide, 10, "Funding ask");
    addTitle(slide, "Funding ask", "US$75,000 to prove a safe, repeatable service in 12 months.", "Milestone-based seed funding will turn the working platform into a supervised pilot with staffed care, independent review and measurable evidence.");
    slide.addShape(pptx.ShapeType.roundRect, { x: 0.72, y: 3.0, w: 3.05, h: 2.78, rectRadius: 0.08, fill: { color: C.ink }, line: { color: C.ink } });
    addText(slide, "THE ASK", 0.98, 3.28, 1.0, 0.25, { fontSize: 10, bold: true, color: C.pink, charSpacing: 1.5 });
    addText(slide, "US$75,000", 0.98, 3.7, 2.52, 0.62, { fontFace: FONT_HEAD, fontSize: 28, bold: true, color: C.paper });
    addText(slide, "12-month runway", 0.98, 4.35, 2.52, 0.28, { fontSize: 11, bold: true, color: C.paper });
    addText(slide, "Released against pilot, safety and evidence milestones.", 0.98, 4.77, 2.52, 0.56, { fontSize: 10, color: "DCD5DC", breakLine: true, fit: "shrink" });
    addText(slide, "No ads. No sale of private data.", 0.98, 5.39, 2.52, 0.24, { fontSize: 9.2, bold: true, color: C.pink });
    const appAllocation = [
      ["Product, security and reliability", 30, "$22,500"],
      ["Care operations and safeguarding", 25, "$18,750"],
      ["Supervised pilot and evaluation", 20, "$15,000"],
      ["Clinical and language validation", 15, "$11,250"],
      ["Legal, data protection and contingency", 10, "$7,500"],
    ];
    appAllocation.forEach((item, i) => addFundingRow(slide, { x: 4.1, y: 3.13 + i * 0.5, w: 8.1, label: item[0], percent: item[1], amount: item[2], color: i === 1 ? C.pinkDark : C.pink }));
    slide.addShape(pptx.ShapeType.roundRect, { x: 4.1, y: 5.74, w: 8.1, h: 0.58, rectRadius: 0.06, fill: { color: C.pinkSoft }, line: { color: C.pinkPale } });
    addText(slide, "Funds unlock: audited pilot release · staffed coverage · validated guidance · credible pilot evidence", 4.34, 5.86, 7.62, 0.3, { fontSize: 10, bold: true, color: C.pinkDeep, align: "center", fit: "shrink" });
    addText(slide, "Founding team: Kamwanga Raheem · Kisakye Abigail · Kaboggoza Ivan", 0.72, 6.57, 5.45, 0.24, { fontSize: 9.2, bold: true, color: C.ink });
    addText(slide, "kamwangaraheem2050@gmail.com  ·  +256 704 057 370  ·  sister-care.vercel.app", 6.3, 6.57, 6.0, 0.24, { fontSize: 9.2, color: C.pinkDark, align: "right", hyperlink: { url: "https://sister-care.vercel.app/" } });
  }

  return pptx;
}

function buildOrganisationDeck() {
  const pptx = newDeck("SisterCares Organisation Pitch Deck", "The wider SisterCares social-impact organisation");

  // 1 — Cover
  {
    const slide = pptx.addSlide("CLEAN");
    slide._pptx = pptx;
    slide.background = { color: C.paper };
    addImage(slide, IMG.community, 7.15, 0, 6.183, 7.5, "SisterCares community support circle");
    slide.addShape(pptx.ShapeType.rect, { x: 6.86, y: 0, w: 0.65, h: 7.5, fill: { color: C.paper, transparency: 4 }, line: { color: C.paper, transparency: 100 } });
    addLogo(slide, 0.68, 0.58, 0.52, "SisterCares");
    addPill(slide, "ORGANISATION PITCH · 2026", 0.72, 1.55, 2.25);
    addText(slide, "No girl or woman should face pain, stigma or a difficult question alone.", 0.72, 2.13, 5.88, 1.72, { fontFace: FONT_HEAD, fontSize: 31, bold: true, color: C.ink, valign: "top", fit: "shrink" });
    addText(slide, "SisterCares joins private digital support with practical community action for mental wellbeing and menstrual dignity.", 0.72, 4.04, 5.7, 0.93, { fontSize: 15, color: C.muted, valign: "top", breakLine: true, fit: "shrink" });
    addPill(slide, "LISTEN", 0.72, 5.35, 1.05);
    addPill(slide, "SUPPORT", 1.91, 5.35, 1.15);
    addPill(slide, "EQUIP", 3.2, 5.35, 1.05);
    addPill(slide, "REFER", 4.39, 5.35, 1.05);
    addText(slide, "Uganda · built to grow with trusted local partners", 0.72, 6.6, 5.2, 0.3, { fontSize: 11, bold: true, color: C.pinkDark });
  }

  // 2 — Challenge
  {
    const slide = pptx.addSlide("CLEAN");
    slide._pptx = pptx;
    addChrome(slide, 2, "The challenge", "SisterCares");
    addTitle(slide, "The challenge", "The need is larger than an app.", "A private digital channel matters, but many people also face limited phone access, stigma, material poverty and weak referral pathways.");
    addImage(slide, IMG.hero, 0.68, 3.0, 4.68, 3.12, "Young woman distressed and unsure where to seek support");
    const barriers = [
      ["Silence and stigma", "Mental distress, harassment and menstrual questions may feel unsafe to discuss."],
      ["Unequal access", "Some girls do not own a phone or can use one only during school holidays."],
      ["Material barriers", "Pads, accurate information and safe disposal are not always available."],
      ["Broken handoffs", "A referral is not enough if nobody checks whether support was reached."],
    ];
    barriers.forEach((item, i) => {
      const x = 5.7 + (i % 2) * 3.42;
      const y = 3.0 + Math.floor(i / 2) * 1.58;
      addCard(slide, { x, y, w: 3.12, h: 1.32, number: String(i + 1), title: item[0], body: item[1], titleSize: 14, bodySize: 9.5 });
    });
    addSource(slide, "WHO, Mental health of adolescents (2025)", "https://www.who.int/news-room/fact-sheets/detail/adolescent-mental-health", 5.7, 6.3, 3.0);
    addSource(slide, "UNICEF, Menstrual hygiene", "https://www.unicef.org/wash/menstrual-hygiene", 9.12, 6.3, 3.0);
    slide.addNotes("Sources: WHO Mental health of adolescents, 1 September 2025; UNICEF Menstrual hygiene. The need statement combines published context with SisterCares' intended community discovery; it does not claim measured local prevalence.");
  }

  // 3 — Model
  {
    const slide = pptx.addSlide("CLEAN");
    slide._pptx = pptx;
    addChrome(slide, 3, "Our model", "SisterCares");
    addTitle(slide, "Our model", "One trusted organisation, several ways to ask for help.", "People can enter through the channel available to them and still reach information, a trained human, practical support or referral.");
    const model = [
      ["SisterCare app", "Private conversation, cycle context and verified counsellor support for eligible users."],
      ["SisterBoxes", "Locked question boxes let students ask anonymously without needing a phone."],
      ["Community conversations", "Facilitated mental-health and menstrual-health sessions answer real concerns without shame."],
      ["Menstrual dignity", "Pads, first-period guidance and SisterCares disposal bins make support practical."],
    ];
    model.forEach((item, i) => {
      const x = 0.74 + i * 3.06;
      addCard(slide, { x, y: 3.12, w: 2.72, h: 2.45, number: String(i + 1), title: item[0], body: item[1], fill: i === 0 ? C.ink : i === 3 ? C.pinkSoft : C.paper, accent: C.pink, titleSize: 16, bodySize: 10.5 });
      if (i === 0) {
        // Overlay light text on the dark product card.
        slide.addShape(pptx.ShapeType.roundRect, { x, y: 3.12, w: 2.72, h: 2.45, rectRadius: 0.08, fill: { color: C.ink }, line: { color: C.ink } });
        slide.addShape(pptx.ShapeType.ellipse, { x: x + 0.22, y: 3.34, w: 0.42, h: 0.42, fill: { color: C.pink }, line: { color: C.pink } });
        addText(slide, "1", x + 0.22, 3.34, 0.42, 0.42, { fontSize: 10, bold: true, color: C.paper, align: "center" });
        addText(slide, item[0], x + 0.78, 3.32, 1.72, 0.5, { fontFace: FONT_HEAD, fontSize: 16, bold: true, color: C.paper, fit: "shrink" });
        addText(slide, item[1], x + 0.25, 3.94, 2.22, 1.2, { fontSize: 10.5, color: "E5DFE5", valign: "top", breakLine: true, fit: "shrink" });
      }
    });
    slide.addShape(pptx.ShapeType.roundRect, { x: 1.54, y: 5.9, w: 10.2, h: 0.64, rectRadius: 0.06, fill: { color: C.pink }, line: { color: C.pink } });
    addText(slide, "Every channel should lead to a clear answer, practical support or a completed referral.", 1.85, 6.03, 9.58, 0.34, { fontFace: FONT_HEAD, fontSize: 15, bold: true, color: C.paper, align: "center", fit: "shrink" });
  }

  // 4 — No-phone pathway
  {
    const slide = pptx.addSlide("CLEAN");
    slide._pptx = pptx;
    addChrome(slide, 4, "Access without a phone", "SisterCares");
    addTitle(slide, "Access without a phone", "A question can still reach help.", "The offline pathway is designed for schools and communities where personal phone access cannot be assumed.");
    const steps = [
      ["Ask anonymously", "Write a question and place it in a locked SisterBox."],
      ["Review safely", "A trained, authorised focal person groups questions and escalates safety concerns."],
      ["Respond", "A facilitated session answers common questions without identifying the writer."],
      ["Refer and follow up", "Private concerns move to an agreed safeguarding or clinical pathway."],
    ];
    addPath(slide, steps.map(([title, body]) => ({ title, body })), 3.18);
    slide.addShape(pptx.ShapeType.roundRect, { x: 0.78, y: 5.14, w: 12.0, h: 1.0, rectRadius: 0.08, fill: { color: C.amberSoft }, line: { color: "F2D6A7" } });
    addText(slide, "Safeguarding boundary", 1.04, 5.34, 1.72, 0.28, { fontSize: 10, bold: true, color: C.amber });
    addText(slide, "The adult app pilot does not automatically extend to minors. School programmes require consent rules, trained staff, referral partners and incident ownership before launch.", 2.82, 5.27, 9.52, 0.5, { fontSize: 10.5, color: C.ink, breakLine: true, fit: "shrink" });
  }

  // 5 — Programmes
  {
    const slide = pptx.addSlide("CLEAN");
    slide._pptx = pptx;
    addChrome(slide, 5, "Programme portfolio", "SisterCares");
    addTitle(slide, "Programme portfolio", "Support the whole person, not one isolated symptom.", "Mental wellbeing and menstrual dignity are linked in the organisation, while each programme keeps a clear purpose and accountable owner.");
    addImage(slide, IMG.community, 7.38, 2.96, 5.31, 3.54, "Facilitated SisterCares community conversation");
    addCard(slide, { x: 0.72, y: 3.03, w: 3.05, h: 1.54, number: "1", title: "Mental wellbeing", body: "Listening spaces, stigma reduction, coping education, safeguarding and completed referrals." });
    addCard(slide, { x: 4.02, y: 3.03, w: 3.05, h: 1.54, number: "2", title: "Menstrual dignity", body: "Pads, first-period guidance, myth correction and practical self-care information." });
    addCard(slide, { x: 0.72, y: 4.86, w: 3.05, h: 1.54, number: "3", title: "Safe environments", body: "Anonymous question boxes and maintained disposal bins in partner sites." });
    addCard(slide, { x: 4.02, y: 4.86, w: 3.05, h: 1.54, number: "4", title: "Digital continuity", body: "Eligible users continue privately through the app and verified counsellor network." });
  }

  // 6 — People and partners
  {
    const slide = pptx.addSlide("CLEAN");
    slide._pptx = pptx;
    addChrome(slide, 6, "People and partners", "SisterCares");
    addTitle(slide, "People and partners", "Local trust is how the model reaches people safely.", "SisterCares provides the system and accountability; established partners provide context, access and specialist support.");
    const audiences = [
      ["School-aged girls", "Safeguarded offline programmes, menstrual dignity and anonymous questions."],
      ["Young women and adults", "App access, community conversations and verified counsellor support."],
      ["Schools and universities", "Sites, focal persons, student services and safeguarding structures."],
      ["NGOs and clinics", "Specialist referrals, supervision, community access and evidence."],
      ["CSR and funders", "Pads, bins, pilot funding, evaluation and responsible scale."],
      ["Local leadership", "Permission, cultural context, accountability and community trust."],
    ];
    audiences.forEach((item, i) => {
      const x = 0.74 + (i % 3) * 4.1;
      const y = 3.08 + Math.floor(i / 3) * 1.58;
      addCard(slide, { x, y, w: 3.72, h: 1.32, number: String(i + 1), title: item[0], body: item[1], titleSize: 14, bodySize: 9.5, fill: i < 2 ? C.pinkSoft : C.paper });
    });
  }

  // 7 — Outcomes
  {
    const slide = pptx.addSlide("CLEAN");
    slide._pptx = pptx;
    addChrome(slide, 7, "Impact", "SisterCares");
    addTitle(slide, "Impact", "Measure whether support helped, not how busy we looked.", "Registrations, sessions and pad counts are useful operations data. They are not the final proof of impact.");
    const outcomes = [
      ["A difficult question was answered", "The person received a clear response through the app, a SisterBox or a facilitated session."],
      ["The person felt heard", "Private feedback shows whether the interaction respected and helped her."],
      ["A referral was completed", "Serious cases have an owner and follow-up, rather than only a phone number."],
      ["Menstrual barriers reduced", "Participants report better knowledge, product access and safe disposal at the site."],
    ];
    outcomes.forEach((item, i) => {
      const x = 0.75 + (i % 2) * 6.15;
      const y = 3.13 + Math.floor(i / 2) * 1.55;
      slide.addShape(pptx.ShapeType.roundRect, { x, y, w: 5.68, h: 1.27, rectRadius: 0.08, fill: { color: i === 0 ? C.ink : C.paper }, line: { color: i === 0 ? C.ink : C.line } });
      addText(slide, `0${i + 1}`, x + 0.24, y + 0.19, 0.45, 0.3, { fontSize: 10, bold: true, color: C.pink });
      addText(slide, item[0], x + 0.82, y + 0.16, 4.55, 0.36, { fontFace: FONT_HEAD, fontSize: 15, bold: true, color: i === 0 ? C.paper : C.ink, fit: "shrink" });
      addText(slide, item[1], x + 0.82, y + 0.57, 4.55, 0.45, { fontSize: 9.5, color: i === 0 ? "E5DFE5" : C.muted, breakLine: true, fit: "shrink" });
    });
    addText(slide, "Pilot targets will be agreed with partners before delivery; no impact figures are claimed yet.", 0.75, 6.41, 11.95, 0.28, { fontSize: 9.5, italic: true, color: C.muted, align: "center" });
  }

  // 8 — Sustainability
  {
    const slide = pptx.addSlide("CLEAN");
    slide._pptx = pptx;
    addChrome(slide, 8, "Sustainability", "SisterCares");
    addTitle(slide, "Sustainability", "Blend earned income with mission-aligned support.", "No single revenue source should decide who deserves help.");
    const streams = [
      ["Premium app", "Paid AI and counsellor access for users who can afford it."],
      ["Institutional programmes", "Universities, NGOs and schools fund agreed support packages."],
      ["Grants and CSR", "Fund early pilots, pad access, bins, safeguarding and evaluation."],
      ["In-kind partners", "Clinicians, manufacturers and venues reduce delivery cost."],
    ];
    streams.forEach((item, i) => {
      const x = 0.75 + i * 3.08;
      addCard(slide, { x, y: 3.14, w: 2.74, h: 2.26, number: String(i + 1), title: item[0], body: item[1], fill: i === 1 ? C.pinkSoft : C.paper, bodySize: 10.5 });
    });
    slide.addShape(pptx.ShapeType.roundRect, { x: 1.34, y: 5.74, w: 10.65, h: 0.62, rectRadius: 0.06, fill: { color: C.ink }, line: { color: C.ink } });
    addText(slide, "No advertising · no sale of private data · transparent sponsored access", 1.64, 5.86, 10.05, 0.3, { fontSize: 12, bold: true, color: C.paper, align: "center" });
  }

  // 9 — Future
  {
    const slide = pptx.addSlide("CLEAN");
    slide._pptx = pptx;
    addChrome(slide, 9, "The future", "SisterCares");
    addTitle(slide, "The future", "Build the evidence, then make the model easier to repeat.", "The organisation grows site by site, keeping local referral ownership and safeguarding ahead of visibility.");
    const phases = [
      ["YEAR 1", "Prove three sites", "Co-design and run the integrated model. Measure trust, referral completion, menstrual dignity and true delivery cost."],
      ["YEAR 2", "Deepen locally", "Target ten partner sites across two districts, with trained focal people and dependable clinic and safeguarding partners."],
      ["YEAR 3", "Prepare to replicate", "Publish the model, improve procurement and create a district-ready toolkit without weakening local accountability."],
    ];
    phases.forEach((phase, i) => {
      const x = 0.74 + i * 4.12;
      slide.addShape(pptx.ShapeType.roundRect, { x, y: 3.1, w: 3.72, h: 2.36, rectRadius: 0.08, fill: { color: i === 0 ? C.ink : C.paper }, line: { color: i === 0 ? C.ink : C.line } });
      addText(slide, phase[0], x + 0.25, 3.35, 3.2, 0.25, { fontSize: 9.5, bold: true, color: i === 0 ? C.pink : C.pinkDark });
      addText(slide, phase[1], x + 0.25, 3.78, 3.2, 0.42, { fontFace: FONT_HEAD, fontSize: 18, bold: true, color: i === 0 ? C.paper : C.ink });
      addText(slide, phase[2], x + 0.25, 4.33, 3.2, 0.88, { fontSize: 10.1, color: i === 0 ? "E6E0E6" : C.muted, valign: "top", breakLine: true, fit: "shrink" });
    });
    slide.addShape(pptx.ShapeType.roundRect, { x: 0.74, y: 5.78, w: 12.0, h: 0.68, rectRadius: 0.06, fill: { color: C.amberSoft }, line: { color: "F2D6A7" } });
    addText(slide, "Decision rule", 1.02, 5.93, 1.15, 0.26, { fontSize: 10, bold: true, color: C.amber });
    addText(slide, "Pause any service whose people, safeguarding, supplies or referral capacity cannot meet its promise.", 2.24, 5.88, 9.9, 0.34, { fontSize: 10.5, bold: true, color: C.ink, fit: "shrink" });
  }

  // 10 — Funding ask
  {
    const slide = pptx.addSlide("CLEAN");
    slide._pptx = pptx;
    addChrome(slide, 10, "Funding ask", "SisterCares");
    addTitle(slide, "Funding ask", "UGX 150 million for a 12-month, three-site integrated pilot.", "Grant and CSR funding will test the complete organisation model: private support, mental-health programming, menstrual dignity, safe facilities and completed referrals.");
    slide.addShape(pptx.ShapeType.roundRect, { x: 0.72, y: 3.0, w: 3.05, h: 2.78, rectRadius: 0.08, fill: { color: C.ink }, line: { color: C.ink } });
    addText(slide, "THE ASK", 0.98, 3.28, 1.0, 0.25, { fontSize: 10, bold: true, color: C.pink, charSpacing: 1.5 });
    addText(slide, "UGX 150M", 0.98, 3.7, 2.52, 0.62, { fontFace: FONT_HEAD, fontSize: 28, bold: true, color: C.paper });
    addText(slide, "12 months · 3 pilot sites", 0.98, 4.35, 2.52, 0.28, { fontSize: 11, bold: true, color: C.paper });
    addText(slide, "Restricted to delivery, dignity supplies, safeguarding and evidence milestones.", 0.98, 4.77, 2.52, 0.6, { fontSize: 9.8, color: "DCD5DC", breakLine: true, fit: "shrink" });
    addText(slide, "Partners can also contribute pads, bins, venues or clinical time.", 0.98, 5.39, 2.52, 0.3, { fontSize: 8.8, bold: true, color: C.pink, fit: "shrink" });
    const organisationAllocation = [
      ["Community programme delivery", 25, "UGX 37.5M"],
      ["Pads and menstrual education", 25, "UGX 37.5M"],
      ["SisterBoxes, bins and installation", 15, "UGX 22.5M"],
      ["Safeguarding and referral support", 15, "UGX 22.5M"],
      ["Measurement and learning", 10, "UGX 15M"],
      ["Governance, communication and contingency", 10, "UGX 15M"],
    ];
    organisationAllocation.forEach((item, i) => addFundingRow(slide, { x: 4.1, y: 3.0 + i * 0.43, w: 8.1, label: item[0], percent: item[1], amount: item[2], color: i < 2 ? C.pink : C.pinkDark }));
    slide.addShape(pptx.ShapeType.roundRect, { x: 4.1, y: 5.68, w: 8.1, h: 0.64, rectRadius: 0.06, fill: { color: C.pinkSoft }, line: { color: C.pinkPale } });
    addText(slide, "Funds unlock: 3 equipped sites · anonymous questions · pad access · safeguarded support · measured referrals", 4.34, 5.81, 7.62, 0.34, { fontSize: 9.8, bold: true, color: C.pinkDeep, align: "center", fit: "shrink" });
    addText(slide, "Founding team: Kamwanga Raheem · Kisakye Abigail · Kaboggoza Ivan", 0.72, 6.57, 5.45, 0.24, { fontSize: 9.2, bold: true, color: C.ink });
    addText(slide, "kamwangaraheem2050@gmail.com  ·  +256 704 057 370  ·  sister-care.vercel.app", 6.3, 6.57, 6.0, 0.24, { fontSize: 9.2, color: C.pinkDark, align: "right", hyperlink: { url: "https://sister-care.vercel.app/" } });
  }

  return pptx;
}

async function main() {
  const appDeck = buildAppDeck();
  const organisationDeck = buildOrganisationDeck();
  await appDeck.writeFile({ fileName: path.join(OUT, "SisterCare_Pitch_Deck.pptx"), compression: true });
  await organisationDeck.writeFile({ fileName: path.join(OUT, "SisterCares_Organisation_Pitch_Deck.pptx"), compression: true });
  console.log("Created SisterCare app and SisterCares organisation pitch decks.");
}

await main();
