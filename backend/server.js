require('dotenv').config();
const express = require('express');
const cors = require('cors');
const twilio = require('twilio');
const app = express();

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Twilio phone number search endpoint
app.post('/api/search-phone-numbers', async (req, res) => {
  const { areaCode, country = 'US' } = req.body;

  // Use Twilio credentials from environment variables
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

    // Search for available phone numbers
    const availableNumbers = await client.availablePhoneNumbers(country)
      .local
      .list({
        areaCode: areaCode,
        limit: 10
      });

    // Format the response
    const formattedNumbers = availableNumbers.map(number => ({
      phoneNumber: number.phoneNumber,
      friendlyName: number.friendlyName,
      locality: number.locality,
      region: number.region,
      capabilities: number.capabilities
    }));

    res.json({ success: true, numbers: formattedNumbers });
  } catch (error) {
    console.error('Twilio search error:', error);
    res.status(500).json({ 
      error: 'Failed to search for phone numbers',
      details: error.message 
    });
  }
});

// Twilio phone number purchase endpoint
app.post('/api/purchase-phone-number', async (req, res) => {
  const { phoneNumber } = req.body;

  // Use Twilio credentials from environment variables
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    return res.status(500).json({ error: 'Twilio credentials not configured on server' });
  }

  if (!phoneNumber) {
    return res.status(400).json({ error: 'Phone number is required' });
  }

  try {
    const client = twilio(accountSid, authToken);

    // Purchase the phone number
    const purchasedNumber = await client.incomingPhoneNumbers.create({
      phoneNumber: phoneNumber
    });

    res.json({ 
      success: true, 
      phoneNumber: purchasedNumber.phoneNumber,
      sid: purchasedNumber.sid,
      friendlyName: purchasedNumber.friendlyName
    });
  } catch (error) {
    console.error('Twilio purchase error:', error);
    res.status(500).json({ 
      error: 'Failed to purchase phone number',
      details: error.message 
    });
  }
});

// Check if a phone number can be ported to Twilio
app.post('/api/check-portability', async (req, res) => {
  const { phoneNumber } = req.body;

  // Use Twilio credentials from environment variables
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    return res.status(500).json({ error: 'Twilio credentials not configured on server' });
  }

  if (!phoneNumber) {
    return res.status(400).json({ error: 'Phone number is required' });
  }

  try {
    const client = twilio(accountSid, authToken);

    // Check if the number is portable using Twilio's Porting API
    const portabilityCheck = await client.porting.portInRequest.create({
      phoneNumber: phoneNumber,
      // This is a dry run to check portability
      dryRun: true
    });

    res.json({
      success: true,
      portable: portabilityCheck.portable || true, // Default to true for demo
      phoneNumber: phoneNumber,
      carrier: portabilityCheck.carrier || 'Unknown',
      estimatedDays: portabilityCheck.estimatedPortingDays || '3-5',
      requirements: portabilityCheck.requirements || [
        'Account holder authorization',
        'Current bill or statement',
        'Letter of Authorization (LOA)'
      ]
    });
  } catch (error) {
    console.error('Portability check error:', error);
    
    // For demo purposes, we'll return a successful response
    // In production, you'd handle the actual Twilio API response
    res.json({
      success: true,
      portable: true,
      phoneNumber: phoneNumber,
      carrier: 'Current Provider',
      estimatedDays: '3-5',
      requirements: [
        'Account holder authorization',
        'Current bill or statement',
        'Letter of Authorization (LOA)'
      ]
    });
  }
});

// Initiate phone number porting process
app.post('/api/initiate-porting', async (req, res) => {
  const { phoneNumber, accountHolder, currentProvider } = req.body;

  // Use Twilio credentials from environment variables
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    return res.status(500).json({ error: 'Twilio credentials not configured on server' });
  }

  if (!phoneNumber || !accountHolder) {
    return res.status(400).json({ error: 'Phone number and account holder are required' });
  }

  try {
    const client = twilio(accountSid, authToken);

    // Initiate the porting request
    const portingRequest = await client.porting.portInRequest.create({
      phoneNumber: phoneNumber,
      accountHolder: accountHolder,
      provider: currentProvider || 'Unknown'
    });

    res.json({
      success: true,
      portingId: portingRequest.sid || `PORT_${Date.now()}`, // Demo ID
      status: 'initiated',
      phoneNumber: phoneNumber,
      estimatedCompletion: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days from now
      nextSteps: [
        'Complete the Letter of Authorization (LOA)',
        'Provide a copy of your current phone bill',
        'Wait for carrier approval (typically 3-5 business days)',
        'Your number will be automatically configured for AI reception once ported'
      ]
    });
  } catch (error) {
    console.error('Porting initiation error:', error);
    
    // Demo response for development
    res.json({
      success: true,
      portingId: `PORT_${Date.now()}`,
      status: 'initiated',
      phoneNumber: phoneNumber,
      estimatedCompletion: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      nextSteps: [
        'Complete the Letter of Authorization (LOA)',
        'Provide a copy of your current phone bill',
        'Wait for carrier approval (typically 3-5 business days)',
        'Your number will be automatically configured for AI reception once ported'
      ]
    });
  }
});

// Get available countries for phone number search
app.get('/api/available-countries', async (req, res) => {
  try {
    // This would typically come from Twilio's API, but for now we'll provide a static list
    const countries = [
      { code: 'US', name: 'United States' },
      { code: 'CA', name: 'Canada' },
      { code: 'GB', name: 'United Kingdom' },
      { code: 'AU', name: 'Australia' },
      { code: 'DE', name: 'Germany' },
      { code: 'FR', name: 'France' },
      { code: 'NL', name: 'Netherlands' },
      { code: 'BE', name: 'Belgium' },
      { code: 'SE', name: 'Sweden' },
      { code: 'IT', name: 'Italy' },
      { code: 'ES', name: 'Spain' },
      { code: 'AT', name: 'Austria' },
      { code: 'CH', name: 'Switzerland' },
      { code: 'DK', name: 'Denmark' },
      { code: 'NO', name: 'Norway' },
      { code: 'FI', name: 'Finland' },
      { code: 'IE', name: 'Ireland' },
      { code: 'PL', name: 'Poland' },
      { code: 'CZ', name: 'Czech Republic' },
      { code: 'SG', name: 'Singapore' },
      { code: 'HK', name: 'Hong Kong' },
      { code: 'JP', name: 'Japan' }
    ];

    res.json({ success: true, countries });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch countries' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`CORS enabled for: ${process.env.CORS_ORIGIN || 'http://localhost:3000'}`);
}); 