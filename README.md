# WANN-PLANNER

Build "WANN Weekly OS" — a rotating weekly schedule dashboard app for a pastry chef managing multiple parallel lives: Hyatt Hotel work, her own cake brand (Kora Cakes), household management, and family/childcare.

═══════════════════════════

DESIGN SYSTEM

═══════════════════════════

- Font: DM Mono Light (or IBM Plex Mono) as default

- Base colors: background #F5F4F1, border #D4D3CE, text #1A1A18

- 1px borders, no shadows, minimal rounded corners

- UPPERCASE labels for structural/nav elements

- Modern minimalist base — NOT decorated by default

FULL COLOR CUSTOMIZATION (Settings panel, gear icon top right):

- Background, border, text color: fully custom via color picker (hex input + presets)

- Live preview while adjusting

- Font toggle: DM Mono / IBM Plex Mono / System Default

- Widget visibility toggles: show/hide Habit Tracker, Weekly Review, Monthly Summary, Cross-App Alerts

- Store all settings in Supabase `user_settings` table (user_id, bg_color, border_color, text_color, font, widget_visibility JSON)

═══════════════════════════

CORE VIEW: "THIS WEEK" ROTATION

═══════════════════════════

- 7-day strip where TODAY is always leftmost/first — NOT a fixed Mon-Sun grid

- Days rotate forward daily

- Today's card is expanded; other 6 days show condensed view

- Mini month calendar + prev/next week arrows for navigation

- Upcoming birthday/anniversary within this week or next shows as a highlighted banner at the top

═══════════════════════════

BIRTHDAYS & ANNIVERSARIES

═══════════════════════════

- Separate from regular tasks — annual recurring by default (same month/day every year)

- Fields: name, date, type (birthday / anniversary / other), category tag (Family / Friend / Work), optional notes field (gift ideas, reminders)

- Auto-calculate age for birthdays (based on birth year, if provided)

- D-day countdown badge shown when within current/next week

- List view: all upcoming entries sorted by next occurrence date

- Table: `special_dates` (id, user_id, name, date, type, category, notes, show_age boolean)

═══════════════════════════

TASKS — CATEGORIES, SUBTAGS, CUSTOM RECURRENCE

═══════════════════════════

- User-created categories (not hardcoded), each with name + color

  - Starter categories: 집 (Home), 하야트 (Hyatt), 코라 (Kora Cakes)

  - "+ Add category" button for user to create more

- Subtags within each category (e.g. 집 > 빨래/청소/집밥/아기밥), user-defined per category

- Filter/view tasks by category or subtag

- Recurrence options

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://wann-planner.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/8107281d-4f79-4569-ad09-bf5571f7e0aa).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
