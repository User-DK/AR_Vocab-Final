# AR-Vocab — Assessment & Clinical Review: Deployment Readiness

> **Audience:** Developer + Supervising Clinician  
> **Scope:** `SpeechAssessmentScreen`, `ClinicalReportScreen`, `ProgressScreen`, `speechAssessment.ts`

---

## 1. What Is Working Well ✅

| Area | Status | Notes |
|---|---|---|
| Phonetic scoring (Soundex + edit-distance) | ✅ Good | Robust algorithm, handles homophones & fillers |
| Per-word best-score & star tracking | ✅ Good | Saved to device via RNFS |
| Badge system (category × difficulty) | ✅ Good | Real unlock condition, not cosmetic |
| Clinical report PDF export | ✅ Good | Uses `react-native-html-to-pdf` + `Share` |
| Improvement trend chart (LineChart) | ✅ Good | SVG-based, clean implementation |
| Permission handling (Android mic) | ✅ Good | Graceful deny path |
| isMounted guard on async results | ✅ Good | Prevents state-update-on-unmounted crash |
| TTS fallback when audio file missing | ✅ Good | Prevents silent failures |
| Voice listener cleanup on unmount | ✅ Adequate | `Voice.removeAllListeners()` called |

---

## 2. Issues Found — Prioritised for Clinical Use

### 🔴 CRITICAL (Must Fix Before Deployment)

#### C1 — History capped at 50 entries; clinical trend becomes meaningless
**File:** `speechAssessment.ts:577`
```ts
if (history.length > 50) history.shift(); // ← only 50 records ever stored
```
**Problem:** After 50 attempts the oldest data is lost. A therapist reviewing a child after a month of daily use will see a truncated, misleading trend.  
**Fix:** Store a summary object (week-level rollups) separately from the raw ring buffer.

```ts
// Keep last 200 raw entries (ring), plus weekly rollup
if (history.length > 200) history.shift();
```
And add a separate `weekly_summary.json`:
```json
{ "2026-W18": { "attempts": 12, "avgScore": 74, "wordsAttempted": ["cat","dog"] } }
```

---

#### C2 — Badge unlock requires `bestScore === 100` exactly — nearly impossible
**File:** `speechAssessment.ts:553`
```ts
const allPerfect = targetItems.every((item: any) => {
  const prog = progress.items[item.word.toLowerCase()];
  return prog && prog.bestScore === 100; // ← strict equality
});
```
**Problem:** The scoring pipeline returns `Math.floor(10 + finalRaw * 90)`. A "perfect" recognizer result gives `finalRaw ≈ 0.95`, yielding score **95**, not 100. Badges are functionally unearnable.  
**Fix:**
```ts
return prog && prog.bestScore >= 90; // consistent with star threshold (95 in updateProgress)
```

---

#### C3 — BarChart bar heights use raw attempt counts normalised over 100 — wrong
**File:** `AnalyticsCharts.tsx:78`
```ts
const barHeight = (val / 100) * height; // val is attempt COUNT (e.g. 3, 7)
```
**Problem:** If a word was attempted 3 times the bar is only 3% tall. The chart is visually useless.  
**Fix:** Normalise to the max value in the dataset:
```ts
const max = Math.max(...data, 1);
const barHeight = (val / max) * height;
```

---

#### C4 — `generateClinicalNote` compares raw score numbers not phonetic accuracy
**File:** `speechAssessment.ts:401-406`
```ts
let note = `...average phonetic accuracy of ${Math.floor(avgAcc || 0)}%...`;
if (diff > 5) note += "A clear positive trend..."  // diff is score points (10-100 scale)
```
**Problem:** `diff > 5` on a 10-100 scale is a tiny fluctuation, not a clinically significant trend. This will fire on basically every random session. Use percentage-point threshold relative to scale:
```ts
if (diff > 10) note += "A clear positive trend...";
else if (diff < -10) note += "Some decline...";
```

---

#### C5 — No date-stamping on progress items — no timeline for therapist
**File:** `speechAssessment.ts:526`
```ts
const currentItem = progress.items[wordKey] || { stars: 0, bestScore: 0, isLearned: false, attempts: 0 };
// No firstAttempted / lastAttempted fields
```
**Problem:** The clinical report cannot answer "When did the child first attempt this word?" or "Was progress made this week?" — basic clinical questions.  
**Fix:** Add timestamps:
```ts
currentItem.firstAttempted = currentItem.firstAttempted || new Date().toISOString();
currentItem.lastAttempted = new Date().toISOString();
```

---

### 🟡 IMPORTANT (Fix Before External Sharing with Therapists)

#### I1 — `streak` is hardcoded to `1`
**File:** `speechAssessment.ts:478`
```ts
streak: 1, // Placeholder for now
```
**Problem:** Progress screen shows "Streak" as if it's real. This is misleading to a clinician or parent.  
**Fix (simple approach):** Track last-used date in progress JSON:
```ts
// In updateProgress:
const today = new Date().toDateString();
if (progress.lastUsedDate !== today) {
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  progress.streak = progress.lastUsedDate === yesterday ? (progress.streak || 0) + 1 : 1;
  progress.lastUsedDate = today;
}
```
Or if it's too much work right now: **remove the streak field from the UI entirely** until it's real.

---

#### I2 — Clinical Report: `overallAccuracy` is average of `phoneticAccuracy`, not overall score
**File:** `speechAssessment.ts:327-328, 363`
```ts
const avgPhonetic = history.reduce((acc, h) => acc + (h.phoneticAccuracy || h.score || 0), 0) / history.length;
// ...
overallAccuracy: Math.floor(avgPhonetic), // shown as "X% Accuracy" in the circle
```
**Problem:** `phoneticAccuracy` (Soundex-based, 0-100) and `score` (weighted composite, 10-100) are used interchangeably. If `phoneticAccuracy` is 0 (which happens on error), `h.score` is used, causing inconsistent values in the report circle.  
**Fix:** Always use the composite `score` field for the "Overall Accuracy" display:
```ts
const avgScore = history.reduce((acc, h) => acc + h.score, 0) / history.length;
overallAccuracy: Math.floor(avgScore),
```

---

#### I3 — No empty-state guard if `report` is null in ClinicalReportScreen
**File:** `ClinicalReportScreen.tsx:218-252`
```tsx
<LineChart data={report?.improvementTrend || []} />
// ...
{report?.responseTimeByLevel.map(...)}  // ← if report is null, .map crashes
```
**Problem:** If `getClinicalReport()` throws and returns the fallback object, `responseTimeByLevel` is `[]` so `.map()` is fine — but the `?.` on `report` without a null screen is inconsistent. More importantly, the loading spinner hides after `setLoading(false)` even if `report` is null.  
**Fix:** Add a null-guard UI:
```tsx
if (!report) return <EmptyState message="No session data yet. Complete at least one assessment." />;
```

---

#### I4 — PDF contains raw badge IDs, not human-readable text (minor rendering issue)
**File:** `ClinicalReportScreen.tsx:115`
```ts
b.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
```
This works for `animals_easy` → "Animals Easy" ✅  
But emits `🏆 Animals Easy` without a badge date or category context.  
**Fix (optional):** Add a small badge metadata map so PDFs read "Animals – Beginner Level (Completed)" instead.

---

#### I5 — `curriculumMastery` in PDF uses inline CSS `width: X%` on divs — broken in react-native-html-to-pdf
**File:** `ClinicalReportScreen.tsx:103`
```html
<div style="background: #6366f1; height: 100%; width: ${m.percentage}%;">
```
**Problem:** `react-native-html-to-pdf` uses a webkit WebView renderer. CSS percentage widths inside a div with `position: relative` may render as 0 in some versions.  
**Fix:** Use inline pixel widths:
```ts
const barPx = Math.round((m.percentage / 100) * 400); // 400px is approx full width in PDF
`<div style="background: #6366f1; height: 100%; width: ${barPx}px;">` 
```

---

### 🟢 NICE TO HAVE (Future Iteration)

#### N1 — Session concept is missing
Right now every word attempt is independently recorded. There's no concept of a "session" (start time → end time, words attempted in that session). A therapist reviewing sessions needs this.  
**Recommendation:** Add a `SessionRecord` type and save a session summary whenever the user navigates away from `SpeechAssessmentScreen`.

#### N2 — No data export backup / restore
All data lives in `RNFS.DocumentDirectoryPath`. If the child's phone is wiped or replaced, all clinical history is lost.  
**Recommendation:** Add "Backup to file" (export JSON) and "Restore from file" buttons in Settings.

#### N3 — Waveform animation is decorative only
The 15 `waveAnims` in `SpeechAssessmentScreen` are never driven by actual audio amplitude — they're static `Animated.Value(5)`. This is fine visually but could be confusing if a child thinks the animation means it "heard" them.  
**Recommendation:** Either animate them randomly while recording (to signal "I'm listening") or replace with a simple pulsing circle.

#### N4 — `require('../../assets/ar/vocabulary-data.json')` called inside engine methods
**File:** `speechAssessment.ts:443, 547`  
Calling `require()` inside a function that runs on every progress update is fine in Metro (it's cached), but it's an anti-pattern — the JSON is re-referenced on each call. Move it to a module-level constant.

---

## 3. Recommended Data Model (Simple, Clinically Robust)

```ts
// progress.json (existing, extended)
interface UserProgress {
  items: {
    [word: string]: {
      stars: number;          // 0 or 1
      bestScore: number;      // 0-100
      isLearned: boolean;
      attempts: number;
      firstAttempted: string; // ISO date  ← ADD
      lastAttempted: string;  // ISO date  ← ADD
    };
  };
  badges: string[];
  totalStars: number;
  totalAttempts: number;
  streak: number;             // ← ADD (real)
  lastUsedDate: string;       // ← ADD (ISO date string, date only)
}

// pronunciation_history.json (existing, increase cap to 200)
// Keep as-is, just raise the limit

// weekly_summary.json  ← NEW (simple, therapist-friendly)
interface WeeklySummary {
  [weekKey: string]: {          // e.g. "2026-W18"
    attempts: number;
    avgScore: number;
    wordsAttempted: string[];
    newWordsMastered: string[];
  };
}
```

---

## 4. Fix Priority Checklist

```
[x] C1 — Raise history cap to 200 entries  ✅ saveToHistory() capped at 200; weekly_summary.json added for long-term rollup
[x] C2 — Badge unlock: bestScore >= 90  ✅ updateProgress() uses >= 90 threshold
[x] C3 — BarChart: normalise to max value, not 100  ✅ AnalyticsCharts.tsx uses maxValue
[x] C4 — Clinical note: use diff > 10 threshold  ✅ generateClinicalNote() checks diff > 10 / < -10
[x] C5 — Add firstAttempted / lastAttempted to progress items  ✅ Both timestamps written in updateProgress()
[x] I1 — Implement real streak  ✅ Consecutive-day streak tracked via lastUsedDate; displayed in ProgressScreen stats
[x] I2 — Use composite score for overallAccuracy  ✅ getClinicalReport() averages h.score (10-100), not phoneticAccuracy
[x] I3 — Add null-guard / empty-state to ClinicalReportScreen  ✅ Empty state shown when attempts === 0 and no trend data
[x] I5 — Fix PDF progress bar CSS to use pixel widths  ✅ barPx = Math.round((percentage/100)*400) used in PDF template
[x] BONUS — weekly_summary.json persistence  ✅ saveWeeklySummary() writes ISO-week rollups after every assessment
```

**Total estimated effort for all Critical + Important fixes: ~1 hour**

---

## 5. What the Report Already Gets Right (Keep These)

- ✅ Clinical note is auto-generated and contextual
- ✅ Strengths vs. Areas for Growth breakdown is clinician-friendly language
- ✅ Response time per difficulty level is a real clinical signal
- ✅ "Most Challenging Vocabulary" section directly guides therapy focus
- ✅ PDF share flow works end-to-end
- ✅ User standing / milestone system is motivational and appropriate for the target population

---

## 6. Simple Architecture That Scales for Real Clinical Use

```
SpeechAssessmentScreen
    ↓ startAssessment(word)
    ↓ stopAssessment(category, difficulty)
         → calculateProScore()          [Phonetic + Character + Timing]
         → saveToHistory()              [Ring buffer, max 200]
         → updateProgress()             [Stars, badges, timestamps, streak]
         → saveWeeklySummary()          [NEW — aggregate for therapist timeline]

ProgressScreen (Student View)
    ← getAnalytics()                   [Category %, stars, standing]
    ← LineChart (last 10 scores)

ClinicalReportScreen (Therapist View)
    ← getClinicalReport()              [Aggregates history + progress]
    → generatePDF()                    [HTML → PDF → Share]
```

The architecture is **already clean and correct**. No major refactor needed — just the targeted fixes above.
