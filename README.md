# just-tell-me-what-to-cook (V1)

A mobile-first MVP that turns pantry chaos into up to three doable meal ideas.

## Why this stack
- **Next.js (App Router) + Vercel**: mainstream, simple deploy, and API routes for AI without extra servers.
- **No database by default**: MVP does not need storage, so we skip extra infra.
- **Gemini 1.5 Flash**: free tier, handles vision + text + audio transcription.

If we add accounts or saved plans later, Supabase is the first pick. Resend is the first pick for email.

## Dependencies (kept intentionally minimal)
- `next`, `react`, `react-dom`: the app framework and runtime.
- `typescript` + `@types/*`: type safety and editor support.

No component library, no animation framework, no extra SDKs.

## Setup

```bash
npm install
```

Create `.env.local`:

```bash
GEMINI_API_KEY=your_key_here
```

Run the app:

```bash
npm run dev
```

## See it like an app
- iOS Safari: Share -> Add to Home Screen.
- Android Chrome: Menu -> Add to Home Screen.

## Core flow
1. Upload 1-3 photos of supplies OR record a voice note (with text fallback).
2. Ingredients are extracted into editable chips.
3. Meal ideas generate automatically (default energy = low).
4. Change energy, add/remove ingredients, or refresh ideas as needed.
5. If extraction confidence is low, the app asks one clarifying question.

## Notes
- Images are only processed in memory and sent to the AI for extraction.
- No user accounts or pantry storage in V1.
- Energy level drives number of steps and overall complexity.

## Manual QA checklist
- Photo upload accepts 1-3 images and returns ingredient chips.
- Voice record works in Chrome mobile; text fallback works when recording is unsupported.
- Chips allow removing and adding ingredients before generating meals.
- Energy selection changes the meal complexity (fewer steps for low energy).
- Low-confidence extraction shows a single clarifying question.
- UI feels mobile-first, spacious, and avoids card grids/templates.
- Add to Home Screen shows a standalone, app-like experience.

## Next steps (optional)
1. Add a lightweight image preview optimizer and size cap for uploads.
2. Let users save a short history locally (localStorage only).
3. Add a shareable "plan card" that formats the chosen meal for notes apps.
