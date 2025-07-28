# 🤖 Calladina AI Voice Agent - Complete Deployment Guide

## 🎯 System Overview

Your AI Voice Agent system is now complete with:
- **OpenAI GPT-4** for intelligent conversation
- **ElevenLabs** for natural text-to-speech  
- **Twilio** for phone call handling
- **React Frontend** for agent training
- **Express Backend** with voice webhooks
- **Ngrok** for secure webhook deployment

## 🚀 Quick Start Deployment

### 1. Start the Complete System
```bash
# Start both frontend and backend
npm run dev
```

### 2. Deploy with Ngrok
```bash
# In a new terminal, run the deployment script
cd backend
node deploy.js
```

This will:
- Create a secure ngrok tunnel
- Provide webhook URLs for Twilio
- Update your environment automatically
- Keep the tunnel alive

## 📞 Configure Twilio Webhooks

After running the deployment script, you'll get output like this:
```
🔗 Webhook URL: https://abc123.ngrok.io/api/voice-webhook
```

**Configure your Twilio phone number:**
1. Go to [Twilio Console](https://console.twilio.com/)
2. Navigate to **Phone Numbers > Manage > Active Numbers**
3. Click your purchased number: **+1 (343) 655-3015**
4. Set these webhooks:
   - **Voice URL:** `https://abc123.ngrok.io/api/voice-webhook`
   - **Status Callback:** `https://abc123.ngrok.io/api/status-webhook`
   - **Method:** POST for both

## 🧠 Train Your AI Agent

### Access the Training Interface
1. Open http://localhost:3000
2. Navigate to **"AI Training"** tab
3. Configure your agent:

**Business Information:**
- Business Name: Your Company Name
- Hours: Your business hours
- Services: What you offer
- Contact: Email and phone

**AI Personality:**
- Tone: professional and friendly
- Style: concise but helpful  
- Traits: patient, understanding, professional

**Custom Responses:**
- Greeting: First message callers hear
- Goodbye: Closing message
- Fallback: When AI doesn't understand

### Test Your AI Agent
Use the built-in testing interface to:
- Test different conversation scenarios
- Refine responses
- Adjust personality traits
- Preview how the AI will respond

## 🎙️ AI Voice Agent Features

### Intelligent Call Handling
- **Natural Greetings:** Personalized welcome messages
- **Context Awareness:** Remembers conversation flow
- **Smart Routing:** Transfers to humans when needed
- **Business Logic:** Answers questions about hours, services, contact info

### Advanced Capabilities
- **Speech-to-Text:** Understands caller speech via Twilio
- **GPT-4 Processing:** Intelligent response generation
- **Natural Voice:** ElevenLabs TTS for human-like speech
- **Call Logging:** Automatic conversation recording
- **Real-time Monitoring:** Live call status tracking

## 🔧 API Endpoints

Your deployed system includes these endpoints:

### Voice System
- `POST /api/voice-webhook` - Main call handler
- `POST /api/process-speech` - Speech processing
- `POST /api/status-webhook` - Call status updates

### AI Training  
- `GET /api/agent/knowledge` - Get current training
- `POST /api/agent/train` - Update agent training
- `POST /api/agent/test` - Test AI responses

### Utilities
- `POST /api/tts` - Text-to-speech conversion
- `GET /api/call-logs` - View call history
- `GET /api/health` - System status check

## 📊 Monitoring & Logs

### Real-time Monitoring
Watch the backend console for:
- Incoming call notifications
- Speech recognition results  
- AI response generation
- Call completion status

### Call Logs
Access detailed logs at:
- **Frontend:** Dashboard > Call History
- **Backend:** `backend/call-logs/` directory
- **API:** `GET /api/call-logs`

## 🔧 Environment Configuration

Your `.env` file is configured with:
```env
# OpenAI Configuration
OPENAI_API_KEY=sk-proj-R9Sxl6YKO5jpasmZ1iZf...

# ElevenLabs Configuration  
ELEVENLABS_API_KEY=sk_e1023f57680fbb3387b1093f...
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM

# Agent Settings
AGENT_NAME=Calladina AI Receptionist
```

## 🧪 Testing Your AI Voice Agent

### 1. Local Testing
```bash  
# Test AI responses
curl -X POST http://localhost:3001/api/agent/test \
  -H "Content-Type: application/json" \
  -d '{"message": "What are your business hours?"}'

# Test text-to-speech
curl -X POST http://localhost:3001/api/tts \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello, this is a test"}' \
  --output test-speech.mp3
```

### 2. Live Phone Testing
1. **Deploy with ngrok:** `node backend/deploy.js`
2. **Configure Twilio webhooks** (see above)
3. **Call your number:** +1 (343) 655-3015
4. **Test conversation flow:**
   - Ask about business hours
   - Request services information  
   - Try transferring to a human
   - Test goodbye scenarios

## 🎯 Call Flow Examples

### Typical Conversation
```
Caller: "Hi, what are your hours?"
AI: "We're open 9 AM - 5 PM Monday to Friday. How can I help you today?"

Caller: "I need to schedule an appointment"  
AI: "I'd be happy to help you schedule an appointment. Let me transfer you to our scheduling team."

Caller: "Actually, what services do you offer?"
AI: "We offer Customer Support, Appointments, and General Information. Which service interests you?"
```

### Advanced Scenarios
- **After Hours:** AI explains business hours and options
- **Transfer Requests:** Seamless handoff to human agents  
- **Complex Questions:** Graceful fallback to human assistance
- **Multiple Topics:** Context-aware conversation flow

## 🚀 Production Deployment Options

### Option 1: Ngrok (Development/Testing)
- **Pros:** Quick setup, secure tunnels, easy testing
- **Cons:** Temporary URLs, requires terminal open
- **Best For:** Development, testing, demos

### Option 2: Cloud Deployment (Production)
Deploy to platforms like:
- **Heroku:** Easy deployment with automatic HTTPS
- **Railway:** Modern platform with great developer experience  
- **DigitalOcean:** VPS with full control
- **AWS/Google Cloud:** Enterprise-grade scaling

## 🔐 Security Best Practices

### API Key Security
- ✅ Environment variables (not code)
- ✅ Gitignore .env files
- ✅ Rotate keys regularly
- ✅ Use webhook verification

### Webhook Security  
- ✅ Verify Twilio signatures
- ✅ Use HTTPS only
- ✅ Implement rate limiting
- ✅ Log security events

## 🆘 Troubleshooting

### Common Issues

**AI not responding:**
- Check OpenAI API key validity
- Verify network connectivity
- Review backend logs for errors

**Voice quality issues:**
- Test ElevenLabs API key
- Check voice ID configuration
- Verify audio output format

**Webhook not receiving calls:**
- Confirm ngrok tunnel is active
- Ensure Twilio webhook URLs are correct
- Check firewall/network settings

**Training not saving:**
- Verify backend is running
- Check file permissions
- Review browser console for errors

### Debug Commands
```bash
# Check service health
curl http://localhost:3001/api/health

# Test AI training endpoint
curl http://localhost:3001/api/agent/knowledge

# Verify environment variables
cd backend && node -e "console.log(!!process.env.OPENAI_API_KEY)"
```

## 🎉 Success! Your AI Voice Agent is Live!

You now have a fully functional AI voice receptionist that can:
- ✅ Answer phone calls intelligently
- ✅ Handle complex conversations
- ✅ Provide business information
- ✅ Transfer calls when needed
- ✅ Learn from training data
- ✅ Generate natural speech
- ✅ Log all interactions

**Next Steps:**
1. Train your agent with your specific business info
2. Test thoroughly with different scenarios  
3. Deploy to production when ready
4. Monitor and refine based on real usage

**Your Ottawa phone number +1 (343) 655-3015 is now powered by AI! 🚀** 