import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';

const Dashboard = ({ onReconfigure, onSignOut }) => {
  const [user] = useAuthState(auth);
  const [setupData, setSetupData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mr-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">127</div>
              <div className="text-sm text-gray-600">Total Calls</div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center mr-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">45</div>
              <div className="text-sm text-gray-600">Bookings Made</div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center mr-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">18</div>
              <div className="text-sm text-gray-600">Transfers</div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-orange-600 rounded-lg flex items-center justify-center mr-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2-2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">97%</div>
              <div className="text-sm text-gray-600">Success Rate</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-4">
            {[
              { time: '2 minutes ago', action: 'New booking scheduled', details: 'Consultation with John Smith for 2:30 PM' },
              { time: '15 minutes ago', action: 'Call transferred to Sales', details: 'Caller interested in premium package' },
              { time: '1 hour ago', action: 'Voicemail received', details: 'Customer inquiry about pricing' },
              { time: '2 hours ago', action: 'Booking confirmed', details: 'Follow-up appointment with Sarah Wilson' }
            ].map((activity, index) => (
              <div key={index} className="flex items-start p-3 bg-gray-50 rounded-lg">
                <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">{activity.action}</div>
                  <div className="text-xs text-gray-600 mt-1">{activity.details}</div>
                  <div className="text-xs text-gray-500 mt-1">{activity.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-medium text-sm transition-all duration-200 shadow-sm hover:shadow-md">
              View Call History
            </button>
            <button className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg font-medium text-sm transition-all duration-200 shadow-sm hover:shadow-md">
              Manage Bookings
            </button>
            <button className="w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded-lg font-medium text-sm transition-all duration-200 shadow-sm hover:shadow-md">
              Update Voice Settings
            </button>
            <button 
              onClick={onReconfigure}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white px-4 py-3 rounded-lg font-medium text-sm transition-all duration-200 shadow-sm hover:shadow-md"
            >
              Reconfigure Setup
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderConfiguration = () => (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <span className="mr-2">🏢</span>
          Business Details
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
            <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-900">
              {setupData?.formData?.businessName || 'Not set'}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
            <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-900">
              {setupData?.formData?.industry || 'Not set'}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
            <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-900">
              {setupData?.formData?.selectedPhoneNumber || setupData?.formData?.phoneNumber || 'Not set'}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Primary Email</label>
            <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-900">
              {setupData?.formData?.primaryEmail || 'Not set'}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <span className="mr-2">🕐</span>
          Business Hours
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => (
            <div key={day}>
              <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">{day}</label>
              <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-900">
                {setupData?.formData?.[`${day}Hours`] || 'Closed'}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <span className="mr-2">👥</span>
          Departments & Call Routing
        </h3>
        {setupData?.formData?.departments?.length > 0 ? (
          <div className="space-y-3">
            {setupData.formData.departments.map((dept, index) => (
              dept.name && (
                <div key={index} className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm font-medium text-gray-900">{dept.name}</div>
                  <div className="text-xs text-gray-600">Extension: {dept.extension || 'Not set'}</div>
                </div>
              )
            ))}
          </div>
        ) : (
          <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-600">No departments configured</div>
        )}
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <span className="mr-2">🔊</span>
          Voice Settings
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tone</label>
            <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-900 capitalize">
              {setupData?.formData?.tone || 'Not set'}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
            <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-900 capitalize">
              {setupData?.formData?.voiceGender || 'Not set'}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Accent</label>
            <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-900">
              {setupData?.formData?.accent || 'Not set'}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Languages</label>
            <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-900">
              {setupData?.formData?.languageList || 'English only'}
            </div>
          </div>
        </div>
      </div>

      {setupData?.formData?.bookingServices?.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <span className="mr-2">📅</span>
            Booking Services
          </h3>
          <div className="space-y-3">
            {setupData.formData.bookingServices.map((service, index) => (
              service.name && (
                <div key={index} className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm font-medium text-gray-900">{service.name}</div>
                  <div className="text-xs text-gray-600">
                    Duration: {service.duration || 'Not set'}
                    {service.description && ` • ${service.description}`}
                  </div>
                </div>
              )
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const tabs = [
    { id: 'overview', name: 'Overview', icon: '📊' },
    { id: 'configuration', name: 'Configuration', icon: '⚙️' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">AI Receptionist Dashboard</h1>
              <p className="text-gray-600 mt-1">
                Welcome back, {user?.displayName || user?.email}
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={onReconfigure}
                className="bg-white text-gray-700 px-6 py-3 rounded-lg border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 font-medium"
              >
                Reconfigure
              </button>
              <button
                onClick={onSignOut}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all duration-200 font-medium shadow-sm hover:shadow-md"
              >
                Sign Out
              </button>
            </div>
          </div>

          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'configuration' && renderConfiguration()}
      </div>
    </div>
  );
};

export default Dashboard; 