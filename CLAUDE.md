# Craftfolio — Project Spec (CLAUDE.md)

## What We're Building

A mobile app for crafters to log finished projects, remember what materials they used, and share their work with friends. Think of it as a digital version of the physical craft journals people already buy — but searchable, photo-first, and shareable via web link.

**Tagline:** "Your handmade portfolio."
**App name:** Craftfolio
**Domain:** getcraftfolio.com
**Status:** In development — v1 feature complete, polishing phase

---

## Core Problem

Crafters make things for people, give them away, and forget about them. They also forget what materials they used and what they learned. Physical journals exist for this but they're not searchable, can't hold real photos, and you leave them at home. The one existing mobile app in this space (MakerLog) has 2 ratings and a broken free tier.

---

## Target User

Multi-craft hobbyists. People who do knitting, crocheting, needlepoint, sewing, resin work, embroidery, and other crafts — sometimes several. Not just knitters. The app must be craft-agnostic.

Primary user: Hannah (girlfriend, vet, does 7+ craft types, already bought a physical journal for this purpose).

---

## Tech Stack

| Layer | Tool | Notes |
|---|---|---|
| Mobile app | Expo (React Native) | Cross-platform iOS + Android from one codebase. Best Claude Code compatibility. |
| Database + Auth | Supabase (PostgreSQL) | Same pattern as tightdraw. Direct client access from app where safe. |
| Backend functions | Supabase Edge Functions | Serverless. Used for AI label scanning and any other server-side logic. API keys never in the app binary. Deploy to us-east-1. |
| AI extraction | Anthropic API (claude-haiku) | Called from Edge Functions only. Used for photo-to-material extraction. |
| Payments | RevenueCat | Handles both iOS and Android in-app purchase logic. Integrated in MVP. |
| Shareable links | Web URLs at getcraftfolio.com | Public read-only web views, no app required to view. Subtle "get the app" banner for organic acquisition. |
| Auth providers | Supabase Auth | Email + Google + Apple sign-in. Apple sign-in required by App Store if any social login is offered. |

**Key rule:** The Anthropic API key lives only in Supabase Edge Functions environment variables. Never in the mobile app binary.

---

## Design Language

The app must feel warm, soft, and handmade. Reference: Ribblr's aesthetic.

**Mascot:** Red panda with a knitting needle tucked behind its ear like a hairpin. Name TBD. Generate using DALL-E 3 / ChatGPT with this prompt:
> "Cute chibi red panda, soft pastel illustration style, small knitting needle tucked behind ear like a hairpin, friendly round eyes, warm lavender and cream color palette, clean white background, app mascot style, no sharp edges, rounded shapes, sticker-style illustration"

Iterate until the style feels right. Need 3-4 final poses: waving, neutral/idle, holding something craft-related, and a flat icon version for the app icon.

**Primary brand color:** Warm lavender — hex #C3B1E1. Soft, not aggressively purple. Pairs with cream (#FAF8F5) backgrounds and complements the red panda's warm orange-red tones. Use lavender for CTAs, active tab indicators, buttons, and highlights.

**Visual principles:**
- Kakao Friends flat style
- Red panda colors (muted dusty terracotta, not bright red)
- Cream face patches, rounded ears
- Lavender yarn ball on top of head
- Head only, no body

**This is not negotiable for v1.** A technically functional but visually wrong app will not get traction in this market.

---

## Data Model

### craft_types (seeded lookup table)
- id (uuid, PK)
- name (text, unique) — e.g. "Knitting", "Crochet", "Needlepoint", "Sewing", "Resin", "Embroidery", "Macramé", "Weaving", "Quilting", "Cross Stitch", "Felting", "Candle Making", "Jewelry Making", "Scrapbooking"
- is_custom (bool, default false) — true for user-submitted craft types

Seed with ~30 common crafts. Allow custom entry that saves back to this table.

### users
- id (uuid, PK)
- email
- display_name
- avatar_url
- created_at
- portfolio_slug (unique — used for share URLs e.g. getcraftfolio.com/u/hannah)
- is_paid (bool, default false) — flipped by RevenueCat webhook on purchase

### projects
- id (uuid, PK)
- user_id (FK → users)
- title
- craft_type_id (FK → craft_types)
- made_for (text, nullable — recipient name)
- date_completed (date, nullable)
- pattern_source (text, nullable — free text or URL)
- technique_notes (text, nullable)
- is_shareable (bool, default false — requires paid account)
- created_at
- updated_at

### project_photos
- id (uuid, PK)
- project_id (FK → projects)
- storage_url
- is_cover (bool) — first photo is cover by default
- sort_order (int)
- created_at

### materials
- id (uuid, PK)
- user_id (FK → users)
- material_type (text, nullable — "yarn", "thread/floss", "fabric", "resin", "needle", "hook", "other")
- brand (text, nullable)
- name (text, nullable — yarn line or colorway name e.g. "Cascade 220", "Brownie Points")
- color_name (text, nullable)
- color_code (text, nullable — manufacturer color number e.g. DMC #321)
- dye_lot (text, nullable — batch number, distinct from color code, critical for yarn matching across skeins)
- fiber_content (text, nullable — e.g. "100% merino wool", "80% acrylic 20% wool")
- yarn_weight (text, nullable — "Lace (0)", "Fingering (1)", "Sport (2)", "DK (3)", "Worsted (4)", "Aran (5)", "Bulky (6)", "Super Bulky (7)", "Jumbo (8)")
- yardage_per_skein (numeric, nullable)
- weight_per_skein_grams (numeric, nullable)
- needle_size_mm (numeric, nullable — for needles/hooks, metric is universal)
- needle_size_us (text, nullable — US equivalent e.g. "US 7")
- needle_type (text, nullable — "straight", "circular", "DPN", "interchangeable", "crochet hook")
- needle_material (text, nullable — "bamboo", "metal", "wood", "plastic")
- cable_length_inches (numeric, nullable — for circular needles only)
- notes (text, nullable)
- is_favorited (bool, default false)
- quantity_in_stash (numeric, nullable — NULL = not tracking. Reserved for v2 stash feature. Do NOT expose in v1 UI.)
- created_at

### project_materials (join table)
- id (uuid, PK)
- project_id (FK → projects)
- material_id (FK → materials)
- quantity_used (text, nullable — free text e.g. "2 skeins", "about 200 yards", "half a ball")
- usage_notes (text, nullable)

---

## Screens / User Flows

### Onboarding
1. Splash screen with mascot
2. Sign up / Log in (email, Google, or Apple)
3. Set display name + optional avatar

### Main App (Tab Navigation)
- **Journal** (home) — photo-forward grid of finished projects, newest first
- **Add Project** — FAB/plus button
- **Materials** — favorited materials list
- **Profile** — settings, share portfolio link, upgrade prompt

### Project Creation Flow
1. Add photos (camera or library, multiple, reorderable, first = cover)
2. Fill details: title, craft type (dropdown), made for, date completed
3. Add materials: photo scan or manual (repeatable)
4. Technique notes (free text)
5. Pattern source (optional)
6. Save

### Material Entry
- **Option A:** Photo of label → Edge Function → Claude haiku → pre-fills fields → user confirms
- **Option B:** Manual — user picks material_type first, then sees only relevant fields
- Heart icon to save to favorites after adding

**Field display is driven by material_type, not craft type.** A crocheter can still log embroidery floss; the form shows thread fields if they pick "thread/floss" as the material type. Craft type on the project is a tag only — it does not restrict which materials can be added.

Field groups by material_type:
- **yarn:** brand, name/colorway, color_name, color_code, dye_lot, fiber_content, yarn_weight, yardage_per_skein, weight_per_skein_grams
- **thread/floss:** brand, color_name, color_code (e.g. DMC #321), fiber_content, notes
- **needle/hook:** needle_type, needle_size_mm, needle_size_us, needle_material, cable_length_inches (circulars only)
- **fabric:** brand, color_name, fiber_content, notes
- **resin / other:** brand, color_name, notes

Never show all columns at once. Only render fields relevant to the selected material_type.

### Sharing
- Per project: toggle shareable → getcraftfolio.com/p/[id]
- Portfolio: getcraftfolio.com/u/[slug] — all shareable projects
- Web views require no app or account to view
- "Download Craftfolio" banner at bottom of web view
- Sharing requires paid account

---

## Monetization

- **Free tier:** Up to 10 projects, manual material entry only, no shareable links
- **One-time purchase ($4.99):** Unlimited projects + AI material scanning + shareable links
- No subscription. Ever.
- RevenueCat webhook flips is_paid on purchase

---

## MVP Scope (v1.0)

Build this. Nothing else.

- User auth (email + Google + Apple)
- Create / edit / delete projects
- Multiple photos per project, reorderable
- Craft type dropdown (seeded + custom)
- Material entry: photo scan (AI) + manual fallback
- Favorited materials list
- Portfolio grid view
- Shareable project + portfolio links (paid)
- One-time purchase via RevenueCat
- Web views for share links (no app required)
- "Download Craftfolio" banner on web views

**Out of scope for v1:**
- Social features, followers, discovery
- WIP/in-progress project tracking
- Stash quantity tracking (planned v2 — schema pre-positioned, see below)
- Pattern library or PDF viewer
- Push notifications
- Android-specific polish (iOS first)

---

## V2 — Stash Feature (In Development)

### Core Concept
The stash is an inventory of materials the user owns. Any material can optionally
be "in stash" with a quantity tracked. The Materials tab becomes the primary stash
view. Favoriting still works within the stash.

A material with quantity_in_stash = NULL exists as a reference only (used in
projects, can be favorited) but is not tracked as inventory. A material with
quantity_in_stash set (even 0) is a stash item.

### Schema Changes Required
Migration 00004_stash.sql:
- quantity_in_stash already exists (numeric, nullable) — just expose in UI
- ADD COLUMN stash_unit text
  values: 'skeins', 'cards', 'yards', 'pieces', null for needles/hooks
- ADD COLUMN stash_status text DEFAULT 'in_stash'
  values: 'in_stash', 'used_up', 'reserved'

### Units by Material Type
- yarn → skeins (decimal ok, e.g. 2.5)
- thread/floss → skeins OR cards (user picks per item)
- fabric → yards (decimal ok, e.g. 2.5)
- needle/hook → no unit, no quantity, just exists in stash, NEVER decrements
- resin/other → pieces (whole numbers)

### Auto-Decrement Rules
When a material is linked to a project via project_materials:
1. If material has quantity_in_stash = NULL → skip, no action
2. If material is needle/hook → skip, never decrement
3. If quantity_used is numeric and unit matches stash_unit → subtract
4. If result would go below 0 → warn user "You only have X left, continue?"
   then floor at 0 if confirmed
5. If quantity_used is free text or units don't match → skip, no error
6. When quantity hits 0 → prompt "Mark as Used Up?"

### quantity_used Behavior
- Stash materials: numeric field + unit selector in project_materials
- Non-stash materials: free text (existing behavior unchanged)

### UI — Materials Tab
Two sub-tabs:
- Stash: all materials where quantity_in_stash is non-null
  - Grouped by material_type
  - Shows quantity + unit (e.g. "2.5 skeins", "3 cards", "in stash" for needles)
  - Stash status badge: In Stash (green), Used Up (gray), Reserved (lavender)
  - Heart icon for favoriting within stash
  - "Show Used Up" toggle — hidden by default
  - Tap card to edit
- Favorites: all materials where is_favorited = true (existing behavior)

### Stash Card Display
- Material type badge (existing style)
- Display name from getMaterialDisplayName()
- Quantity + unit OR "In Stash" for needles/hooks
- Stash status badge
- Heart icon

### Adding Material to Stash
In AddMaterialScreen, after material_type is selected:
- Show "Add to Stash?" toggle (default off)
- If toggled on:
  - yarn/thread/fabric/resin: show quantity field + unit selector
  - needle/hook: no quantity field, just adds to stash
- User can also add to stash later by editing the material

### Adding from Stash to a Project
In AddMaterialScreen when reached from a project context:
- Show "Add from Stash" button at top (alongside existing "Scan Label")
- Opens searchable/filterable list of stash materials
- Filter: only show stash_status = 'in_stash' (not used_up, not reserved)
- Selecting pre-fills all material fields
- quantity_used becomes numeric + unit selector for stash materials
- On save: trigger auto-decrement check

### Bulk Add (Same Brand, Different Colorways)
After saving a material that has brand/name set:
- Show prompt: "Add another colorway of [brand — name]?"
- Options: "Yes, same yarn" / "Done"
- If "Yes": reopen form with everything pre-filled EXCEPT:
  - color_name (cleared)
  - color_code (cleared)
  - dye_lot (cleared)
- Repeat until user taps "Done"
- Works for any material type, not just yarn

### Stash Status Management
- User can manually change status from stash card (tap → edit)
- Used Up: visually muted in stash list, hidden by default
- Reserved: shown normally, lavender badge
- Auto-decrement to 0 triggers "Mark as Used Up?" prompt

### Build Order
1. Schema migration (00004_stash.sql)
2. MaterialsScreen — stash tab + favorites tab
3. AddMaterialScreen — stash toggle + bulk add prompt
4. AddMaterialScreen — add from stash flow
5. Auto-decrement logic in project_materials save

---

## Dev Environment & Workflow

**Developer machine:** Windows with WSL2 (Ubuntu) + VSCode
**Primary test device:** Google Pixel (Android) via Expo Go
**Secondary test device:** Girlfriend's iPhone — use for periodic iOS checks and Apple Developer enrollment when needed

### Local Setup
```bash
# WSL Ubuntu — install dependencies
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
npm install -g expo-cli eas-cli supabase

# Create project
mkdir craftfolio && cd craftfolio
git init
npx create-expo-app . --template blank-typescript
```

### Daily Dev Commands
```bash
# Start Expo dev server (run in WSL, open Expo Go on Pixel)
npx expo start

# Run on Android (Pixel connected via USB or wireless)
npx expo run:android

# iOS build via EAS (cloud build — no Mac needed)
eas build --platform ios --profile development

# Supabase local dev
supabase start
supabase db push
supabase db diff  # check schema drift

# Deploy Edge Function
supabase functions deploy scan-material-label

# Serve Edge Functions locally for testing
supabase functions serve
```

### Testing Workflow
1. **Daily development:** Expo Go on Pixel via `npx expo start` — scan QR code, instant reload on save
2. **iOS checks:** EAS Build cloud build → install on girlfriend's iPhone via TestFlight or direct install link. Do this at major milestones, not daily.
3. **Edge Functions:** Test locally with `supabase functions serve` before deploying
4. **Database changes:** Always run `supabase db diff` before pushing to catch schema drift. Never patch code to match a drifted schema — fix the schema.

### Git Workflow
```bash
# One branch per feature
git checkout -b feature/project-creation
# Commit after each working Claude Code session
git add . && git commit -m "feat: add project creation flow"
```

---

## Edge Function: Material Label Scan

**Endpoint:** `POST /functions/v1/scan-material-label`
**Input:** `{ image_base64: string, mime_type: string }`
**Auth:** Requires valid Supabase JWT in Authorization header

**Prompt tells Claude to extract:** brand name, color name, color code, material type, weight/specs
**Prompt tells Claude NOT to extract:** price, barcode numbers, care symbols, retailer info, promotional text

**On success:** returns `{ brand, color_name, color_code, material_type, weight_or_specs }`
**On failure:** returns empty fields — app falls back to manual entry silently. Never show scan errors to user.

**Cost:** ~$0.001-0.002/scan with haiku. ~$5-10/month at 1000 active users.

---

## Pre-Build Checklist

- [x] App concept validated with target user
- [x] Spec written
- [x] App name decided — Craftfolio
- [x] Domain purchased — getcraftfolio.com (Cloudflare)
- [x] Mascot generated — red panda with knitting needle hairpin
- [x] Primary brand color decided — warm lavender #C3B1E1
- [ ] Apple Developer account ($99/year) — not needed yet, Android first
- [x] Supabase project created (cloud)
- [x] RevenueCat account created (free to start)
- [x] Expo / EAS account created (free)

---

## What's Been Built (Current State)

- Email auth (sign up, sign in, sign out, session persistence)
- Project creation flow (photos, details, materials)
- Manual material entry with field groups by material_type
- AI material label scanning via Edge Function (claude-haiku)
- Journal grid view with pull-to-refresh and FAB
- Project detail screen (read-only + edit)
- Photo storage via Supabase Storage (project-photos bucket)
- RevenueCat one-time purchase ($4.99) with usePremium hook
- Shareable links — web views at getcraftfolio.com/p/[id] and /u/[slug]
- Web app at getcraftfolio.com (Next.js, deployed to Vercel)
- Mobile styling pass — cream/lavender brand, mascot integrated
- Mascot assets at assets/images/mascot-neutral.png, mascot-happy.png, mascot-icon.png
- Delete project
- Dev mode for premium feature testing
- Privacy policy at getcraftfolio.com/privacy
- Internal test build submitted to Google Play Console

---

## Schema Notes (Drift from Original Spec)

- uuid_generate_v4() replaced with gen_random_uuid() — Supabase cloud doesn't have uuid-ossp in search path
- Android package name: com.getcraftfolio.app (not com.sleepycornbread.craftfolio)

---

## Known Issues / Backlog

### Bugs
- Needle/hook materials display as "Unnamed Material" when no brand/name is set.
  Fix: derive display name from material_type + key spec (e.g. "Wood Needle — 4.0mm")

### Planned Features (v1 polish)
- Project status field: not started, in progress, completed, abandoned
- Date started field on projects
- Hours logged field on projects (simple editable numeric field, not a timer)
- Filter projects by status on Journal screen
- Photo editing on existing projects (add, remove, reorder)
- Google auth
- Apple auth (blocking for iOS App Store)
- Favorited materials tab (Materials tab currently unbuilt)
- Onboarding flow for new users

### In Development — Stash Feature (v2)
- [ ] Schema migration (00004_stash.sql)
- [ ] MaterialsScreen — stash tab + favorites tab
- [ ] AddMaterialScreen — stash toggle + bulk add prompt
- [ ] AddMaterialScreen — add from stash flow
- [ ] Auto-decrement logic in project_materials save

---

## Claude Code Session Rules

1. **Always read CLAUDE.md at session start**
2. **One feature per session** — narrow prompts only
3. **Schema-first** — run `information_schema.columns` before any DB query
4. **Update CLAUDE.md** after any significant decision or schema change
5. **Never put API keys in the app** — Edge Functions only

### Good session prompt examples
- "Read CLAUDE.md. Create the Supabase schema from the data model section. Seed craft_types with 30 crafts. Do nothing else."
- "Read CLAUDE.md. Build the project creation form — screens 1 and 2 only (photos + basic details). Use the design language section for styling."
- "Read CLAUDE.md. Build the Edge Function for material label scanning. Test it locally with supabase functions serve."

### Bad session prompt examples
- "Build the materials feature" — too broad
- "Build the app" — way too broad

---

## Decisions Log

| Decision | Rationale |
|---|---|
| Craft type = dropdown from seeded table | Prevents typos, keeps data clean, extensible via custom entry |
| Material form fields driven by material_type, not craft type | Materials don't map 1:1 to craft types. A crocheter can use embroidery floss. Decoupling avoids rigid constraints and weird edge cases. |
| Stash tracking = v2 only | Significant scope. Schema pre-positioned with nullable quantity_in_stash. Don't block shipping v1. |
| Shareable links = web view, no app required | Friction kills sharing. Web view + download banner = better organic acquisition |
| RevenueCat in MVP | In-app purchase is painful to retrofit |
| Google + Apple auth in MVP | App Store requires Apple if any social login offered |
| Free tier = 10 projects, manual only | Crafting projects take months — 10 is generous. AI scan as paid incentive keeps free tier costs zero. |
| Primary brand color = warm lavender #C3B1E1 | Warm, soft, complements red panda mascot without clashing. |
| No subscription | Subscription fatigue. One-time purchase fits the audience. |
| AI label scan via Edge Function only | API key cannot live in app binary |
| Mascot = red panda | Distinctive, warm, fits the cozy craft aesthetic |
| Domain = getcraftfolio.com | craftfolio.com and craftfolio.app both taken |
| Dev = Android-first | Developer on Windows/WSL, no Mac. Pixel as primary test device. |

---

## Key Learnings from Tightdraw

1. **Schema-first.** Define data model before any code.
2. **One feature per Claude Code session.**
3. **CLAUDE.md is load-bearing.** Update after every significant change.
4. **LLM extraction needs explicit exclusions.** Tell it what NOT to extract.
5. **Build for detectability.** Bad data will slip through — make it findable.
6. **Isolate the AI step.** Scan fails → silent fallback to manual. Never block user flow.

---

*Last updated: March 2026 — v1 feature complete, polishing phase*