#!/usr/bin/env python3
# ==============================================================================
# Mizan (ميزان) - End-to-End QA Testing & User Journey Guide PDF Generator
# ==============================================================================

import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    PageBreak,
    KeepTogether,
    HRFlowable,
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_number(num_pages)
            super(NumberedCanvas, self).showPage()
        super(NumberedCanvas, self).save()

    def draw_page_number(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748B"))
        
        # Header (pages > 1)
        if self._pageNumber > 1:
            self.drawString(54, 755, "Mizan (ميزان) UAE Tax Intelligence — End-to-End QA Testing Guide")
            self.setStrokeColor(colors.HexColor("#E2E8F0"))
            self.setLineWidth(0.5)
            self.line(54, 747, 558, 747)
            
        # Footer
        page_text = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(558, 36, page_text)
        self.drawString(54, 36, "CONFIDENTIAL — STRICTLY FOR INTERNAL TESTING & AUDIT ASSURANCE")
        self.setStrokeColor(colors.HexColor("#E2E8F0"))
        self.setLineWidth(0.5)
        self.line(54, 48, 558, 48)
        self.restoreState()

def build_pdf(filename="Mizan_UAE_Tax_QA_Test_Guide.pdf"):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54,
    )

    styles = getSampleStyleSheet()

    # Custom Color Palette
    PRIMARY = colors.HexColor("#F95700")       # Mizan Desert Orange
    PRIMARY_DARK = colors.HexColor("#D64600")
    DARK_HERO = colors.HexColor("#18191B")      # Charcoal
    TEXT_MAIN = colors.HexColor("#0F172A")      # Slate 900
    TEXT_MUTED = colors.HexColor("#475569")     # Slate 600
    BORDER_COLOR = colors.HexColor("#E2E8F0")   # Light border
    BG_LIGHT = colors.HexColor("#F8FAFC")
    SUCCESS = colors.HexColor("#10B981")
    WARNING = colors.HexColor("#F59E0B")

    # Typography Styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=DARK_HERO,
        spaceAfter=4,
    )

    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=11,
        leading=15,
        textColor=TEXT_MUTED,
        spaceAfter=12,
    )

    h1_style = ParagraphStyle(
        'Heading1',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=14,
        leading=18,
        textColor=PRIMARY,
        spaceBefore=14,
        spaceAfter=8,
    )

    h2_style = ParagraphStyle(
        'Heading2',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=15,
        textColor=DARK_HERO,
        spaceBefore=10,
        spaceAfter=4,
    )

    body_style = ParagraphStyle(
        'BodyText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=TEXT_MAIN,
        spaceAfter=6,
    )

    bullet_style = ParagraphStyle(
        'BulletText',
        parent=body_style,
        leftIndent=12,
        firstLineIndent=-12,
        spaceAfter=3,
    )

    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.white,
    )

    table_cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=11,
        textColor=TEXT_MAIN,
    )

    table_cell_bold = ParagraphStyle(
        'TableCellBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=11,
        textColor=DARK_HERO,
    )

    callout_style = ParagraphStyle(
        'CalloutText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=DARK_HERO,
    )

    elements = []

    # Title & Metadata Card
    elements.append(Paragraph("Mizan (ميزان) UAE Tax Intelligence", title_style))
    elements.append(Paragraph("<b>End-to-End Functional QA Testing & User Journey Verification Guide</b>", ParagraphStyle('Sub', parent=subtitle_style, fontSize=12, textColor=PRIMARY_DARK, fontName='Helvetica-Bold')))
    elements.append(Paragraph("Covers complete user journey from initial signup, trade license OCR onboarding, custom profile editing, business entity deletion, skeleton loaders, and zero-haptics-default to final EmaraTax VAT 201 and Corporate Tax filing.", subtitle_style))
    elements.append(HRFlowable(width="100%", thickness=1.5, color=PRIMARY, spaceBefore=4, spaceAfter=12))

    # Meta Info Box
    meta_data = [
        [
            Paragraph("<b>Target Build:</b> Mizan Mobile v1.0.0 (Expo 58 / React Native 0.88)", table_cell_style),
            Paragraph("<b>Target Backend:</b> NestJS Tax Engines (Port 4000 / Cloud API)", table_cell_style),
        ],
        [
            Paragraph("<b>Primary Statutes:</b> Federal Decree-Law No. 47/2022 &amp; No. 8/2017", table_cell_style),
            Paragraph("<b>Test Date:</b> November 2026", table_cell_style),
        ],
    ]
    meta_table = Table(meta_data, colWidths=[250, 254])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), BG_LIGHT),
        ('BOX', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
    ]))
    elements.append(meta_table)
    elements.append(Spacer(1, 14))

    # SECTION 1: Test Environment Setup & Pre-Requisites
    elements.append(Paragraph("1. Test Environment & Pre-Conditions", h1_style))
    elements.append(Paragraph("Before beginning the test walkthrough, ensure the following setup parameters are satisfied:", body_style))
    
    pre_reqs = [
        "<b>Device Support:</b> Android Device or Android Virtual Device (AVD) running Android 11+.",
        "<b>Network Connectivity:</b> Active Wi-Fi or cellular network with internet access for Firebase Auth and Cloud Firestore sync.",
        "<b>Clean State Option:</b> You can either register a fresh user account or use existing test credentials.",
        "<b>Sample Assets Required:</b> One UAE Trade License (PDF or photo) and one UAE VAT Purchase Receipt / Bill (photo or PNG).",
    ]
    for r in pre_reqs:
        elements.append(Paragraph(f"• {r}", bullet_style))
    elements.append(Spacer(1, 10))

    # SECTION 2: Master Test Matrix Table
    elements.append(Paragraph("2. Master User Journey Test Matrix", h1_style))
    elements.append(Paragraph("Execute tests sequentially through all 8 stages. Mark each test as PASS or FAIL on your testing device.", body_style))

    test_rows = [
        [
            Paragraph("<b>ID</b>", table_header_style),
            Paragraph("<b>Test Case &amp; Step Flow</b>", table_header_style),
            Paragraph("<b>Expected Output / Acceptance Criteria</b>", table_header_style),
            Paragraph("<b>Status</b>", table_header_style),
        ],
        # Stage 1: Auth
        [
            Paragraph("<b>TC-01</b>", table_cell_bold),
            Paragraph("<b>App Launch &amp; Default Haptics Verification</b><br/>Launch app from fresh install. Navigate tabs and tap interactive buttons.", table_cell_style),
            Paragraph("<b>Strictly NO haptic vibrations</b> occur on button touches or tab switches (Haptics strictly OFF by default). Root screen verifies session gracefully.", table_cell_style),
            Paragraph("[  ] PASS<br/>[  ] FAIL", table_cell_style),
        ],
        [
            Paragraph("<b>TC-02</b>", table_cell_bold),
            Paragraph("<b>User Registration &amp; Google Sign-In</b><br/>Tap 'Create Account' or 'Sign in with Google' on the Login Screen.", table_cell_style),
            Paragraph("Successful authentication creates JWT token, creates Firebase user session, and advances directly to Trade License Onboarding.", table_cell_style),
            Paragraph("[  ] PASS<br/>[  ] FAIL", table_cell_style),
        ],
        # Stage 2: Onboarding
        [
            Paragraph("<b>TC-03</b>", table_cell_bold),
            Paragraph("<b>Trade License Scan &amp; Bilingual OCR</b><br/>Take photo or select sample UAE trade license in <code>/onboarding/business</code>.", table_cell_style),
            Paragraph("Gemini Vision OCR extracts Legal Name, License #, Emirate, Expiry, and Entity Type with bilingual Arabic/English accuracy.", table_cell_style),
            Paragraph("[  ] PASS<br/>[  ] FAIL", table_cell_style),
        ],
        [
            Paragraph("<b>TC-04</b>", table_cell_bold),
            Paragraph("<b>EmaraTax Classification &amp; SBR Check</b><br/>Review details in Verification screen; enter AED 1,200,000 turnover; tap Save.", table_cell_style),
            Paragraph("Calculates SBR eligible (Article 21 revenue &le; 3M AED). Entity is registered to Firestore &amp; backend and lands on Home Dashboard.", table_cell_style),
            Paragraph("[  ] PASS<br/>[  ] FAIL", table_cell_style),
        ],
        # Stage 3: Skeleton Loaders
        [
            Paragraph("<b>TC-05</b>", table_cell_bold),
            Paragraph("<b>Skeleton Screen Shimmer Verification</b><br/>Pull-to-refresh on Dashboard, Books, Invoices, and Tax Hub tabs.", table_cell_style),
            Paragraph("Smooth animated shimmer skeleton placeholders display matching card geometries instead of generic loading spinners.", table_cell_style),
            Paragraph("[  ] PASS<br/>[  ] FAIL", table_cell_style),
        ],
        # Stage 4: Profile & Account Settings
        [
            Paragraph("<b>TC-06</b>", table_cell_bold),
            Paragraph("<b>Dedicated Edit Profile Screen Navigation</b><br/>Go to Profile tab and tap the user card or 'Account &amp; Profile Settings'.", table_cell_style),
            Paragraph("Navigates to dedicated <code>/profile/edit</code> screen with full-page form (NOT a popup modal).", table_cell_style),
            Paragraph("[  ] PASS<br/>[  ] FAIL", table_cell_style),
        ],
        [
            Paragraph("<b>TC-07</b>", table_cell_bold),
            Paragraph("<b>Custom Username &amp; Display Name Edit</b><br/>In Edit Profile, update full name to 'Rashid Al Maktoum' and handle to 'rashid_uae'; tap Save.", table_cell_style),
            Paragraph("Saves to Firebase Auth and local cache. Does not get overwritten by Google default. Greeting displays 'Hello, Rashid'.", table_cell_style),
            Paragraph("[  ] PASS<br/>[  ] FAIL", table_cell_style),
        ],
        [
            Paragraph("<b>TC-08</b>", table_cell_bold),
            Paragraph("<b>Custom Profile Picture Upload</b><br/>Tap avatar in Edit Profile; choose photo from gallery or camera; tap Save.", table_cell_style),
            Paragraph("Custom photo displays immediately on Edit Profile, Profile card, and Home Header avatar instead of generic initial circle.", table_cell_style),
            Paragraph("[  ] PASS<br/>[  ] FAIL", table_cell_style),
        ],
        # Stage 5: Business Deletion
        [
            Paragraph("<b>TC-09</b>", table_cell_bold),
            Paragraph("<b>Business Entity Deletion (Safety &amp; Execution)</b><br/>In Profile &gt; Manage Business &gt; scroll to 'Danger Zone' &gt; tap 'Delete Business Entity'.", table_cell_style),
            Paragraph("Alert dialog requests confirmation. Confirming permanently deletes entity from Firestore/backend, switches active entity, and updates UI.", table_cell_style),
            Paragraph("[  ] PASS<br/>[  ] FAIL", table_cell_style),
        ],
        # Stage 6: Invoicing
        [
            Paragraph("<b>TC-10</b>", table_cell_bold),
            Paragraph("<b>UAE Article 59 Tax Invoice Generation</b><br/>Tap '+ New Invoice' &gt; add client &gt; add line item &gt; tap 'Issue Tax Invoice'.", table_cell_style),
            Paragraph("Computes 5% VAT; creates sequential immutable invoice number; generates bilingual PDF with Peppol PINT SHA-256 hash.", table_cell_style),
            Paragraph("[  ] PASS<br/>[  ] FAIL", table_cell_style),
        ],
        # Stage 7: Expenses & Books
        [
            Paragraph("<b>TC-11</b>", table_cell_bold),
            Paragraph("<b>Expense OCR &amp; Ledger Posting</b><br/>Tap 'Scan Receipt' &gt; take photo &gt; review extracted VAT amount &gt; tap 'Approve'.", table_cell_style),
            Paragraph("Expense is posted to business books, auto-converted to AED via CBUAE daily rate, and updates P&amp;L balance in Books tab.", table_cell_style),
            Paragraph("[  ] PASS<br/>[  ] FAIL", table_cell_style),
        ],
        # Stage 8: Tax Hub
        [
            Paragraph("<b>TC-12</b>", table_cell_bold),
            Paragraph("<b>Tax Hub VAT 201 &amp; Corporate Tax Return</b><br/>Open Tax Hub tab &gt; inspect VAT Form 201 Box 1 and Box 10 &gt; Corporate Tax SBR toggle.", table_cell_style),
            Paragraph("Deterministic tax liability is calculated from real invoices and expenses; penalty countdown shield displays days to filing.", table_cell_style),
            Paragraph("[  ] PASS<br/>[  ] FAIL", table_cell_style),
        ],
        # Stage 9: Article 32 Entertainment Split
        [
            Paragraph("<b>TC-13</b>", table_cell_bold),
            Paragraph("<b>Article 32 Entertainment 50% Smart-Split</b><br/>In <code>/expenses/review</code>, open dining expense and toggle 'Article 32 Entertainment Split'.", table_cell_style),
            Paragraph("50% CT deductible and 50% add-back are calculated; input VAT is displayed as AED 0.00 (100% blocked under Art. 53 of CD 52/2017).", table_cell_style),
            Paragraph("[  ] PASS<br/>[  ] FAIL", table_cell_style),
        ],
        # Stage 10: CT Registration Countdown Tracker
        [
            Paragraph("<b>TC-14</b>", table_cell_bold),
            Paragraph("<b>Corporate Tax Registration Countdown Widget</b><br/>On Home Dashboard, review the FTA Decision No. 3 of 2024 Tracker card.", table_cell_style),
            Paragraph("Calculates statutory deadline based on license issuance month; warns of AED 10,000 fine (CD 75/2023); allows entering 15-digit CT TRN to resolve.", table_cell_style),
            Paragraph("[  ] PASS<br/>[  ] FAIL", table_cell_style),
        ],
        # Stage 11: Deterministic Bank Statement Importer
        [
            Paragraph("<b>TC-15</b>", table_cell_bold),
            Paragraph("<b>Deterministic Bank Statement CSV Importer</b><br/>In Books tab, tap 'Import CSV' and pick a bank statement file (zero Gemini AI call).", table_cell_style),
            Paragraph("Parses ENBD/ADCB/FAB/Wio formats; auto-converts foreign currencies with CBUAE official rates; tags Art. 32 vendors; commits to books.", table_cell_style),
            Paragraph("[  ] PASS<br/>[  ] FAIL", table_cell_style),
        ],
        # Stage 12: Offline Mode & Sync Status
        [
            Paragraph("<b>TC-16</b>", table_cell_bold),
            Paragraph("<b>Offline Mode &amp; Cloud Sync Status Pill</b><br/>Inspect header sync pill in Dashboard. Observe 'Synced' vs 'Pending'.", table_cell_style),
            Paragraph("Pill dynamically updates to '🟠 N Pending' when offline mutations exist; tapping pill triggers flush and returns to '🟢 Synced'.", table_cell_style),
            Paragraph("[  ] PASS<br/>[  ] FAIL", table_cell_style),
        ],
    ]

    test_table = Table(test_rows, colWidths=[42, 178, 230, 54])
    test_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), DARK_HERO),
        ('ALIGN', (0, 0), (0, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, BG_LIGHT]),
    ]))
    elements.append(test_table)
    elements.append(Spacer(1, 14))

    # SECTION 3: Step-by-Step Walkthrough Details
    elements.append(Paragraph("3. Detailed Step-by-Step QA Walkthrough", h1_style))
    
    walkthrough_steps = [
        ("Step 1: Fresh Installation & Zero-Haptic Check", [
            "Launch the app. Do not touch any settings yet.",
            "Tap on bottom tabs (Home, Books, Invoices, Tax Hub, Profile).",
            "VERIFY: Zero device vibration occurs on any tab change or button tap.",
            "Navigate to Profile > Device & Feedback Preferences > VERIFY 'Haptic Vibration Feedback' toggle is OFF.",
        ]),
        ("Step 2: Custom Profile Settings Screen Verification", [
            "On the Profile tab, tap your user card or 'Account & Profile Settings'.",
            "VERIFY: A separate full-page screen opens (/profile/edit) with a top navigation bar and back button.",
            "Tap the circular avatar or 'Change Photo'.",
            "Select an image from gallery or take a picture. VERIFY avatar updates with your custom picture.",
            "Edit 'Full Name' to your desired name (e.g. 'Rashid Al Maktoum').",
            "Edit 'Username' handle to '@rashid_uae'.",
            "Enter UAE Phone number (+971 50 123 4567) and Organisation name.",
            "Tap 'Save Profile Changes' -> Check confirmation alert -> Tap OK.",
            "VERIFY: Returning to Profile, the card now displays your custom photo, custom name, and @handle.",
            "VERIFY: Home tab top avatar reflects your custom photo.",
        ]),
        ("Step 3: Business Entity Deletion Verification", [
            "In Profile tab, under 'My Businesses', select a test business entity.",
            "Tap 'Manage' to open Business Settings.",
            "Scroll down to 'Entity Management & Danger Zone'.",
            "Tap 'Delete Business Entity'.",
            "VERIFY: Confirmation alert warns that trade license, tax records, and invoices will be deleted.",
            "Tap 'Yes, Delete Entity'.",
            "VERIFY: Success notification appears and view switches cleanly to Profile.",
            "VERIFY: The deleted business no longer appears in 'My Businesses'.",
        ]),
        ("Step 4: Skeleton Screen Loading Verification", [
            "Switch to the Books tab: observe the initial loading state.",
            "VERIFY: Pulsing skeleton cards shimmer across the screen matching the hero card and ledger rows.",
            "Switch to Invoices tab: observe search bar and invoice item skeletons.",
            "Switch to Tax Hub tab: observe tax position and breakdown card skeletons.",
            "VERIFY: No raw or jarring spinners freeze the UI.",
        ]),
        ("Step 5: UAE VAT & Corporate Tax Flow Verification", [
            "Open Invoices > tap '+ New' > issue a tax invoice for AED 10,000 + 5% VAT (AED 500).",
            "Open Books > verify revenue and output VAT are automatically credited.",
            "Open Tax Hub > verify Form 201 Box 1 reflects AED 10,000 with AED 500 Output VAT.",
            "Verify Article 21 SBR election card shows Small Business Relief posture.",
            "Tap 'Ask Mizan AI' to confirm tax treatment consultation with bilingual citations.",
        ]),
        ("Step 6: Article 32 Entertainment Smart-Split Verification", [
            "Navigate to /expenses/review to inspect pending expense receipts.",
            "Open a dining or hospitality expense (or any expense bill).",
            "VERIFY: 'Article 32 Entertainment Split' card is visible with an animated toggle.",
            "Toggle switch ON: observe statutory breakdown (50% CT Deductible, 50% CT Add-Back, Input VAT: AED 0.00 Blocked).",
            "Tap 'Approve' -> VERIFY success feedback and ledger update.",
            "Inspect Corporate Tax Assessment: VERIFY the 50% add-back adjustment is applied to taxable income.",
        ]),
        ("Step 7: Corporate Tax Registration Countdown Widget Verification", [
            "On Home Dashboard, scroll to the Corporate Tax Registration Tracker card.",
            "If active business does not have a CT TRN: observe statutory deadline countdown based on license issue month.",
            "VERIFY: Prominent alert displays the AED 10,000 administrative penalty under Cabinet Decision No. 75/2023.",
            "Tap 'Register on EmaraTax' -> VERIFY external browser opens FTA portal (eservices.tax.gov.ae).",
            "Tap 'I Have a CT TRN' -> enter 15-digit TRN -> tap 'Verify & Save'.",
            "VERIFY: Card resolves into a sleek green 'Corporate Tax Registered' badge with TRN display.",
        ]),
        ("Step 8: Deterministic Bank Statement CSV Importer Verification", [
            "Open Books tab > tap 'Import CSV' button in the header or ledger banner.",
            "Select a UAE bank statement file (ENBD, ADCB, Mashreq, FAB, Wio, or generic CSV).",
            "VERIFY: Bank reconciliation modal opens showing detected bank name, total inflows, outflows, and net cashflow.",
            "VERIFY: Foreign currencies (e.g. USD, EUR) are auto-converted to AED using official CBUAE rates (Art. 69).",
            "VERIFY: Known merchants (DEWA, ADNOC, Amazon, Deliveroo) are deterministically auto-tagged without AI.",
            "Tap 'Commit to Books' -> VERIFY ledger entries are created and financial balances update instantly.",
        ]),
        ("Step 9: Offline Mode & Cloud Sync Status Pill Verification", [
            "Inspect the top header on Home Dashboard or ScreenHeader.",
            "VERIFY: Status pill displays '🟢 Synced' when online with zero pending items.",
            "Tap the pill: VERIFY informative reassurance dialog confirms all records are synced.",
            "When records are created while offline, VERIFY pill updates to '🟠 N Pending'.",
            "Tap pill when pending items exist: VERIFY local queue flushes and pill returns to '🟢 Synced'.",
        ]),
    ]

    for title, sub_steps in walkthrough_steps:
        elements.append(Paragraph(f"<b>{title}</b>", h2_style))
        for s in sub_steps:
            elements.append(Paragraph(f"• {s}", bullet_style))
        elements.append(Spacer(1, 4))

    elements.append(Spacer(1, 10))

    # SECTION 4: Sign-off & Bug Log
    elements.append(Paragraph("4. QA Sign-Off & Verification Verdict", h1_style))
    sign_off_data = [
        [
            Paragraph("<b>QA Engineer:</b> ___________________________", table_cell_style),
            Paragraph("<b>Date of Execution:</b> ___________________________", table_cell_style),
        ],
        [
            Paragraph("<b>Device / OS:</b> ___________________________", table_cell_style),
            Paragraph("<b>Overall Verdict:</b> [  ] APPROVED   [  ] REJECTED", table_cell_style),
        ],
    ]
    sign_off_table = Table(sign_off_data, colWidths=[250, 254])
    sign_off_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), BG_LIGHT),
        ('BOX', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
    ]))
    elements.append(sign_off_table)

    # Build Document
    doc.build(elements, canvasmaker=NumberedCanvas)
    print(f"PDF successfully generated at: {os.path.abspath(filename)}")

if __name__ == "__main__":
    output_filename = "Mizan_UAE_Tax_QA_Test_Guide.pdf"
    if len(sys.argv) > 1:
        output_filename = sys.argv[1]
    build_pdf(output_filename)
