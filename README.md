# AI Voice Receptionist Setup Application

A full-stack React application for configuring AI Voice Receptionist settings with integrated Twilio phone number search and purchasing capabilities.

## Project Structure

```
calladina/
├── frontend/                    # React frontend application
│   ├── public/
│   ├── src/
│   │   ├── firebase.js         # Firebase configuration
│   │   ├── App.js              # Main application component
│   │   ├── LoginPage.js        # Authentication page
│   │   ├── SetupGuide.js       # Setup wizard component
│   │   ├── Dashboard.js        # Main dashboard
│   │   └── index.js            # Entry point
│   ├── .env                    # Frontend environment variables
│   ├── .env.example           # Frontend environment template
│   └── package.json           # Frontend dependencies
├── backend/                    # Node.js backend API
│   ├── server.js              # Express server
│   ├── .env                   # Backend environment variables
│   ├── .env.example          # Backend environment template
│   └── package.json          # Backend dependencies
├── package.json               # Main project scripts
└── README.md
```

## Features

- **Firebase Authentication**: Secure login with Google OAuth
- **Twilio Integration**: Search and purchase phone numbers worldwide
- **Comprehensive Setup**: 7-step configuration process
- **Modern UI**: Built with React and Tailwind CSS
- **Real-time Phone Search**: Live search for available phone numbers by area code
- **Microservice Architecture**: Separate frontend and backend applications

## Prerequisites

Before running the application, make sure you have:

1. **Node.js** (version 14 or higher)
2. **Firebase Account** with a project set up
3. **Twilio Account** with API credentials
4. **npm** or **yarn** package manager

## Quick Start

1. **Clone the project**
2. **Install all dependencies**:
   ```bash
   npm run setup
   ```

3. **Configure environment variables**:
   - Frontend: Update `frontend/.env` with your Firebase credentials (already configured)
   - Backend: Update `backend/.env` with your Twilio credentials

4. **Run the application**:
   ```bash
   npm run dev
   ```

This will start both the frontend (http://localhost:3000) and backend (http://localhost:3001) simultaneously.

## Environment Configuration

### Frontend Environment Variables

The frontend uses the following environment variables (in `frontend/.env`):

```env
REACT_APP_FIREBASE_API_KEY=your_firebase_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
REACT_APP_API_URL=http://localhost:3001
```

### Backend Environment Variables

The backend uses the following environment variables (in `backend/.env`):

```env
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
```

## Installation & Setup

### Method 1: Quick Setup (Recommended)

```bash
# Install all dependencies for both frontend and backend
npm run setup

# Start both frontend and backend servers
npm run dev
```

### Method 2: Manual Setup

```bash
# Install frontend dependencies
npm run install:frontend

# Install backend dependencies
npm run install:backend

# Start both servers
npm run dev
```

### Method 3: Run Separately

```bash
# Terminal 1: Run backend
npm run backend

# Terminal 2: Run frontend
npm run frontend
```

## Available Scripts

### Main Project Scripts

- `npm run dev` - Start both frontend and backend servers
- `npm run setup` - Install all dependencies for both frontend and backend
- `npm run frontend` - Start only the frontend server
- `npm run backend` - Start only the backend server
- `npm run install:frontend` - Install frontend dependencies
- `npm run install:backend` - Install backend dependencies
- `npm run install:all` - Install all dependencies
- `npm run build` - Build the frontend for production

### Frontend Scripts (run from frontend/ directory)

- `npm start` - Start the React development server
- `npm run build` - Build the React app for production
- `npm test` - Run tests

### Backend Scripts (run from backend/ directory)

- `npm start` - Start the Express server
- `npm run dev` - Start the server with nodemon (auto-restart)

## Configuration

### Firebase Setup

1. Create a Firebase project at https://console.firebase.google.com
2. Enable Authentication and set up Google OAuth
3. The Firebase configuration is already set up in `frontend/.env`

### Twilio Setup

1. Create a Twilio account at https://www.twilio.com
2. Get your Account SID and Auth Token from the Twilio Console
3. Update the credentials in `backend/.env`:
   ```env
   TWILIO_ACCOUNT_SID=your_actual_account_sid
   TWILIO_AUTH_TOKEN=your_actual_auth_token
   ```

## Usage

### Getting Started

1. **Login**: Use your Google account to authenticate
2. **Setup Guide**: Complete the 7-step setup process:
   - **Step 1**: Business Details
   - **Step 2**: Hours & Availability
   - **Step 3**: Phone Setup (with Twilio integration)
   - **Step 4**: Call Routing & Extensions
   - **Step 5**: Booking & Calendar Integration
   - **Step 6**: Voice & Language Preferences
   - **Step 7**: Final Setup

### Phone Number Management

In Step 3 (Phone Setup), you can:

1. **Enter Twilio Credentials**: Input your Account SID and Auth Token
2. **Search by Area Code**: Enter any area code to find available numbers
3. **Browse Popular Area Codes**: Quick access to common area codes
4. **Purchase Numbers**: Click "Select" to purchase a phone number
5. **International Support**: Search phone numbers in multiple countries

### Supported Countries

The application supports phone number search in:
- United States (US)
- Canada (CA)
- United Kingdom (GB)
- Australia (AU)
- Germany (DE)
- France (FR)
- Netherlands (NL)
- Italy (IT)
- Spain (ES)
- Sweden (SE)
- Singapore (SG)
- Hong Kong (HK)
- Japan (JP)

## API Endpoints

The backend server provides the following endpoints:

- `POST /api/search-phone-numbers` - Search for available phone numbers
- `POST /api/purchase-phone-number` - Purchase a phone number
- `GET /api/available-countries` - Get list of supported countries
- `GET /api/health` - Health check endpoint

## Development

### Frontend Development

```bash
cd frontend
npm start
```

The frontend will run on http://localhost:3000

### Backend Development

```bash
cd backend
npm run dev
```

The backend will run on http://localhost:3001 with auto-restart enabled.

## Troubleshooting

### Common Issues

**Server Connection Error**
- Ensure the backend server is running on port 3001
- Check your Twilio credentials in `backend/.env`
- Verify the `REACT_APP_API_URL` in `frontend/.env`

**Phone Number Search Issues**
- Verify your Twilio Account SID and Auth Token are correct
- Check that you have sufficient Twilio account balance
- Ensure the area code is valid for the selected country

**Firebase Authentication Issues**
- Check your Firebase configuration in `frontend/.env`
- Ensure Google OAuth is properly set up in Firebase Console
- Verify your domain is added to authorized domains

**Build Issues**
- Make sure all dependencies are installed: `npm run install:all`
- Check that Node.js version is 14 or higher
- Clear node_modules and reinstall: `rm -rf */node_modules && npm run install:all`

## Contributing

To contribute to this project:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.
