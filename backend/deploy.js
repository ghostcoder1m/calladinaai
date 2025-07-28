const ngrok = require('ngrok');
const fs = require('fs');
const path = require('path');

const WEBHOOK_PORT = process.env.PORT || 3001;

async function deployWithNgrok() {
  try {
    console.log('🚀 Starting Calladina AI Voice Agent Deployment...\n');

    // Start ngrok tunnel
    console.log('🌐 Creating ngrok tunnel...');
    const url = await ngrok.connect({
      addr: WEBHOOK_PORT,
      authtoken: process.env.NGROK_AUTH_TOKEN, // Optional: set your ngrok auth token
      region: 'us' // You can change this to your preferred region
    });

    console.log(`✅ Ngrok tunnel established!`);
    console.log(`📡 Public URL: ${url}`);
    console.log(`🔗 Webhook URL: ${url}/api/voice-webhook\n`);

    // Update environment variables
    const envPath = path.join(__dirname, '.env');
    let envContent = '';
    
    try {
      envContent = fs.readFileSync(envPath, 'utf8');
    } catch (error) {
      console.log('⚠️  .env file not found, creating one...');
    }

    // Update or add NGROK_URL
    const ngrokUrlRegex = /NGROK_URL=.*/;
    const newNgrokLine = `NGROK_URL=${url}`;
    
    if (ngrokUrlRegex.test(envContent)) {
      envContent = envContent.replace(ngrokUrlRegex, newNgrokLine);
    } else {
      envContent += `\n${newNgrokLine}\n`;
    }

    fs.writeFileSync(envPath, envContent);
    console.log('📝 Updated .env file with ngrok URL\n');

    console.log('🔧 TWILIO WEBHOOK CONFIGURATION:');
    console.log('   1. Go to Twilio Console: https://console.twilio.com/');
    console.log('   2. Navigate to Phone Numbers > Manage > Active Numbers');
    console.log('   3. Select your purchased phone number');
    console.log('   4. In the "Voice & Fax" section, set:');
    console.log(`      - Webhook URL: ${url}/api/voice-webhook`);
    console.log('      - HTTP Method: POST');
    console.log(`      - Status Callback URL: ${url}/api/status-webhook`);
    console.log('      - Status Callback Method: POST\n');

    console.log('🎯 AI VOICE AGENT ENDPOINTS:');
    console.log(`   - Voice Webhook: ${url}/api/voice-webhook`);
    console.log(`   - Status Webhook: ${url}/api/status-webhook`);
    console.log(`   - Agent Training: ${url}/api/agent/train`);
    console.log(`   - Test AI: ${url}/api/agent/test`);
    console.log(`   - Text-to-Speech: ${url}/api/tts`);
    console.log(`   - Call Logs: ${url}/api/call-logs`);
    console.log(`   - Health Check: ${url}/api/health\n`);

    console.log('📞 TESTING YOUR AI VOICE AGENT:');
    console.log('   1. Make sure your Twilio webhook is configured (see above)');
    console.log('   2. Call your Twilio phone number');
    console.log('   3. The AI agent should answer and start conversation');
    console.log('   4. Check the backend logs for real-time debugging\n');

    console.log('🔧 ENVIRONMENT SETUP CHECKLIST:');
    console.log(`   ✅ Ngrok tunnel: ${url}`);
    console.log(`   ${process.env.OPENAI_API_KEY ? '✅' : '❌'} OpenAI API Key`);
    console.log(`   ${process.env.ELEVENLABS_API_KEY ? '✅' : '❌'} ElevenLabs API Key`);
    console.log(`   ${process.env.TWILIO_ACCOUNT_SID ? '✅' : '❌'} Twilio Account SID`);
    console.log(`   ${process.env.TWILIO_AUTH_TOKEN ? '✅' : '❌'} Twilio Auth Token\n`);

    // Keep the tunnel alive
    console.log('🎉 Deployment complete! AI Voice Agent is now live!');
    console.log('💡 Keep this terminal open to maintain the ngrok tunnel');
    console.log('🛑 Press Ctrl+C to stop the tunnel and deployment\n');

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n🛑 Shutting down ngrok tunnel...');
      await ngrok.disconnect();
      await ngrok.kill();
      console.log('✅ Deployment stopped. Goodbye!');
      process.exit(0);
    });

    // Keep the process alive
    setInterval(() => {
      console.log(`⏰ ${new Date().toLocaleTimeString()} - Tunnel active: ${url}`);
    }, 300000); // Log every 5 minutes

  } catch (error) {
    console.error('❌ Deployment failed:', error);
    process.exit(1);
  }
}

// Run deployment
deployWithNgrok(); 