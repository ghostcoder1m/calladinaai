# 🚀 Calladina AI Voice Agent - Startup Scripts

## Quick Start Scripts

We've created several scripts to make running your AI Voice Agent super easy!

### 🎯 **Most Common Usage**

```bash
# Just run the app (development mode)
./run.sh

# Or use the full script with options
./start-calladina.sh dev
```

### 📞 **For Live Phone Calls**

```bash
# Deploy with ngrok for phone calls
./deploy.sh

# Or using the main script
./start-calladina.sh ngrok
```

## 📋 **All Available Scripts**

### **`start-calladina.sh`** - Main Startup Script
The comprehensive script with all options:

```bash
./start-calladina.sh [MODE]
```

**Available Modes:**
- `dev` - Start in development mode (default) 
- `ngrok` - Start with ngrok for phone calls
- `backend` - Start backend only
- `frontend` - Start frontend only  
- `install` - Install all dependencies
- `health` - Check system health
- `stop` - Stop all services
- `help` - Show help message

### **`run.sh`** - Quick Start
Simple wrapper to start the app immediately:

```bash
./run.sh
```
*Equivalent to: `./start-calladina.sh dev`*

### **`deploy.sh`** - Phone Deployment  
Quick deployment for live phone calls:

```bash
./deploy.sh
```
*Equivalent to: `./start-calladina.sh ngrok`*

## 🔧 **Common Workflows**

### **First Time Setup**
```bash
# Install all dependencies
./start-calladina.sh install

# Start the app
./run.sh
```

### **Development**
```bash
# Start both frontend and backend
./run.sh

# Check if everything is running
./start-calladina.sh health

# Stop everything when done
./start-calladina.sh stop
```

### **Phone Call Testing**
```bash
# Make sure app is running first
./run.sh

# In another terminal, deploy for phone calls
./deploy.sh

# Configure Twilio webhook with the provided URL
# Call your number: +1 (343) 655-3015
```

### **Troubleshooting**
```bash
# Check system health
./start-calladina.sh health

# Stop all services
./start-calladina.sh stop

# Restart fresh
./run.sh
```

## 🎯 **What Each Mode Does**

### **Development Mode (`dev`)**
- ✅ Starts both frontend (port 3000) and backend (port 3001)
- ✅ Hot reload enabled for development  
- ✅ Console logging for debugging
- 🌐 Access at: http://localhost:3000

### **Ngrok Mode (`ngrok`)**
- ✅ Starts full development environment
- ✅ Creates secure ngrok tunnel
- ✅ Provides webhook URLs for Twilio
- ✅ Enables live phone call testing
- 📞 Your AI agent becomes callable!

### **Backend Only (`backend`)**  
- ✅ Starts just the API server (port 3001)
- ✅ Perfect for API testing
- 🔧 Access at: http://localhost:3001

### **Frontend Only (`frontend`)**
- ✅ Starts just the React app (port 3000)  
- ✅ Great for UI development
- 🌐 Access at: http://localhost:3000

## 🎉 **Success Indicators**

When everything is working, you'll see:
```
🎉 Calladina AI Voice Agent is running!

📱 Web Interface: http://localhost:3000
🔧 Backend API: http://localhost:3001  
📊 Health Check: http://localhost:3001/api/health

🧠 To train your AI agent, go to: http://localhost:3000 → AI Training tab
📞 To enable phone calls, run: ./start-calladina.sh ngrok
```

## 🆘 **Troubleshooting**

### **Port Already in Use**
```bash
./start-calladina.sh stop
./run.sh
```

### **Dependencies Missing**
```bash
./start-calladina.sh install
```

### **Environment Issues**
The script will automatically check your `.env` file and API keys!

### **Services Not Starting**
```bash
./start-calladina.sh health
# Shows exactly what's running and what's not
```

---

**🤖 Your AI Voice Agent is now just one command away!**

**Most users just need:** `./run.sh` ✨ 