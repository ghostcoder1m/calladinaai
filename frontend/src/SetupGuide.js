import React, { useState, useEffect, useCallback } from 'react';
import { db } from './firebase';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from './firebase';

const SetupGuide = ({ onComplete }) => {
  const [user] = useAuthState(auth);
  const [formData, setFormData] = useState({
    // Business Details
    businessName: '',
    industry: '',
    businessAddress: '',
    website: '',
    phoneNumber: '',
    primaryEmail: '',
    
    // Business Hours
    mondayHours: '',
    tuesdayHours: '',
    wednesdayHours: '',
    thursdayHours: '',
    fridayHours: '',
    saturdayHours: '',
    sundayHours: '',
    afterHoursHandling: '',
    holidayOption: '',
    country: 'US',
    customHolidays: '',
    
    // Phone Setup
    hasBusinessPhone: '',
    forwardCalls: '',
    needNewNumber: '',
    preferredAreaCode: '',
    twilioAccountSid: '',
    twilioAuthToken: '',
    selectedPhoneNumber: '',
    
    // Call Routing
    departments: [{ name: '', extension: '', voice: null }],
    wantCallMenu: '',
    ivrMenu: {
      enabled: false,
      welcomeMessage: '',
      menuItems: [
        { id: 1, key: '1', label: '', action: 'transfer', target: '', subMenu: [] }
      ]
    },
    
    // Booking & Calendar
    enableBooking: '',
    calendarType: '',
    bookingServices: [{ name: '', duration: '', description: '' }],
    bookingInfo: '',
    
    // Voice Preferences
    selectedVoice: null,
    tone: 'Professional',
    voiceGender: 'female',
    accent: 'American',
    additionalLanguages: '',
    languageList: '',
    
    // Additional
    specialInstructions: ''
  });

  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [availableNumbers, setAvailableNumbers] = useState([]);
  const [searchingNumbers, setSearchingNumbers] = useState(false);
  const [searchAreaCode, setSearchAreaCode] = useState('');
  const [twilioError, setTwilioError] = useState('');
  const [validationErrors, setValidationErrors] = useState({});
  const [saveMessage, setSaveMessage] = useState('');
      const [isLoading, setIsLoading] = useState(true);
  const [purchaseLoading, setPurchaseLoading] = useState(null);
  const [purchaseError, setPurchaseError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [webhookLoading, setWebhookLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Voice selection state
  const [availableVoices, setAvailableVoices] = useState({});
  const [voicesLoading, setVoicesLoading] = useState(false);
  const [testingVoice, setTestingVoice] = useState(null);

  // Country options
  const countries = [
    { code: 'US', name: 'United States' },
    { code: 'CA', name: 'Canada' },
    { code: 'GB', name: 'United Kingdom' },
    { code: 'AU', name: 'Australia' },
    { code: 'DE', name: 'Germany' },
    { code: 'FR', name: 'France' },
    { code: 'IT', name: 'Italy' },
    { code: 'ES', name: 'Spain' },
    { code: 'NL', name: 'Netherlands' },
    { code: 'BE', name: 'Belgium' },
    { code: 'CH', name: 'Switzerland' },
    { code: 'AT', name: 'Austria' },
    { code: 'SE', name: 'Sweden' },
    { code: 'NO', name: 'Norway' },
    { code: 'DK', name: 'Denmark' },
    { code: 'FI', name: 'Finland' },
    { code: 'IE', name: 'Ireland' },
    { code: 'PT', name: 'Portugal' },
    { code: 'GR', name: 'Greece' },
    { code: 'PL', name: 'Poland' },
    { code: 'CZ', name: 'Czech Republic' },
    { code: 'HU', name: 'Hungary' },
    { code: 'RO', name: 'Romania' },
    { code: 'BG', name: 'Bulgaria' },
    { code: 'HR', name: 'Croatia' },
    { code: 'SI', name: 'Slovenia' },
    { code: 'SK', name: 'Slovakia' },
    { code: 'EE', name: 'Estonia' },
    { code: 'LV', name: 'Latvia' },
    { code: 'LT', name: 'Lithuania' },
    { code: 'JP', name: 'Japan' },
    { code: 'KR', name: 'South Korea' },
    { code: 'CN', name: 'China' },
    { code: 'IN', name: 'India' },
    { code: 'SG', name: 'Singapore' },
    { code: 'HK', name: 'Hong Kong' },
    { code: 'TW', name: 'Taiwan' },
    { code: 'TH', name: 'Thailand' },
    { code: 'MY', name: 'Malaysia' },
    { code: 'ID', name: 'Indonesia' },
    { code: 'PH', name: 'Philippines' },
    { code: 'VN', name: 'Vietnam' },
    { code: 'NZ', name: 'New Zealand' },
    { code: 'ZA', name: 'South Africa' },
    { code: 'BR', name: 'Brazil' },
    { code: 'MX', name: 'Mexico' },
    { code: 'AR', name: 'Argentina' },
    { code: 'CL', name: 'Chile' },
    { code: 'CO', name: 'Colombia' },
    { code: 'PE', name: 'Peru' },
    { code: 'VE', name: 'Venezuela' },
    { code: 'UY', name: 'Uruguay' },
    { code: 'PY', name: 'Paraguay' },
    { code: 'BO', name: 'Bolivia' },
    { code: 'EC', name: 'Ecuador' },
    { code: 'OTHER', name: 'Other' }
  ];

  // Popular area codes for quick selection
  const popularAreaCodes = [
    { code: '212', location: 'New York, NY', country: 'US' },
    { code: '213', location: 'Los Angeles, CA', country: 'US' },
    { code: '312', location: 'Chicago, IL', country: 'US' },
    { code: '415', location: 'San Francisco, CA', country: 'US' },
    { code: '617', location: 'Boston, MA', country: 'US' },
    { code: '202', location: 'Washington, DC', country: 'US' },
    { code: '305', location: 'Miami, FL', country: 'US' },
    { code: '404', location: 'Atlanta, GA', country: 'US' },
    { code: '416', location: 'Toronto, ON', country: 'CA' },
    { code: '604', location: 'Vancouver, BC', country: 'CA' },
    { code: '514', location: 'Montreal, QC', country: 'CA' },
    { code: '020', location: 'London', country: 'GB' },
    { code: '061', location: 'Manchester', country: 'GB' },
    { code: '02', location: 'Sydney', country: 'AU' },
    { code: '03', location: 'Melbourne', country: 'AU' },
    { code: '30', location: 'Berlin', country: 'DE' },
    { code: '1', location: 'Paris', country: 'FR' }
  ];

  // Time options for business hours
  const timeOptions = [
    'Closed',
    '6:00 AM', '6:30 AM', '7:00 AM', '7:30 AM', '8:00 AM', '8:30 AM',
    '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
    '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM',
    '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM', '5:00 PM', '5:30 PM',
    '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM', '8:00 PM', '8:30 PM',
    '9:00 PM', '9:30 PM', '10:00 PM', '10:30 PM', '11:00 PM', '11:30 PM'
  ];

  // Load existing setup data on component mount
  useEffect(() => {
    const loadSetupData = async () => {
      if (user) {
        try {
          const docRef = doc(db, 'setupConfigurations', user.uid);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            const data = docSnap.data();
            setFormData(prev => ({
              ...prev,
              ...data.formData
            }));
            if (data.currentStep) {
              setCurrentStep(data.currentStep);
            }
          }
        } catch (error) {
          console.error('Error loading setup data:', error);
        }
      }
      setIsLoading(false);
    };

    loadSetupData();
  }, [user]);

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear validation error when field is updated
    if (validationErrors[field]) {
      setValidationErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleHoursChange = (day, type, value) => {
    const currentHours = formData[`${day}Hours`];
    if (value === 'Closed') {
      handleChange(`${day}Hours`, 'Closed');
    } else {
      if (type === 'open') {
        const closingTime = currentHours.includes(' - ') ? currentHours.split(' - ')[1] : '';
        handleChange(`${day}Hours`, closingTime ? `${value} - ${closingTime}` : value);
      } else {
        const openingTime = currentHours.includes(' - ') ? currentHours.split(' - ')[0] : currentHours;
        handleChange(`${day}Hours`, openingTime ? `${openingTime} - ${value}` : value);
      }
    }
  };

  const getOpeningTime = (dayHours) => {
    if (dayHours === 'Closed') return 'Closed';
    return dayHours.includes(' - ') ? dayHours.split(' - ')[0] : dayHours;
  };

  const getClosingTime = (dayHours) => {
    if (dayHours === 'Closed') return 'Closed';
    return dayHours.includes(' - ') ? dayHours.split(' - ')[1] : '';
  };

  // API URL constant
  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';

  // Test voice sample
  const testVoice = async (voice) => {
    setTestingVoice(voice.voice_id);
    try {
      const response = await fetch(`${apiUrl}/api/test-voice`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          voiceId: voice.voice_id,
          text: `Hello! I'm ${voice.name}, and I'll be your AI receptionist for ${formData.businessName || 'your business'}. How can I help you today?`
        })
      });

      const data = await response.json();
      
      if (data.success) {
        // Play the audio
        const audio = new Audio(data.audioData);
        audio.play();
      }
    } catch (error) {
      console.error('Failed to test voice:', error);
    } finally {
      setTestingVoice(null);
    }
  };

  // Load voices when component mounts
  useEffect(() => {
    const loadVoices = async () => {
      setVoicesLoading(true);
      try {
        const response = await fetch(`${apiUrl}/api/voices`);
        const data = await response.json();
        
        if (data.success) {
          setAvailableVoices(data.voices);
          
          // Set default voice if none selected
          if (!formData.selectedVoice && data.voices.all?.length > 0) {
            const defaultVoice = data.voices.all.find(v => 
              v.accent === formData.accent && 
              v.tone === formData.tone && 
              v.gender === formData.voiceGender
            ) || data.voices.all[0];
            
            handleChange('selectedVoice', defaultVoice);
          }
        }
      } catch (error) {
        console.error('Failed to load voices:', error);
        setErrorMessage('Failed to load voices. Please try again later.');
      } finally {
        setVoicesLoading(false);
      }
    };

    loadVoices();
  }, []); // Only run once on mount

  // Twilio phone number search with enhanced error handling
  const searchPhoneNumbers = async (areaCode, country = 'US') => {
    if (!areaCode || areaCode.length < 3) {
      setTwilioError('Please enter a valid area code (3+ digits)');
      return;
    }

    setSearchingNumbers(true);
    setTwilioError('');
    setAvailableNumbers([]);
    
    try {
      console.log('Searching phone numbers...', { areaCode, country });
      
      const response = await fetch(`${apiUrl}/api/search-phone-numbers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          areaCode: areaCode.toString(),
          country: country
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.numbers) {
        setAvailableNumbers(data.numbers);
        if (data.numbers.length === 0) {
          setTwilioError(`No phone numbers available for area code ${areaCode} in ${country}. Try a different area code.`);
        }
      } else {
        setTwilioError(data.error || 'Failed to search for phone numbers. Server configuration may be needed.');
      }
    } catch (error) {
      console.error('Phone number search error:', error);
      setTwilioError('Unable to connect to the server. Please check your internet connection and try again.');
    } finally {
      setSearchingNumbers(false);
    }
  };

  const purchasePhoneNumber = async (phoneNumber) => {
    setPurchaseLoading(phoneNumber);
    setPurchaseError('');

    try {
      const response = await fetch(`${apiUrl}/api/purchase-phone-number`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: phoneNumber
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Handle successful purchase with automatic webhook configuration
        setFormData(prev => ({
          ...prev,
          selectedPhoneNumber: data.phoneNumber,
          purchasedPhoneNumber: data.phoneNumber,
          webhookConfigured: data.webhookConfigured
        }));

        // Show different messages based on webhook configuration status
        if (data.webhookConfigured) {
          setSuccessMessage(`✅ ${data.message}\n🔗 Voice calls will be handled by your AI agent automatically!`);
        } else {
          setSuccessMessage(`✅ Phone number purchased: ${data.phoneNumber}\n⚠️ Webhook configuration needed for AI calls.`);
        }

        // Log webhook details for debugging
        if (data.webhookUrls) {
          console.log('🎯 Webhook URLs configured:', data.webhookUrls);
        }

        // Clear any phone search results since we've made a purchase
        setAvailableNumbers([]);
        
      } else {
        setPurchaseError(data.error || 'Failed to purchase phone number');
        setErrorMessage(data.error || 'Failed to purchase phone number');
      }
    } catch (error) {
      console.error('Purchase error:', error);
      setPurchaseError('Network error. Please try again.');
      setErrorMessage('Network error while purchasing phone number. Please try again.');
    } finally {
      setPurchaseLoading(null);
    }
  };

  // New function to manually configure webhook for existing numbers
  const configureWebhook = async (phoneNumber) => {
    setWebhookLoading(true);
    setErrorMessage('');

    try {
      const response = await fetch(`${apiUrl}/api/configure-webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: phoneNumber
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setFormData(prev => ({
          ...prev,
          webhookConfigured: true
        }));
        
        setSuccessMessage(`✅ ${data.message}\n🔗 Your phone number is now connected to your AI agent!`);
        console.log('🎯 Webhook configured:', data.webhookUrls);
        
      } else {
        setErrorMessage(data.error || 'Failed to configure webhook');
      }
    } catch (error) {
      console.error('Webhook configuration error:', error);
      setErrorMessage('Network error while configuring webhook. Please try again.');
    } finally {
      setWebhookLoading(false);
    }
  };

  // Department management functions
  const addDepartment = () => {
    setFormData(prev => ({
      ...prev,
      departments: [...prev.departments, { name: '', extension: '', voice: null }]
    }));
  };

  const removeDepartment = (index) => {
    setFormData(prev => ({
      ...prev,
      departments: prev.departments.filter((_, i) => i !== index)
    }));
  };

  const updateDepartment = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      departments: prev.departments.map((dept, i) => 
        i === index ? { ...dept, [field]: value } : dept
      )
    }));
  };

  // Service management functions
  const addService = () => {
    setFormData(prev => ({
      ...prev,
      bookingServices: [...prev.bookingServices, { name: '', duration: '', description: '' }]
    }));
  };

  const removeService = (index) => {
    setFormData(prev => ({
      ...prev,
      bookingServices: prev.bookingServices.filter((_, i) => i !== index)
    }));
  };

  const updateService = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      bookingServices: prev.bookingServices.map((service, i) => 
        i === index ? { ...service, [field]: value } : service
      )
    }));
  };

  // IVR Menu management functions
  const updateIVRMenu = (updates) => {
    setFormData(prev => ({
      ...prev,
      ivrMenu: { ...prev.ivrMenu, ...updates }
    }));
  };

  const addMenuItem = (parentId = null) => {
    const newId = Date.now();
    const newItem = {
      id: newId,
      key: '',
      label: '',
      action: 'transfer',
      target: '',
      subMenu: []
    };

    setFormData(prev => {
      const newMenu = { ...prev.ivrMenu };
      
      if (parentId) {
        // Adding to submenu
        const findAndAddToParent = (items) => {
          for (let item of items) {
            if (item.id === parentId) {
              item.subMenu.push(newItem);
              return;
            }
            if (item.subMenu.length > 0) {
              findAndAddToParent(item.subMenu);
            }
          }
        };
        findAndAddToParent(newMenu.menuItems);
      } else {
        // Adding to main menu
        newMenu.menuItems.push(newItem);
      }

      return { ...prev, ivrMenu: newMenu };
    });
  };

  const removeMenuItem = (itemId) => {
    setFormData(prev => {
      const newMenu = { ...prev.ivrMenu };
      
      const removeFromItems = (items) => {
        for (let i = 0; i < items.length; i++) {
          if (items[i].id === itemId) {
            items.splice(i, 1);
            return;
          }
          if (items[i].subMenu.length > 0) {
            removeFromItems(items[i].subMenu);
          }
        }
      };
      
      removeFromItems(newMenu.menuItems);
      return { ...prev, ivrMenu: newMenu };
    });
  };

  const updateMenuItem = (itemId, field, value) => {
    setFormData(prev => {
      const newMenu = { ...prev.ivrMenu };
      
      const updateInItems = (items) => {
        for (let item of items) {
          if (item.id === itemId) {
            item[field] = value;
            return;
          }
          if (item.subMenu.length > 0) {
            updateInItems(item.subMenu);
          }
        }
      };
      
      updateInItems(newMenu.menuItems);
      return { ...prev, ivrMenu: newMenu };
    });
  };

  const renderMenuItems = (items, level = 0) => {
    return items.map((item) => (
      <div key={item.id} className={`${level > 0 ? 'ml-8 border-l-2 border-gray-200 pl-4' : ''}`}>
        <div className="p-4 bg-white border border-gray-200 rounded-lg mb-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700">
                {level > 0 ? `Submenu Option` : `Menu Option`}
              </span>
              {level > 0 && (
                <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                  Level {level + 1}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => removeMenuItem(item.id)}
              className="text-red-600 hover:text-red-800 text-sm font-medium"
            >
              Remove
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Key Press *
              </label>
              <input
                type="text"
                value={item.key}
                onChange={(e) => updateMenuItem(item.id, 'key', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="1"
                maxLength="1"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Menu Label *
              </label>
              <input
                type="text"
                value={item.label}
                onChange={(e) => updateMenuItem(item.id, 'label', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Sales"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Action *
              </label>
              <select
                value={item.action}
                onChange={(e) => updateMenuItem(item.id, 'action', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="transfer">Transfer to Department</option>
                <option value="voicemail">Take Voicemail</option>
                <option value="submenu">Go to Submenu</option>
                <option value="message">Play Message</option>
                <option value="callback">Request Callback</option>
              </select>
            </div>
          </div>
          
          {item.action === 'transfer' && (
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Transfer to Department
              </label>
              <select
                value={item.target}
                onChange={(e) => updateMenuItem(item.id, 'target', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Department</option>
                {formData.departments.map((dept, index) => (
                  <option key={index} value={dept.name}>
                    {dept.name} ({dept.extension})
                  </option>
                ))}
              </select>
            </div>
          )}
          
          {item.action === 'message' && (
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Custom Message
              </label>
              <textarea
                value={item.target}
                onChange={(e) => updateMenuItem(item.id, 'target', e.target.value)}
                rows="2"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter the message to play..."
              />
            </div>
          )}
          
          {item.action === 'voicemail' && (
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Voicemail Department
              </label>
              <select
                value={item.target}
                onChange={(e) => updateMenuItem(item.id, 'target', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Department</option>
                {formData.departments.map((dept, index) => (
                  <option key={index} value={dept.name}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          
          {item.action === 'submenu' && (
            <div className="mb-3">
              <button
                type="button"
                onClick={() => addMenuItem(item.id)}
                className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-sm font-medium"
              >
                + Add Submenu Option
              </button>
            </div>
          )}
          
          <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
            Preview: "Press {item.key} for {item.label}"
          </div>
        </div>
        
        {item.subMenu.length > 0 && (
          <div className="ml-4">
            {renderMenuItems(item.subMenu, level + 1)}
          </div>
        )}
      </div>
    ));
  };

  // Validation functions for each step
  const validateStep1 = () => {
    const errors = {};
    
    if (!formData.businessName.trim()) {
      errors.businessName = 'Business name is required';
    }
    if (!formData.industry.trim()) {
      errors.industry = 'Industry is required';
    }
    if (!formData.primaryEmail.trim()) {
      errors.primaryEmail = 'Primary email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.primaryEmail)) {
      errors.primaryEmail = 'Please enter a valid email address';
    }
    
    return errors;
  };

  const validateStep2 = () => {
    const errors = {};
    
    if (!formData.afterHoursHandling) {
      errors.afterHoursHandling = 'Please select after-hours handling option';
    }
    if (formData.holidayOption === 'default' && !formData.country) {
      errors.country = 'Please select your country';
    }
    if (formData.holidayOption === 'custom' && !formData.customHolidays.trim()) {
      errors.customHolidays = 'Please enter custom holidays';
    }
    
    return errors;
  };

  const validateStep3 = () => {
    const errors = {};
    
    // For simplified phone setup, we only need to check if a phone number was selected
    if (!formData.selectedPhoneNumber) {
      errors.selectedPhoneNumber = 'Please purchase a phone number to continue';
    }
    
    return errors;
  };

  const validateStep4 = () => {
    const errors = {};
    
    if (!formData.selectedVoice) {
      errors.selectedVoice = 'Please select a voice for your AI agent';
    }
    
    return errors;
  };

  const validateStep5 = () => {
    const errors = {};
    
    // Validate departments
    formData.departments.forEach((dept, index) => {
      if (!dept.name.trim()) {
        errors[`department_${index}_name`] = 'Department name is required';
      }
      if (!dept.extension.trim()) {
        errors[`department_${index}_extension`] = 'Extension is required';
      }
      if (!dept.voice) {
        errors[`department_${index}_voice`] = 'Please select a voice for this department';
      }
    });

    // Validate IVR menu if enabled
    if (formData.ivrMenu.enabled) {
      if (!formData.ivrMenu.welcomeMessage.trim()) {
        errors.ivrWelcomeMessage = 'Welcome message is required';
      }
      
      formData.ivrMenu.menuItems.forEach((item, index) => {
        if (!item.key.trim()) {
          errors[`ivr_${index}_key`] = 'Key press is required';
        }
        if (!item.label.trim()) {
          errors[`ivr_${index}_label`] = 'Menu label is required';
        }
        if (item.action === 'transfer' && !item.target) {
          errors[`ivr_${index}_target`] = 'Please select a department';
        }
      });
    }
    
    return errors;
  };

  const validateStep6 = () => {
    const errors = {};
    
    if (!formData.additionalLanguages) {
      errors.additionalLanguages = 'Please select if additional languages are needed';
    }
    if (formData.additionalLanguages === 'yes' && !formData.languageList.trim()) {
      errors.languageList = 'Please specify which additional languages are needed';
    }
    
    return errors;
  };

  const validateStep7 = () => {
    const errors = {};
    
    // This step is for final review/additional settings
    // Most validation is now handled in earlier steps
    
    return errors;
  };





  const validateCurrentStep = () => {
    let errors = {};
    
    switch (currentStep) {
      case 1:
        errors = validateStep1();
        break;
      case 2:
        errors = validateStep2();
        break;
      case 3:
        errors = validateStep3();
        break;
      case 4:
        errors = validateStep4();
        break;
      case 5:
        errors = validateStep5();
        break;
      case 6:
        errors = validateStep6();
        break;
      case 7:
        errors = validateStep7();
        break;
      default:
        break;
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Auto-save to Firestore
  const saveToFirestore = useCallback(async () => {
    if (!user) return;
    
    setIsSaving(true);
    try {
      const docRef = doc(db, 'setupConfigurations', user.uid);
      await setDoc(docRef, {
        formData,
        currentStep,
        lastUpdated: serverTimestamp(),
        userId: user.uid,
        userEmail: user.email
      }, { merge: true });
      
      setSaveMessage('Changes saved automatically');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error('Error saving to Firestore:', error);
      setSaveMessage('Error saving changes');
      setTimeout(() => setSaveMessage(''), 3000);
    }
    setIsSaving(false);
  }, [user, formData, currentStep]);

  // Save on step change and form data change
  useEffect(() => {
    if (user && !isLoading) {
      const timeoutId = setTimeout(() => {
        saveToFirestore();
      }, 1000); // Auto-save after 1 second of inactivity
      
      return () => clearTimeout(timeoutId);
    }
  }, [formData, currentStep, user, isLoading, saveToFirestore]);

  const handleNextStep = () => {
    if (validateCurrentStep()) {
      setCurrentStep(Math.min(7, currentStep + 1));
    }
  };

  const handlePrevStep = () => {
    setCurrentStep(Math.max(1, currentStep - 1));
  };

  const handleSubmit = async () => {
    if (!validateCurrentStep()) return;
    
    setIsSubmitting(true);
    
    try {
      // Final save to Firestore
      await saveToFirestore();
      
      // Mark setup as complete with voice data
      const docRef = doc(db, 'setupConfigurations', user.uid);
      await setDoc(docRef, {
        formData: {
          ...formData,
          // Ensure voice selection is preserved
          selectedVoice: formData.selectedVoice,
          voiceAccent: formData.accent,
          voiceTone: formData.tone,
          voiceGender: formData.voiceGender,
          // Ensure departments with voices are preserved
          departments: formData.departments
        },
        currentStep,
        setupCompleted: true,
        completedAt: serverTimestamp(),
        userId: user.uid,
        userEmail: user.email
      }, { merge: true });
      
      console.log('Setup completed and saved:', formData);
      onComplete();
    } catch (error) {
      console.error('Error completing setup:', error);
      setSaveMessage('Error completing setup. Please try again.');
    }
    
    setIsSubmitting(false);
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="bg-white rounded-3xl shadow-elegant p-12 mx-4 max-w-md">
            <div className="mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl flex items-center justify-center mx-auto shadow-soft">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-semibold text-slate-900 mb-3">
              Loading Setup
            </h2>
            <p className="text-slate-600 mb-8 leading-relaxed">
              Preparing your intelligent AI receptionist configuration...
            </p>
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-3 border-slate-200 border-t-blue-500"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const steps = [
    { id: 1, title: 'Business Details', icon: '🏢' },
    { id: 2, title: 'Hours & Availability', icon: '🕐' },
    { id: 3, title: 'Phone Setup', icon: '☎️' },
    { id: 4, title: 'Call Routing', icon: '👥' },
    { id: 5, title: 'Booking & Calendar', icon: '📅' },
    { id: 6, title: 'Voice & Language', icon: '🔊' },
    { id: 7, title: 'Final Setup', icon: '⚙️' }
  ];

  // Helper function to display validation errors
  const renderError = (fieldName) => {
    if (validationErrors[fieldName]) {
      return (
        <div className="mt-2 animate-slide-down">
          <div className="flex items-center px-3 py-2 bg-red-50 border border-red-200 rounded-lg shadow-sm">
            <div className="flex-shrink-0">
              <div className="w-5 h-5 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-3 h-3 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            </div>
            <p className="ml-3 text-sm font-medium text-red-800">{validationErrors[fieldName]}</p>
          </div>
        </div>
      );
    }
    return null;
  };

  // Helper function to get input classes with error state
  const getInputClasses = (fieldName) => {
    const baseClasses = "w-full px-3 py-2 bg-white border rounded-lg focus:outline-none focus:ring-2 text-gray-900 placeholder-gray-500 transition-all duration-200";
    const errorClasses = validationErrors[fieldName] 
      ? "border-red-500 focus:ring-red-500 focus:border-red-500" 
      : "border-gray-300 focus:ring-blue-500 focus:border-blue-500";
    return `${baseClasses} ${errorClasses}`;
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-10">
            <div className="text-center mb-10">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-3xl mb-6 shadow-soft-lg">
                <span className="text-3xl">🏢</span>
              </div>
              <h2 className="text-3xl font-bold text-slate-900 mb-3 tracking-tight">Business Details</h2>
              <p className="text-slate-600 text-lg leading-relaxed max-w-2xl mx-auto">
                Tell us about your business so we can personalize your AI receptionist to perfectly match your brand and needs
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-slate-800 tracking-wide">Business Name *</label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.businessName}
                    onChange={(e) => handleChange('businessName', e.target.value)}
                    className="w-full px-4 py-4 bg-white border-2 border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-0 transition-all duration-200 shadow-sm hover:shadow-soft"
                    placeholder="Enter your business name"
                  />
                  <div className="absolute inset-0 rounded-xl ring-1 ring-inset ring-slate-900/5 pointer-events-none"></div>
                </div>
                {renderError('businessName')}
              </div>
              
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-slate-800 tracking-wide">Industry / Type of Business *</label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.industry}
                    onChange={(e) => handleChange('industry', e.target.value)}
                    className="w-full px-4 py-4 bg-white border-2 border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-0 transition-all duration-200 shadow-sm hover:shadow-soft"
                    placeholder="e.g., Healthcare, Legal, Retail"
                  />
                  <div className="absolute inset-0 rounded-xl ring-1 ring-inset ring-slate-900/5 pointer-events-none"></div>
                </div>
                {renderError('industry')}
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-semibold text-slate-800 tracking-wide">Business Address</label>
              <div className="relative">
                <textarea
                  value={formData.businessAddress}
                  onChange={(e) => handleChange('businessAddress', e.target.value)}
                  rows="4"
                  className="w-full px-4 py-4 bg-white border-2 border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-0 transition-all duration-200 shadow-sm hover:shadow-soft resize-none"
                  placeholder="Enter your complete business address"
                />
                <div className="absolute inset-0 rounded-xl ring-1 ring-inset ring-slate-900/5 pointer-events-none"></div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-slate-800 tracking-wide">Website</label>
                <div className="relative">
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) => handleChange('website', e.target.value)}
                    className="w-full px-4 py-4 bg-white border-2 border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-0 transition-all duration-200 shadow-sm hover:shadow-soft"
                    placeholder="https://yourwebsite.com"
                  />
                  <div className="absolute inset-0 rounded-xl ring-1 ring-inset ring-slate-900/5 pointer-events-none"></div>
                </div>
              </div>
              
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-slate-800 tracking-wide">Existing Business Phone Number</label>
                <div className="relative">
                  <input
                    type="tel"
                    value={formData.phoneNumber}
                    onChange={(e) => handleChange('phoneNumber', e.target.value)}
                    className="w-full px-4 py-4 bg-white border-2 border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-0 transition-all duration-200 shadow-sm hover:shadow-soft"
                    placeholder="(555) 123-4567"
                  />
                  <div className="absolute inset-0 rounded-xl ring-1 ring-inset ring-slate-900/5 pointer-events-none"></div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-semibold text-slate-800 tracking-wide">Primary Contact Email *</label>
              <div className="relative">
                <input
                  type="email"
                  value={formData.primaryEmail}
                  onChange={(e) => handleChange('primaryEmail', e.target.value)}
                  className="w-full px-4 py-4 bg-white border-2 border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-0 transition-all duration-200 shadow-sm hover:shadow-soft"
                  placeholder="contact@yourbusiness.com"
                />
                <div className="absolute inset-0 rounded-xl ring-1 ring-inset ring-slate-900/5 pointer-events-none"></div>
              </div>
              {renderError('primaryEmail')}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">🕐 Business Hours & Availability</h2>
            
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800">Opening & Closing Hours</h3>
              
              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                <div key={day} className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                  <label className="text-sm font-medium text-gray-700">{day}:</label>
                  
                  <select
                    value={getOpeningTime(formData[`${day.toLowerCase()}Hours`])}
                    onChange={(e) => handleHoursChange(day.toLowerCase(), 'open', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select opening time</option>
                    {timeOptions.map(time => (
                      <option key={time} value={time}>{time}</option>
                    ))}
                  </select>
                  
                  {getOpeningTime(formData[`${day.toLowerCase()}Hours`]) !== 'Closed' && (
                    <>
                      <span className="text-center text-gray-500">to</span>
                      <select
                        value={getClosingTime(formData[`${day.toLowerCase()}Hours`])}
                        onChange={(e) => handleHoursChange(day.toLowerCase(), 'close', e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select closing time</option>
                        {timeOptions.filter(time => time !== 'Closed').map(time => (
                          <option key={time} value={time}>{time}</option>
                        ))}
                      </select>
                    </>
                  )}
                  
                  {getOpeningTime(formData[`${day.toLowerCase()}Hours`]) === 'Closed' && (
                    <span className="col-span-2 text-gray-500 italic">Closed</span>
                  )}
                </div>
              ))}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Should the AI handle after-hours calls with voicemail? *</label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="afterHours"
                    value="yes"
                    checked={formData.afterHoursHandling === 'yes'}
                    onChange={(e) => handleChange('afterHoursHandling', e.target.value)}
                    className="mr-2"
                  />
                  Yes
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="afterHours"
                    value="no"
                    checked={formData.afterHoursHandling === 'no'}
                    onChange={(e) => handleChange('afterHoursHandling', e.target.value)}
                    className="mr-2"
                  />
                  No
                </label>
              </div>
              {renderError('afterHoursHandling')}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Holidays / Closures</label>
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="holidays"
                    value="default"
                    checked={formData.holidayOption === 'default'}
                    onChange={(e) => handleChange('holidayOption', e.target.value)}
                    className="mr-2"
                  />
                  Use default public holidays for my country
                </label>
                {formData.holidayOption === 'default' && (
                  <div className="ml-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Country:</label>
                    <select
                      value={formData.country}
                      onChange={(e) => handleChange('country', e.target.value)}
                      className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select your country</option>
                      {countries.map(country => (
                        <option key={country.code} value={country.code}>
                          {country.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="holidays"
                    value="custom"
                    checked={formData.holidayOption === 'custom'}
                    onChange={(e) => handleChange('holidayOption', e.target.value)}
                    className="mr-2"
                  />
                  Custom list of holidays / closures
                </label>
                {formData.holidayOption === 'custom' && (
                  <textarea
                    value={formData.customHolidays}
                    onChange={(e) => handleChange('customHolidays', e.target.value)}
                    rows="3"
                    className="ml-6 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Dec 24 – Christmas Eve; Aug 5 – Civic Holiday"
                  />
                )}
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-10">
            <div className="text-center mb-10">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-500 to-green-600 rounded-3xl mb-6 shadow-soft-lg">
                <span className="text-3xl">☎️</span>
              </div>
              <h2 className="text-3xl font-bold text-slate-900 mb-3 tracking-tight">Phone Setup</h2>
              <p className="text-slate-600 text-lg leading-relaxed max-w-2xl mx-auto">
                Get a dedicated phone number for your AI voice receptionist with intelligent call handling.
              </p>
            </div>
            
            <div className="space-y-8 animate-slide-down">
              <div className="space-y-8 animate-slide-down">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-8 rounded-2xl border border-blue-100 shadow-soft">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                        <span className="text-xl">🎯</span>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-blue-900 mb-3">Get Your AI Phone Number</h3>
                      <p className="text-blue-800 leading-relaxed">
                        Search and purchase a dedicated phone number for your AI voice receptionist. 
                        Your new number will be automatically configured and ready to handle calls 
                        with intelligent responses, transfers, and booking capabilities.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-800 mb-4">
                      Search for Available Phone Numbers
                    </h3>
                    
                    <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                          <label className="block text-sm font-semibold text-slate-700">
                            Country
                          </label>
                          <div className="relative">
                            <select
                              value={formData.country}
                              onChange={(e) => handleChange('country', e.target.value)}
                              className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-lg text-slate-900 focus:border-blue-500 focus:ring-0 transition-all duration-200 shadow-sm hover:shadow-soft appearance-none"
                            >
                              <option value="US">🇺🇸 United States</option>
                              <option value="CA">🇨🇦 Canada</option>
                              <option value="GB">🇬🇧 United Kingdom</option>
                              <option value="AU">🇦🇺 Australia</option>
                              <option value="DE">🇩🇪 Germany</option>
                              <option value="FR">🇫🇷 France</option>
                              <option value="NL">🇳🇱 Netherlands</option>
                              <option value="IT">🇮🇹 Italy</option>
                              <option value="ES">🇪🇸 Spain</option>
                              <option value="SE">🇸🇪 Sweden</option>
                              <option value="SG">🇸🇬 Singapore</option>
                              <option value="HK">🇭🇰 Hong Kong</option>
                              <option value="JP">🇯🇵 Japan</option>
                            </select>
                            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <label className="block text-sm font-semibold text-slate-700">
                            Area Code
                          </label>
                          <input
                            type="text"
                            value={searchAreaCode}
                            onChange={(e) => setSearchAreaCode(e.target.value.replace(/\D/g, ''))}
                            className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-0 transition-all duration-200 shadow-sm hover:shadow-soft font-mono"
                            placeholder="212, 415, etc."
                            maxLength="5"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <label className="block text-sm font-semibold text-slate-700">
                            &nbsp;
                          </label>
                          <button
                            type="button"
                            onClick={() => searchPhoneNumbers(searchAreaCode, formData.country)}
                            disabled={!searchAreaCode || searchAreaCode.length < 3 || searchingNumbers}
                            className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg font-semibold transition-all duration-200 shadow-soft hover:shadow-soft-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center"
                          >
                            {searchingNumbers ? (
                              <>
                                <svg className="animate-spin w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Searching...
                              </>
                            ) : (
                              <>
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                Search Numbers
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                      
                      <div className="mt-6">
                        <h4 className="text-sm font-semibold text-slate-700 mb-4">Popular Area Codes</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                          {popularAreaCodes
                            .filter(area => area.country === formData.country || formData.country === '')
                            .map(area => (
                              <button
                                key={area.code}
                                type="button"
                                onClick={() => {
                                  setSearchAreaCode(area.code);
                                  searchPhoneNumbers(area.code, formData.country);
                                }}
                                className="p-3 text-left bg-white hover:bg-slate-50 rounded-lg text-sm border border-slate-200 hover:border-blue-300 transition-all duration-200 hover:shadow-soft"
                              >
                                <div className="font-semibold text-slate-900">{area.code}</div>
                                <div className="text-xs text-slate-600">{area.location}</div>
                              </button>
                            ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {twilioError && (
                  <div className="bg-gradient-to-r from-red-50 to-red-50 border border-red-200 rounded-xl p-4 animate-slide-down">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-red-800 mb-1">Phone Number Search Error</h4>
                        <p className="text-sm text-red-700">{twilioError}</p>
                      </div>
                    </div>
                  </div>
                )}

                {availableNumbers.length > 0 && (
                  <div className="animate-slide-down">
                    <h4 className="text-lg font-semibold text-slate-800 mb-6">Available Phone Numbers</h4>
                    <div className="grid gap-4">
                      {availableNumbers.map((number, index) => (
                        <div 
                          key={number.phoneNumber} 
                          className="group p-6 bg-white border-2 border-slate-200 rounded-xl hover:border-green-300 hover:shadow-soft transition-all duration-200"
                          style={{ animationDelay: `${index * 100}ms` }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <div className="text-xl font-bold text-slate-900 font-mono">
                                  {number.phoneNumber}
                                </div>
                                <div className="flex space-x-2">
                                  {number.capabilities?.voice && (
                                    <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                                      📞 Voice
                                    </span>
                                  )}
                                  {number.capabilities?.sms && (
                                    <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                                      💬 SMS
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="text-sm text-slate-600">
                                📍 {number.locality}, {number.region}
                              </div>
                            </div>
                            <button
                              type="button"
                              disabled={purchaseLoading === number.phoneNumber}
                              onClick={() => purchasePhoneNumber(number.phoneNumber)}
                              className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl font-semibold transition-all duration-200 shadow-soft hover:shadow-soft-lg hover:scale-105 group-hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center min-w-[140px]"
                            >
                              {purchaseLoading === number.phoneNumber ? (
                                <>
                                  <svg className="animate-spin w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  Purchasing...
                                </>
                              ) : (
                                'Purchase Number'
                              )}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Error Messages */}
                {(purchaseError || errorMessage) && (
                  <div className="bg-gradient-to-r from-red-50 to-red-100 border border-red-200 rounded-xl p-6 animate-slide-down">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-red-900 mb-2">Purchase Error</h4>
                        <p className="text-red-800">{purchaseError || errorMessage}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Success Messages */}
                {successMessage && (
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6 animate-slide-down">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-green-900 mb-2">Success!</h4>
                        <div className="whitespace-pre-line text-green-800">{successMessage}</div>
                      </div>
                    </div>
                  </div>
                )}

                {formData.selectedPhoneNumber && (
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 animate-slide-down">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                          <span className="text-xl">📞</span>
                        </div>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-lg font-bold text-blue-900 mb-2">Your AI Phone Number</h4>
                        <div className="space-y-3">
                          <p className="text-blue-800">
                            Number: <span className="font-mono font-bold text-lg text-blue-900">{formData.selectedPhoneNumber}</span>
                          </p>
                          
                          {formData.webhookConfigured ? (
                            <div className="flex items-center space-x-2">
                              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                              <span className="text-sm font-semibold text-green-700">🎉 AI Agent Connected & Ready for Calls!</span>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <div className="flex items-center space-x-2">
                                <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></div>
                                <span className="text-sm font-semibold text-yellow-700">⚠️ Webhook Configuration Needed</span>
                              </div>
                              <button
                                onClick={() => configureWebhook(formData.selectedPhoneNumber)}
                                disabled={webhookLoading}
                                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg font-semibold transition-all duration-200 shadow-soft hover:shadow-soft-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                              >
                                {webhookLoading ? (
                                  <>
                                    <svg className="animate-spin w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Configuring...
                                  </>
                                ) : (
                                  <>
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                    Configure AI Agent
                                  </>
                                )}
                              </button>
                            </div>
                          )}
                          
                          <p className="text-sm text-blue-700">
                            {formData.webhookConfigured 
                              ? "✅ Your number is live and will intelligently handle calls, transfers, and bookings."
                              : "📋 Click 'Configure AI Agent' to activate intelligent call handling."
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-10">
            <div className="text-center mb-10">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-500 to-purple-600 rounded-3xl mb-6 shadow-soft-lg">
                <span className="text-3xl">🎤</span>
              </div>
              <h2 className="text-3xl font-bold text-slate-900 mb-3 tracking-tight">Voice Selection</h2>
              <p className="text-slate-600 text-lg leading-relaxed max-w-2xl mx-auto">
                Choose the perfect voice for your AI receptionist. Select accent, tone, and personality that matches your brand.
              </p>
            </div>
            
            {voicesLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-slate-600">Loading available voices...</p>
              </div>
            ) : (
              <div className="space-y-8 animate-slide-down">
                {/* Voice Filters */}
                <div className="bg-gradient-to-br from-purple-50 to-indigo-50 p-8 rounded-2xl border border-purple-100 shadow-soft">
                  <h3 className="text-xl font-bold text-purple-900 mb-4">Voice Preferences</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-slate-700">Accent</label>
                      <select
                        value={formData.accent}
                        onChange={(e) => handleChange('accent', e.target.value)}
                        className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-lg text-slate-900 focus:border-purple-500 focus:ring-0 transition-all duration-200 shadow-sm hover:shadow-soft"
                      >
                        <option value="American">🇺🇸 American</option>
                        <option value="British">🇬🇧 British</option>
                        <option value="Australian">🇦🇺 Australian</option>
                        <option value="Canadian">🇨🇦 Canadian</option>
                        <option value="Irish">🇮🇪 Irish</option>
                        <option value="Scottish">🏴󠁧󠁢󠁳󠁣󠁴󠁿 Scottish</option>
                      </select>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-slate-700">Tone</label>
                      <select
                        value={formData.tone}
                        onChange={(e) => handleChange('tone', e.target.value)}
                        className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-lg text-slate-900 focus:border-purple-500 focus:ring-0 transition-all duration-200 shadow-sm hover:shadow-soft"
                      >
                        <option value="Professional">💼 Professional</option>
                        <option value="Friendly">😊 Friendly</option>
                        <option value="Authoritative">🎯 Authoritative</option>
                        <option value="Calm">😌 Calm</option>
                        <option value="Energetic">⚡ Energetic</option>
                        <option value="Casual">😎 Casual</option>
                      </select>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-slate-700">Gender</label>
                      <select
                        value={formData.voiceGender}
                        onChange={(e) => handleChange('voiceGender', e.target.value)}
                        className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-lg text-slate-900 focus:border-purple-500 focus:ring-0 transition-all duration-200 shadow-sm hover:shadow-soft"
                      >
                        <option value="female">👩 Female</option>
                        <option value="male">👨 Male</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Available Voices */}
                {availableVoices.all && availableVoices.all.length > 0 && (
                  <div className="space-y-6">
                    <h3 className="text-xl font-bold text-slate-900">Available Voices</h3>
                    <div className="grid gap-4">
                      {availableVoices.all
                        .filter(voice => 
                          voice.accent === formData.accent && 
                          voice.tone === formData.tone && 
                          voice.gender === formData.voiceGender
                        )
                        .map((voice, index) => (
                          <div 
                            key={voice.voice_id} 
                            className={`group p-6 bg-white border-2 rounded-xl hover:border-purple-300 hover:shadow-soft transition-all duration-200 ${
                              formData.selectedVoice?.voice_id === voice.voice_id 
                                ? 'border-purple-500 shadow-soft-lg bg-purple-50' 
                                : 'border-slate-200'
                            }`}
                            style={{ animationDelay: `${index * 100}ms` }}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-3 mb-2">
                                  <div className="text-xl font-bold text-slate-900">
                                    {voice.name}
                                  </div>
                                  <div className="flex space-x-2">
                                    <span className="inline-flex items-center px-3 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
                                      {voice.accent}
                                    </span>
                                    <span className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                                      {voice.tone}
                                    </span>
                                    <span className="inline-flex items-center px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                                      {voice.gender}
                                    </span>
                                  </div>
                                </div>
                                {voice.description && (
                                  <p className="text-sm text-slate-600 mb-3">{voice.description}</p>
                                )}
                              </div>
                              <div className="flex items-center space-x-3 ml-6">
                                <button
                                  type="button"
                                  disabled={testingVoice === voice.voice_id}
                                  onClick={() => testVoice(voice)}
                                  className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg font-semibold transition-all duration-200 shadow-soft hover:shadow-soft-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                                >
                                  {testingVoice === voice.voice_id ? (
                                    <>
                                      <svg className="animate-spin w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                      </svg>
                                      Playing...
                                    </>
                                  ) : (
                                    <>
                                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h8m-9-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                      Test Voice
                                    </>
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleChange('selectedVoice', voice)}
                                  className={`px-6 py-2 rounded-lg font-semibold transition-all duration-200 shadow-soft hover:shadow-soft-lg ${
                                    formData.selectedVoice?.voice_id === voice.voice_id
                                      ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white'
                                      : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white'
                                  }`}
                                >
                                  {formData.selectedVoice?.voice_id === voice.voice_id ? '✓ Selected' : 'Select Voice'}
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                    
                    {availableVoices.all.filter(voice => 
                      voice.accent === formData.accent && 
                      voice.tone === formData.tone && 
                      voice.gender === formData.voiceGender
                    ).length === 0 && (
                      <div className="text-center py-8">
                        <p className="text-slate-600">No voices found matching your preferences. Try different filters.</p>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Selected Voice Summary */}
                {formData.selectedVoice && (
                  <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-6">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-purple-900 mb-2">Voice Selected: {formData.selectedVoice.name}</h4>
                        <div className="space-y-1">
                          <p className="text-purple-800">
                            <strong>Accent:</strong> {formData.selectedVoice.accent} | 
                            <strong> Tone:</strong> {formData.selectedVoice.tone} | 
                            <strong> Gender:</strong> {formData.selectedVoice.gender}
                          </p>
                          <p className="text-sm text-purple-700">
                            🎉 This voice will be used for all AI phone interactions with your customers.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">👥 Call Routing & Extensions</h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-4">
                Departments / Team Members for Call Transfers
              </label>
              
              <div className="space-y-4">
                {formData.departments.map((dept, index) => (
                  <div key={index} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-medium text-gray-700">
                        Department {index + 1}
                      </h4>
                      {formData.departments.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeDepartment(index)}
                          className="text-red-600 hover:text-red-800 text-sm font-medium"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Department Name *
                          </label>
                          <input
                            type="text"
                            value={dept.name}
                            onChange={(e) => updateDepartment(index, 'name', e.target.value)}
                            className={getInputClasses(`department_${index}_name`)}
                            placeholder="e.g., Sales, Support, Manager"
                          />
                          {renderError(`department_${index}_name`)}
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Extension / Phone Number *
                          </label>
                          <input
                            type="text"
                            value={dept.extension}
                            onChange={(e) => updateDepartment(index, 'extension', e.target.value)}
                            className={getInputClasses(`department_${index}_extension`)}
                            placeholder="e.g., Ext. 102, 555-123-4567"
                          />
                          {renderError(`department_${index}_extension`)}
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Voice for {dept.name || 'this department'} *
                        </label>
                        <div className="bg-white border border-gray-300 rounded-lg p-3">
                          {voicesLoading ? (
                            <div className="flex items-center justify-center py-4">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
                              <span className="text-gray-600">Loading voices...</span>
                            </div>
                          ) : availableVoices.all && availableVoices.all.length > 0 ? (
                            <div className="max-h-40 overflow-y-auto space-y-2">
                              {availableVoices.all.slice(0, 10).map((voice) => (
                                <label key={voice.voice_id} className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer">
                                  <input
                                    type="radio"
                                    name={`dept_${index}_voice`}
                                    value={voice.voice_id}
                                    checked={dept.voice?.voice_id === voice.voice_id}
                                    onChange={() => updateDepartment(index, 'voice', voice)}
                                    className="mr-3"
                                  />
                                  <div className="flex-1">
                                    <div className="flex items-center justify-between">
                                      <span className="font-medium text-gray-900">{voice.name}</span>
                                      <div className="flex items-center space-x-2">
                                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                          {voice.gender}
                                        </span>
                                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                                          {voice.tone}
                                        </span>
                                        <button
                                          type="button"
                                          disabled={testingVoice === voice.voice_id}
                                          onClick={() => testVoice(voice)}
                                          className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs rounded transition-colors disabled:opacity-50"
                                        >
                                          {testingVoice === voice.voice_id ? '▶️' : '🔊'}
                                        </button>
                                      </div>
                                    </div>
                                    {voice.description && (
                                      <p className="text-xs text-gray-600 mt-1">{voice.description}</p>
                                    )}
                                  </div>
                                </label>
                              ))}
                            </div>
                          ) : (
                            <p className="text-gray-500 text-center py-4">No voices available. Please check your connection.</p>
                          )}
                        </div>
                        {renderError(`department_${index}_voice`)}
                      </div>
                    </div>
                  </div>
                ))}
                
                <button
                  type="button"
                  onClick={addDepartment}
                  className="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors"
                >
                  + Add Another Department
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-4">Interactive Voice Response (IVR) Menu</label>
              
              <div className="space-y-4">
                <div>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="ivrEnabled"
                      value="no"
                      checked={!formData.ivrMenu.enabled}
                      onChange={(e) => updateIVRMenu({ enabled: false })}
                      className="mr-2"
                    />
                    No call menu - Route calls directly to AI receptionist
                  </label>
                </div>
                
                <div>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="ivrEnabled"
                      value="yes"
                      checked={formData.ivrMenu.enabled}
                      onChange={(e) => updateIVRMenu({ enabled: true })}
                      className="mr-2"
                    />
                    Yes - Set up call menu with options
                  </label>
                </div>
                
                {formData.ivrMenu.enabled && (
                  <div className="ml-6 space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Welcome Message
                      </label>
                      <textarea
                        value={formData.ivrMenu.welcomeMessage}
                        onChange={(e) => updateIVRMenu({ welcomeMessage: e.target.value })}
                        rows="2"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., Thank you for calling ABC Company. Please listen to the following options..."
                      />
                    </div>
                    
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-sm font-medium text-gray-700">Menu Options</h4>
                        <button
                          type="button"
                          onClick={() => addMenuItem()}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                        >
                          + Add Menu Option
                        </button>
                      </div>
                      
                      <div className="space-y-4">
                        {renderMenuItems(formData.ivrMenu.menuItems)}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">📅 Booking & Calendar Integration</h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Should the AI be able to book appointments? *</label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="booking"
                    value="yes"
                    checked={formData.enableBooking === 'yes'}
                    onChange={(e) => handleChange('enableBooking', e.target.value)}
                    className="mr-2"
                  />
                  Yes
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="booking"
                    value="no"
                    checked={formData.enableBooking === 'no'}
                    onChange={(e) => handleChange('enableBooking', e.target.value)}
                    className="mr-2"
                  />
                  No
                </label>
              </div>
              {renderError('enableBooking')}
            </div>

            {formData.enableBooking === 'yes' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Connect your calendar</label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="calendar"
                        value="google"
                        checked={formData.calendarType === 'google'}
                        onChange={(e) => handleChange('calendarType', e.target.value)}
                        className="mr-2"
                      />
                      Google Calendar
                      <button className="ml-2 px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600">
                        Connect Google Calendar
                      </button>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="calendar"
                        value="calendly"
                        checked={formData.calendarType === 'calendly'}
                        onChange={(e) => handleChange('calendarType', e.target.value)}
                        className="mr-2"
                      />
                      Calendly
                      <button className="ml-2 px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600">
                        Connect Calendly
                      </button>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="calendar"
                        value="other"
                        checked={formData.calendarType === 'other'}
                        onChange={(e) => handleChange('calendarType', e.target.value)}
                        className="mr-2"
                      />
                      Other - specify:
                      <input
                        type="text"
                        className="ml-2 px-2 py-1 border border-gray-300 rounded text-sm"
                        placeholder="Calendar type"
                      />
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-4">
                    Services Available for Booking
                  </label>
                  
                  <div className="space-y-4">
                    {formData.bookingServices.map((service, index) => (
                      <div key={index} className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-medium text-gray-700">
                            Service {index + 1}
                          </h4>
                          {formData.bookingServices.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeService(index)}
                              className="text-red-600 hover:text-red-800 text-sm font-medium"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Service Name *
                            </label>
                            <input
                              type="text"
                              value={service.name}
                              onChange={(e) => updateService(index, 'name', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="e.g., Consultation"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Duration *
                            </label>
                            <input
                              type="text"
                              value={service.duration}
                              onChange={(e) => updateService(index, 'duration', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="e.g., 30 minutes"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Description
                            </label>
                            <input
                              type="text"
                              value={service.description}
                              onChange={(e) => updateService(index, 'description', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="e.g., Initial consultation"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    <button
                      type="button"
                      onClick={addService}
                      className="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors"
                    >
                      + Add Another Service
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Information the AI should collect before booking
                  </label>
                  <textarea
                    value={formData.bookingInfo}
                    onChange={(e) => handleChange('bookingInfo', e.target.value)}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., name, phone number, reason for appointment, preferred date/time"
                  />
                </div>
              </>
            )}
          </div>
        );

      case 7:
        return (
          <div className="space-y-10">
            <div className="text-center mb-10">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-500 to-green-600 rounded-3xl mb-6 shadow-soft-lg">
                <span className="text-3xl">🌍</span>
              </div>
              <h2 className="text-3xl font-bold text-slate-900 mb-3 tracking-tight">Additional Languages</h2>
              <p className="text-slate-600 text-lg leading-relaxed max-w-2xl mx-auto">
                Configure multilingual support for your AI receptionist to serve customers in their preferred language.
              </p>
            </div>
            
            <div className="space-y-8 animate-slide-down">
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-8 rounded-2xl border border-green-100 shadow-soft">
                <h3 className="text-xl font-bold text-green-900 mb-4">Language Support</h3>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-3">
                      Does the AI need to speak additional languages besides English?
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      {['No', 'Yes'].map(option => (
                        <label key={option} className="flex items-center p-4 bg-white rounded-xl border-2 border-slate-200 hover:border-green-300 transition-all duration-200 cursor-pointer">
                          <input
                            type="radio"
                            name="additionalLanguages"
                            value={option.toLowerCase()}
                            checked={formData.additionalLanguages === option.toLowerCase()}
                            onChange={(e) => handleChange('additionalLanguages', e.target.value)}
                            className="w-4 h-4 text-green-600 focus:ring-green-500 border-gray-300"
                          />
                          <span className="ml-3 text-slate-900 font-medium">{option}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {formData.additionalLanguages === 'yes' && (
                    <div className="animate-slide-down">
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Which languages should the AI support?
                      </label>
                      <textarea
                        value={formData.languageList}
                        onChange={(e) => handleChange('languageList', e.target.value)}
                        rows="3"
                        className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-lg text-slate-900 focus:border-green-500 focus:ring-0 transition-all duration-200 shadow-sm hover:shadow-soft resize-none"
                        placeholder="e.g., Spanish, French, Mandarin, Portuguese, German..."
                      />
                      <p className="text-sm text-slate-600 mt-2">
                        💡 Note: AI will automatically detect the customer's language and respond accordingly
                      </p>
                    </div>
                  )}
                </div>
              </div>
              
              {formData.additionalLanguages === 'yes' && formData.languageList && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                        </svg>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-blue-900 mb-2">Multilingual AI Configured</h4>
                      <p className="text-blue-800">
                        <strong>Supported Languages:</strong> {formData.languageList}
                      </p>
                      <p className="text-sm text-blue-700 mt-2">
                        🎯 Your AI will automatically switch between languages based on customer communication
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 8:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">⚙️ Final Setup</h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Special instructions, integrations, or scripts the AI should follow
              </label>
              <textarea
                value={formData.specialInstructions}
                onChange={(e) => handleChange('specialInstructions', e.target.value)}
                rows="6"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Any specific instructions for how the AI should handle calls, special procedures, integrations with other systems, or custom scripts..."
              />
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">Setup Summary</h3>
              <p className="text-sm text-blue-800">
                Once you submit this form, our team will configure your AI voice receptionist 
                according to your specifications. You'll receive a confirmation email with 
                setup details and next steps within 24 hours.
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white shadow-elegant rounded-3xl mx-4 my-8 overflow-hidden">
          {/* Sophisticated Header */}
          <div className="relative bg-gradient-to-r from-slate-900 to-slate-800 px-8 py-16">
            <div className="absolute inset-0 bg-gradient-to-br from-black/10 to-transparent"></div>
            <div className="relative text-center max-w-3xl mx-auto">
              <div className="mb-8">
                <div className="w-16 h-16 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto shadow-soft border border-white/20">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </div>
              </div>
              <h1 className="text-4xl font-semibold text-white mb-4 tracking-tight">AI Voice Receptionist Setup</h1>
              <p className="text-slate-300 text-lg leading-relaxed max-w-2xl mx-auto">
                Configure your intelligent AI receptionist to handle calls, bookings, and transfers exactly how your business needs
              </p>
            </div>
          </div>

          {/* Elegant Progress */}
          <div className="px-8 py-8 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Progress</h3>
                  <p className="text-sm text-slate-600 mt-1">Step {currentStep} of {steps.length}</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-slate-900">{Math.round((currentStep / steps.length) * 100)}%</div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Complete</p>
                </div>
              </div>
              
              {/* Beautiful Progress Bar */}
              <div className="relative">
                <div className="w-full bg-slate-200 rounded-full h-3 shadow-inner">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-700 ease-out shadow-sm relative overflow-hidden"
                    style={{ width: `${(currentStep / steps.length) * 100}%` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
                  </div>
                </div>
              </div>
              
              {/* Sophisticated Step Indicators */}
              <div className="mt-8 grid grid-cols-7 gap-4">
                {steps.map((step, index) => (
                  <div key={step.id} className="text-center group">
                    <div className={`mx-auto mb-3 w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
                      currentStep === step.id 
                        ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-soft-lg scale-110 ring-4 ring-blue-100' 
                        : currentStep > step.id 
                          ? 'bg-gradient-to-br from-green-500 to-green-600 text-white shadow-soft scale-105' 
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200 group-hover:scale-105'
                    }`}>
                      {currentStep > step.id ? (
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <span className="text-lg">{step.icon}</span>
                      )}
                    </div>
                    <span className={`text-xs font-medium transition-colors duration-300 block ${
                      currentStep >= step.id ? 'text-slate-900' : 'text-slate-500'
                    }`}>
                      {step.title}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Beautiful Form Content */}
          <div className="p-8 bg-gradient-to-b from-white to-slate-50">
            <div className="max-w-3xl mx-auto">
              <div className="bg-white rounded-2xl shadow-soft border border-slate-100 p-8">
                {renderStep()}
              </div>
            </div>
          </div>

          {/* Elegant Auto-save indicator */}
          {saveMessage && (
            <div className="px-8 py-4 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-100 animate-slide-down">
              <div className="flex items-center justify-center max-w-4xl mx-auto">
                <div className="flex items-center bg-white rounded-full px-4 py-2 shadow-soft border border-green-100">
                  <div className="flex-shrink-0">
                    {isSaving ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-green-200 border-t-green-600"></div>
                    ) : (
                      <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-green-800 font-medium">{saveMessage}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Sophisticated Navigation */}
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-8 py-6">
            <div className="max-w-3xl mx-auto flex justify-between items-center">
              <button
                onClick={handlePrevStep}
                disabled={currentStep === 1}
                className="group flex items-center px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-sm border border-white/10"
              >
                <svg className="w-4 h-4 mr-2 group-hover:-translate-x-0.5 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Previous
              </button>

              <div className="text-center">
                {isSaving && (
                  <div className="flex items-center justify-center text-sm text-white/80 mb-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white mr-2"></div>
                    Auto-saving...
                  </div>
                )}
                <div className="text-xs text-white/60 font-medium uppercase tracking-wider">
                  Step {currentStep} of {steps.length}
                </div>
              </div>

              {currentStep < steps.length ? (
                <button
                  onClick={handleNextStep}
                  className="group flex items-center px-8 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl font-semibold transition-all duration-200 shadow-soft hover:shadow-soft-lg hover:scale-105"
                >
                  Continue
                  <svg className="w-4 h-4 ml-2 group-hover:translate-x-0.5 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="group flex items-center px-8 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl font-semibold transition-all duration-200 shadow-soft hover:shadow-soft-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Completing Setup...
                    </>
                  ) : (
                    <>
                      Complete Setup
                      <svg className="w-4 h-4 ml-2 group-hover:translate-x-0.5 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SetupGuide; 