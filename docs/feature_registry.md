# Mizan (ميزان) - UAE Tax Intelligence Platform: Feature Registry

> **UI Overhaul Status (2026-11-14):** The mobile UI layer (`mobile/app/` screens and `mobile/src/components/` / `animations/`) has been reset to a clean Expo Router shell (`mobile/app/_layout.tsx`, `mobile/app/index.tsx`) for screen-by-screen reconstruction. All `backend/` statutory engines, database schemas, and Firebase Auth/Firestore integrations remain intact (previous UI archived on git branch `archive/pre-ui-overhaul`).

This registry tracks the status, tier, and architectural boundaries of all core platform capabilities.

| Feature ID | Feature Name | Description | Module / Scope | Status |
| :--- | :--- | :--- | :--- | :--- |
| **FEAT-AUTH-01** | Production Authentication | Email/Password, Firebase Identity Engine & Session Persistence | `mobile/src/services` & `backend/src/auth` | Active |
| **FEAT-AUTH-02** | Mandatory Business Onboarding | Non-skippable UAE Trade License & Legal Entity registration flow | `mobile/app/onboarding/business.tsx` | Active |
| **FEAT-ONBD-02** | 3-Way Trade License Entry | Tri-modal onboarding: 📷 Camera OCR, 📁 PDF Document & Image Picker (`expo-document-picker`) with permission gating, or ✍️ Manual Form | `mobile/app/onboarding/business.tsx` | Active |
| **FEAT-PREF-01** | App Preferences & Feedback | Global toggle for Haptics & Camera Shutter Sound (both default OFF) | `mobile/src/utils/preferences.ts` & `mobile/app/(tabs)/profile.tsx` | Active |
| **FEAT-PERM-01** | Auto Camera Permission | Automatic native OS permission prompt upon screen mount without manual button clicks | `mobile/app/scan/index.tsx` & `mobile/app/expenses/scan.tsx` | Active |
| **FEAT-AUTH-03** | Gatekeeper Route Guard | Strict session & entity gating prohibiting unauthorized tab access | `mobile/app/index.tsx` & `mobile/app/(tabs)/_layout.tsx` | Active |
| **FEAT-AUTH-04** | 1-Tap Google Sign-In | Native Google OAuth authentication via Firebase Auth and Google Play Services, guarded lazily via `TurboModuleRegistry.get('RNGoogleSignin')` for safe Expo Go / Web fallback | `mobile/src/services/googleAuth.ts`, `mobile/app/auth` & `mobile/android` | Active |
| **FEAT-DATA-01** | Cloud Firestore Data Layer | Serverless multi-tenant NoSQL data store with hardened Security Rules (`firestore.rules`) | `mobile/src/services/firestore.service.ts` & `firestore.rules` | Active |
| **FEAT-TAX-01** | UAE Corporate Tax Engine | Federal Decree-Law No. 47/2022 & 9% calculation above AED 375k | `backend/src/tax-engine` & `mobile/app/(tabs)/tax.tsx` | Active |
| **FEAT-TAX-02** | Small Business Relief (SBR) | Ministerial Decision No. 73/2023 0% relief calculation up to AED 3M | `backend/src/tax-engine` | Active |
| **FEAT-VAT-01** | VAT 201 Engine | Federal Decree-Law No. 8/2017 5% Standard, 0% Zero-Rated & Exempt | `backend/src/tax-engine` | Active |
| **FEAT-OCR-01** | Trade License OCR | Automated recognition of UAE Trade Licenses across all 7 Emirates | `backend/src/ocr` & `mobile/app/scan` | Active |
| **FEAT-OCR-02** | Expense & Receipt Scanner | Receipt OCR parsing with VAT extraction and categorization | `mobile/app/expenses/scan.tsx` | Active |
| **FEAT-INV-01** | UAE Compliant Tax Invoicing | Bilingual Arabic/English tax invoices with QR & TRN formatting | `backend/src/invoicing` & `mobile/app/(tabs)/invoices.tsx` | Active |
| **FEAT-INV-02** | Manual Invoicing Companion & TRN Validator | 15-digit Article 59 TRN format validation & 1-tap manual item templates (Consulting, Software, Legal, Export) | `mobile/app/invoices/new.tsx` | Active |
| **FEAT-AI-01** | Grounded Tax AI Assistant | Statutory FTA-grounded advisory with zero hallucination guarantee | `backend/src/ai` & `mobile/app/learn/chat.tsx` | Coming Soon (Regulatory Review) |
| **FEAT-BANK-02** | Direct Open Banking Feeds | Real-time bank synchronisation via CBUAE Open Finance framework | `mobile/app/(tabs)/index.tsx` & `mobile/src/services/bank.ts` | Coming Soon (CBUAE Open Finance) |
| **FEAT-DASH-01** | EmaraTax Calendar & Deadlines | Automated tax filing calendars & trade license renewal tracking | `backend/src/dashboard` & `mobile/app/(tabs)/index.tsx` | Active |
| **FEAT-UI-01** | Shimmer Skeleton Screens | Replaced blank ActivityIndicator loaders with layout-matching skeleton screens across Dashboard, Books, Invoices, Tax | `mobile/src/components/Skeleton.tsx` | Active |
| **FEAT-BIZ-02** | Business Entity Deletion | Full multi-entity lifecycle deletion with Cloud Firestore cascade & PostgreSQL audit cleanup | `mobile/app/(tabs)/profile.tsx` & `backend/src/business` | Active |
| **FEAT-USER-01** | Dedicated Profile Settings | Dedicated settings route (`/profile/edit`), custom username `@handle`, photo picker, organization name | `mobile/app/profile/edit.tsx` | Active |
| **FEAT-EXP-03** | Article 32 Entertainment Smart-Split | Automated 50% CT deduction limit & 100% blocked VAT recovery under Art. 53 of CD 52/2017 | `mobile/app/expenses/review.tsx` & `backend/src/tax` | Active |
| **FEAT-DASH-02** | CT Registration Deadline Tracker | FTA Decision No. 3 of 2024 staggered countdown widget with AED 10k penalty shield | `mobile/src/components/CtRegistrationCountdownWidget.tsx` | Active |
| **FEAT-BANK-01** | Deterministic Bank Statement Importer | 100% deterministic local CSV/Excel parser for ENBD, ADCB, FAB, Wio with CBUAE rates & ZERO Gemini AI dependency | `mobile/src/utils/bankStatementParser.ts` & `mobile/app/(tabs)/books.tsx` | Active |
| **FEAT-DATA-02** | Offline Mode & Cloud Sync Queue | Local mutation queuing (`AppStorage`) with header sync status pill (`🟢 Synced` / `🟠 Pending`) | `mobile/src/utils/offlineQueue.ts` & `mobile/src/components/SyncStatusPill.tsx` | Active |
| **FEAT-UI-02** | Modernist Neo-Khaleeji Typography | Unified typography engine: Outfit (Display), DM Sans (UI/Body), Cairo (Arabic), and DM Mono (Financials & TRN) with zero-shift preloading | `mobile/src/theme/tokens.ts`, `mobile/app/_layout.tsx`, `mobile/assets/fonts` | Active |
| **FEAT-UI-03** | Smooth Spring Modal Engine | Zero-distortion Reanimated spring modal (`SmoothModal`) with hardware-translucent backdrop & native window lock | `mobile/src/components/SmoothModal.tsx`, `mobile/src/animations` | Active |
| **FEAT-UI-04** | Adaptive Dark Theme & System Color Scheme | Persisted `'system' \| 'light' \| 'dark'` appearance engine via `ThemeContext`, `useThemedStyles`, dual light/dark palettes, `expo-system-ui` root background sync, and Profile Appearance selector (camera viewfinders kept dark; `expo-print` HTML kept light-paper) | `mobile/src/context/ThemeContext.tsx`, `mobile/src/theme/tokens.ts`, `mobile/app/` & `mobile/src/` | Active |
