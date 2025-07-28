require('dotenv').config();
const express = require('express');
const cors = require('cors');
const twilio = require('twilio');
const OpenAI = require('openai');
const axios = require('axios');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const { authenticate } = require('@google-cloud/local-auth');

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000'
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files for Twilio audio playback
app.use('/public', express.static(path.join(__dirname, 'public')));

// File upload configuration
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Initialize AI services
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Twilio client
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// Google Calendar Configuration
const SCOPES = ['https://www.googleapis.com/auth/calendar'];
const TOKEN_PATH = path.join(__dirname, 'token.json');
const CREDENTIALS_PATH = path.join(__dirname, 'credentials.json');

let calendar = null;

// Initialize Google Calendar
async function initializeCalendar() {
  try {
    if (fs.existsSync(CREDENTIALS_PATH)) {
      const auth = await authorize();
      calendar = google.calendar({ version: 'v3', auth });
      console.log('📅 Google Calendar: ✅ Connected');
      return true;
    } else {
      console.log('📅 Google Calendar: ⚠️  Credentials file not found');
      return false;
    }
  } catch (error) {
    console.error('📅 Google Calendar: ❌ Failed to connect:', error.message);
    return false;
  }
}

// Authorize Google Calendar API
async function authorize() {
  let client = await loadSavedCredentialsIfExist();
  if (client) {
    return client;
  }
  client = await authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH,
  });
  if (client.credentials) {
    await saveCredentials(client);
  }
  return client;
}

// Load saved credentials
async function loadSavedCredentialsIfExist() {
  try {
    const content = await fs.promises.readFile(TOKEN_PATH);
    const credentials = JSON.parse(content);
    return google.auth.fromJSON(credentials);
  } catch (err) {
    return null;
  }
}

// Save credentials
async function saveCredentials(client) {
  const content = await fs.promises.readFile(CREDENTIALS_PATH);
  const keys = JSON.parse(content);
  const key = keys.installed || keys.web;
  const payload = JSON.stringify({
    type: 'authorized_user',
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  });
  await fs.promises.writeFile(TOKEN_PATH, payload);
}

// Calendar utility functions
async function checkAvailability(startTime, endTime, calendarId = 'primary') {
  if (!calendar) return { available: false, error: 'Calendar not connected' };
  
  try {
    const response = await calendar.freebusy.query({
      resource: {
        timeMin: startTime,
        timeMax: endTime,
        items: [{ id: calendarId }],
      },
    });
    
    const busy = response.data.calendars[calendarId].busy || [];
    return { available: busy.length === 0, busy };
  } catch (error) {
    console.error('Error checking availability:', error);
    return { available: false, error: error.message };
  }
}

async function createAppointment(title, description, startTime, endTime, attendeeEmail = null, calendarId = 'primary') {
  if (!calendar) return { success: false, error: 'Calendar not connected' };
  
  try {
    const event = {
      summary: title,
      description: description,
      start: {
        dateTime: startTime,
        timeZone: 'America/Toronto', // Adjust timezone as needed
      },
      end: {
        dateTime: endTime,
        timeZone: 'America/Toronto',
      },
    };
    
    if (attendeeEmail) {
      event.attendees = [{ email: attendeeEmail }];
    }
    
    const response = await calendar.events.insert({
      calendarId: calendarId,
      resource: event,
    });
    
    return { 
      success: true, 
      event: response.data,
      eventId: response.data.id,
      htmlLink: response.data.htmlLink
    };
  } catch (error) {
    console.error('Error creating appointment:', error);
    return { success: false, error: error.message };
  }
}

async function getUpcomingAppointments(maxResults = 10, calendarId = 'primary') {
  if (!calendar) return { success: false, error: 'Calendar not connected' };
  
  try {
    const response = await calendar.events.list({
      calendarId: calendarId,
      timeMin: new Date().toISOString(),
      maxResults: maxResults,
      singleEvents: true,
      orderBy: 'startTime',
    });
    
    return { 
      success: true, 
      events: response.data.items || [] 
    };
  } catch (error) {
    console.error('Error getting appointments:', error);
    return { success: false, error: error.message };
  }
}

// In-memory storage for agent training and call sessions
let agentKnowledge = {
  businessInfo: {
    name: "Your Business",
    hours: "9 AM - 5 PM Monday to Friday",
    services: ["Customer Support", "Appointments", "General Information"],
    contact: {
      email: "info@yourbusiness.com",
      phone: "+1234567890"
    }
  },
  responses: {
    greeting: "Hello! Thank you for calling {businessName}. I'm {agentName}, your AI assistant. How can I help you today?",
    fallback: "I'm not sure about that. Let me transfer you to a human representative.",
    goodbye: "Thank you for calling {businessName}. Have a great day!",
    hours: "We're open {businessHours}. If you're calling outside these hours, please leave a message or call back during business hours.",
    services: "We offer {services}. Which service are you interested in?"
  },
  personality: {
    tone: "professional and friendly",
    style: "concise but helpful",
    traits: ["patient", "understanding", "professional"]
  },
  selectedVoice: null,
  departments: []
};

let callSessions = new Map(); // Store active call sessions

// Utility Functions
async function generateAIResponse(userInput, context = {}) {
  try {
    // Get available departments for transfer capability
    const departments = agentKnowledge.departments || [];
    const departmentList = departments.map(d => d.name).join(', ');
    
    const systemPrompt = `You are ${agentKnowledge.businessInfo.name}'s AI receptionist named ${process.env.AGENT_NAME || 'Calladina'}. 

Your personality: ${agentKnowledge.personality.tone}
Your traits: ${agentKnowledge.personality.traits.join(', ')}

Business Information:
- Name: ${agentKnowledge.businessInfo.name}
- Industry: ${agentKnowledge.businessInfo.industry || 'Not specified'}
- Hours: ${agentKnowledge.businessInfo.hours}
- Services: ${agentKnowledge.businessInfo.services.join(', ')}
- Contact: ${agentKnowledge.businessInfo.contact.email}, ${agentKnowledge.businessInfo.contact.phone}
${agentKnowledge.businessInfo.address ? `- Address: ${agentKnowledge.businessInfo.address}` : ''}
${agentKnowledge.businessInfo.website ? `- Website: ${agentKnowledge.businessInfo.website}` : ''}

Available Departments for Transfer:
${departments.length > 0 ? departments.map(d => `- ${d.name} (Extension: ${d.extension})`).join('\n') : '- No specific departments configured'}

Key Responses:
- Greeting: "${agentKnowledge.responses.greeting}"
- Hours Info: "${agentKnowledge.responses.hours}"
- Services Info: "${agentKnowledge.responses.services}"

Department Transfer Guidelines:
- If caller asks to be transferred to a specific department (${departmentList}), respond with: "TRANSFER_TO:[DEPARTMENT_NAME]"
- If caller asks for "receptionist", "main receptionist", or "main office", respond with: "TRANSFER_TO:Main"
- Examples: "TRANSFER_TO:Sales", "TRANSFER_TO:Support", "TRANSFER_TO:Main"
- Listen for requests like "transfer me to sales", "I need support", "connect me to receptionist", "transfer me to main office", etc.
- Only use TRANSFER_TO if they specifically mention a department we have or the main receptionist

Appointment Booking Guidelines:
- You can help schedule appointments during business hours: ${agentKnowledge.businessInfo.hours}
- If someone wants to book an appointment, ask for: date, time, and purpose/service needed
- For appointment requests, respond with: "BOOK_APPOINTMENT:[DATE]|[TIME]|[PURPOSE]|[EMAIL]"
- Example: "BOOK_APPOINTMENT:2024-01-15|14:00|Consultation|john@email.com"
- Only suggest times during business hours
- Always confirm appointment details before booking

General Guidelines:
1. Keep responses concise and helpful (2-3 sentences max)
2. Always be professional and friendly
3. If you can't help with their specific request, offer to transfer to a human representative
4. Use the specific business information provided above
5. Handle common requests like appointments, hours, services, contact info
6. When asked about hours, use the exact hours information provided
7. When asked about services, mention the specific services we offer
8. For booking/appointments, actively help them schedule - you have calendar access!

Current context: ${JSON.stringify(context)}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userInput }
      ],
      max_tokens: 150,
      temperature: 0.7,
    });

    return completion.choices[0].message.content.trim();
  } catch (error) {
    console.error('OpenAI API error:', error);
    return agentKnowledge.responses.fallback;
  }
}

async function generateSpeech(text, voiceId = null, callSid = null) {
  try {
    // Try to get voice from call session first, then parameter, then environment
    let elevenLabsVoiceId = voiceId;
    
    if (!elevenLabsVoiceId && callSid && callSessions.has(callSid)) {
      const session = callSessions.get(callSid);
      elevenLabsVoiceId = session.selectedVoice?.voice_id;
    }
    
    if (!elevenLabsVoiceId) {
      elevenLabsVoiceId = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';
    }
    
    const response = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${elevenLabsVoiceId}`,
      {
        text: text,
        model_id: "eleven_monolingual_v1",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5,
          style: 0.0,
          use_speaker_boost: true
        }
      },
      {
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': process.env.ELEVENLABS_API_KEY
        },
        responseType: 'arraybuffer'
      }
    );

    return Buffer.from(response.data);
  } catch (error) {
    console.error('ElevenLabs API error:', error);
    throw new Error('Failed to generate speech');
  }
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    services: {
      openai: !!process.env.OPENAI_API_KEY,
      elevenlabs: !!process.env.ELEVENLABS_API_KEY,
      twilio: !!process.env.TWILIO_ACCOUNT_SID
    }
  });
});

// Existing Twilio phone number endpoints
app.post('/api/search-phone-numbers', async (req, res) => {
  const { areaCode, country = 'US' } = req.body;
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    return res.status(500).json({ error: 'Twilio credentials not configured on server' });
  }

  if (!areaCode) {
    return res.status(400).json({ error: 'Area code is required' });
  }

  try {
    const client = twilio(accountSid, authToken);

    console.log(`Searching for phone numbers in area code ${areaCode}, country ${country}`);
    
    const availableNumbers = await client.availablePhoneNumbers(country)
      .local
      .list({
        areaCode: areaCode,
        limit: 10,
        voiceEnabled: true,
        smsEnabled: true
      });

    const formattedNumbers = availableNumbers.map(number => ({
      phoneNumber: number.phoneNumber,
      friendlyName: number.friendlyName,
      locality: number.locality,
      region: number.region,
      capabilities: {
        voice: number.capabilities.voice,
        sms: number.capabilities.sms,
        mms: number.capabilities.mms
      }
    }));

    console.log(`Found ${formattedNumbers.length} available numbers`);
    
    res.json({
      success: true,
      numbers: formattedNumbers,
      searchCriteria: { areaCode, country }
    });

  } catch (error) {
    console.error('Phone number search error:', error);
    res.status(500).json({ 
      error: 'Unable to search for phone numbers. Please try again later.',
      details: error.message 
    });
  }
});

// Configure Twilio webhook automatically
app.post('/api/configure-webhook', async (req, res) => {
  try {
    const { phoneNumber, webhookUrl } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    // Use the current ngrok URL from environment or the provided one
    const baseUrl = webhookUrl || process.env.NGROK_URL || 'http://localhost:3001';
    const voiceWebhookUrl = `${baseUrl}/api/voice-webhook`;
    const statusWebhookUrl = `${baseUrl}/api/status-webhook`;

    console.log(`🔧 Configuring webhook for ${phoneNumber}...`);
    console.log(`📡 Voice webhook: ${voiceWebhookUrl}`);
    console.log(`📊 Status webhook: ${statusWebhookUrl}`);

    // Find the phone number resource
    const phoneNumbers = await twilioClient.incomingPhoneNumbers.list({
      phoneNumber: phoneNumber
    });

    if (phoneNumbers.length === 0) {
      return res.status(404).json({ 
        error: 'Phone number not found in your Twilio account',
        phoneNumber: phoneNumber
      });
    }

    const phoneNumberSid = phoneNumbers[0].sid;

    // Update the phone number configuration
    const updatedPhoneNumber = await twilioClient.incomingPhoneNumbers(phoneNumberSid)
      .update({
        voiceUrl: voiceWebhookUrl,
        voiceMethod: 'POST',
        statusCallback: statusWebhookUrl,
        statusCallbackMethod: 'POST'
      });

    console.log(`✅ Webhook configured successfully for ${phoneNumber}`);

    res.json({
      success: true,
      phoneNumber: phoneNumber,
      webhookUrls: {
        voice: voiceWebhookUrl,
        status: statusWebhookUrl
      },
      message: 'Webhook configured successfully! Your AI agent is now live.',
      updatedPhoneNumber: {
        sid: updatedPhoneNumber.sid,
        phoneNumber: updatedPhoneNumber.phoneNumber,
        voiceUrl: updatedPhoneNumber.voiceUrl,
        statusCallback: updatedPhoneNumber.statusCallback
      }
    });

  } catch (error) {
    console.error('❌ Error configuring webhook:', error);
    
    let errorMessage = 'Failed to configure webhook';
    
    if (error.code === 20003) {
      errorMessage = 'Authentication failed. Please check your Twilio credentials.';
    } else if (error.code === 20404) {
      errorMessage = 'Phone number not found. Please verify the number exists in your Twilio account.';
    } else if (error.message && error.message.includes('Invalid webhook URL')) {
      errorMessage = 'Invalid webhook URL. Please ensure your ngrok tunnel is running.';
    }

    res.status(500).json({ 
      error: errorMessage,
      details: error.message,
      code: error.code
    });
  }
});

// Purchase phone number endpoint (updated to auto-configure webhook)
app.post('/api/purchase-phone-number', async (req, res) => {
  try {
    const { phoneNumber } = req.body;

  if (!phoneNumber) {
    return res.status(400).json({ error: 'Phone number is required' });
  }

    console.log(`💰 Attempting to purchase phone number: ${phoneNumber}`);

    const purchasedNumber = await twilioClient.incomingPhoneNumbers.create({
      phoneNumber: phoneNumber
    });

    console.log(`✅ Phone number purchased successfully: ${purchasedNumber.phoneNumber}`);

    // Automatically configure webhook after purchase
    const baseUrl = process.env.NGROK_URL || 'http://localhost:3001';
    const voiceWebhookUrl = `${baseUrl}/api/voice-webhook`;
    const statusWebhookUrl = `${baseUrl}/api/status-webhook`;

    console.log(`🔧 Auto-configuring webhook for ${purchasedNumber.phoneNumber}...`);

    try {
      // Update the phone number with webhook URLs
      const updatedPhoneNumber = await twilioClient.incomingPhoneNumbers(purchasedNumber.sid)
        .update({
          voiceUrl: voiceWebhookUrl,
          voiceMethod: 'POST',
          statusCallback: statusWebhookUrl,
          statusCallbackMethod: 'POST'
        });

      console.log(`✅ Webhook auto-configured for ${purchasedNumber.phoneNumber}`);

    res.json({ 
      success: true, 
      phoneNumber: purchasedNumber.phoneNumber,
      sid: purchasedNumber.sid,
        webhookConfigured: true,
        webhookUrls: {
          voice: voiceWebhookUrl,
          status: statusWebhookUrl
        },
        message: `🎉 Success! Phone number ${purchasedNumber.phoneNumber} purchased and configured. Your AI agent is now live!`,
        purchasedNumber: {
          sid: purchasedNumber.sid,
          phoneNumber: purchasedNumber.phoneNumber,
          friendlyName: purchasedNumber.friendlyName,
          voiceUrl: updatedPhoneNumber.voiceUrl,
          statusCallback: updatedPhoneNumber.statusCallback
        }
      });

    } catch (webhookError) {
      console.error('⚠️ Phone purchased but webhook configuration failed:', webhookError);
      
      // Still return success since the number was purchased
      res.json({
        success: true,
        phoneNumber: purchasedNumber.phoneNumber,
        sid: purchasedNumber.sid,
        webhookConfigured: false,
        webhookError: webhookError.message,
        message: `📞 Phone number ${purchasedNumber.phoneNumber} purchased successfully, but webhook needs manual configuration.`,
        purchasedNumber: {
          sid: purchasedNumber.sid,
          phoneNumber: purchasedNumber.phoneNumber,
      friendlyName: purchasedNumber.friendlyName
        }
    });
    }

  } catch (error) {
    console.error('❌ Error purchasing phone number:', error);
    
    let errorMessage = 'Failed to purchase phone number';
    
    if (error.code === 21422) {
      errorMessage = 'Trial accounts are allowed only one Twilio number. Please upgrade your account to purchase additional numbers.';
    } else if (error.code === 21421) {
      errorMessage = 'This phone number is not available for purchase. Please try a different number.';
    } else if (error.code === 20003) {
      errorMessage = 'Authentication failed. Please check your Twilio credentials.';
    } else if (error.code === 20001) {
      errorMessage = 'Permission denied. Please check your Twilio account permissions.';
    }

    res.status(500).json({ 
      error: errorMessage,
      details: error.message,
      code: error.code
    });
  }
});

// AI Agent Training Endpoints
app.get('/api/agent/knowledge', (req, res) => {
  res.json({
    success: true,
    knowledge: agentKnowledge
  });
});

app.post('/api/agent/train', (req, res) => {
  try {
    const { businessInfo, responses, personality, selectedVoice, departments } = req.body;
    
    if (businessInfo) {
      agentKnowledge.businessInfo = { ...agentKnowledge.businessInfo, ...businessInfo };
    }
    
    if (responses) {
      agentKnowledge.responses = { ...agentKnowledge.responses, ...responses };
    }
    
    if (personality) {
      agentKnowledge.personality = { ...agentKnowledge.personality, ...personality };
    }
    
    if (selectedVoice) {
      agentKnowledge.selectedVoice = selectedVoice;
    }
    
    if (departments) {
      agentKnowledge.departments = departments;
    }

    // Save to file for persistence
    fs.promises.writeFile(
      path.join(__dirname, 'agent-knowledge.json'), 
      JSON.stringify(agentKnowledge, null, 2)
    ).catch(err => console.error('Error saving knowledge:', err));

    res.json({
      success: true,
      message: 'Agent training updated successfully',
      knowledge: agentKnowledge
    });
  } catch (error) {
    console.error('Agent training error:', error);
    res.status(500).json({ error: 'Failed to update agent training' });
  }
});

// Test AI response endpoint
app.post('/api/agent/test', async (req, res) => {
  try {
    const { message, context } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const response = await generateAIResponse(message, context);
    
    res.json({
      success: true,
      input: message,
      response: response,
      context: context
    });
  } catch (error) {
    console.error('AI test error:', error);
    res.status(500).json({ error: 'Failed to generate AI response' });
  }
});

// Text-to-Speech endpoint
app.post('/api/tts', async (req, res) => {
  try {
    const { text, voiceId } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const audioBuffer = await generateSpeech(text, voiceId);
    
    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': audioBuffer.length,
      'Content-Disposition': 'attachment; filename="speech.mp3"'
    });
    
    res.send(audioBuffer);
  } catch (error) {
    console.error('TTS error:', error);
    res.status(500).json({ error: 'Failed to generate speech' });
  }
});

// Helper function to present IVR menu
async function presentIVRMenu(req, res, twiml, callSid) {
  const session = callSessions.get(callSid);
  
  // Build menu message
  const businessName = agentKnowledge.businessInfo?.name || 'our business';
  let menuMessage = `Hello and thank you for calling ${businessName}. `;
  
  // Check if we have departments configured
  const departments = agentKnowledge.departments || [];
  
  if (departments.length > 0) {
    menuMessage += 'Please select from the following options: ';
    
    departments.forEach((dept, index) => {
      const key = index + 1;
      menuMessage += `Press ${key} for ${dept.name}. `;
    });
    
    menuMessage += 'Press 0 to speak with our main receptionist.';
  } else {
    menuMessage += 'Please hold while we connect you to our receptionist.';
  }

  console.log(`🎯 IVR Menu: "${menuMessage}"`);

  try {
    // Use the main voice for IVR menu
    const mainVoice = agentKnowledge.selectedVoice || { voice_id: process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM' };
    const audioBuffer = await generateSpeech(menuMessage, mainVoice.voice_id, callSid);
    
    // Save audio file for Twilio to play
    const audioFileName = `menu_${callSid}_${Date.now()}.mp3`;
    const audioPath = path.join(__dirname, 'public', audioFileName);
    
    // Ensure public directory exists
    const publicDir = path.join(__dirname, 'public');
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }
    
    fs.writeFileSync(audioPath, audioBuffer);
    
    // Get the public URL for the audio file
    const baseUrl = process.env.NGROK_URL || `http://localhost:3001`;
    const audioUrl = `${baseUrl}/public/${audioFileName}`;
    
    console.log(`🔊 Playing IVR menu: ${audioUrl}`);
    
    // Play the ElevenLabs-generated audio
    twiml.play(audioUrl);
    
  } catch (audioError) {
    console.error('❌ ElevenLabs TTS failed for menu, falling back to Twilio TTS:', audioError);
    // Fallback to Twilio TTS if ElevenLabs fails
    twiml.say({
      voice: 'Polly.Joanna',
      rate: '0.9'
    }, menuMessage);
  }

  // Listen for DTMF input (key presses)
  if (departments.length > 0) {
    const gather = twiml.gather({
      input: 'dtmf',
      action: '/api/voice-webhook',
      method: 'POST',
      timeout: 15,  // Increased timeout
      numDigits: 1,
      finishOnKey: '',  // Don't wait for additional key
      partialResultCallback: '/api/voice-webhook'  // Process immediately
    });
    
    // Add a brief pause after audio before gathering
    gather.pause({ length: 1 });
    
    // Fallback if no input
    twiml.say('I didn\'t receive a selection. Let me repeat the options.');
    twiml.redirect('/api/voice-webhook');
  } else {
    // No departments, go straight to main conversation
    session.context.stage = 'conversation';
    session.currentDepartment = { name: 'Main', voice: agentKnowledge.selectedVoice };
    twiml.redirect('/api/voice-webhook');
  }

  res.type('text/xml');
  res.send(twiml.toString());
}

// Helper function to handle IVR selection
async function handleIVRSelection(req, res, twiml, callSid, digits) {
  const session = callSessions.get(callSid);
  const departments = agentKnowledge.departments || [];
  
  console.log(`🔢 IVR Selection: ${digits} | Available departments: ${departments.length} | Department names: ${departments.map(d => d.name).join(', ')}`);
  
  if (digits === '0') {
    // Main receptionist
    session.context.stage = 'conversation';
    session.currentDepartment = { 
      name: 'Main Receptionist', 
      voice: agentKnowledge.selectedVoice || { voice_id: process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM' }
    };
    session.selectedVoice = session.currentDepartment.voice;
    
    const greeting = 'Hello! You\'ve reached our main receptionist. How can I assist you today?';
    await playGreetingAndStartConversation(twiml, greeting, session, callSid);
    
  } else {
    const deptIndex = parseInt(digits) - 1;
    
    console.log(`🔍 Processing department selection: digit=${digits}, index=${deptIndex}, departments.length=${departments.length}`);
    
    if (deptIndex >= 0 && deptIndex < departments.length) {
      const selectedDept = departments[deptIndex];
      
      console.log(`✅ Valid department selected: ${selectedDept.name} (index ${deptIndex})`);
      
      session.context.stage = 'conversation';
      session.currentDepartment = selectedDept;
      session.selectedVoice = selectedDept.voice || agentKnowledge.selectedVoice || { voice_id: process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM' };
      
      console.log(`🏢 Selected department: ${selectedDept.name} with voice: ${session.selectedVoice?.name || 'Default'} (${session.selectedVoice?.voice_id})`);
      
      const greeting = `Hello! You've reached the ${selectedDept.name} department. How can I help you today?`;
      await playGreetingAndStartConversation(twiml, greeting, session, callSid);
      
    } else {
      console.log(`❌ Invalid department selection: digit=${digits}, index=${deptIndex} is not in range 0-${departments.length-1}`);
      // Invalid selection
      twiml.say('I\'m sorry, that\'s not a valid option. Let me repeat the menu.');
      twiml.redirect('/api/voice-webhook');
    }
  }
  
  res.type('text/xml');
  res.send(twiml.toString());
}

// Helper function to play greeting and start conversation
async function playGreetingAndStartConversation(twiml, greeting, session, callSid) {
  console.log(`🎯 Department greeting: "${greeting}"`);

  try {
    const audioBuffer = await generateSpeech(greeting, session.selectedVoice.voice_id, callSid);
    
    const audioFileName = `dept_${callSid}_${Date.now()}.mp3`;
    const audioPath = path.join(__dirname, 'public', audioFileName);
    
    const publicDir = path.join(__dirname, 'public');
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }
    
    fs.writeFileSync(audioPath, audioBuffer);
    
    const baseUrl = process.env.NGROK_URL || `http://localhost:3001`;
    const audioUrl = `${baseUrl}/public/${audioFileName}`;
    
    console.log(`🔊 Playing department greeting: ${audioUrl}`);
    twiml.play(audioUrl);
    
  } catch (audioError) {
    console.error('❌ ElevenLabs TTS failed for department greeting:', audioError);
    twiml.say({
      voice: 'Polly.Joanna',
      rate: '0.9'
    }, greeting);
  }

  // Listen for user input
  twiml.gather({
    input: 'speech',
    action: '/api/process-speech',
    method: 'POST',
    timeout: 5,
    speechTimeout: '2'
  });

  // Fallback if no input
  twiml.say('I didn\'t catch that. Please let me know how I can help you.');
  twiml.redirect('/api/voice-webhook');
}

// Helper function to handle department conversation
async function handleDepartmentConversation(req, res, twiml, callSid) {
  // This will redirect to the speech processing for ongoing conversation
  twiml.gather({
    input: 'speech',
    action: '/api/process-speech',
    method: 'POST',
    timeout: 5,
    speechTimeout: '2'
  });

  twiml.say('How can I help you today?');
  
  res.type('text/xml');
  res.send(twiml.toString());
}

// Twilio Voice Webhook - Main call handler
app.post('/api/voice-webhook', async (req, res) => {
  try {
    const twiml = new twilio.twiml.VoiceResponse();
    const callSid = req.body.CallSid;
    const from = req.body.From;
    const digits = req.body.Digits;
    
    console.log(`📞 Incoming call from ${from}, CallSid: ${callSid}, Digits: ${digits || 'none'}`);
    
    // Get or create call session
    let session = callSessions.get(callSid);
    
    if (!session) {
      // Create new call session
      const defaultVoice = agentKnowledge.selectedVoice || { voice_id: process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM' };
      
      session = {
        from: from,
        startTime: new Date(),
        context: { stage: 'menu' },
        conversationHistory: [],
        selectedVoice: defaultVoice,
        currentDepartment: null
      };
      
      callSessions.set(callSid, session);
    }

    // Handle IVR menu navigation
    if (session.context.stage === 'menu' && digits) {
      return handleIVRSelection(req, res, twiml, callSid, digits);
    }
    
    // Handle department conversation
    if (session.context.stage === 'conversation') {
      return handleDepartmentConversation(req, res, twiml, callSid);
    }

    // Initial call or return to menu - present IVR menu
    return presentIVRMenu(req, res, twiml, callSid);
    
  } catch (error) {
    console.error('❌ Voice webhook error:', error);
    
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say('I apologize, but I\'m experiencing technical difficulties. Please try calling back in a moment.');
    twiml.hangup();
    
    res.type('text/xml');
    res.send(twiml.toString());
  }
});

// Process speech input from Twilio
app.post('/api/process-speech', async (req, res) => {
  try {
    const twiml = new twilio.twiml.VoiceResponse();
    const callSid = req.body.CallSid;
    const speechResult = req.body.SpeechResult;
    
    console.log(`Speech input from ${callSid}: "${speechResult}"`);
    
    const session = callSessions.get(callSid);
    if (!session) {
      twiml.say('Session expired. Please call back.');
      twiml.hangup();
      res.type('text/xml');
      return res.send(twiml.toString());
    }

    // Add to conversation history
    session.conversationHistory.push({
      type: 'user',
      content: speechResult,
      timestamp: new Date()
    });

    // Generate AI response
    const aiResponse = await generateAIResponse(speechResult, session.context);
    
    // Check if AI wants to transfer to another department
    if (aiResponse.includes('TRANSFER_TO:')) {
      const transferMatch = aiResponse.match(/TRANSFER_TO:(\w+)/);
      if (transferMatch) {
        const requestedDept = transferMatch[1];
        const departments = agentKnowledge.departments || [];
        const targetDept = departments.find(d => d.name.toLowerCase() === requestedDept.toLowerCase());
        
        let transferTarget = null;
        
        if (targetDept) {
          console.log(`🔄 Transferring call to ${targetDept.name} department`);
          transferTarget = targetDept;
        } else if (requestedDept.toLowerCase() === 'main') {
          console.log(`🔄 Transferring call to Main Receptionist`);
          
          // Transfer to main receptionist (like pressing 0 in IVR)
          transferTarget = { 
            name: 'Main Receptionist', 
            voice: agentKnowledge.selectedVoice || { voice_id: process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM' }
          };
        }
        
        if (transferTarget) {
          // IMPORTANT: Keep the OLD voice for the transfer message
          const oldVoice = session.selectedVoice;
          
          // Play transfer message with OLD voice, then switch
          const transferMessage = `One moment please, I'm transferring you to our ${transferTarget.name}.`;
          
          session.conversationHistory.push({
            type: 'assistant',
            content: transferMessage,
            timestamp: new Date()
          });
          
          try {
            // Play transfer message with OLD voice
            const audioBuffer = await generateSpeech(transferMessage, oldVoice?.voice_id, callSid);
            const audioFileName = `transfer_${callSid}_${Date.now()}.mp3`;
            const audioPath = path.join(__dirname, 'public', audioFileName);
            fs.writeFileSync(audioPath, audioBuffer);
            
            const baseUrl = process.env.NGROK_URL || `http://localhost:3001`;
            const audioUrl = `${baseUrl}/public/${audioFileName}`;
            
            console.log(`🔊 Playing transfer message: ${audioUrl} with OLD voice: ${oldVoice?.name}`);
            twiml.play(audioUrl);
            
            // Add realistic transfer experience
            twiml.pause({ length: 1 });
            
            // Realistic transfer experience with brief hold
            console.log(`📞 Playing transfer connecting sequence...`);
            twiml.say({
              voice: 'Polly.Joanna',
              rate: '0.9'
            }, 'Please hold while I connect your call.');
            
            // Brief realistic hold period with silence (simulates connection time)
            twiml.pause({ length: 3 });
            
            // NOW update session to new department (AFTER transfer message)
            session.currentDepartment = transferTarget;
            session.selectedVoice = transferTarget.voice;
            
            // Now play department greeting with NEW voice
            const deptGreeting = `Hello! You've been transferred to our ${transferTarget.name}. How can I assist you today?`;
            const deptAudioBuffer = await generateSpeech(deptGreeting, transferTarget.voice?.voice_id, callSid);
            const deptAudioFileName = `dept_transfer_${callSid}_${Date.now()}.mp3`;
            const deptAudioPath = path.join(__dirname, 'public', deptAudioFileName);
            fs.writeFileSync(deptAudioPath, deptAudioBuffer);
            
            const deptAudioUrl = `${baseUrl}/public/${deptAudioFileName}`;
            console.log(`🔊 Playing department greeting: ${deptAudioUrl} with voice: ${transferTarget.voice?.name}`);
            twiml.play(deptAudioUrl);
            
            session.conversationHistory.push({
              type: 'assistant',
              content: deptGreeting,
              timestamp: new Date()
            });
            
          } catch (audioError) {
            console.error('❌ Transfer audio failed, using Twilio TTS:', audioError);
            twiml.say(`One moment please, I'm transferring you to our ${transferTarget.name}.`);
            
            // Add realistic transfer experience for fallback too
            twiml.pause({ length: 1 });
            twiml.say('Please hold while I connect your call.');
            
            // Brief realistic hold period
            twiml.pause({ length: 3 });
            
            // Update session to new department for fallback too
            session.currentDepartment = transferTarget;
            session.selectedVoice = transferTarget.voice;
            
            twiml.say(`Hello! You've been transferred to our ${transferTarget.name}. How can I assist you today?`);
          }
          
          // Continue conversation in new department
          twiml.gather({
            input: 'speech',
            action: '/api/process-speech',
            method: 'POST',
            timeout: 5,
            speechTimeout: '2'
          });
          
          twiml.say('How can I help you today?');
          res.type('text/xml');
          return res.send(twiml.toString());
        } else {
          console.log(`❌ Requested department "${requestedDept}" not found`);
          // Fall through to normal response handling
        }
      }
    }

    // Check if AI wants to book an appointment
    if (aiResponse.includes('BOOK_APPOINTMENT:')) {
      const appointmentMatch = aiResponse.match(/BOOK_APPOINTMENT:([^|]+)\|([^|]+)\|([^|]+)\|([^|\s]*)/);
      if (appointmentMatch) {
        const [, date, time, purpose, email] = appointmentMatch;
        
        console.log(`📅 Attempting to book appointment: ${date} at ${time} for ${purpose}`);
        
        try {
          // Parse the date and time
          const appointmentDateTime = new Date(`${date}T${time}:00`);
          const endDateTime = new Date(appointmentDateTime.getTime() + 60 * 60 * 1000); // 1 hour appointment
          
          // Check availability
          const availability = await checkAvailability(
            appointmentDateTime.toISOString(),
            endDateTime.toISOString()
          );
          
          if (availability.available) {
            // Create the appointment
            const appointmentResult = await createAppointment(
              `${purpose} - Phone Booking`,
              `Appointment booked via phone call. Purpose: ${purpose}${email ? `. Contact: ${email}` : ''}`,
              appointmentDateTime.toISOString(),
              endDateTime.toISOString(),
              email || null
            );
            
            if (appointmentResult.success) {
              const confirmationMessage = `Perfect! I've successfully booked your appointment for ${purpose} on ${date} at ${time}. You should receive a confirmation if you provided an email. Is there anything else I can help you with?`;
              
              session.conversationHistory.push({
                type: 'assistant',
                content: confirmationMessage,
                timestamp: new Date()
              });
              
              console.log(`✅ Appointment booked successfully: ${appointmentResult.eventId}`);
              
              // Play confirmation using ElevenLabs
              try {
                const audioBuffer = await generateSpeech(confirmationMessage, session.selectedVoice?.voice_id, callSid);
                const audioFileName = `appointment_${callSid}_${Date.now()}.mp3`;
                const audioPath = path.join(__dirname, 'public', audioFileName);
                fs.writeFileSync(audioPath, audioBuffer);
                
                const baseUrl = process.env.NGROK_URL || `http://localhost:3001`;
                const audioUrl = `${baseUrl}/public/${audioFileName}`;
                
                console.log(`🔊 Playing appointment confirmation: ${audioUrl}`);
                twiml.play(audioUrl);
                
              } catch (audioError) {
                console.error('❌ ElevenLabs TTS failed for appointment confirmation:', audioError);
                twiml.say(confirmationMessage);
              }
              
              // Continue conversation
              twiml.gather({
                input: 'speech',
                action: '/api/process-speech',
                method: 'POST',
                timeout: 5,
                speechTimeout: '2'
              });
              
              twiml.say('Is there anything else I can help you with?');
              res.type('text/xml');
              return res.send(twiml.toString());
              
            } else {
              const errorMessage = `I'm sorry, I encountered an issue while booking your appointment. Let me transfer you to someone who can help you schedule it manually.`;
              
              session.conversationHistory.push({
                type: 'assistant',
                content: errorMessage,
                timestamp: new Date()
              });
              
              console.log(`❌ Failed to create appointment: ${appointmentResult.error}`);
              // Fall through to normal response handling
            }
          } else {
            const conflictMessage = `I'm sorry, but ${date} at ${time} is not available. Let me check other available times for you, or you can speak with someone to find a better time slot.`;
            
            session.conversationHistory.push({
              type: 'assistant',
              content: conflictMessage,
              timestamp: new Date()
            });
            
            console.log(`❌ Time slot not available: ${date} at ${time}`);
            // Fall through to normal response handling with conflict message
          }
        } catch (error) {
          console.error('❌ Error processing appointment booking:', error);
          const errorMessage = `I'm having trouble accessing the calendar right now. Let me transfer you to someone who can help book your appointment.`;
          
          session.conversationHistory.push({
            type: 'assistant',
            content: errorMessage,
            timestamp: new Date()
          });
          // Fall through to normal response handling
        }
      }
    }
    
    session.conversationHistory.push({
      type: 'assistant',
      content: aiResponse,
      timestamp: new Date()
    });

    // Helper function to generate and play ElevenLabs audio
    const playElevenLabsAudio = async (text, fallbackText = null) => {
      try {
        console.log(`🎯 Generating ElevenLabs response: "${text}"`);
        const audioBuffer = await generateSpeech(text, session.selectedVoice?.voice_id, callSid);
        
        // Save audio file for Twilio to play
        const audioFileName = `response_${callSid}_${Date.now()}.mp3`;
        const audioPath = path.join(__dirname, 'public', audioFileName);
        
        fs.writeFileSync(audioPath, audioBuffer);
        
        // Get the public URL for the audio file
        const baseUrl = process.env.NGROK_URL || `http://localhost:3001`;
        const audioUrl = `${baseUrl}/public/${audioFileName}`;
        
        console.log(`🔊 Playing ElevenLabs audio: ${audioUrl}`);
        twiml.play(audioUrl);
        
      } catch (audioError) {
        console.error('❌ ElevenLabs TTS failed, falling back to Twilio TTS:', audioError);
        twiml.say({
          voice: 'Polly.Joanna',
          rate: '0.9'
        }, fallbackText || text);
      }
    };

    // Check if user wants to end call
    const lowerInput = speechResult.toLowerCase();
    if (lowerInput.includes('goodbye') || lowerInput.includes('bye') || lowerInput.includes('thank you')) {
      const goodbye = agentKnowledge.responses.goodbye
        .replace('{businessName}', agentKnowledge.businessInfo.name);
      
      await playElevenLabsAudio(goodbye);
      twiml.hangup();
      
    } else {
      // Continue conversation with AI response
      await playElevenLabsAudio(aiResponse);

      // Listen for next input
      twiml.gather({
        input: 'speech',
        action: '/api/process-speech',
        method: 'POST',
        timeout: 5,
        speechTimeout: '2'
      });

      // Fallback
      await playElevenLabsAudio('Is there anything else I can help you with?');
      twiml.redirect('/api/process-speech');
    }

    res.type('text/xml');
    res.send(twiml.toString());
  } catch (error) {
    console.error('Speech processing error:', error);
    
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say('I apologize for the confusion. Let me transfer you to a representative.');
    twiml.hangup();
    
    res.type('text/xml');
    res.send(twiml.toString());
  }
});

// Call status webhook
app.post('/api/status-webhook', (req, res) => {
  const callSid = req.body.CallSid;
  const callStatus = req.body.CallStatus;
  
  console.log(`Call ${callSid} status: ${callStatus}`);
  
  if (callStatus === 'completed' || callStatus === 'failed' || callStatus === 'canceled') {
    const session = callSessions.get(callSid);
    if (session) {
      session.endTime = new Date();
      session.duration = session.endTime - session.startTime;
      
      console.log(`Call ended. Duration: ${session.duration}ms`);
      
      // Save call log (in production, save to database)
      const callLog = {
        callSid,
        from: session.from,
        startTime: session.startTime,
        endTime: session.endTime,
        duration: session.duration,
        conversationHistory: session.conversationHistory,
        status: callStatus
      };
      
      fs.promises.writeFile(
        path.join(__dirname, `call-logs/call-${callSid}.json`),
        JSON.stringify(callLog, null, 2)
      ).catch(err => console.error('Error saving call log:', err));
      
      // Clean up session
      callSessions.delete(callSid);
    }
  }
  
  res.sendStatus(200);
});

// Get call logs
app.get('/api/call-logs', async (req, res) => {
  try {
    const callLogsDir = path.join(__dirname, 'call-logs');
    
    try {
      await fs.promises.access(callLogsDir);
    } catch {
      await fs.promises.mkdir(callLogsDir, { recursive: true });
    }
    
    const files = await fs.promises.readdir(callLogsDir);
    const callLogs = [];
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const content = await fs.promises.readFile(path.join(callLogsDir, file), 'utf8');
          const log = JSON.parse(content);
          callLogs.push(log);
        } catch (err) {
          console.error(`Error reading call log ${file}:`, err);
        }
      }
    }
    
    // Sort by start time, most recent first
    callLogs.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
    
    res.json({
      success: true,
      logs: callLogs
    });
  } catch (error) {
    console.error('Error fetching call logs:', error);
    res.status(500).json({ error: 'Failed to fetch call logs' });
  }
});

// ====== GOOGLE CALENDAR API ENDPOINTS ======

// Check calendar availability
app.post('/api/calendar/check-availability', async (req, res) => {
  try {
    const { startTime, endTime } = req.body;
    
    if (!startTime || !endTime) {
      return res.status(400).json({ 
        success: false, 
        error: 'Start time and end time are required' 
      });
    }
    
    const result = await checkAvailability(startTime, endTime);
    res.json(result);
  } catch (error) {
    console.error('Error checking availability:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to check availability' 
    });
  }
});

// Create appointment
app.post('/api/calendar/create-appointment', async (req, res) => {
  try {
    const { title, description, startTime, endTime, attendeeEmail } = req.body;
    
    if (!title || !startTime || !endTime) {
      return res.status(400).json({ 
        success: false, 
        error: 'Title, start time, and end time are required' 
      });
    }
    
    // First check availability
    const availability = await checkAvailability(startTime, endTime);
    if (!availability.available) {
      return res.json({
        success: false,
        error: 'Time slot is not available',
        conflicts: availability.busy
      });
    }
    
    const result = await createAppointment(title, description, startTime, endTime, attendeeEmail);
    res.json(result);
  } catch (error) {
    console.error('Error creating appointment:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create appointment' 
    });
  }
});

// Get upcoming appointments
app.get('/api/calendar/appointments', async (req, res) => {
  try {
    const maxResults = parseInt(req.query.maxResults) || 10;
    const result = await getUpcomingAppointments(maxResults);
    res.json(result);
  } catch (error) {
    console.error('Error getting appointments:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get appointments' 
    });
  }
});

// Calendar connection status
app.get('/api/calendar/status', async (req, res) => {
  res.json({
    connected: calendar !== null,
    hasCredentials: fs.existsSync(CREDENTIALS_PATH)
  });
});

// Create call-logs directory on startup
fs.promises.mkdir(path.join(__dirname, 'call-logs'), { recursive: true })
  .catch(err => console.error('Error creating call-logs directory:', err));

// Load existing agent knowledge on startup
fs.promises.readFile(path.join(__dirname, 'agent-knowledge.json'), 'utf8')
  .then(data => {
    const savedKnowledge = JSON.parse(data);
    agentKnowledge = { ...agentKnowledge, ...savedKnowledge };
    console.log('Loaded existing agent knowledge');
  })
  .catch(err => {
    console.log('No existing agent knowledge found, using defaults');
  });

// Get available ElevenLabs voices
app.get('/api/voices', async (req, res) => {
  try {
    console.log('🎤 Fetching available ElevenLabs voices...');

    const response = await axios.get('https://api.elevenlabs.io/v1/voices', {
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY,
        'Content-Type': 'application/json'
      }
    });

    const voices = response.data.voices.map(voice => ({
      voice_id: voice.voice_id,
      name: voice.name,
      preview_url: voice.preview_url,
      category: voice.category || 'general',
      description: voice.description || '',
      labels: voice.labels || {},
      // Add accent and tone categorization
      accent: categorizeAccent(voice.name, voice.labels),
      tone: categorizeTone(voice.name, voice.labels, voice.description),
      gender: voice.labels?.gender || 'unknown',
      age: voice.labels?.age || 'unknown'
    }));

    // Group voices by accent and tone for easier selection
    const groupedVoices = {
      byAccent: groupBy(voices, 'accent'),
      byTone: groupBy(voices, 'tone'),
      byGender: groupBy(voices, 'gender'),
      all: voices
    };

    console.log(`✅ Retrieved ${voices.length} ElevenLabs voices`);

    res.json({
      success: true,
      voices: groupedVoices,
      message: `Found ${voices.length} available voices`
    });

  } catch (error) {
    console.error('❌ Error fetching ElevenLabs voices:', error);
    
    // Fallback voices if API fails
    const fallbackVoices = {
      byAccent: {
        'American': [
          { voice_id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', tone: 'Professional', gender: 'female' },
          { voice_id: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi', tone: 'Friendly', gender: 'female' },
          { voice_id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella', tone: 'Warm', gender: 'female' }
        ],
        'British': [
          { voice_id: 'XrExE9yKIg1WjnnlVkGX', name: 'Matilda', tone: 'Professional', gender: 'female' },
          { voice_id: '2EiwWnXFnvU5JabPnv8n', name: 'Clyde', tone: 'Authoritative', gender: 'male' }
        ]
      },
      byTone: {
        'Professional': [
          { voice_id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', accent: 'American', gender: 'female' },
          { voice_id: 'XrExE9yKIg1WjnnlVkGX', name: 'Matilda', accent: 'British', gender: 'female' }
        ],
        'Friendly': [
          { voice_id: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi', accent: 'American', gender: 'female' },
          { voice_id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella', accent: 'American', gender: 'female' }
        ]
      },
      all: [
        { voice_id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', accent: 'American', tone: 'Professional', gender: 'female' },
        { voice_id: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi', accent: 'American', tone: 'Friendly', gender: 'female' },
        { voice_id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella', accent: 'American', tone: 'Warm', gender: 'female' },
        { voice_id: 'XrExE9yKIg1WjnnlVkGX', name: 'Matilda', accent: 'British', tone: 'Professional', gender: 'female' },
        { voice_id: '2EiwWnXFnvU5JabPnv8n', name: 'Clyde', accent: 'British', tone: 'Authoritative', gender: 'male' }
      ]
    };

    res.json({
      success: true,
      voices: fallbackVoices,
      message: 'Using fallback voices (ElevenLabs API unavailable)',
      fallback: true
    });
  }
});

// Helper functions for voice categorization
function categorizeAccent(name, labels) {
  const nameUpper = name.toUpperCase();
  const description = labels?.description?.toUpperCase() || '';
  
  if (nameUpper.includes('BRITISH') || nameUpper.includes('UK') || description.includes('BRITISH')) {
    return 'British';
  } else if (nameUpper.includes('AMERICAN') || nameUpper.includes('US') || description.includes('AMERICAN')) {
    return 'American';
  } else if (nameUpper.includes('AUSTRALIAN') || description.includes('AUSTRALIAN')) {
    return 'Australian';
  } else if (nameUpper.includes('CANADIAN') || description.includes('CANADIAN')) {
    return 'Canadian';
  } else if (nameUpper.includes('IRISH') || description.includes('IRISH')) {
    return 'Irish';
  } else if (nameUpper.includes('SCOTTISH') || description.includes('SCOTTISH')) {
    return 'Scottish';
  }
  
  // Default to American for most voices
  return 'American';
}

function categorizeTone(name, labels, description = '') {
  const combined = `${name} ${description} ${JSON.stringify(labels)}`.toUpperCase();
  
  if (combined.includes('PROFESSIONAL') || combined.includes('BUSINESS') || combined.includes('CORPORATE')) {
    return 'Professional';
  } else if (combined.includes('FRIENDLY') || combined.includes('WARM') || combined.includes('WELCOMING')) {
    return 'Friendly';
  } else if (combined.includes('AUTHORITATIVE') || combined.includes('CONFIDENT') || combined.includes('STRONG')) {
    return 'Authoritative';
  } else if (combined.includes('CALM') || combined.includes('SOOTHING') || combined.includes('GENTLE')) {
    return 'Calm';
  } else if (combined.includes('ENERGETIC') || combined.includes('UPBEAT') || combined.includes('LIVELY')) {
    return 'Energetic';
  } else if (combined.includes('CASUAL') || combined.includes('RELAXED')) {
    return 'Casual';
  }
  
  return 'Professional'; // Default tone
}

function groupBy(array, key) {
  return array.reduce((result, item) => {
    const group = item[key];
    if (!result[group]) {
      result[group] = [];
    }
    result[group].push(item);
    return result;
  }, {});
}

// Test voice endpoint
app.post('/api/test-voice', async (req, res) => {
  try {
    const { voiceId, text = "Hello! This is a test of your selected voice for your AI receptionist." } = req.body;

    if (!voiceId) {
      return res.status(400).json({ error: 'Voice ID is required' });
    }

    console.log(`🎤 Testing voice ${voiceId}...`);

    const response = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        text: text,
        model_id: "eleven_monolingual_v1",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5
        }
      },
      {
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY,
          'Content-Type': 'application/json'
        },
        responseType: 'arraybuffer'
      }
    );

    // Convert audio to base64 for frontend playback
    const audioBase64 = Buffer.from(response.data).toString('base64');

    res.json({
      success: true,
      audioData: `data:audio/mpeg;base64,${audioBase64}`,
      message: 'Voice test generated successfully'
    });

  } catch (error) {
    console.error('❌ Error testing voice:', error);
    res.status(500).json({ 
      error: 'Failed to test voice',
      details: error.message
    });
  }
});

// Start server
app.listen(port, async () => {
  console.log(`🚀 Calladina AI Voice Agent Server running on port ${port}`);
  console.log(`🤖 AI Services Status:`);
  console.log(`   - OpenAI: ${process.env.OPENAI_API_KEY ? '✅ Connected' : '❌ Not configured'}`);
  console.log(`   - ElevenLabs: ${process.env.ELEVENLABS_API_KEY ? '✅ Connected' : '❌ Not configured'}`);
  console.log(`   - Twilio: ${process.env.TWILIO_ACCOUNT_SID ? '✅ Connected' : '❌ Not configured'}`);
  
  // Initialize Google Calendar
  await initializeCalendar();
  
  console.log(`📞 Webhook URL: ${process.env.NGROK_URL || 'https://your-ngrok-url.ngrok.io'}/api/voice-webhook`);
}); 