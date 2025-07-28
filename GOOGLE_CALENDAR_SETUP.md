# Google Calendar Integration Setup Guide

## Overview
This guide will help you set up Google Calendar integration so your AI receptionist can book appointments automatically during phone calls.

## Step 1: Create Google Cloud Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Give your project a name like "Calladina AI Agent"

## Step 2: Enable Google Calendar API

1. In the Google Cloud Console, go to **APIs & Services** > **Library**
2. Search for "Google Calendar API"
3. Click on "Google Calendar API" and click **Enable**

## Step 3: Create Credentials

1. Go to **APIs & Services** > **Credentials**
2. Click **+ CREATE CREDENTIALS** > **OAuth client ID**
3. If prompted, configure the OAuth consent screen:
   - Choose **External** user type
   - Fill in required fields:
     - App name: "Calladina AI Agent"
     - User support email: Your email
     - Developer contact: Your email
   - Add your email to test users
4. For Application type, select **Desktop application**
5. Give it a name like "Calladina Calendar Access"
6. Click **Create**

## Step 4: Download Credentials

1. After creating the OAuth client, click the download button (⬇️)
2. Save the file as `credentials.json` in your `backend/` directory
3. The file should look like this:
```json
{
  "installed": {
    "client_id": "your-client-id.googleusercontent.com",
    "project_id": "your-project-id",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_secret": "your-client-secret",
    "redirect_uris": ["http://localhost"]
  }
}
```

## Step 5: First Time Authentication

1. Start your Calladina backend server:
   ```bash
   cd backend
   npm start
   ```

2. The first time the server starts, it will:
   - Detect the `credentials.json` file
   - Open a browser window for authentication
   - Ask you to sign in to your Google account
   - Ask for permission to access your calendar
   - Save the authentication token to `token.json`

3. You should see in the console:
   ```
   📅 Google Calendar: ✅ Connected
   ```

## Step 6: Test the Integration

1. Call your Twilio number
2. Say something like: "I'd like to book an appointment"
3. The AI will ask for date, time, and purpose
4. Provide the details and the AI will book it automatically!

## Troubleshooting

### Calendar Not Connected
- Check that `credentials.json` exists in the `backend/` directory
- Restart the server to trigger authentication
- Check console logs for error messages

### Authentication Failed
- Delete `token.json` and restart the server
- Make sure your Google account has access to the calendar
- Check that the OAuth consent screen is properly configured

### Time Zone Issues
- The system uses 'America/Toronto' timezone by default
- You can modify this in the `createAppointment` function in `server.js`

### Appointment Not Created
- Check that the date format is correct (YYYY-MM-DD)
- Time should be in 24-hour format (14:00 for 2 PM)
- Make sure the calendar API is enabled in Google Cloud Console

## Features

✅ **Real-time availability checking** - Won't double-book  
✅ **Automatic appointment creation** - Creates events in your Google Calendar  
✅ **Email invitations** - If caller provides email  
✅ **Smart scheduling** - Only suggests times during business hours  
✅ **Conflict detection** - Handles busy time slots gracefully  

## Example Conversation

**Caller**: "Hi, I'd like to schedule an appointment"  
**AI**: "I'd be happy to help you schedule an appointment! What date works best for you?"  
**Caller**: "How about tomorrow at 2 PM?"  
**AI**: "Let me check availability for tomorrow at 2 PM... Perfect! I've successfully booked your appointment for tomorrow at 14:00. You should receive a confirmation. Is there anything else I can help you with?"

## Security Notes

- Keep your `credentials.json` file secure and never commit it to git
- The `token.json` file contains your authentication token - also keep it secure
- Only grant calendar access to trusted applications
- You can revoke access anytime in your Google Account settings

## Calendar Management

Your AI agent can now:
- Check real-time availability 
- Book appointments automatically
- Handle scheduling conflicts
- Send calendar invitations
- Integrate with your existing Google Calendar workflow

The appointments will appear in your default Google Calendar with details about the phone booking. 