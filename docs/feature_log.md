# Mizan (ميزان) - Feature Dependency Graph & Architecture Log

> **UI Overhaul Status (2026-11-14):** Mobile UI screens and visual components were reset to a clean shell for screen-by-screen rebuild (archived on `archive/pre-ui-overhaul`). Backend modules remain intact.

```mermaid
graph TD
    subgraph Identity & Tenant Layer
        AUTH[FEAT-AUTH-01: Production Auth]
        GOOGLE[FEAT-AUTH-04: 1-Tap Google Sign-In]
        GUARD[FEAT-AUTH-03: Route Gatekeeper]
        ONBOARD[FEAT-AUTH-02: Mandatory Business Onboarding]
        ONBOARD_TRI[FEAT-ONBD-02: 3-Way Entry - Scan, Upload, Manual]
        FIRESTORE[FEAT-DATA-01: Cloud Firestore Multi-Tenant Store]
        BIZ_CTX[Business Multi-Entity Context]
        PREFS[FEAT-PREF-01: App Preferences & Silent Defaults]
        BIZ_DEL[FEAT-BIZ-02: Business Entity Deletion & Danger Zone]
        USER_EDIT[FEAT-USER-01: Dedicated Profile Settings & Custom Handle]
        SYNC_QUEUE[FEAT-DATA-02: Offline Queue & Cloud Sync Status Pill]
    end

    subgraph Tax & Regulatory Core
        TAX_ENG[FEAT-TAX-01: Corporate Tax Engine]
        SBR_ENG[FEAT-TAX-02: Small Business Relief 0%]
        VAT_ENG[FEAT-VAT-01: VAT 201 Engine]
        ENT_SPLIT[FEAT-EXP-03: Art. 32 Entertainment 50% Split & Blocked VAT]
        CT_COUNTDOWN[FEAT-DASH-02: CT Registration Deadline Countdown Widget]
    end

    subgraph Operational Tools
        OCR_LIC[FEAT-OCR-01: Trade License OCR]
        OCR_EXP[FEAT-OCR-02: Expense Scanner]
        PERM[FEAT-PERM-01: Auto Camera Permission Prompt]
        INVOICE[FEAT-INV-01: Compliant Invoicing]
        INV_TEMPLATES[FEAT-INV-02: Manual Invoicing Companion & TRN Validator]
        DASH[FEAT-DASH-01: EmaraTax Dashboard]
        AI_ASST[FEAT-AI-01: Grounded AI Assistant - COMING SOON]
        BANK_FEED[FEAT-BANK-02: Direct Live Bank Feeds - COMING SOON]
        SKELETON[FEAT-UI-01: Shimmer Skeleton Placeholders]
        BANK_IMPORT[FEAT-BANK-01: Deterministic Bank CSV Importer - Zero AI]
        TYPO[FEAT-UI-02: Modernist Neo-Khaleeji Typography Engine]
        SMOOTH_MODAL[FEAT-UI-03: Reanimated v4 Motion & Smooth Navigation Engine]
        THEME[FEAT-UI-04: Adaptive Dark Theme Engine]
    end

    AUTH --> GUARD
    GOOGLE --> GUARD
    GUARD --> ONBOARD
    ONBOARD --> ONBOARD_TRI
    ONBOARD_TRI --> OCR_LIC
    ONBOARD_TRI --> FIRESTORE
    PERM --> OCR_LIC
    PERM --> OCR_EXP
    PREFS --> OCR_EXP
    PREFS --> OCR_LIC
    FIRESTORE --> BIZ_CTX
    BIZ_CTX --> DASH
    BIZ_CTX --> TAX_ENG
    BIZ_CTX --> SBR_ENG
    BIZ_CTX --> VAT_ENG
    BIZ_CTX --> INVOICE
    BIZ_CTX --> OCR_LIC
    BIZ_CTX --> OCR_EXP
    BIZ_CTX --> BIZ_DEL
    BIZ_CTX --> USER_EDIT
    BIZ_CTX --> CT_COUNTDOWN
    OCR_EXP --> ENT_SPLIT
    ENT_SPLIT --> VAT_ENG
    ENT_SPLIT --> TAX_ENG
    BANK_IMPORT --> BIZ_CTX
    BANK_IMPORT --> ENT_SPLIT
    SYNC_QUEUE --> FIRESTORE
    SKELETON --> DASH
    TYPO --> DASH
    TYPO --> INVOICE
    TYPO --> CT_COUNTDOWN
    SMOOTH_MODAL --> DASH
    SMOOTH_MODAL --> INVOICE
    SMOOTH_MODAL --> CT_COUNTDOWN
    SMOOTH_MODAL --> BIZ_DEL
    SMOOTH_MODAL --> AI_ASST
    INVOICE --> INV_TEMPLATES
    TAX_ENG --> AI_ASST
    PREFS --> THEME
    THEME --> DASH
    THEME --> INVOICE
    THEME --> SMOOTH_MODAL
    THEME --> SKELETON
    THEME --> CT_COUNTDOWN
    THEME --> AI_ASST
```

### Dependency Audit
- **Entry Security**: Users entering the mobile application must pass `AUTH` and verify identity.
- **Entity Pre-condition**: `DASH`, `TAX_ENG`, and `INVOICE` require `activeBusiness` with a valid `tradeLicenseNumber` and jurisdiction configuration.
- **Onboarding Gate**: If `businesses.length == 0`, the navigation stack intercepts routing and locks into `ONBOARD` until valid company details are committed.
- **Adaptive Theming**: `THEME` resolves OS `useColorScheme()` against the persisted `themeMode` preference (`'system' | 'light' | 'dark'`) via `ThemeProvider` and `expo-system-ui`, while intentionally keeping camera scanner viewfinders dark and exported `expo-print` HTML reports white-paper.
