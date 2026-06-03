# SisterCare - Project Instructions

## Project Overview

SisterCare is a digital support platform for women's well-being, guidance, and menstrual health built with Next.js 14.

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS with custom theme
- **Authentication**: Firebase Auth
- **Database**: Firebase Firestore
- **Font**: Manrope (Google Fonts)
- **Icons**: Material Symbols Outlined

## Design System

- **Primary Color**: #8c30e8 (Purple)
- **Background Light**: #f7f6f8
- **Background Dark**: #191121
- **Font Family**: Manrope

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Auth route group
│   │   ├── login/
│   │   └── signup/
│   ├── dashboard/
│   ├── chat/
│   ├── library/
│   ├── settings/
│   ├── layout.tsx
│   └── page.tsx           # Landing page
├── components/            # Reusable components
│   ├── ui/               # Base UI components
│   ├── layout/           # Layout components
│   └── features/         # Feature-specific components
├── lib/                  # Utility functions
│   └── firebase.ts       # Firebase configuration
├── context/              # React context providers
├── hooks/                # Custom React hooks
└── types/                # TypeScript types
```

## Development Guidelines

- Use TypeScript for all components
- Follow the established color scheme
- Ensure dark mode compatibility
- Keep components modular and reusable
- Use Tailwind CSS for styling

## ⚠️ Commit Message Rule — STRICTLY ENFORCED

Every set of changes must end with **exactly one commit message** on a single line.

Rules:

- **One line only** — no bullet points, no multi-line descriptions, no title + body format
- **No markdown** — plain text only
- **Present tense, imperative** — e.g. `Fix counsellor routing with static fallback`
- **Specific** — describe what changed, not just "update files"
- **Always provided** — every response that modifies code must include a commit message at the end

Format:

```
Commit: <your one-line message here>
```

This rule applies to every single code change, no exceptions.
