import React, { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';

const AgentTraining = ({ user, onComplete }) => {
  const [agentKnowledge, setAgentKnowledge] = useState({
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
    }
  });

  const [testMessage, setTestMessage] = useState('');
  const [testResponse, setTestResponse] = useState('');
  const [isTestingAI, setIsTestingAI] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [isLoadingKnowledge, setIsLoadingKnowledge] = useState(true);

  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';

  // Load existing agent knowledge and setup guide data on component mount
  useEffect(() => {
    loadAgentKnowledge();
  }, [user]);

  const loadAgentKnowledge = async () => {
    try {
      // First, load existing agent knowledge from backend
      const agentResponse = await fetch(`${apiUrl}/api/agent/knowledge`);
      let agentData = {};
      if (agentResponse.ok) {
        const data = await agentResponse.json();
        agentData = data.knowledge;
      }

      // Then, load setup guide data from Firestore if user is available
      let setupData = {};
      if (user) {
        try {
          const docRef = doc(db, 'setupConfigurations', user.uid);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            setupData = docSnap.data().formData || {};
            console.log('Loaded setup guide data:', setupData);
          }
        } catch (error) {
          console.error('Error loading setup guide data:', error);
        }
      }

          // Merge setup guide data into agent knowledge
    const mergedKnowledge = mergeSetupDataWithAgent(agentData, setupData);
    setAgentKnowledge(mergedKnowledge);
    
    // Store selected voice globally for use in call sessions
    if (setupData.selectedVoice) {
      sessionStorage.setItem('selectedVoice', JSON.stringify(setupData.selectedVoice));
    }

    } catch (error) {
      console.error('Error loading agent knowledge:', error);
    } finally {
      setIsLoadingKnowledge(false);
    }
  };

  // Function to merge setup guide data with agent knowledge
  const mergeSetupDataWithAgent = (agentData, setupData) => {
    const merged = { ...agentData };

    if (setupData.businessName) {
      merged.businessInfo = merged.businessInfo || {};
      merged.businessInfo.name = setupData.businessName;
    }

    if (setupData.industry) {
      merged.businessInfo = merged.businessInfo || {};
      merged.businessInfo.industry = setupData.industry;
    }

    if (setupData.primaryEmail) {
      merged.businessInfo = merged.businessInfo || {};
      merged.businessInfo.contact = merged.businessInfo.contact || {};
      merged.businessInfo.contact.email = setupData.primaryEmail;
    }

    if (setupData.selectedPhoneNumber) {
      merged.businessInfo = merged.businessInfo || {};
      merged.businessInfo.contact = merged.businessInfo.contact || {};
      merged.businessInfo.contact.phone = setupData.selectedPhoneNumber;
    }

    // Merge business hours from setup
    if (setupData.businessHours) {
      merged.businessInfo = merged.businessInfo || {};
      const hours = Object.entries(setupData.businessHours)
        .filter(([day, schedule]) => schedule.isOpen)
        .map(([day, schedule]) => `${day}: ${schedule.hours}`)
        .join(', ');
      if (hours) {
        merged.businessInfo.hours = hours;
      }
    }

    // Extract services from industry and other setup data
    if (setupData.industry) {
      merged.businessInfo = merged.businessInfo || {};
      const defaultServices = getServicesFromIndustry(setupData.industry);
      merged.businessInfo.services = [...new Set([...defaultServices, ...(merged.businessInfo.services || [])])];
    }

    // Update greeting to include business name
    if (setupData.businessName) {
      merged.responses = merged.responses || {};
      merged.responses.greeting = merged.responses.greeting.replace('{businessName}', setupData.businessName);
      merged.responses.goodbye = merged.responses.goodbye.replace('{businessName}', setupData.businessName);
    }

    // Include voice selection from setup guide
    if (setupData.selectedVoice) {
      merged.selectedVoice = setupData.selectedVoice;
    }

    // Include departments with voices from setup guide
    if (setupData.departments && Array.isArray(setupData.departments)) {
      merged.departments = setupData.departments.filter(dept => dept.name && dept.extension);
    }

    return merged;
  };

  // Function to get default services based on industry
  const getServicesFromIndustry = (industry) => {
    const industryServices = {
      'Healthcare': ['Appointments', 'Patient Support', 'Medical Information', 'Insurance Inquiries'],
      'Legal': ['Consultations', 'Case Updates', 'Document Requests', 'Legal Advice'],
      'Real Estate': ['Property Inquiries', 'Showings', 'Market Information', 'Mortgage Assistance'],
      'Technology': ['Technical Support', 'Product Information', 'Software Updates', 'Training'],
      'Education': ['Enrollment', 'Student Support', 'Course Information', 'Academic Counseling'],
      'Finance': ['Account Services', 'Investment Advice', 'Loan Applications', 'Financial Planning'],
      'Retail': ['Product Support', 'Order Status', 'Returns & Exchanges', 'Store Information'],
      'Restaurant': ['Reservations', 'Catering', 'Menu Information', 'Special Events'],
      'Professional Services': ['Consultations', 'Project Updates', 'Service Information', 'Scheduling'],
      'Other': ['Customer Support', 'Appointments', 'General Information']
    };

    return industryServices[industry] || industryServices['Other'];
  };

  const handleBusinessInfoChange = (field, value) => {
    setAgentKnowledge(prev => ({
      ...prev,
      businessInfo: {
        ...prev.businessInfo,
        [field]: value
      }
    }));
  };

  const handleContactChange = (field, value) => {
    setAgentKnowledge(prev => ({
      ...prev,
      businessInfo: {
        ...prev.businessInfo,
        contact: {
          ...prev.businessInfo.contact,
          [field]: value
        }
      }
    }));
  };

  const handleServicesChange = (value) => {
    const services = value.split(',').map(s => s.trim()).filter(s => s.length > 0);
    setAgentKnowledge(prev => ({
      ...prev,
      businessInfo: {
        ...prev.businessInfo,
        services: services
      }
    }));
  };

  const handleResponseChange = (responseType, value) => {
    setAgentKnowledge(prev => ({
      ...prev,
      responses: {
        ...prev.responses,
        [responseType]: value
      }
    }));
  };

  const handlePersonalityChange = (field, value) => {
    if (field === 'traits') {
      const traits = value.split(',').map(t => t.trim()).filter(t => t.length > 0);
      setAgentKnowledge(prev => ({
        ...prev,
        personality: {
          ...prev.personality,
          traits: traits
        }
      }));
    } else {
      setAgentKnowledge(prev => ({
        ...prev,
        personality: {
          ...prev.personality,
          [field]: value
        }
      }));
    }
  };

  const saveAgentTraining = async () => {
    setIsSaving(true);
    setSaveMessage('');

    try {
      // Re-sync with setup guide data before saving to ensure we have the latest
      if (user) {
        try {
          const docRef = doc(db, 'setupConfigurations', user.uid);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            const setupData = docSnap.data().formData || {};
            console.log('Re-syncing with latest setup data before saving:', setupData);
            
            // Merge the latest setup data with current agent knowledge
            const syncedKnowledge = mergeSetupDataWithAgent(agentKnowledge, setupData);
            setAgentKnowledge(syncedKnowledge);
            
            // Use the synced knowledge for saving
            const completeAgentKnowledge = {
              ...syncedKnowledge,
              // Include voice selection from setup guide
              selectedVoice: syncedKnowledge.selectedVoice || JSON.parse(sessionStorage.getItem('selectedVoice') || 'null'),
            };

            const response = await fetch(`${apiUrl}/api/agent/train`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(completeAgentKnowledge)
            });

            const data = await response.json();

            if (response.ok) {
              setSaveMessage('✅ Agent training saved successfully! Your AI now has all your business information and will use it to answer calls.');
              setTimeout(() => setSaveMessage(''), 5000);
            } else {
              setSaveMessage(`❌ Error: ${data.error}`);
            }
            
            return; // Exit early since we handled the save
          }
        } catch (syncError) {
          console.error('Error syncing with setup data:', syncError);
          // Continue with regular save if sync fails
        }
      }

      // Fallback: regular save without re-sync
      const completeAgentKnowledge = {
        ...agentKnowledge,
        // Include voice selection from setup guide
        selectedVoice: agentKnowledge.selectedVoice || JSON.parse(sessionStorage.getItem('selectedVoice') || 'null'),
      };

      const response = await fetch(`${apiUrl}/api/agent/train`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(completeAgentKnowledge)
      });

      const data = await response.json();

      if (response.ok) {
        setSaveMessage('✅ Agent training saved successfully! Your AI now has all your business information and will use it to answer calls.');
        setTimeout(() => setSaveMessage(''), 5000);
      } else {
        setSaveMessage(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error saving agent training:', error);
      setSaveMessage('❌ Error saving agent training. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const testAIResponse = async () => {
    if (!testMessage.trim()) return;

    setIsTestingAI(true);
    setTestResponse('');

    try {
      const response = await fetch(`${apiUrl}/api/agent/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: testMessage,
          context: {}
        })
      });

      const data = await response.json();

      if (response.ok) {
        setTestResponse(data.response);
      } else {
        setTestResponse(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error testing AI response:', error);
      setTestResponse('Error connecting to AI service. Please try again.');
    } finally {
      setIsTestingAI(false);
    }
  };

  if (isLoadingKnowledge) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-slate-600">Loading your business data and agent knowledge...</p>
          <p className="text-slate-500 text-sm mt-2">Integrating Setup Guide with AI Training...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-500 to-purple-600 rounded-3xl mb-6 shadow-soft-lg">
            <span className="text-3xl">🤖</span>
          </div>
          <h1 className="text-4xl font-bold text-slate-900 mb-3 tracking-tight">AI Agent Training</h1>
          <p className="text-slate-600 text-lg leading-relaxed max-w-2xl mx-auto">
            Your AI agent has been automatically configured with your business information from the setup guide. 
            Fine-tune responses and personality below.
          </p>
          {agentKnowledge.businessInfo.name !== "Your Business" && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg max-w-md mx-auto">
              <p className="text-sm text-green-800">
                ✅ <strong>Loaded from Setup:</strong> {agentKnowledge.businessInfo.name}
              </p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Training Interface */}
          <div className="space-y-8">
            {/* Business Information */}
            <div className="bg-white rounded-2xl shadow-soft border border-slate-200 p-8">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
                  <span className="text-white text-lg">🏢</span>
                </div>
                <h2 className="text-2xl font-bold text-slate-900">Business Information</h2>
                <div className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                  Auto-loaded from Setup
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Business Name
                  </label>
                  <input
                    type="text"
                    value={agentKnowledge.businessInfo.name}
                    onChange={(e) => handleBusinessInfoChange('name', e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-0 transition-all duration-200 shadow-sm hover:shadow-soft"
                    placeholder="Your Business Name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Business Hours
                  </label>
                  <input
                    type="text"
                    value={agentKnowledge.businessInfo.hours}
                    onChange={(e) => handleBusinessInfoChange('hours', e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-0 transition-all duration-200 shadow-sm hover:shadow-soft"
                    placeholder="9 AM - 5 PM Monday to Friday"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Services (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={agentKnowledge.businessInfo.services.join(', ')}
                    onChange={(e) => handleServicesChange(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-0 transition-all duration-200 shadow-sm hover:shadow-soft"
                    placeholder="Customer Support, Appointments, General Information"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={agentKnowledge.businessInfo.contact.email}
                      onChange={(e) => handleContactChange('email', e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-0 transition-all duration-200 shadow-sm hover:shadow-soft"
                      placeholder="info@yourbusiness.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={agentKnowledge.businessInfo.contact.phone}
                      onChange={(e) => handleContactChange('phone', e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-0 transition-all duration-200 shadow-sm hover:shadow-soft"
                      placeholder="+1234567890"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* AI Personality */}
            <div className="bg-white rounded-2xl shadow-soft border border-slate-200 p-8">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-purple-500 rounded-xl flex items-center justify-center">
                  <span className="text-white text-lg">🎭</span>
                </div>
                <h2 className="text-2xl font-bold text-slate-900">AI Personality</h2>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Tone
                  </label>
                  <input
                    type="text"
                    value={agentKnowledge.personality.tone}
                    onChange={(e) => handlePersonalityChange('tone', e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:border-purple-500 focus:ring-0 transition-all duration-200 shadow-sm hover:shadow-soft"
                    placeholder="professional and friendly"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Style
                  </label>
                  <input
                    type="text"
                    value={agentKnowledge.personality.style}
                    onChange={(e) => handlePersonalityChange('style', e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:border-purple-500 focus:ring-0 transition-all duration-200 shadow-sm hover:shadow-soft"
                    placeholder="concise but helpful"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Traits (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={agentKnowledge.personality.traits.join(', ')}
                    onChange={(e) => handlePersonalityChange('traits', e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:border-purple-500 focus:ring-0 transition-all duration-200 shadow-sm hover:shadow-soft"
                    placeholder="patient, understanding, professional"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Custom Responses & Testing */}
          <div className="space-y-8">
            {/* Custom Responses */}
            <div className="bg-white rounded-2xl shadow-soft border border-slate-200 p-8">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center">
                  <span className="text-white text-lg">💬</span>
                </div>
                <h2 className="text-2xl font-bold text-slate-900">Custom Responses</h2>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Greeting Message
                  </label>
                  <textarea
                    value={agentKnowledge.responses.greeting}
                    onChange={(e) => handleResponseChange('greeting', e.target.value)}
                    rows="3"
                    className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:border-green-500 focus:ring-0 transition-all duration-200 shadow-sm hover:shadow-soft resize-none"
                    placeholder="Hello! Thank you for calling..."
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Use {'{businessName}'} and {'{agentName}'} for dynamic values
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Goodbye Message
                  </label>
                  <textarea
                    value={agentKnowledge.responses.goodbye}
                    onChange={(e) => handleResponseChange('goodbye', e.target.value)}
                    rows="2"
                    className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:border-green-500 focus:ring-0 transition-all duration-200 shadow-sm hover:shadow-soft resize-none"
                    placeholder="Thank you for calling..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Fallback Response
                  </label>
                  <textarea
                    value={agentKnowledge.responses.fallback}
                    onChange={(e) => handleResponseChange('fallback', e.target.value)}
                    rows="2"
                    className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:border-green-500 focus:ring-0 transition-all duration-200 shadow-sm hover:shadow-soft resize-none"
                    placeholder="I'm not sure about that..."
                  />
                </div>
              </div>
            </div>

            {/* AI Testing */}
            <div className="bg-white rounded-2xl shadow-soft border border-slate-200 p-8">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center">
                  <span className="text-white text-lg">🧪</span>
                </div>
                <h2 className="text-2xl font-bold text-slate-900">Test AI Agent</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Test Message
                  </label>
                  <textarea
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    rows="3"
                    className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:border-orange-500 focus:ring-0 transition-all duration-200 shadow-sm hover:shadow-soft resize-none"
                    placeholder="What are your business hours?"
                  />
                </div>

                <button
                  onClick={testAIResponse}
                  disabled={isTestingAI || !testMessage.trim()}
                  className="w-full px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-lg font-semibold transition-all duration-200 shadow-soft hover:shadow-soft-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center"
                >
                  {isTestingAI ? (
                    <>
                      <svg className="animate-spin w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Testing AI...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Test AI Response
                    </>
                  )}
                </button>

                {testResponse && (
                  <div className="mt-4 p-4 bg-gradient-to-r from-slate-50 to-slate-100 border border-slate-200 rounded-lg">
                    <h4 className="text-sm font-semibold text-slate-700 mb-2">AI Response:</h4>
                    <p className="text-slate-900 text-sm leading-relaxed">{testResponse}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="text-center mt-10">
          <div className="flex flex-col items-center space-y-4">
            <button
              onClick={saveAgentTraining}
              disabled={isSaving}
              className="px-12 py-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl font-semibold text-lg transition-all duration-200 shadow-soft hover:shadow-soft-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center mx-auto"
            >
              {isSaving ? (
                <>
                  <svg className="animate-spin w-5 h-5 mr-3" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving Agent Training...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Save Agent Training
                </>
              )}
            </button>

            {/* Complete Training Button */}
            {saveMessage.includes('✅') && (
              <button
                onClick={async () => {
                  // Save one more time before completing
                  await saveAgentTraining();
                  // Call onComplete to go to dashboard
                  if (onComplete) {
                    onComplete();
                  }
                }}
                className="px-12 py-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl font-semibold text-lg transition-all duration-200 shadow-soft hover:shadow-soft-lg hover:scale-105 flex items-center justify-center mx-auto"
              >
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Complete Training & Go to Dashboard
              </button>
            )}
          </div>

          {saveMessage && (
            <div className="mt-4 text-center">
              <p className={`text-lg font-medium ${saveMessage.includes('✅') ? 'text-green-600' : 'text-red-600'}`}>
                {saveMessage}
              </p>
            </div>
          )}
        </div>

        {/* Phone Deployment Status */}
        <div className="mt-12 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-2xl p-8">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-500 rounded-2xl mb-4">
              <span className="text-2xl">📞</span>
            </div>
            <h3 className="text-xl font-bold text-yellow-900 mb-3">Phone Number Not Live Yet</h3>
            <p className="text-yellow-800 mb-4">
              Your AI agent is trained but your phone number <strong>+1 (343) 655-3015</strong> needs to be deployed with ngrok.
            </p>
            <div className="bg-white rounded-lg p-4 max-w-md mx-auto">
              <p className="text-sm text-slate-700 mb-2"><strong>To activate phone calls:</strong></p>
              <p className="text-xs text-slate-600 font-mono bg-slate-100 p-2 rounded">./deploy.sh</p>
              <p className="text-xs text-slate-500 mt-2">Run this in a new terminal to enable live calls</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentTraining; 