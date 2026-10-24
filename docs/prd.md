# Requirements Document

## 1. Application Overview

### 1.1 Application Name
Smart Home Automation Application

### 1.2 Application Description
A comprehensive smart home management system that allows users to manage rooms, devices, and automation protocols across their home. The application provides centralized control for switches, sensors, cameras, networking equipment, central control devices, and other smart devices with support for multiple communication protocols including KNX (Wired), Zigbee, Z-Wave, Wi-Fi, Bluetooth, Matter, and LAN. The system includes pricing management in EGP currency, per-room cost tracking with pro-rata distribution of commissioning and installation costs, quotation generation capabilities, enhanced Excel file integration with pre-populated device template for automated price and inventory updates with automatic inclusion of custom-added devices and manual price recording, ability to remove Excel link and edit prices on the fly, user authentication system with admin approval for new registrations, email and phone number verification, show/hide password functionality, Excel-based quotation database management with shared access for all users, quotation versioning system with auto-increment version labels (V1, V2, V3...), client approval tracking, installation and warranty management, financial summary with payment tracking (including edit and delete capabilities), discount functionality with conditional visibility, invoice conversion functionality (Admin only), Admin-only quotation deletion capability, amendment approval workflow requiring Admin approval for all user edits with amendment tracking showing editor's username, bilingual support for Arabic and English with language switching functionality, seven-category pricing display system (Light, Shading, Access Control, CCTV & Security, Networking, Voice Assistant, Central Control) for accurate price management, automatic last amendment date tracking for all quotations, visible Admin Dashboard for user management, Sign Up link on login page, real-time admin notifications for pending user approvals, enhanced user management with Decline Request functionality and data preservation for deleted/suspended users, all new Admins have full creator privileges, dynamic device management allowing users to add new devices permanently to the device database with customizable options including optional Gangs (up to 8) and Protocol selection and automatic Excel template synchronization and immediate dropdown population, comprehensive wireless smart device library, streamlined clickable device selection with detail page routing, advanced protocol-based filtering system, clean and simple interface design, custom device pricing saved to pricing database, PDF export with paid amount and due amount, protocol display for each device in PDF export, structured custom device configuration request system, editable device names for all devices, Curtain Motor device with protocol options, Wi-Fi Camera with brand options, Smart Lock with expanded brand options, Intercom systems under Access Control, Memory Card device, Central Control devices including Alexa and Central Control Screens, room assignment display for all devices, Access Points and Network Switches with brand model options, print all quotation pages functionality, dedicated Print tab in main navigation, Excel export functionality, universal print functionality, payment dates display, client approval date and guarantee period display, active Excel-based backup systems, intelligent line item notes system with AI-generated installation suggestions, comprehensive Terms & Conditions section in PDF, commissioning visit fee field, invoice PDF export displaying INVOICE header, auto-save quotation functionality with 1-minute interval, price amendment notifications on unpaid quotations, new device population in quotation and Excel database and dropdown menu, Add New Device tab directly within the Devices section with full spec configuration including Name, Type, Category, Gang Count, Protocol, Model #, Room Assignment and any additional specs, a dedicated Custom Device Name Tab for populating device names in the dropdown menu for future quotations with optional Gangs (up to 8) and Protocol options, a comprehensive price history tracking and flexible price adjustment control system (Admin only), a multi-level price change approval workflow with approval history tracking, a dedicated test scenario framework for verifying the complete price increase workflow, a database health check utility for schema validation, RLS policy verification, index analysis, and data integrity checks, an Add New Category feature allowing Admin users to create entirely new device categories that are immediately reflected across all category-dependent views, device template categories allowing admins to create reusable device bundles or packages that can be added to quotations as a single unit with bulk pricing, room name editing capability for typo correction, customizable category labels allowing administrators to rename category labels directly from the Pricing Management interface without code changes, and a complete application backup and migration package export system enabling complete replication and full data preservation on alternative platforms.

### 1.3 Target Platform
Web application (responsive design for desktop, mobile, and tablet)

### 1.4 Currency
**Currency Unit**: EGP (Egyptian Pound)
- All pricing, quotations, invoices, and financial summaries are displayed in EGP
- Currency symbol: EGP or E£
- Format: EGP 1,234.56 or E£ 1,234.56
- Consistent currency display across application interface, PDF exports, Excel exports, and all financial sections

### 1.5 Version Management Strategy
- **Version Label Format**: V1, V2, V3, V4... (auto-increment)
- **Initial Version**: Assigned version V1 upon initial creation and save
- **Version Increment Logic**: Automatically increments when any field in the quotation is modified and saved
- **Version Display**: Displayed in quotation detail view, quotation list column, and header sections of PDF and Excel exports

### 1.6 Branding & Logo Implementation
- **Dual Logo Display**:
  - Primary Logo (Top Left): IMG_1774.jpg (Prosmart logo) positioned leftmost
  - Secondary Logo: Smart Systems .PNG positioned to the right of Prosmart logo with 12px spacing
- Maximum height 48px on desktop, 36px on mobile
- Clickable links to dashboard

### 1.7 Last Amendment Date Tracking
- Read-only date field automatically updating to current timestamp upon quotation revisions
- Triggers on any client, room, device, price, commissioning, payment, or approval change

### 1.8 New Quotation Button
- Fixed action button resetting active quotation data with confirmation modal and setting version to V1

### 1.9 Client Information Section
- Fields: Client Name, Address, Phone Number, Project Code (auto-generated format: Initial + Date YYYYMMDD, editable)

### 1.10 Bilingual Support (Arabic & English)
- Language toggle supporting English (default) and Arabic across all interface components and exports

### 1.11 Main Navigation Structure
- Main views:
  1. Home/Dashboard
  2. Quotation
  3. Print
  4. Settings
  5. Admin Dashboard (Admin only)

---

## 2. Core Features

### 2.1 User Authentication System
- Registration with username, email, phone, password
- Email and SMS code verification with 15-minute expiry
- User accounts require Admin approval before login access
- Role-based permissions:
  - **Admin**: Full access including user management, pricing management, quotation lifecycle, Excel template management, system tests, Database Health Check, Complete App Backup and Migration Package export, category creation, label customization, and approval workflows.
  - **Senior Admin**: Quotation operations and ability to submit price change requests for Admin approval.
  - **Standard User**: Quotation creation, viewing, and exporting; edits subject to Admin approval.

### 2.2 Quotation Approval Workflow (Standard Users)
- Standard Users submit finalized quotations for Admin review (Draft → Pending Approval → Approved / Rejected / Revision Requested)
- Admin review interface with revision comments and complete approval history logs

### 2.3 Excel-Based Quotation Storage
- Centralized quotation storage and retrieval in structured Excel format (`Smart Home Quotations.xlsx`)

### 2.4 Auto-Save Functionality
- Interval-based auto-save every 1 minute during active editing and on navigation away

### 2.5 Price Amendment Notification System
- Automatic detection of pricing updates occurring after quotation creation for unpaid quotations with percentage change indicator

### 2.6 Rooms Management
- Room creation, deletion, and inline name editing
- Per-room device cost subtotal calculation with pro-rata distribution of commissioning, visit fee, installation, and VAT

### 2.7 Device Management System
- Support for Light, Shading, Access Control, CCTV & Security, Networking, Voice Assistant, Central Control, and custom categories
- Protocol assignment (Zigbee, Z-Wave, Wi-Fi, Bluetooth, Matter, KNX, LAN, LAN MQTT, Other)
- Optional Gang configuration (1 to 8 gangs)
- Real-time dropdown and template synchronization

### 2.7A Add New Device Tab (Devices Section)
- Admin interface for adding custom devices with full specifications (name, type, category, brand, gang count, protocol, model #, room assignment, unit price, custom key-value specs)

### 2.7B Add New Category Feature (Admin Only)
- Admin functionality to create and manage custom device categories propagating immediately across all application views and dropdowns

### 2.7C Device Template Categories (Admin Only)
- Creation of reusable multi-device bundles with bulk pricing or auto-calculated sum options

### 2.7D Category Label Customization (Admin Only)
- In-app customization of display labels for both default and custom categories without code changes

### 2.8 Intelligent Line Item Notes System with AI Suggestions
- Per-device collapsible installation notes with 2-3 contextual AI suggested notes

### 2.9 Commissioning, Installation, Discount, and VAT Management
- Fixed or percentage commissioning and installation calculations
- Fixed Commissioning Visit Fee field
- Fixed or percentage discount application
- Configurable VAT rate with real-time room-level pro-rata breakdown

### 2.10 Quotation Summary by Category
- Structured breakdown by 7 default plus custom categories with prominent CCTV & Security grouping

### 2.11 PDF Export Functionality
- Quotation and Invoice PDF export supporting dual logos, device specs, notes, approval dates, payment history, and Terms & Conditions

### 2.12 Excel Export Functionality
- Formatted multi-tab Excel export matching system design with full device metadata

### 2.13 Universal Print & Print All Quotation Pages
- Print view with navigation suppression, clean headers, footers, and page-break rules

### 2.14 Edit Saved Quotations Functionality
- Full quotation editing with automatic version incrementing and permission checks

### 2.15 Financial Summary & Payment Details Section
- Tracking of down payments, remaining balance, payment history with edit/delete actions (Admin only)

### 2.16 Client Approval and Guarantee Period Management
- Tracking of client approval date and guarantee duration

### 2.17 Invoice Conversion Functionality (Admin Only)
- Admin-only one-click conversion of client-approved quotations to locked invoices

### 2.18 Enhanced Excel Integration (Admin Only)
- Two-way Excel template download and batch price/device upload

### 2.19 Pricing Management (Admin Only)
- Per-category price administration, custom device pricing, and amendment tracking

### 2.20 Multi-Level Price Change Approval Workflow
- Senior Admin price request submission with Admin review, approval, or rejection

### 2.21 Amendment Approval Workflow (Standard Users)
- Approval gate for standard user edits on existing quotations

### 2.22 Custom Device Name Tab (Admin Only)
- Centralized catalog of custom device configurations and prices

### 2.23 Delete Quotation Functionality (Admin Only)
- Admin quotation deletion with confirmation check

### 2.24 Price History Tracking and Price Adjustment Controls (Admin Only)
- Immutable Price History Log, per-device price trend charts, rollback capability, and quotation price increase action panel

### 2.25 Price Increase Workflow Test Scenario Framework (Admin Only)
- 9-step automated testing harness to validate end-to-end price update and quotation impact workflows

### 2.26 Database Health Check Utility (Admin Only)
- Diagnostic modules for table schema validation, RLS policy verification, index analysis, and orphaned record detection

### 2.27 Complete Application Backup and Migration Package Export (Admin Only)
**Purpose**: Provide an Admin-triggered, read-only complete application export that packages live production code, complete database schema, all data records, quotation snapshots, business logic specifications, environment configurations, assets, migration guides, and AI rebuild instructions into a self-contained archive for seamless recreation and backup.

#### 2.27.1 Admin Panel Integration & Trigger
- **Button Placement**: Displayed prominently in the Admin Panel / Admin Dashboard
- **Button Label**: 「Download Complete App Backup」
- **Secondary Label**: 「Export source code, database, data, quotations, assets & migration package」
- **Button Styling**: Primary blue container (#1976D2), white text, archive/download icon (24px)
- **Confirmation Modal**:
  - Header: 「Download Complete App Backup & Migration Package」
  - Description: Details that a full, read-only export package will be generated containing the complete source code, database schema, data records, assets, business formulas, and an AI rebuild prompt.
  - Confirmation Actions: 「Generate & Download Backup」 (Confirm) and 「Cancel」
- **Execution Safety**: Strict read-only database query execution with zero mutation or data locking.

#### 2.27.2 Package Structure & Contents
The generated backup is packaged as a structured ZIP archive named `ProSmart_App_Backup_YYYY-MM-DD_HH-mm.zip` with the following directory tree:

```
ProSmart_App_Backup_YYYY-MM-DD_HH-mm.zip
├── app-source/
│   ├── frontend/             # All UI components, pages, state management, styles
│   ├── backend/              # Server routes, handlers, quotation & pricing logic
│   ├── shared/               # Types, interfaces, constants, validation schemas
│   └── package.json
├── database/
│   ├── schema/               # Full DDL: tables, columns, indexes, constraints, views
│   ├── data/                 # JSON/SQL dumps of all application tables
│   └── migrations/           # Sequential database migration scripts & RLS policies
├── assets/
│   ├── logos/                # IMG_1774.jpg, Smart Systems .PNG
│   ├── icons/                # System line icons and UI assets
│   └── uploads/              # Attached files, product images, customer documents
├── config/
│   ├── .env.example          # Sanitized environment template (e.g. DATABASE_URL=REPLACE_ME)
│   └── app.config.json       # System configurations, default VAT, currency settings
├── docs/
│   ├── APP_ARCHITECTURE.md   # Architectural overview, data flows, and component map
│   ├── BUSINESS_LOGIC.md     # Quotation calculations, pro-rata formulas, warranty rules
│   ├── DATABASE_GUIDE.md     # Entity relationships, dictionary, and security model
│   └── MIGRATION_GUIDE.md    # Step-by-step setup and deployment instructions
├── AI_REBUILD_PROMPT.md      # Self-contained prompt for AI app builders to reproduce the app
├── EXPORT_MANIFEST.json      # Metadata, timestamp, record tallies, and validation hash
└── README.md                 # Package introduction and quickstart overview
```

#### 2.27.3 Data & Quotation Export Specifications
- **Database Schema**: Complete table structures, column definitions, data types, primary and foreign keys, RLS policies, indexes, and constraints.
- **Application Data**: Full record export for users, roles, categories, devices, pricing logs, price requests, approvals, templates, and settings.
- **Quotation Data Integrity**: Complete preservation of all quotation historical records with fixed values (ID, client details, room structures, device line items, Gangs, Protocols, model numbers, notes, commissioning, visit fees, installation, discounts, VAT, payment records, approval history, and totals) without recalculation.
- **Security & Sanitization**: Sensitive environment keys and database credentials are replaced with standardized placeholders (`REPLACE_ME`).

#### 2.27.4 AI Rebuild Instruction & Validation Report
- **`AI_REBUILD_PROMPT.md`**: Contains comprehensive reproduction instructions, application specifications, workflow descriptions, and calculation rules allowing an AI assistant or builder platform to reproduce the system.
- **`EXPORT_MANIFEST.json` & UI Summary**: Generates a summary validation report showing:
  - Export timestamp and application version
  - Total record counts per table (Clients, Quotations, Items, Devices, Categories, Payments, Logs)
  - Asset file counts and storage size
  - Validation integrity status (Healthy / Pass)

---

## 3. Design Style
- **Color Scheme**: Clean white background with neutral gray borders (#E0E0E0) and primary blue accents (#2196F3 / #1976D2)
- **Layout**: Modular card-based hierarchy with desktop, tablet, and mobile responsive layouts
- **Header**: Top navigation displaying dual branding logos (Prosmart left, Smart Systems right)
- **Exports & Prints**: Formalized styling with localized headers, line item notes, and full business disclaimers

---

## 4. Acceptance Criteria

1. When an Admin clicks the 「Download Complete App Backup」 button in the Admin Panel, a confirmation dialog appears detailing the package contents.
2. Confirming backup generation executes a read-only database query without modifying or locking active records.
3. The generated ZIP package matches the naming format `ProSmart_App_Backup_YYYY-MM-DD_HH-mm.zip` and contains `/app-source`, `/database`, `/assets`, `/config`, `/docs`, `AI_REBUILD_PROMPT.md`, `EXPORT_MANIFEST.json`, and `README.md`.
4. All quotations in the export retain their original frozen numbers, line items, gang counts, protocols, and calculated totals without recalculation.
5. Environment configuration files inside `/config` use safe placeholders for credentials without exposing sensitive production keys.
6. The `EXPORT_MANIFEST.json` and on-screen summary report correctly display accurate record counts and export timestamps.
7. Standard Users and Senior Admins do not have access to the Complete App Backup download feature.

---

## 5. Not in Scope for This Version
- Automated scheduled background cloud backups to third-party S3 buckets
- Version history side-by-side visual diff tool
- Direct in-browser source code editing
- Third-party CRM/ERP automated synchronization