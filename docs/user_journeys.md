# Mizan (ميزان) - User Journeys & State Transitions

> **UI Overhaul Status (2026-11-14):** Mobile UI screens are currently reset to the Clean UI Rebuild Shell (`mobile/app/index.tsx`). The diagram below represents the target/archived journey (archived on `archive/pre-ui-overhaul`) to be rebuilt screen by screen.

```mermaid
flowchart TD
    START([User Opens Mobile App]) --> SPLASH[Root Gatekeeper, ThemeProvider & Typography Preloader: app/_layout.tsx]
    SPLASH --> CHECK_AUTH{Has Valid Session Token?}

    CHECK_AUTH -- No --> LOGIN[Login Screen: app/auth/login.tsx]
    CHECK_AUTH -- Yes --> CHECK_BIZ{Has Registered Business?}

    LOGIN --> DO_LOGIN{Action}
    DO_LOGIN -- Email / Password --> AUTHENTICATE[Authenticate with Credentials]
    DO_LOGIN -- 1-Tap Google --> GOOGLE_AUTH[Google OAuth & Firebase Credential]
    DO_LOGIN -- Sign Up --> REGISTER[Register Screen: app/auth/register.tsx]

    REGISTER --> DO_REG{Action}
    DO_REG -- Email / Password --> CREATE_ACC[Create Account & User Profile]
    DO_REG -- 1-Tap Google --> GOOGLE_AUTH
    CREATE_ACC --> ONBOARDING[Mandatory Onboarding: app/onboarding/business.tsx]
    GOOGLE_AUTH --> CHECK_BIZ_AFTER_LOGIN

    AUTHENTICATE --> CHECK_BIZ_AFTER_LOGIN{Has Registered Business?}
    CHECK_BIZ_AFTER_LOGIN -- No --> ONBOARDING
    CHECK_BIZ_AFTER_LOGIN -- Yes --> DASHBOARD

    CHECK_BIZ -- No --> ONBOARDING
    CHECK_BIZ -- Yes --> DASHBOARD[Main Platform Dashboard: app/tabs/index.tsx]

    subgraph Mandatory Onboarding Wizard
        ONBOARDING --> CHOOSE_MODE{Entry Method}
        CHOOSE_MODE -- 📷 Scan Camera --> AUTO_PERM[Auto Camera Permission & Snap]
        AUTO_PERM --> AI_OCR[AI Vision OCR Extraction]
        CHOOSE_MODE -- 📁 Upload File --> PICKER[Photo / PDF Document Picker]
        PICKER --> AI_OCR
        AI_OCR --> PREFILL[Pre-populate Fields & Switch to Form]
        CHOOSE_MODE -- ✍️ Enter Manually --> STEP1
        PREFILL --> STEP1[Step 1: Legal Entity Type & Trade Name]
        STEP1 --> STEP2[Step 2: Jurisdiction, Licensing Authority & Emirate]
        STEP2 --> STEP3[Step 3: Revenue & Tax Profile - SBR / VAT TRN]
        STEP3 --> SUBMIT_BIZ[Persist Business Entity in Backend]
        SUBMIT_BIZ --> DASHBOARD
    end

    subgraph Authenticated Product Surfaces
        DASHBOARD --> BOOKS[Bookkeeping & Ledger: app/tabs/books.tsx]
        DASHBOARD --> INVOICES[Bilingual Invoicing: app/tabs/invoices.tsx]
        DASHBOARD --> TAX[Corporate Tax & VAT Filings: app/tabs/tax.tsx]
        DASHBOARD --> SCANNER[Trade License & OCR Scanner: app/tabs/scan.tsx]
        DASHBOARD --> PROFILE[Entity Switcher & Settings: app/tabs/profile.tsx]
        DASHBOARD --> CT_TRACKER[CT Registration Tracker: FTA Dec 3/2024 Countdown]
        DASHBOARD --> SYNC_STATUS[Sync Status Pill: Online/Offline Queue Flush]

        INVOICES --> NEW_INV[New Tax Invoice: app/invoices/new.tsx]
        NEW_INV --> TRN_VAL[Article 59 15-Digit TRN Real-Time Validation]
        NEW_INV --> ITEM_PRESETS[Quick Templates: Consulting, Software, Legal, Export]

        BOOKS --> BANK_IMPORT[Deterministic Bank CSV Importer: ENBD, ADCB, FAB, Wio]
        BOOKS --> EXP_REVIEW[Review Expenses: app/expenses/review.tsx]
        EXP_REVIEW --> CAT_MODAL[Expense Category Selector via SmoothModal]
        EXP_REVIEW --> ENT_SPLIT[Art. 32 Entertainment 50% CT / Blocked VAT Toggle]

        PROFILE --> EDIT_PROFILE[Dedicated Profile Settings: app/profile/edit.tsx]
        PROFILE --> APPEARANCE[Appearance Setting via SmoothModal: System / Light / Dark]
        APPEARANCE --> SPLASH
        PROFILE --> DANGER_ZONE[Delete Business Entity: 2-Step Danger Zone Modal via SmoothModal]
        CT_TRACKER --> TRN_MODAL[15-Digit TRN Verification: SmoothModal Spring Popup]
    end

    PROFILE -- Tap Logout --> LOGOUT[Clear Token & Active State]
    LOGOUT --> LOGIN
```
