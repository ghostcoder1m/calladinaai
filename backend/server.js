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