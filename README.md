# Nicotex — Personal Nicotine Reduction Assistant

A mobile-first Progressive Web App (PWA) designed specifically for iPhone 17 and modern browsers to reduce and eliminate dependence on Nicotex nicotine gum.

Built with **React, TypeScript, Vite, Tailwind CSS, and Dexie.js (IndexedDB)**. 100% private, client-side, zero backend, zero paid APIs, and deployable for free on **Cloudflare Pages**.

---

## 🌟 Key Features

1. **One-Tap Consumption Logging**
   - Prominent, debounced `Log Nicotex` button.
   - Defaults to configured strength (`2mg` or `4mg`).
   - 12 contextual triggers (e.g., stress, work focus, after meals, boredom, habit).
   - Multi-select contextual factors (coffee, late night, driving, etc.).
   - Full editing and deletion capability with accidental tap debounce.

2. **Craving Interception System**
   - Immediate `I'm craving Nicotex` response button.
   - **Step 1:** Record trigger & intensity (1–10).
   - **Step 2:** Background-safe 2–3 minute delay timer with guided techniques:
     - Interactive 4-7-8 relaxation breathing orb.
     - Cold water vagal stimulation prompt.
     - 5-4-3-2-1 sensory grounding.
     - Urge surfing mindfulness.
   - **Step 3:** Record post-pause intensity, outcome (resisted, postponed, or chewed), and link to logged pieces if chewed.

3. **Personalised Reduction Engine**
   - Multi-phase structured tapering:
     - **Phase 0:** Baseline Observation (3–7 days).
     - **Phase 1:** Mindful Spacing & Cutting 1st Automatic Piece.
     - **Phase 2:** Gradual Step-Down (or 4mg → 2mg step down).
     - **Phase 3:** Low Frequency & Craving-Only Protocol.
     - **Phase 4:** Full Independence.
   - No forced progression; pause, revise, or adjust targets anytime.
   - Explicit clinical notes on buccal absorption dynamics vs cigarette nicotine spikes.

4. **Relapse-Resistant Streak & Progress Tracking**
   - Consecutive compliant days tracking.
   - Neutral, supportive messaging if daily target is exceeded:
     > *"You exceeded today's target. Your progress over the past two weeks still counts. Would you like to record what happened and continue with your plan?"*
   - Never deletes historical progress or streaks due to a lapse.
   - Missing data is never treated as zero consumption.

5. **Financial Expenditure Analytics**
   - Total spent since tracking began.
   - Spent today, this month, and projected annual expenditure at current rate.
   - Estimated avoided expenditure against baseline.
   - Configurable pack price, quantity, and currency (`₹`, `$`, `€`, `£`).

6. **Local Pattern Telemetry & Optional AI Export**
   - 24-hour hourly distribution bar chart.
   - Peak consumption window identification.
   - Unplanned trigger breakdown.
   - Strictly local rule-based insights (requires minimum 5 data points; never fabricates data).
   - Modular AI prompt generator: copy an anonymized summary to paste into ChatGPT/Claude or test with a personal API key.

7. **Data Privacy, Backup & Restore**
   - 100% local IndexedDB storage.
   - Full database JSON export.
   - CSV export for spreadsheets (Pieces & Cravings).
   - Full JSON restore with schema validation.
   - Verified data wipe option.
   - Transparent warnings regarding browser storage eviction and device uninstallation.

---

## 🚀 Local Development (Windows)

```powershell
# 1. Install dependencies
npm install

# 2. Run unit tests
npm test

# 3. Start local dev server
npm run dev

# 4. Create production build
npm run build
```

---

## ☁️ Free Deployment to Cloudflare Pages

You can host this static PWA on **Cloudflare Pages** for free with zero maintenance:

### Option A: Via GitHub (Recommended)
1. Push this repository to your personal GitHub account.
2. Log into the [Cloudflare Dashboard](https://dash.cloudflare.com/) and go to **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**.
3. Select your `NicotexOS` repository.
4. Set build settings:
   - **Framework preset**: `Vite`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Root directory**: `/`
5. Click **Save and Deploy**. Your custom HTTPS URL (e.g. `https://nicotex.pages.dev`) will be live within 60 seconds!

### Option B: Direct Drag-and-Drop
1. Run `npm run build` locally.
2. In Cloudflare Pages, select **Direct Upload**.
3. Drag the `dist/` folder into Cloudflare.

---

## 📱 Installation on iPhone 17 (Safari)

1. Open your deployed Cloudflare Pages URL in **Safari** on your iPhone 17.
2. Tap the **Share** button (the square with an arrow pointing upward in the bottom toolbar).
3. Scroll down and tap **Add to Home Screen** (`+`).
4. Tap **Add** in the top-right corner.
5. The Nicotex icon will appear on your Home Screen.
6. Open the app from your Home Screen. It will launch in **standalone display mode** with:
   - Native safe-area handling (Dynamic Island / notch and home indicator padding).
   - 100% offline service-worker caching (turn on Airplane Mode to verify!).
   - Private sandbox storage.

---

## 🧪 Automated Testing

Vitest runs 19 unit and integration tests covering:
- Daily consumption calculations & remaining targets.
- 7-day rolling averages.
- Cost per piece & spending calculations.
- Elapsed time and interval formatting.
- Adherence streak continuity and missing data resistance.
- Craving analytics & delay success rates.
- Local pattern detection thresholds.
- IndexedDB CRUD operations & JSON/CSV export/import round-trips.

```powershell
npm test
```
