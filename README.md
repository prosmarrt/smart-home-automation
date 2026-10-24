# Smart Home Automation Application

A comprehensive smart home management system for managing rooms, devices, and automation protocols with quotation generation and backup capabilities.

## Features

- **Room Management**: Add, edit, and delete rooms with device organization
- **Device Management**: Support for switches, sensors, cameras, networking equipment, and more
- **Protocol Support**: Zigbee, Matter, Wi-Fi, Wired, LAN, and KNX protocols
- **Quotation System**: Generate detailed quotations with pricing, VAT, and discounts
- **Payment Tracking**: Record and manage payments with multiple payment methods
- **Google Sheets Backup**: Automatic backup of quotation data to Google Sheets
- **Multi-language Support**: English and Arabic language support
- **User Management**: Admin and user roles with approval system
- **Version Control**: Track quotation changes with version history

## Technology Stack

- **Frontend**: React 18 + TypeScript + Vite
- **UI Framework**: shadcn/ui + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage
- **Backup**: Google Sheets API integration

## Getting Started

### Prerequisites

- Node.js 18+ and pnpm
- Supabase account
- Google Cloud Console account (for Google Sheets backup)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd app-85wlczelkwsh
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables:
Create a `.env` file with:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
```

4. Run database migrations:
```bash
# Migrations are automatically applied via Supabase
```

5. Start development server:
```bash
pnpm dev
```

## Google Sheets Backup Setup

### 1. Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the following APIs:
   - Google Sheets API
   - Google Drive API

### 2. Create OAuth 2.0 Credentials

1. Navigate to **APIs & Services > Credentials**
2. Click **Create Credentials > OAuth client ID**
3. Select **Web application**
4. Add authorized redirect URIs:
   ```
   https://your-project.supabase.co/functions/v1/google-oauth-callback
   ```
5. Save the **Client ID** and **Client Secret**

### 3. Configure Supabase Secrets

Add the following secrets to your Supabase project:

```bash
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=https://your-project.supabase.co/functions/v1/google-oauth-callback
```

### 4. Using Google Sheets Backup

1. Navigate to any quotation view page
2. Click on the **Backup** tab
3. Click **Connect Google Sheets**
4. Authorize the application
5. Click **Backup Now** to backup the quotation

Backups are stored in a spreadsheet named "Smart Home Quotations Backup" in your Google Drive.

## Project Structure

```
src/
├── components/
│   ├── auth/              # Authentication components
│   ├── backup/            # Backup components (Google Sheets)
│   ├── smart-home/        # Smart home feature components
│   └── ui/                # shadcn/ui components
├── db/
│   ├── api.ts            # Database API functions
│   └── supabase.ts       # Supabase client
├── pages/                # Page components
├── types/                # TypeScript type definitions
├── utils/                # Utility functions
└── i18n/                 # Internationalization

supabase/
├── functions/            # Edge Functions
│   ├── google-oauth-init/
│   ├── google-oauth-callback/
│   └── backup-to-sheets/
└── migrations/           # Database migrations
```

## Database Schema

Key tables:
- `profiles`: User profiles with roles
- `rooms`: Room definitions
- `devices`: Device configurations
- `quotations`: Quotation records
- `payments`: Payment tracking
- `google_oauth_tokens`: OAuth tokens for Google Sheets
- `backup_history`: Backup operation logs

## Security

- Row Level Security (RLS) enabled on all tables
- OAuth 2.0 for Google Sheets integration
- Encrypted token storage
- User-based access control
- Admin approval system

## Deployment

### Supabase Edge Functions

Deploy Edge Functions:
```bash
supabase functions deploy google-oauth-init
supabase functions deploy google-oauth-callback
supabase functions deploy backup-to-sheets
```

### Frontend

Build for production:
```bash
pnpm build
```

Deploy to your hosting provider (Vercel, Netlify, etc.)

## Backup Strategy

### Automatic Backups
- Event-driven: Backup on quotation create/update
- Scheduled: Daily/hourly sync (configurable)

### Manual Backups
- On-demand backup from quotation view page
- Backup history tracking
- Error logging and retry mechanism

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

Copyright © 2026 Smart Home Automation Application

## Support

For issues and questions, please create an issue in the repository.
