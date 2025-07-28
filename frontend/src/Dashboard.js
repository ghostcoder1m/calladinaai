import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';



const Dashboard = ({ onReconfigure, onSignOut }) => {
  const [user] = useAuthState(auth);
  const [setupData, setSetupData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('overview');
  const [callLogs, setCallLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [calendarData, setCalendarData] = useState([]);
  const [expandedCall, setExpandedCall] = useState(null);
  const [settingsTab, setSettingsTab] = useState('personal');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [availableVoices, setAvailableVoices] = useState([
    { name: 'Sarah', gender: 'female', accent: 'American' },
    { name: 'Callum', gender: 'male', accent: 'British' },
    { name: 'Aria', gender: 'female', accent: 'British' },
    { name: 'James', gender: 'male', accent: 'Australian' }
  ]);
  const [userSettings, setUserSettings] = useState({
    displayName: '',
    email: '',
    phone: '',
    timezone: 'America/New_York',
    notifications: {
      calls: true,
      emails: true,
      appointments: true
    }
  });
  const [agentSettings, setAgentSettings] = useState({
    businessName: '',
    businessHours: {
      start: '09:00',
      end: '17:00',
      timezone: 'America/New_York'
    },
    phoneNumber: '',
    selectedVoice: '',
    departments: [],
    knowledge: '',
    greeting: '',
    // Additional fields from setup guide
    industry: '',
    website: '',
    businessAddress: '',
    primaryEmail: '',
    tone: '',
    accent: '',
    voiceGender: '',
    afterHoursHandling: '',
    bookingServices: []
  });

  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';

  useEffect(() => {
    const loadSetupData = async () => {
      if (!user) return;

      try {
        const docRef = doc(db, 'setupConfigurations', user.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setSetupData(docSnap.data());
        }
      } catch (error) {
        console.error('Error loading setup data:', error);
      }
      
      setLoading(false);
    };

    loadSetupData();
  }, [user]);

  const loadCallLogs = async () => {
    setLoadingLogs(true);
    try {
      const response = await fetch(`${apiUrl}/api/call-logs`);
      const data = await response.json();
      
      if (data.success) {
        setCallLogs(data.logs || []);
      }
    } catch (error) {
      console.error('Error loading call logs:', error);
    } finally {
      setLoadingLogs(false);
    }
  };

  const loadCalendarData = async () => {
    try {
      const response = await fetch(`${apiUrl}/api/calendar/appointments`);
      const data = await response.json();
      
      if (data.success) {
        setCalendarData(data.events || []);
      }
    } catch (error) {
      console.error('Error loading calendar data:', error);
    }
  };

  const loadAvailableVoices = async () => {
    try {
      const response = await fetch(`${apiUrl}/api/voices`);
      if (response.ok) {
        const voices = await response.json();
        // Ensure voices is an array
        if (Array.isArray(voices)) {
          setAvailableVoices(voices);
        } else {
          console.warn('Voices API returned non-array data:', voices);
          setAvailableVoices([]);
        }
      } else {
        console.warn('Failed to load voices, using fallback');
        setAvailableVoices([
          { name: 'Sarah', gender: 'female', accent: 'American' },
          { name: 'Callum', gender: 'male', accent: 'British' },
          { name: 'Aria', gender: 'female', accent: 'British' },
          { name: 'James', gender: 'male', accent: 'Australian' }
        ]);
      }
    } catch (error) {
      console.error('Error loading voices:', error);
      // Set fallback voices if API fails
      setAvailableVoices([
        { name: 'Sarah', gender: 'female', accent: 'American' },
        { name: 'Callum', gender: 'male', accent: 'British' },
        { name: 'Aria', gender: 'female', accent: 'British' },
        { name: 'James', gender: 'male', accent: 'Australian' }
      ]);
    }
  };

  const updateAgentSetting = async (field, value) => {
    try {
      setSaving(true);
      
      // Create updated agent settings
      const updatedSettings = {
        ...agentSettings,
        [field]: value
      };

      // Quick save to backend API only for instant updates
      const response = await fetch(`${apiUrl}/api/agent/train`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          knowledge: updatedSettings.knowledge,
          selectedVoice: updatedSettings.selectedVoice,
          departments: updatedSettings.departments
        })
      });

      if (response.ok) {
        // Also save to Firebase (but don't wait for it)
        setDoc(doc(db, 'setupConfigurations', user.uid), {
          formData: {
            businessName: updatedSettings.businessName,
            industry: updatedSettings.industry,
            businessAddress: updatedSettings.businessAddress,
            website: updatedSettings.website,
            primaryEmail: updatedSettings.primaryEmail,
            selectedPhoneNumber: updatedSettings.phoneNumber,
            selectedVoice: updatedSettings.selectedVoice,
            tone: updatedSettings.tone,
            accent: updatedSettings.accent,
            voiceGender: updatedSettings.voiceGender,
            departments: updatedSettings.departments,
            bookingServices: updatedSettings.bookingServices,
            afterHoursHandling: updatedSettings.afterHoursHandling,
            specialInstructions: updatedSettings.greeting,
            mondayHours: `${updatedSettings.businessHours.start} - ${updatedSettings.businessHours.end}`,
            tuesdayHours: `${updatedSettings.businessHours.start} - ${updatedSettings.businessHours.end}`,
            wednesdayHours: `${updatedSettings.businessHours.start} - ${updatedSettings.businessHours.end}`,
            thursdayHours: `${updatedSettings.businessHours.start} - ${updatedSettings.businessHours.end}`,
            fridayHours: `${updatedSettings.businessHours.start} - ${updatedSettings.businessHours.end}`,
            saturdayHours: 'Closed',
            sundayHours: 'Closed'
          },
          updatedAt: new Date().toISOString()
        }, { merge: true }).catch(console.error);
        
        setSaveMessage('✅ Saved');
        setTimeout(() => setSaveMessage(''), 2000);
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      console.error('Error updating setting:', error);
      setSaveMessage('❌ Error');
      setTimeout(() => setSaveMessage(''), 2000);
    } finally {
      setSaving(false);
    }
  };

  const addDepartment = () => {
    const currentDepartments = Array.isArray(agentSettings.departments) ? agentSettings.departments : [];
    
    const newDept = {
      key: (currentDepartments.length + 1).toString(),
      name: 'New Department',
      voice: (Array.isArray(availableVoices) && availableVoices.length > 0) ? availableVoices[0].name : 'Default'
    };
    
    const updatedDepartments = [...currentDepartments, newDept];
    updateAgentSetting('departments', updatedDepartments);
  };

  const updateDepartment = (index, field, value) => {
    if (!Array.isArray(agentSettings.departments)) return;
    
    const updatedDepartments = agentSettings.departments.map((dept, i) => 
      i === index ? { ...dept, [field]: value } : dept
    );
    updateAgentSetting('departments', updatedDepartments);
  };

  const removeDepartment = (indexToRemove) => {
    if (!Array.isArray(agentSettings.departments)) return;
    
    const updatedDepartments = agentSettings.departments.filter((_, index) => index !== indexToRemove);
    updateAgentSetting('departments', updatedDepartments);
  };

  const addService = () => {
    const currentServices = Array.isArray(agentSettings.bookingServices) ? agentSettings.bookingServices : [];
    
    const newService = {
      name: 'New Service',
      duration: '30 minutes',
      description: 'Service description'
    };
    
    const updatedServices = [...currentServices, newService];
    updateAgentSetting('bookingServices', updatedServices);
  };

  const updateService = (index, field, value) => {
    if (!Array.isArray(agentSettings.bookingServices)) return;
    
    const updatedServices = agentSettings.bookingServices.map((service, i) => 
      i === index ? { ...service, [field]: value } : service
    );
    updateAgentSetting('bookingServices', updatedServices);
  };

  const removeService = (indexToRemove) => {
    if (!Array.isArray(agentSettings.bookingServices)) return;
    
    const updatedServices = agentSettings.bookingServices.filter((_, index) => index !== indexToRemove);
    updateAgentSetting('bookingServices', updatedServices);
  };

  const loadUserSettings = async () => {
    try {
      // First try to load from user settings
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setUserSettings(prev => ({
          ...prev,
          displayName: userData.displayName || user.displayName || '',
          email: user.email || '',
          phone: userData.phone || '',
          timezone: userData.timezone || 'America/New_York',
          notifications: userData.notifications || prev.notifications
        }));
      } else {
        // If no user settings exist, try to inherit from setup guide
        const setupDoc = await getDoc(doc(db, 'setupConfigurations', user.uid));
        if (setupDoc.exists()) {
          const setupData = setupDoc.data();
          const formData = setupData.formData || setupData;
          
          setUserSettings(prev => ({
            ...prev,
            displayName: user.displayName || '',
            email: user.email || '',
            phone: formData.phoneNumber || '',
            timezone: 'America/New_York',
            notifications: prev.notifications
          }));
        } else {
          // Default values
          setUserSettings(prev => ({
            ...prev,
            displayName: user.displayName || '',
            email: user.email || '',
            phone: '',
            timezone: 'America/New_York',
            notifications: prev.notifications
          }));
        }
      }
    } catch (error) {
      console.error('Error loading user settings:', error);
    }
  };

  const loadAgentSettings = async () => {
    try {
      const setupDoc = await getDoc(doc(db, 'setupConfigurations', user.uid));
      if (setupDoc.exists()) {
        const setupData = setupDoc.data();
        const formData = setupData.formData || setupData || {}; // Handle both old and new format
        
        // Ensure formData is not null or undefined
        if (!formData || typeof formData !== 'object') {
          console.warn('Invalid formData structure, using defaults');
          return;
        }

        console.log('FormData loaded:', {
          selectedVoice: formData.selectedVoice,
          tone: formData.tone,
          accent: formData.accent,
          voiceGender: formData.voiceGender
        });
        
        // Extract business hours from individual day hours
        const extractBusinessHours = () => {
          const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
          let earliestStart = '23:59';
          let latestEnd = '00:00';
          
          days.forEach(day => {
            const hours = formData[`${day}Hours`];
            if (hours && hours !== 'Closed') {
              if (hours.includes(' - ')) {
                const [start, end] = hours.split(' - ');
                if (start < earliestStart) earliestStart = start;
                if (end > latestEnd) latestEnd = end;
              }
            }
          });
          
          return {
            start: earliestStart === '23:59' ? '09:00' : earliestStart,
            end: latestEnd === '00:00' ? '17:00' : latestEnd,
            timezone: 'America/New_York'
          };
        };

        // Build comprehensive knowledge base from all setup data
        const buildKnowledgeBase = () => {
          let knowledge = '';
          
          // Business Information
          if (formData.businessName && typeof formData.businessName === 'string') knowledge += `Business Name: ${formData.businessName}\n`;
          if (formData.industry && typeof formData.industry === 'string') knowledge += `Industry: ${formData.industry}\n`;
          if (formData.businessAddress && typeof formData.businessAddress === 'string') knowledge += `Address: ${formData.businessAddress}\n`;
          if (formData.website && typeof formData.website === 'string') knowledge += `Website: ${formData.website}\n`;
          if (formData.primaryEmail && typeof formData.primaryEmail === 'string') knowledge += `Email: ${formData.primaryEmail}\n`;
          
          // Business Hours
          knowledge += '\nBusiness Hours:\n';
          const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
          days.forEach((day, index) => {
            const dayKey = day.toLowerCase();
            const hours = formData[`${dayKey}Hours`];
            if (hours && typeof hours === 'string') {
              knowledge += `${day}: ${hours}\n`;
            }
          });
          
          // Services
          if (formData.bookingServices && Array.isArray(formData.bookingServices)) {
            knowledge += '\nServices:\n';
            formData.bookingServices.forEach(service => {
              if (service && service.name) {
                knowledge += `- ${service.name}`;
                if (service.duration && typeof service.duration === 'string') knowledge += ` (${service.duration})`;
                if (service.description && typeof service.description === 'string') knowledge += `: ${service.description}`;
                knowledge += '\n';
              }
            });
          }
          
          // Departments
          if (formData.departments && Array.isArray(formData.departments)) {
            knowledge += '\nDepartments:\n';
            formData.departments.forEach(dept => {
              if (dept && dept.name) {
                knowledge += `- ${dept.name}`;
                if (dept.extension) knowledge += ` (Extension: ${dept.extension})`;
                knowledge += '\n';
              }
            });
          }
          
          // Special Instructions
          if (formData.specialInstructions && typeof formData.specialInstructions === 'string') {
            knowledge += `\nSpecial Instructions:\n${formData.specialInstructions}\n`;
          }
          
          // After Hours Handling
          if (formData.afterHoursHandling && typeof formData.afterHoursHandling === 'string') {
            knowledge += `\nAfter Hours: ${formData.afterHoursHandling}\n`;
          }
          
          // Booking Information
          if (formData.bookingInfo && typeof formData.bookingInfo === 'string') {
            knowledge += `\nBooking Information:\n${formData.bookingInfo}\n`;
          }
          
          return knowledge.trim();
        };

        // Extract voice name from formatted string or object
        const getVoiceName = () => {
          if (formData.selectedVoice) {
            // Handle case where selectedVoice is an object (from ElevenLabs API)
            if (typeof formData.selectedVoice === 'object' && formData.selectedVoice !== null) {
              const voiceName = formData.selectedVoice.name || formData.selectedVoice.voice_id || '';
              console.log('Voice object found:', formData.selectedVoice, 'extracted:', voiceName);
              return voiceName;
            } else if (typeof formData.selectedVoice === 'string') {
              // Handle different string formats:
              // "Sarah (Australian, professional)" -> "Sarah"
              // "Sarah" -> "Sarah"
              let voiceName = formData.selectedVoice;
              
              // Try to extract from parentheses format first
              const parenthesesMatch = formData.selectedVoice.match(/^([^(]+)/);
              if (parenthesesMatch) {
                voiceName = parenthesesMatch[1].trim();
              }
              
              console.log('Voice string found:', formData.selectedVoice, 'extracted:', voiceName);
              return voiceName;
            }
          }
          console.log('No voice data found');
          return '';
        };

        const newSettings = {
          ...agentSettings,
          businessName: (typeof formData.businessName === 'string' ? formData.businessName : '') || '',
          businessHours: extractBusinessHours(),
          phoneNumber: (typeof formData.selectedPhoneNumber === 'string' ? formData.selectedPhoneNumber : '') || '',
          selectedVoice: getVoiceName(),
          departments: Array.isArray(formData.departments) ? formData.departments : [],
          knowledge: buildKnowledgeBase(),
          greeting: (typeof formData.specialInstructions === 'string' ? formData.specialInstructions : '') || `Hello! Welcome to ${formData.businessName || 'our business'}. How can I assist you today?`,
          // Additional fields from setup
          industry: (typeof formData.industry === 'string' ? formData.industry : '') || '',
          website: (typeof formData.website === 'string' ? formData.website : '') || '',
          businessAddress: (typeof formData.businessAddress === 'string' ? formData.businessAddress : '') || '',
          primaryEmail: (typeof formData.primaryEmail === 'string' ? formData.primaryEmail : '') || '',
          tone: (() => {
            const toneValue = typeof formData.tone === 'string' ? formData.tone : (formData.tone?.name || '');
            console.log('Tone value found:', toneValue);
            // Normalize tone values to match dropdown options
            const normalizedTone = toneValue.charAt(0).toUpperCase() + toneValue.slice(1).toLowerCase();
            return normalizedTone;
          })(),
          accent: typeof formData.accent === 'string' ? formData.accent : (formData.accent?.name || ''),
          voiceGender: typeof formData.voiceGender === 'string' ? formData.voiceGender.toLowerCase() : (formData.voiceGender?.name?.toLowerCase() || ''),
          afterHoursHandling: (typeof formData.afterHoursHandling === 'string' ? formData.afterHoursHandling : '') || '',
          bookingServices: Array.isArray(formData.bookingServices) ? formData.bookingServices : []
        };

        console.log('Loading agent settings:', newSettings);
        setAgentSettings(newSettings);
      }

      // Load from backend API as fallback only
      try {
        const response = await fetch(`${apiUrl}/api/agent/knowledge`);
        if (response.ok) {
          const data = await response.json();
          console.log('Backend API data:', data);
          
          // Only use backend data if we don't have setup data
          setAgentSettings(prev => {
            const finalSettings = {
              ...prev,
              // Use setup data first, fallback to API data
              knowledge: prev.knowledge || data.knowledge || '',
              selectedVoice: prev.selectedVoice || (typeof data.selectedVoice === 'string' ? data.selectedVoice.match(/^([^(]+)/)?.[1]?.trim() || data.selectedVoice : '') || '',
              departments: prev.departments.length > 0 ? prev.departments : (Array.isArray(data.departments) ? data.departments : [])
            };
            
            console.log('Final agent settings after backend merge:', finalSettings);
            return finalSettings;
          });
        }
      } catch (error) {
        console.error('Error loading backend data:', error);
      }
    } catch (error) {
      console.error('Error loading agent settings:', error);
    }
  };

  const saveUserSettings = async () => {
    try {
      await setDoc(doc(db, 'users', user.uid), {
        ...userSettings,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      alert('✅ User settings saved successfully!');
    } catch (error) {
      console.error('Error saving user settings:', error);
      alert('❌ Failed to save user settings.');
    }
  };

  const saveAgentSettings = async () => {
    try {
      // Save to Firebase with all the fields
      await setDoc(doc(db, 'setupConfigurations', user.uid), {
        formData: {
          businessName: agentSettings.businessName,
          industry: agentSettings.industry,
          businessAddress: agentSettings.businessAddress,
          website: agentSettings.website,
          primaryEmail: agentSettings.primaryEmail,
          selectedPhoneNumber: agentSettings.phoneNumber,
          selectedVoice: typeof agentSettings.selectedVoice === 'string' ? agentSettings.selectedVoice : (agentSettings.selectedVoice?.name || ''),
          tone: typeof agentSettings.tone === 'string' ? agentSettings.tone : '',
          accent: typeof agentSettings.accent === 'string' ? agentSettings.accent : '',
          voiceGender: typeof agentSettings.voiceGender === 'string' ? agentSettings.voiceGender : '',
          departments: Array.isArray(agentSettings.departments) ? agentSettings.departments : [],
          bookingServices: Array.isArray(agentSettings.bookingServices) ? agentSettings.bookingServices : [],
          afterHoursHandling: agentSettings.afterHoursHandling,
          specialInstructions: agentSettings.greeting,
          // Convert business hours back to individual day format if needed
          mondayHours: `${agentSettings.businessHours.start} - ${agentSettings.businessHours.end}`,
          tuesdayHours: `${agentSettings.businessHours.start} - ${agentSettings.businessHours.end}`,
          wednesdayHours: `${agentSettings.businessHours.start} - ${agentSettings.businessHours.end}`,
          thursdayHours: `${agentSettings.businessHours.start} - ${agentSettings.businessHours.end}`,
          fridayHours: `${agentSettings.businessHours.start} - ${agentSettings.businessHours.end}`,
          saturdayHours: 'Closed',
          sundayHours: 'Closed'
        },
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // Save to backend API
      const response = await fetch(`${apiUrl}/api/agent/train`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          knowledge: agentSettings.knowledge,
          selectedVoice: agentSettings.selectedVoice,
          departments: agentSettings.departments
        })
      });

      if (response.ok) {
        alert('✅ Agent settings saved successfully! All changes have been updated.');
      } else {
        throw new Error('Failed to save to backend');
      }
    } catch (error) {
      console.error('Error saving agent settings:', error);
      alert('❌ Failed to save agent settings.');
    }
  };

  useEffect(() => {
    if (activeSection === 'overview') {
      loadCallLogs();
      loadCalendarData();
    } else if (activeSection === 'calls') {
      loadCallLogs();
    } else if (activeSection === 'calendar') {
      loadCalendarData();
        } else if (activeSection === 'settings') {
      // Add a small delay to ensure proper loading order
      setTimeout(() => {
        loadUserSettings();
        loadAgentSettings();
        loadAvailableVoices();
      }, 100);
    }
  }, [activeSection]);

  const getCallStats = () => {
    const totalCalls = callLogs.length;
    const completedCalls = callLogs.filter(log => log.status === 'completed').length;
    const successRate = totalCalls > 0 ? Math.round((completedCalls / totalCalls) * 100) : 0;
    
    const transfers = callLogs.filter(log => 
      log.conversationHistory?.some(msg => 
        msg.content && (
          msg.content.toLowerCase().includes('transfer') || 
          msg.content.toLowerCase().includes('representative')
        )
      )
    ).length;
    
    const bookings = callLogs.filter(log => 
      log.conversationHistory?.some(msg => 
        msg.content && (
          msg.content.toLowerCase().includes('appointment') || 
          msg.content.toLowerCase().includes('booking') || 
          msg.content.toLowerCase().includes('schedule')
        )
      )
    ).length;
    
    return { totalCalls, bookings, transfers, successRate };
  };

  const getMinutesUsed = () => {
    let totalSeconds = 0;
    callLogs.forEach(log => {
      if (log.duration) {
        // Parse duration from milliseconds or string format
        if (typeof log.duration === 'number') {
          totalSeconds += Math.floor(log.duration / 1000);
        } else {
          // Parse duration format like "1m 30s" or "45s"
          const duration = log.duration.toString();
          const minutes = duration.match(/(\d+)m/);
          const seconds = duration.match(/(\d+)s/);
          
          if (minutes) totalSeconds += parseInt(minutes[1]) * 60;
          if (seconds) totalSeconds += parseInt(seconds[1]);
        }
      }
    });
    const calculatedMinutes = Math.round(totalSeconds / 60);
    // Return demo data if no calls yet, otherwise return calculated minutes
    return calculatedMinutes > 0 ? calculatedMinutes : 347;
  };

  const getPlanInfo = () => {
    const usedMinutes = getMinutesUsed();
    // Determine plan based on usage (for demo purposes)
    if (usedMinutes > 2000) return { plan: 'Enterprise', total: 5000 };
    if (usedMinutes > 200) return { plan: 'Pro', total: 1000 };
    return { plan: 'Starter', total: 500 };
  };

  const formatDuration = (duration) => {
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${seconds}s`;
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-600 mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const sidebarItems = [
    { id: 'overview', name: 'Overview', icon: '📊' },
    { id: 'calls', name: 'Calls', icon: '📞' },
    { id: 'calendar', name: 'Calendar', icon: '📅' },
    { id: 'agent', name: 'Agent', icon: '🤖' },
    { id: 'settings', name: 'Settings', icon: '⚙️' }
  ];

  const stats = getCallStats();

  const SidebarItem = ({ item, isActive, onClick }) => (
    <button
      onClick={onClick}
      className={`w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors ${
        isActive 
          ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600' 
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
      }`}
    >
      <span className="text-lg mr-3">{item.icon}</span>
      <span className={`text-sm font-medium ${isActive ? 'font-semibold' : ''}`}>{item.name}</span>
    </button>
  );

  const MetricCard = ({ title, value, change, changeType, icon, gradient = 'from-blue-500 to-purple-600' }) => (
    <div className="group bg-gradient-to-br from-white to-slate-50 rounded-3xl p-8 shadow-2xl border-0 hover:shadow-3xl transition-all duration-300 hover:-translate-y-2 relative overflow-hidden">
      {/* Animated background gradient */}
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}></div>
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-6">
          <div className="text-slate-600 text-sm font-bold uppercase tracking-wider">{title}</div>
          <div className={`w-14 h-14 bg-gradient-to-br ${gradient} rounded-2xl flex items-center justify-center text-2xl shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110`}>
            <span className="text-white drop-shadow-sm">{icon}</span>
            </div>
            </div>
        <div className="flex items-baseline">
          <div className="text-4xl font-black text-slate-900 group-hover:text-slate-800 transition-colors">{value}</div>
          {change && (
            <div className={`ml-3 text-sm font-bold flex items-center px-3 py-1 rounded-full ${
              changeType === 'positive' ? 'text-emerald-600 bg-emerald-50' : 
              changeType === 'negative' ? 'text-red-600 bg-red-50' : 'text-slate-600 bg-slate-50'
            }`}>
              {changeType === 'positive' && '↗'}
              {changeType === 'negative' && '↘'}
              {change}
            </div>
          )}
          </div>
        </div>

      {/* Subtle glow effect */}
      <div className={`absolute -inset-1 bg-gradient-to-r ${gradient} rounded-3xl blur opacity-0 group-hover:opacity-20 transition-opacity duration-300 -z-10`}></div>
    </div>
  );

  const CircularProgress = ({ used, total, label, plan }) => {
    const percentage = Math.min((used / total) * 100, 100);
    const strokeDasharray = 2 * Math.PI * 45; // radius of 45
    const strokeDashoffset = strokeDasharray - (strokeDasharray * percentage) / 100;
    
    const getColor = () => {
      if (percentage < 50) return 'url(#greenGradient)';
      if (percentage < 80) return 'url(#amberGradient)';
      return 'url(#redGradient)';
    };

    const getGlowColor = () => {
      if (percentage < 50) return 'rgba(16, 185, 129, 0.4)';
      if (percentage < 80) return 'rgba(245, 158, 11, 0.4)';
      return 'rgba(239, 68, 68, 0.4)';
    };

    return (
      <div className="bg-gradient-to-br from-white to-slate-50 rounded-3xl p-8 shadow-2xl border-0 hover:shadow-3xl transition-all duration-300 hover:-translate-y-1">
        <div className="flex items-center justify-center">
          <div className="relative">
            <div 
              className="absolute inset-0 rounded-full blur-xl opacity-30"
              style={{ 
                background: `radial-gradient(circle, ${getGlowColor()} 0%, transparent 70%)`,
                width: '140px',
                height: '140px',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)'
              }}
            ></div>
            <svg className="w-36 h-36 transform -rotate-90 relative z-10" viewBox="0 0 100 100">
              <defs>
                <linearGradient id="greenGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#059669" />
                </linearGradient>
                <linearGradient id="amberGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#d97706" />
                </linearGradient>
                <linearGradient id="redGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ef4444" />
                  <stop offset="100%" stopColor="#dc2626" />
                </linearGradient>
              </defs>
              {/* Background circle */}
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="#e2e8f0"
                strokeWidth="6"
              />
              {/* Progress circle */}
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke={getColor()}
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-1000 ease-out drop-shadow-lg"
                style={{ filter: `drop-shadow(0 0 8px ${getGlowColor()})` }}
              />
              </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-3xl font-black text-slate-900 mb-1">{used}</div>
                <div className="text-xs text-slate-500 font-semibold">of {total}</div>
            </div>
            </div>
          </div>
        </div>
        <div className="mt-6 text-center">
          <div className="text-lg font-bold text-slate-900 mb-1">{label}</div>
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-3 ${
            plan === 'Pro' ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white' :
            plan === 'Enterprise' ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white' :
            'bg-gradient-to-r from-green-500 to-emerald-600 text-white'
          }`}>
            ✨ {plan} Plan
          </div>
          <div className={`text-sm font-bold mb-2 ${
            percentage < 50 ? 'text-emerald-600' : 
            percentage < 80 ? 'text-amber-600' : 'text-red-600'
          }`}>
            {percentage.toFixed(1)}% used
          </div>
          <div className="text-xs text-slate-500 font-medium">
            {total - used} minutes remaining
          </div>
        </div>
      </div>
    );
  };

  const renderOverview = () => (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-700 rounded-3xl p-8 shadow-2xl">
        {/* Animated background elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full -ml-12 -mb-12 animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 w-16 h-16 bg-gradient-to-r from-pink-400/20 to-yellow-400/20 rounded-full -translate-x-8 -translate-y-8 animate-bounce"></div>
        
        <div className="relative flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center mb-4">
              <div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse mr-3"></div>
              <span className="text-emerald-300 font-bold text-sm uppercase tracking-wider">● SYSTEM ACTIVE</span>
            </div>
            <h1 className="text-4xl font-black text-white mb-3 leading-tight">
              Welcome back, <span className="bg-gradient-to-r from-yellow-300 to-pink-300 bg-clip-text text-transparent">{user?.displayName || user?.email?.split('@')[0] || 'there'}</span>! 
              <span className="ml-2 animate-bounce inline-block">👋</span>
            </h1>
            <p className="text-blue-100 text-lg font-medium leading-relaxed">
              Your AI agent is processing calls with <span className="font-bold text-white">neural precision</span> and ready to scale.
            </p>
            </div>
          
          {setupData?.formData?.selectedPhoneNumber && (
            <div className="bg-white/15 backdrop-blur-xl rounded-2xl p-6 border border-white/20 shadow-xl">
              <div className="text-center">
                <div className="text-blue-200 mb-2 font-bold uppercase tracking-wider text-xs">🔥 LIVE AGENT</div>
                <div className="text-2xl font-black text-white font-mono mb-2 tracking-wider">
                  {setupData.formData.selectedPhoneNumber}
                </div>
                <div className="flex items-center justify-center">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-ping mr-2"></div>
                  <span className="text-emerald-300 font-bold text-xs">ONLINE & READY</span>
                </div>
              </div>
            </div>
          )}
          </div>
        </div>

      {/* Usage Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Circular Progress */}
        <div className="lg:col-span-1">
          <CircularProgress
            used={getMinutesUsed()}
            total={getPlanInfo().total}
            label="Minutes Used"
            plan={getPlanInfo().plan}
          />
            </div>
        
        {/* Statistics */}
        <div className="lg:col-span-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard 
            title="Total Calls" 
            value={stats.totalCalls}
            icon="📞"
            gradient="from-blue-500 to-indigo-600"
          />
          <MetricCard 
            title="Appointments" 
            value={stats.bookings}
            icon="📅"
            gradient="from-emerald-500 to-teal-600"
          />
          <MetricCard 
            title="Transfers" 
            value={stats.transfers}
            icon="🔄"
            gradient="from-orange-500 to-red-600"
          />
          <MetricCard 
            title="Success Rate" 
            value={`${stats.successRate}%`}
            icon="✅"
            gradient="from-green-500 to-emerald-600"
          />
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Calls */}
        <div className="bg-gradient-to-br from-white to-slate-50 rounded-3xl shadow-2xl border-0 overflow-hidden">
          <div className="p-8 border-b border-slate-100 bg-gradient-to-r from-blue-500/5 to-indigo-500/5">
            <h3 className="text-xl font-black text-slate-900 flex items-center">
              <span className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white mr-4 shadow-lg">📞</span>
              Recent Calls
            </h3>
          </div>
          <div className="p-8">
            {callLogs.slice(0, 5).length > 0 ? (
              <div className="space-y-4">
                {callLogs.slice(0, 5).map((log, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-white/60 backdrop-blur-sm rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 hover:bg-white/80">
                    <div className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-4 shadow-sm ${
                        log.status === 'completed' ? 'bg-emerald-500' : 'bg-amber-500'
                      }`}></div>
            <div>
                        <div className="font-bold text-slate-900">{log.from}</div>
                        <div className="text-sm text-slate-500 font-medium">{formatDateTime(log.startTime)}</div>
            </div>
          </div>
                    <div className="text-sm text-slate-600 font-semibold bg-slate-100 px-3 py-1 rounded-full">{formatDuration(log.duration)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl flex items-center justify-center text-3xl mb-4 mx-auto shadow-lg">📞</div>
                <p className="text-slate-600 font-medium">No calls yet</p>
                <p className="text-slate-500 text-sm mt-1">Your call history will appear here</p>
              </div>
            )}
        </div>
      </div>

        {/* Upcoming Appointments */}
        <div className="bg-gradient-to-br from-white to-emerald-50 rounded-3xl shadow-2xl border-0 overflow-hidden">
          <div className="p-8 border-b border-emerald-100 bg-gradient-to-r from-emerald-500/5 to-teal-500/5">
            <h3 className="text-xl font-black text-slate-900 flex items-center">
              <span className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center text-white mr-4 shadow-lg">📅</span>
              Upcoming Appointments
            </h3>
          </div>
          <div className="p-8">
            {calendarData.slice(0, 5).length > 0 ? (
          <div className="space-y-4">
                {calendarData.slice(0, 5).map((event, index) => (
                  <div key={index} className="flex items-center p-4 bg-emerald-50/80 backdrop-blur-sm rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 hover:bg-emerald-50">
                    <div className="w-3 h-3 rounded-full bg-emerald-500 mr-4 shadow-sm"></div>
                <div className="flex-1">
                      <div className="font-bold text-slate-900">{event.summary}</div>
                      <div className="text-sm text-slate-500 font-medium">
                        {new Date(event.start.dateTime).toLocaleString()}
                      </div>
                </div>
              </div>
            ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl flex items-center justify-center text-3xl mb-4 mx-auto shadow-lg">📅</div>
                <p className="text-slate-600 font-medium">No upcoming appointments</p>
                <p className="text-slate-500 text-sm mt-1">Scheduled appointments will appear here</p>
              </div>
            )}
          </div>
          </div>
        </div>

      {/* Quick Actions */}
      <div className="bg-gradient-to-br from-white to-purple-50 rounded-3xl p-8 shadow-2xl border-0 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-purple-400/10 to-pink-400/10 rounded-full -mr-12 -mt-12"></div>
        <div className="relative">
          <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center">
            <span className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center text-white mr-4 shadow-lg">⚡</span>
            Quick Actions
          </h3>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={onReconfigure}
              className="group px-6 py-3 bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white rounded-2xl font-bold transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-1 flex items-center"
            >
              <span className="mr-2 group-hover:rotate-180 transition-transform duration-300">⚙️</span> 
              Reconfigure Agent
            </button>
            <button
              onClick={() => setActiveSection('calls')}
              className="group px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-2xl font-bold transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-1 flex items-center"
            >
              <span className="mr-2 group-hover:scale-110 transition-transform duration-300">📞</span> 
              View All Calls
            </button>
            <button
              onClick={() => setActiveSection('calendar')}
              className="group px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-2xl font-bold transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-1 flex items-center"
            >
              <span className="mr-2 group-hover:bounce transition-transform duration-300">📅</span> 
              Manage Calendar
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderCallActivity = () => (
    <div className="space-y-8">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 rounded-3xl p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full -ml-12 -mb-12 animate-pulse delay-1000"></div>
        
        <div className="relative flex items-center justify-between">
          <div>
            <div className="flex items-center mb-4">
              <div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse mr-3"></div>
              <span className="text-emerald-300 font-bold text-sm uppercase tracking-wider">● LIVE MONITORING</span>
            </div>
            <h2 className="text-4xl font-black text-white mb-3 leading-tight flex items-center">
              <span className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mr-4 shadow-lg">📞</span>
              Call Activity
            </h2>
            <p className="text-blue-100 text-lg font-medium">
              Real-time call logs and <span className="font-bold text-white">conversation analytics</span>
            </p>
          </div>
          
            <button 
            onClick={loadCallLogs}
            disabled={loadingLogs}
            className="group px-6 py-3 bg-white/15 backdrop-blur-xl border border-white/20 hover:bg-white/25 disabled:bg-white/10 text-white rounded-2xl font-bold transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-1 disabled:cursor-not-allowed flex items-center"
            >
            <span className={`mr-2 transition-transform duration-300 ${loadingLogs ? 'animate-spin' : 'group-hover:rotate-180'}`}>
              {loadingLogs ? '⟳' : '🔄'}
            </span>
            {loadingLogs ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>

      {loadingLogs ? (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl flex items-center justify-center text-3xl mb-4 mx-auto shadow-lg animate-bounce">📞</div>
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
            <span className="text-slate-600 font-medium">Loading call logs...</span>
      </div>
        </div>
      ) : callLogs.length === 0 ? (
        <div className="bg-gradient-to-br from-white to-slate-50 rounded-3xl p-12 shadow-2xl border-0 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl flex items-center justify-center text-4xl mb-6 mx-auto shadow-lg">📞</div>
          <h3 className="text-2xl font-black text-slate-900 mb-3">No Calls Yet</h3>
          <p className="text-slate-600 font-medium text-lg">Call logs and transcripts will appear here once you receive calls.</p>
          <div className="mt-6 p-4 bg-blue-50 rounded-2xl">
            <p className="text-blue-700 text-sm font-medium">💡 Tip: Test your AI agent by calling your phone number!</p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {callLogs.map((log, index) => (
            <div key={log.callSid || index} className="group bg-gradient-to-br from-white to-slate-50 rounded-3xl shadow-2xl border-0 overflow-hidden hover:shadow-3xl transition-all duration-300 hover:-translate-y-1">
              <div 
                className="p-8 cursor-pointer"
                onClick={() => setExpandedCall(expandedCall === index ? null : index)}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <div className={`w-4 h-4 rounded-full shadow-sm animate-pulse ${
                      log.status === 'completed' ? 'bg-emerald-500' :
                      log.status === 'failed' ? 'bg-red-500' :
                      'bg-amber-500'
                    }`}></div>
                    <div>
                      <h3 className="text-xl font-black text-slate-900 group-hover:text-blue-600 transition-colors">
                        Call from {log.from}
                      </h3>
                      <p className="text-sm text-slate-500 font-medium">
                        {formatDateTime(log.startTime)} • Duration: <span className="font-bold">{formatDuration(log.duration)}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className={`inline-flex items-center px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm ${
                      log.status === 'completed' ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white' :
                      log.status === 'failed' ? 'bg-gradient-to-r from-red-500 to-red-600 text-white' :
                      'bg-gradient-to-r from-amber-500 to-orange-600 text-white'
                    }`}>
                      {log.status === 'completed' ? '✅ Completed' :
                       log.status === 'failed' ? '❌ Failed' : '⏳ Processing'}
                    </span>
                    <div className={`w-6 h-6 flex items-center justify-center transition-transform duration-300 ${
                      expandedCall === index ? 'rotate-180' : ''
                    }`}>
                      <span className="text-slate-400 font-bold">▼</span>
                    </div>
                  </div>
                </div>

                {/* Conversation Preview */}
                {expandedCall !== index && log.conversationHistory && log.conversationHistory.length > 0 && (
                  <div className="mt-4 p-4 bg-slate-50/50 rounded-2xl">
                    <p className="text-sm text-slate-600 font-medium">
                      💬 {log.conversationHistory.length} messages • Click to view full conversation
                    </p>
                    <div className="mt-2 text-sm text-slate-500 italic">
                      "{log.conversationHistory[0]?.content?.substring(0, 100)}..."
                    </div>
                  </div>
                )}
              </div>

              {/* Expanded Conversation */}
              {expandedCall === index && log.conversationHistory && log.conversationHistory.length > 0 && (
                <div className="border-t border-slate-200 bg-gradient-to-r from-slate-50/50 to-blue-50/50 p-8">
                  <div className="flex items-center mb-6">
                    <span className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white mr-3 shadow-lg">💬</span>
                    <h4 className="text-lg font-black text-slate-900">Conversation Transcript</h4>
                    <div className="ml-auto text-xs text-slate-500 font-medium bg-white px-3 py-1 rounded-full shadow-sm">
                      {log.conversationHistory.length} messages
                    </div>
                  </div>
                  <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                    {log.conversationHistory.map((message, msgIndex) => (
                      <div key={msgIndex} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-xs lg:max-w-md px-6 py-4 rounded-2xl shadow-lg transition-all duration-200 hover:shadow-xl ${
                          message.type === 'user'
                            ? 'bg-gradient-to-br from-slate-100 to-slate-200 text-slate-900' 
                            : 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white'
                        }`}>
                          <div className="font-medium leading-relaxed">{message.content}</div>
                          <div className={`text-xs mt-2 flex items-center ${
                            message.type === 'user' ? 'text-slate-500' : 'text-blue-100'
                          }`}>
                            <span className="w-2 h-2 rounded-full mr-2 bg-current opacity-60"></span>
                            {message.type === 'user' ? '👤 Caller' : '🤖 AI Assistant'} • {formatDateTime(message.timestamp)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {expandedCall === index && (!log.conversationHistory || log.conversationHistory.length === 0) && (
                <div className="border-t border-slate-200 bg-slate-50/50 p-8 text-center">
                  <div className="w-12 h-12 bg-slate-200 rounded-2xl flex items-center justify-center text-2xl mb-4 mx-auto">📝</div>
                  <p className="text-slate-500 font-medium italic">No conversation recorded for this call.</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderCalendar = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold text-gray-900">Calendar</h2>
        <button
          onClick={loadCalendarData}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
        >
          Refresh
        </button>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Upcoming Appointments</h3>
        {calendarData.length > 0 ? (
          <div className="space-y-4">
            {calendarData.map((event, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-green-500 mr-4"></div>
                  <div>
                    <h4 className="font-medium text-slate-900">{event.summary}</h4>
                    <p className="text-sm text-slate-600">{event.description}</p>
                    <p className="text-sm text-slate-500">
                      {new Date(event.start.dateTime).toLocaleString()}
                    </p>
                  </div>
                </div>
                {event.htmlLink && (
                  <a 
                    href={event.htmlLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                  >
                    View
                  </a>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-slate-400 text-4xl mb-4">📅</div>
            <h3 className="text-lg font-medium text-slate-900 mb-2">No Appointments</h3>
            <p className="text-slate-600">Appointments booked through your AI agent will appear here.</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeSection) {
      case 'overview':
        return renderOverview();
      case 'calls':
        return renderCallActivity();
      case 'calendar':
        return renderCalendar();
      case 'agent':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-gray-900">AI Agent</h2>
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <p className="text-gray-600 mb-4">Reconfigure your AI agent settings and training.</p>
              <button
                onClick={onReconfigure}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Reconfigure Agent
              </button>
            </div>
          </div>
        );
      case 'settings':
        return (
          <div className="space-y-8">
            {/* Header */}
            <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-700 rounded-3xl p-8 shadow-2xl">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 animate-pulse"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full -ml-12 -mb-12 animate-pulse delay-1000"></div>
              
              <div className="relative flex items-center justify-between">
                <div>
                  <div className="flex items-center mb-4">
                    <div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse mr-3"></div>
                    <span className="text-emerald-300 font-bold text-sm uppercase tracking-wider">● CONFIGURATION CENTER</span>
                  </div>
                  <h2 className="text-4xl font-black text-white mb-3 leading-tight flex items-center">
                    <span className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mr-4 shadow-lg">⚙️</span>
                    Settings
                  </h2>
                  <p className="text-indigo-100 text-lg font-medium">
                    Customize your profile and <span className="font-bold text-white">AI agent configuration</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Settings Tabs */}
            <div className="bg-gradient-to-br from-white to-slate-50 rounded-3xl shadow-2xl border-0 overflow-hidden">
              <div className="flex border-b border-slate-200">
                <button
                  onClick={() => setSettingsTab('personal')}
                  className={`flex-1 px-8 py-6 text-lg font-bold transition-all duration-300 flex items-center justify-center ${
                    settingsTab === 'personal'
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <span className="mr-3 text-2xl">👤</span>
                  Personal Settings
                </button>
                <button
                  onClick={() => setSettingsTab('agent')}
                  className={`flex-1 px-8 py-6 text-lg font-bold transition-all duration-300 flex items-center justify-center ${
                    settingsTab === 'agent'
                      ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <span className="mr-3 text-2xl">🤖</span>
                  Agent Settings
                </button>
              </div>

              <div className="p-8">
                {/* Data Inheritance Info */}
                <div className="mb-8 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-200">
                  <div className="flex items-center mb-2">
                    <span className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm mr-3">ℹ️</span>
                    <h4 className="font-bold text-blue-900">Data Source Information</h4>
                  </div>
                  <p className="text-blue-800 text-sm">
                    {settingsTab === 'personal' 
                      ? "Personal settings are inherited from your setup guide and can be customized here."
                      : "🚀 All agent settings are fully editable with instant saving! These fields auto-fill from your setup guide - make changes directly here and everything updates your AI agent in real-time."
                    }
                  </p>
                </div>

                {settingsTab === 'personal' ? (
                  <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Profile Information */}
                      <div className="space-y-6">
                        <h3 className="text-xl font-black text-slate-900 flex items-center">
                          <span className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white mr-3 shadow-lg">👤</span>
                          Profile Information
        </h3>
                        
          <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">Display Name</label>
                          <input
                            type="text"
                            value={userSettings.displayName}
                            onChange={(e) => setUserSettings(prev => ({ ...prev, displayName: e.target.value }))}
                            className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 font-medium"
                            placeholder="Enter your display name"
                          />
            </div>

                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">Email</label>
                          <input
                            type="email"
                            value={userSettings.email}
                            disabled
                            className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 text-slate-600 font-medium"
                          />
                          <p className="text-xs text-slate-500 mt-1">Email cannot be changed</p>
          </div>

          <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">Phone Number</label>
                          <input
                            type="tel"
                            value={userSettings.phone}
                            onChange={(e) => setUserSettings(prev => ({ ...prev, phone: e.target.value }))}
                            className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 font-medium"
                            placeholder="+1 (555) 123-4567"
                          />
            </div>

                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">Timezone</label>
                          <select
                            value={userSettings.timezone}
                            onChange={(e) => setUserSettings(prev => ({ ...prev, timezone: e.target.value }))}
                            className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 font-medium"
                          >
                            <option value="America/New_York">Eastern Time (ET)</option>
                            <option value="America/Chicago">Central Time (CT)</option>
                            <option value="America/Denver">Mountain Time (MT)</option>
                            <option value="America/Los_Angeles">Pacific Time (PT)</option>
                            <option value="Europe/London">London (GMT)</option>
                            <option value="Europe/Paris">Paris (CET)</option>
                            <option value="Asia/Tokyo">Tokyo (JST)</option>
                          </select>
          </div>
                      </div>

                      {/* Notification Preferences */}
                      <div className="space-y-6">
                        <h3 className="text-xl font-black text-slate-900 flex items-center">
                          <span className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center text-white mr-3 shadow-lg">🔔</span>
                          Notifications
                        </h3>

                        <div className="space-y-4">
                          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
          <div>
                              <div className="font-bold text-slate-900">Call Notifications</div>
                              <div className="text-sm text-slate-600">Get notified when you receive calls</div>
            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={userSettings.notifications.calls}
                                onChange={(e) => setUserSettings(prev => ({
                                  ...prev,
                                  notifications: { ...prev.notifications, calls: e.target.checked }
                                }))}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
          </div>

                          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
          <div>
                              <div className="font-bold text-slate-900">Email Notifications</div>
                              <div className="text-sm text-slate-600">Receive email summaries</div>
            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={userSettings.notifications.emails}
                                onChange={(e) => setUserSettings(prev => ({
                                  ...prev,
                                  notifications: { ...prev.notifications, emails: e.target.checked }
                                }))}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
          </div>

                          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                            <div>
                              <div className="font-bold text-slate-900">Appointment Reminders</div>
                              <div className="text-sm text-slate-600">Get reminded about upcoming appointments</div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={userSettings.notifications.appointments}
                                onChange={(e) => setUserSettings(prev => ({
                                  ...prev,
                                  notifications: { ...prev.notifications, appointments: e.target.checked }
                                }))}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                          </div>
                        </div>
        </div>
      </div>

                    {/* Save Button */}
                    <div className="flex justify-end pt-6 border-t border-slate-200">
                      <button
                        onClick={saveUserSettings}
                        className="group px-8 py-4 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-2xl font-bold transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-1 flex items-center"
                      >
                        <span className="mr-2 group-hover:scale-110 transition-transform">💾</span>
                        Save Personal Settings
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Business Information */}
                      <div className="space-y-6">
                        <h3 className="text-xl font-black text-slate-900 flex items-center">
                          <span className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center text-white mr-3 shadow-lg">🏢</span>
                          Business Information
        </h3>

                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">Business Name</label>
                          <input
                            type="text"
                            value={agentSettings.businessName}
                            onChange={(e) => {
                              setAgentSettings(prev => ({ ...prev, businessName: e.target.value }));
                              clearTimeout(window.businessNameTimeout);
                              window.businessNameTimeout = setTimeout(() => {
                                updateAgentSetting('businessName', e.target.value);
                              }, 1000);
                            }}
                            className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200 font-medium"
                            placeholder="Enter your business name"
                          />
              </div>

                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">Industry</label>
                          <input
                            type="text"
                            value={agentSettings.industry}
                            onChange={(e) => {
                              setAgentSettings(prev => ({ ...prev, industry: e.target.value }));
                              clearTimeout(window.industryTimeout);
                              window.industryTimeout = setTimeout(() => {
                                updateAgentSetting('industry', e.target.value);
                              }, 1000);
                            }}
                            className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200 font-medium"
                            placeholder="Enter your industry"
                          />
            </div>

                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">Business Address</label>
                          <input
                            type="text"
                            value={agentSettings.businessAddress}
                            onChange={(e) => {
                              setAgentSettings(prev => ({ ...prev, businessAddress: e.target.value }));
                              clearTimeout(window.addressTimeout);
                              window.addressTimeout = setTimeout(() => {
                                updateAgentSetting('businessAddress', e.target.value);
                              }, 1000);
                            }}
                            className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200 font-medium"
                            placeholder="Enter your business address"
                          />
        </div>

                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">Website</label>
                          <input
                            type="url"
                            value={agentSettings.website}
                            onChange={(e) => {
                              setAgentSettings(prev => ({ ...prev, website: e.target.value }));
                              clearTimeout(window.websiteTimeout);
                              window.websiteTimeout = setTimeout(() => {
                                updateAgentSetting('website', e.target.value);
                              }, 1000);
                            }}
                            className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200 font-medium"
                            placeholder="https://your-website.com"
                          />
      </div>

                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">Primary Email</label>
                          <input
                            type="email"
                            value={agentSettings.primaryEmail}
                            onChange={(e) => {
                              setAgentSettings(prev => ({ ...prev, primaryEmail: e.target.value }));
                              clearTimeout(window.emailTimeout);
                              window.emailTimeout = setTimeout(() => {
                                updateAgentSetting('primaryEmail', e.target.value);
                              }, 1000);
                            }}
                            className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200 font-medium"
                            placeholder="business@example.com"
                          />
                </div>

                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">Phone Number</label>
                          <input
                            type="tel"
                            value={agentSettings.phoneNumber}
                            disabled
                            className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 text-slate-600 font-medium"
                          />
                          <p className="text-xs text-slate-500 mt-1">Change phone number in Setup</p>
          </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Business Hours Start</label>
                            <input
                              type="time"
                              value={agentSettings.businessHours.start}
                              onChange={(e) => {
                                const newHours = { ...agentSettings.businessHours, start: e.target.value };
                                setAgentSettings(prev => ({ ...prev, businessHours: newHours }));
                                updateAgentSetting('businessHours', newHours);
                              }}
                              className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200 font-medium"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Business Hours End</label>
                            <input
                              type="time"
                              value={agentSettings.businessHours.end}
                              onChange={(e) => {
                                const newHours = { ...agentSettings.businessHours, end: e.target.value };
                                setAgentSettings(prev => ({ ...prev, businessHours: newHours }));
                                updateAgentSetting('businessHours', newHours);
                              }}
                              className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200 font-medium"
                            />
                          </div>
      </div>

                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">Custom Greeting</label>
                          <textarea
                            value={agentSettings.greeting}
                            onChange={(e) => {
                              setAgentSettings(prev => ({ ...prev, greeting: e.target.value }));
                              // Auto-save after 1 second of no typing
                              clearTimeout(window.greetingTimeout);
                              window.greetingTimeout = setTimeout(() => {
                                updateAgentSetting('greeting', e.target.value);
                              }, 1000);
                            }}
                            rows={3}
                            className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200 font-medium"
                            placeholder="Hello! Welcome to our business..."
                          />
                          <p className="text-xs text-slate-500 mt-1">✏️ Auto-saves as you type</p>
                        </div>
                      </div>

                      {/* AI Configuration */}
                      <div className="space-y-6">
                        <h3 className="text-xl font-black text-slate-900 flex items-center">
                          <span className="w-8 h-8 bg-gradient-to-br from-pink-500 to-red-600 rounded-xl flex items-center justify-center text-white mr-3 shadow-lg">🤖</span>
                          AI Configuration
        </h3>

          <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">Selected Voice</label>
                          <select
                            value={agentSettings.selectedVoice || ''}
                            onChange={(e) => updateAgentSetting('selectedVoice', e.target.value)}
                            className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 transition-all duration-200 font-medium"
                          >
                            <option value="">Select a voice...</option>
                            {Array.isArray(availableVoices) && availableVoices.map((voice, index) => (
                              <option key={index} value={voice.name}>
                                {voice.name} ({voice.gender}, {voice.accent})
                              </option>
                            ))}
                          </select>
                          <div className="text-xs text-gray-500 mt-1">
                            Current: "{agentSettings.selectedVoice}" | Available: {availableVoices.map(v => v.name).join(', ')}
            </div>
                          {saving && <p className="text-xs text-blue-500 mt-1">💾 Saving...</p>}
                          {saveMessage && <p className="text-xs text-green-600 mt-1">{saveMessage}</p>}
                          <button
                            onClick={() => {
                              console.log('Manual reload triggered');
                              loadAgentSettings();
                              loadAvailableVoices();
                            }}
                            className="mt-2 text-xs text-blue-600 hover:text-blue-800 underline"
                          >
                            🔄 Reload Settings Data
                          </button>
          </div>

                        <div className="grid grid-cols-3 gap-4">
          <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Tone</label>
                            <select
                              value={agentSettings.tone || ''}
                              onChange={(e) => updateAgentSetting('tone', e.target.value)}
                              className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 transition-all duration-200 font-medium"
                            >
                              <option value="">Select tone...</option>
                              <option value="Professional">Professional</option>
                              <option value="Friendly">Friendly</option>
                              <option value="Casual">Casual</option>
                              <option value="Formal">Formal</option>
                              <option value="Enthusiastic">Enthusiastic</option>
                            </select>
                            <div className="text-xs text-gray-500 mt-1">
                              Current tone: "{agentSettings.tone}"
            </div>
          </div>
          <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Accent</label>
                            <select
                              value={agentSettings.accent || ''}
                              onChange={(e) => updateAgentSetting('accent', e.target.value)}
                              className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 transition-all duration-200 font-medium"
                            >
                              <option value="">Select accent...</option>
                              <option value="American">American</option>
                              <option value="British">British</option>
                              <option value="Australian">Australian</option>
                              <option value="Canadian">Canadian</option>
                              <option value="Irish">Irish</option>
                            </select>
                            <div className="text-xs text-gray-500 mt-1">
                              Current accent: "{agentSettings.accent}"
            </div>
          </div>
          <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Gender</label>
                            <select
                              value={agentSettings.voiceGender || ''}
                              onChange={(e) => updateAgentSetting('voiceGender', e.target.value)}
                              className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 transition-all duration-200 font-medium"
                            >
                              <option value="">Select gender...</option>
                              <option value="male">Male</option>
                              <option value="female">Female</option>
                            </select>
                            <div className="text-xs text-gray-500 mt-1">
                              Current gender: "{agentSettings.voiceGender}"
            </div>
          </div>
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-bold text-slate-700">Departments</label>
                            <button
                              onClick={addDepartment}
                              className="px-3 py-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl text-xs font-bold hover:from-green-600 hover:to-emerald-700 transition-all duration-200 flex items-center"
                            >
                              <span className="mr-1">+</span> Add Department
                            </button>
                          </div>
                          <div className="space-y-3 max-h-64 overflow-y-auto">
                            {Array.isArray(agentSettings.departments) && agentSettings.departments.map((dept, index) => (
                              <div key={index} className="border border-slate-200 rounded-xl p-4 bg-white">
                                <div className="flex items-center justify-between mb-3">
                                  <h4 className="font-bold text-slate-900">Department {index + 1}</h4>
                                  <button
                                    onClick={() => removeDepartment(index)}
                                    className="text-red-500 hover:text-red-700 font-bold text-sm"
                                  >
                                    Remove
                                  </button>
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                  <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">Key</label>
                                    <input
                                      type="text"
                                      value={dept.key || index + 1}
                                      onChange={(e) => updateDepartment(index, 'key', e.target.value)}
                                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:border-pink-500 focus:ring-1 focus:ring-pink-500/20"
                                      placeholder="1"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">Name</label>
                                    <input
                                      type="text"
                                      value={dept.name || ''}
                                      onChange={(e) => updateDepartment(index, 'name', e.target.value)}
                                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:border-pink-500 focus:ring-1 focus:ring-pink-500/20"
                                      placeholder="Department name"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">Voice</label>
                                    <select
                                      value={typeof dept.voice === 'object' ? (dept.voice?.name || '') : (dept.voice || '')}
                                      onChange={(e) => updateDepartment(index, 'voice', e.target.value)}
                                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:border-pink-500 focus:ring-1 focus:ring-pink-500/20"
                                    >
                                      <option value="">Select voice...</option>
                                      {Array.isArray(availableVoices) && availableVoices.map((voice, vIndex) => (
                                        <option key={vIndex} value={voice.name}>
                                          {voice.name}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                </div>
                              </div>
                            ))}
                            {(!Array.isArray(agentSettings.departments) || agentSettings.departments.length === 0) && (
                              <div className="text-center py-8 text-slate-500">
                                <p className="mb-3">No departments configured</p>
                                <button
                                  onClick={addDepartment}
                                  className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-bold hover:from-blue-600 hover:to-indigo-700 transition-all duration-200"
                                >
                                  Add Your First Department
                                </button>
                              </div>
                            )}
        </div>
      </div>

                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-bold text-slate-700">Services</label>
                            <button
                              onClick={addService}
                              className="px-3 py-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl text-xs font-bold hover:from-green-600 hover:to-emerald-700 transition-all duration-200 flex items-center"
                            >
                              <span className="mr-1">+</span> Add Service
                            </button>
                          </div>
                          <div className="space-y-3 max-h-64 overflow-y-auto">
                            {Array.isArray(agentSettings.bookingServices) && agentSettings.bookingServices.map((service, index) => (
                              <div key={index} className="border border-slate-200 rounded-xl p-4 bg-white">
                                <div className="flex items-center justify-between mb-3">
                                  <h4 className="font-bold text-slate-900">Service {index + 1}</h4>
                                  <button
                                    onClick={() => removeService(index)}
                                    className="text-red-500 hover:text-red-700 font-bold text-sm"
                                  >
                                    Remove
                                  </button>
                                </div>
          <div className="space-y-3">
                                  <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">Service Name</label>
                                    <input
                                      type="text"
                                      value={service.name || ''}
                                      onChange={(e) => updateService(index, 'name', e.target.value)}
                                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:border-pink-500 focus:ring-1 focus:ring-pink-500/20"
                                      placeholder="Service name"
                                    />
                  </div>
                                  <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">Duration</label>
                                    <select
                                      value={service.duration || ''}
                                      onChange={(e) => updateService(index, 'duration', e.target.value)}
                                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:border-pink-500 focus:ring-1 focus:ring-pink-500/20"
                                    >
                                      <option value="">Select duration...</option>
                                      <option value="15 minutes">15 minutes</option>
                                      <option value="30 minutes">30 minutes</option>
                                      <option value="45 minutes">45 minutes</option>
                                      <option value="1 hour">1 hour</option>
                                      <option value="1.5 hours">1.5 hours</option>
                                      <option value="2 hours">2 hours</option>
                                    </select>
                </div>
                                  <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">Description</label>
                                    <textarea
                                      value={service.description || ''}
                                      onChange={(e) => updateService(index, 'description', e.target.value)}
                                      rows={2}
                                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:border-pink-500 focus:ring-1 focus:ring-pink-500/20"
                                      placeholder="Service description"
                                    />
          </div>
                                </div>
                              </div>
                            ))}
                            {(!Array.isArray(agentSettings.bookingServices) || agentSettings.bookingServices.length === 0) && (
                              <div className="text-center py-8 text-slate-500">
                                <p className="mb-3">No services configured</p>
                                <button
                                  onClick={addService}
                                  className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-bold hover:from-blue-600 hover:to-indigo-700 transition-all duration-200"
                                >
                                  Add Your First Service
                                </button>
        </div>
      )}
    </div>
                        </div>

            <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">Knowledge Base</label>
                          <textarea
                            value={agentSettings.knowledge}
                            onChange={(e) => {
                              setAgentSettings(prev => ({ ...prev, knowledge: e.target.value }));
                              // Auto-save after 1 second of no typing
                              clearTimeout(window.knowledgeTimeout);
                              window.knowledgeTimeout = setTimeout(() => {
                                updateAgentSetting('knowledge', e.target.value);
                              }, 1000);
                            }}
                            rows={8}
                            className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200 font-medium"
                            placeholder="Describe your business, services, policies, and any information the AI should know..."
                          />
                          <p className="text-xs text-slate-500 mt-1">✏️ Edit directly here - changes save automatically after you stop typing</p>
            </div>
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="bg-gradient-to-r from-slate-50 to-blue-50/50 rounded-2xl p-6">
                      <h3 className="text-lg font-black text-slate-900 mb-4 flex items-center">
                        <span className="mr-2">⚡</span>
                        Quick Actions
                      </h3>
                      <div className="flex flex-wrap gap-4">
              <button
                onClick={onReconfigure}
                          className="group px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-2xl font-bold transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-1 flex items-center"
                        >
                          <span className="mr-2 group-hover:scale-110 transition-transform">🔧</span>
                          Reconfigure Setup
                        </button>
                        <button
                          onClick={() => {
                            loadUserSettings();
                            loadAgentSettings();
                            loadAvailableVoices();
                          }}
                          className="group px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-2xl font-bold transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-1 flex items-center"
                        >
                          <span className="mr-2 group-hover:scale-110 transition-transform">🔄</span>
                          Refresh Data
              </button>
              <button
                onClick={onSignOut}
                          className="group px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-2xl font-bold transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-1 flex items-center"
              >
                          <span className="mr-2 group-hover:scale-110 transition-transform">🚪</span>
                Sign Out
              </button>
            </div>
          </div>

                    {/* Auto-save Status */}
                    <div className="pt-6 border-t border-slate-200 text-center">
                      <div className="flex items-center justify-center space-x-2 text-slate-600">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        <span className="text-sm font-medium">All changes save automatically</span>
                        {saving && <span className="text-blue-600 font-bold">💾 Saving...</span>}
                        {saveMessage && <span className="text-green-600 font-bold">{saveMessage}</span>}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      default:
        return renderOverview();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen fixed left-0 top-0 z-30">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
              <span className="text-white font-semibold text-sm">C</span>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Calladina</h1>
              <p className="text-xs text-gray-500">AI Voice Agent</p>
            </div>
          </div>
        </div>
        
        <nav className="p-4 space-y-1 flex-1">
          {sidebarItems.map((item) => (
            <SidebarItem
              key={item.id}
              item={item}
              isActive={activeSection === item.id}
              onClick={() => setActiveSection(item.id)}
            />
          ))}
        </nav>

        {/* User Info */}
        <div className="p-4 border-t border-gray-200 bg-white">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center mr-3">
              <span className="text-sm font-medium text-gray-600">
                {user?.email?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-900 truncate">
                {user?.displayName || user?.email?.split('@')[0]}
              </div>
              <div className="text-xs text-gray-500 truncate">{user?.email}</div>
            </div>
                <button
              onClick={onSignOut}
              className="p-1 text-gray-400 hover:text-gray-600"
              title="Sign out"
            >
              ⏻
                </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto ml-64 pt-16">
        <main className="p-8">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default Dashboard; 