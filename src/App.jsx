import React, { useState, useEffect } from 'react';
import { useStore } from './store/StoreContext';
import Sidebar from './components/Sidebar';
import Operations from './views/Operations';
import Storage from './views/Storage';
import Customers from './views/Customers';
import Notifications from './views/Notifications';
import Settings from './views/Settings';
import LicenseScreen from './components/LicenseScreen';
import LoginScreen from './components/LoginScreen';
import EndSessionModal from './components/EndSessionModal';
import Toast from './components/Toast';
import ConfirmDialog from './components/ConfirmDialog';
import AdminAuthModal from './components/AdminAuthModal';
import { Menu } from 'lucide-react';

function App() {
    const {
        isLicensed, activateLicense, settings,
        notifications, checkAppUpdates, activeSessionDate, finishSession
    } = useStore();

    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [currentTab, setCurrentTab] = useState('operations');
    const [isMobileShow, setIsMobileShow] = useState(false);
    const [isEndSessionOpen, setIsEndSessionOpen] = useState(false);
    const [enforcedSessionDate, setEnforcedSessionDate] = useState(null);

    useEffect(() => {
        document.documentElement.lang = settings.language || 'ar';
    }, [settings.language]);

    // Global Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            const isInput = ['INPUT', 'TEXTAREA'].includes(e.target.tagName);

            if (!isInput) {
                switch (e.key) {
                    case '1': handleTabChange('operations'); break;
                    case '2': handleTabChange('storage'); break;
                    case '3': handleTabChange('customers'); break;
                    case '4': handleTabChange('notifications'); break;
                    case '5': handleTabChange('settings'); break;
                    default: break;
                }
            }

            if (e.key === 'Escape') {
                if (isEndSessionOpen) {
                    if (enforcedSessionDate) return; // Prevent closing if enforced
                    setIsEndSessionOpen(false);
                    return;
                }
                if (document.querySelector('.modal-overlay')) {
                    return;
                }
                if (currentTab === 'settings') {
                    setCurrentTab('operations');
                } else {
                    setIsEndSessionOpen(true);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isEndSessionOpen, currentTab]);

    useEffect(() => {
        if (isLoggedIn && settings.autoCheckUpdates && window.electron) {
            checkAppUpdates();
        }
    }, [isLoggedIn, settings.autoCheckUpdates]);

    // Daily Session End Check
    useEffect(() => {
        if (!isLoggedIn) return;

        const checkDate = () => {
            const todayStr = new Date().toISOString().split('T')[0];
            if (activeSessionDate && activeSessionDate !== todayStr) {
                setEnforcedSessionDate(activeSessionDate);
                setIsEndSessionOpen(true);
            }
        };

        checkDate(); // On mount/login
        const interval = setInterval(checkDate, 60000); // Check every minute for day change
        return () => clearInterval(interval);
    }, [isLoggedIn, activeSessionDate]);

    const [updateState, setUpdateState] = useState({ show: false, progress: 0, message: '' });

    useEffect(() => {
        if (window.electron?.onUpdateLog) {
            window.electron.onUpdateLog((msg) => {
                console.log(`[Update Operation] ${msg}`);

                if (msg.includes('Update execution started')) {
                    setUpdateState({ show: true, progress: 0, message: 'بدء التحديث...' });
                } else if (msg.includes('Downloading:')) {
                    const match = msg.match(/(\d+)%/);
                    if (match) {
                        setUpdateState(prev => ({
                            ...prev,
                            show: true,
                            progress: parseInt(match[1]),
                            message: `جاري التحميل... ${match[1]}%`
                        }));
                    }
                } else if (msg.includes('Download complete')) {
                    setUpdateState(prev => ({ ...prev, progress: 100, message: 'اكتمل التحميل!' }));
                } else if (msg.includes('Launching installer')) {
                    setUpdateState(prev => ({ ...prev, message: 'جاري تثبيت التحديث...' }));
                } else if (msg.includes('Error')) {
                    setUpdateState(prev => ({ ...prev, message: `خطأ: ${msg}` }));
                    setTimeout(() => setUpdateState(prev => ({ ...prev, show: false })), 3000);
                }
            });
        }
    }, []);

    const renderTabContent = () => {
        switch (currentTab) {
            case 'operations': return <Operations />;
            case 'storage': return <Storage />;
            case 'customers': return <Customers />;
            case 'notifications': return <Notifications />;
            case 'settings': return <Settings />;
            default: return <Operations />;
        }
    };

    const handleTabChange = (tab) => {
        if (tab === 'settings') {
            window.requestAdminAuth?.(() => {
                setCurrentTab('settings');
                setIsMobileShow(false);
            }, settings.language === 'ar' ? 'تأكيد الهوية للوصول للإعدادات' : 'Identity confirmation to access settings');
            return;
        }
        setCurrentTab(tab);
        setIsMobileShow(false);
    };

    return (
        <div key={settings.theme} data-theme={settings.theme}>
            {updateState.show && (
                <div className="modal-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999 }}>
                    <div className="modal-content" style={{ textAlign: 'center', padding: '2rem', width: '400px', maxWidth: '90%' }}>
                        <h3 style={{ marginBottom: '1rem' }}>تحديث النظام</h3>
                        <p style={{ marginBottom: '1rem' }}>{updateState.message}</p>
                        <div style={{
                            width: '100%', height: '10px', background: 'var(--border)',
                            borderRadius: '5px', overflow: 'hidden'
                        }}>
                            <div style={{
                                width: `${updateState.progress}%`, height: '100%',
                                background: 'var(--primary)', transition: 'width 0.3s ease'
                            }}></div>
                        </div>
                    </div>
                </div>
            )}
            <Toast />
            <ConfirmDialog />
            <AdminAuthModal />

            {!isLicensed() ? (
                <LicenseScreen onActivate={async (code, name) => {
                    const valid = await activateLicense(code, name);
                    if (valid) {
                        window.showToast?.(settings.language === 'ar' ? 'تم تنشيط النظام بنجاح' : 'System activated successfully', 'success');
                    } else {
                        window.showToast?.(settings.language === 'ar' ? 'كود التنشيط غير صحيح!' : 'Invalid activation code!', 'danger');
                    }
                }} />
            ) : !isLoggedIn ? (
                <LoginScreen onLogin={(pass) => {
                    if (pass === settings.loginPassword) {
                        setIsLoggedIn(true);
                        window.showToast?.(settings.language === 'ar' ? 'تم تسجيل الدخول بنجاح' : 'Logged in successfully', 'success');
                    } else {
                        window.showToast?.(settings.language === 'ar' ? 'كلمة مرور غير صحيحة!' : 'Incorrect password!', 'danger');
                    }
                }} />
            ) : (
                <div className="app-container">
                    <button
                        id="mobile-menu-toggle"
                        className="btn btn-primary"
                        style={{
                            display: 'none',
                            position: 'fixed',
                            bottom: '1.5rem',
                            left: '1.5rem',
                            zIndex: 10002,
                            borderRadius: '50%',
                            width: '60px',
                            height: '60px',
                            boxShadow: 'var(--shadow-lg)'
                        }}
                        onClick={() => setIsMobileShow(!isMobileShow)}
                    >
                        <Menu size={24} />
                    </button>

                    <div
                        className={`mobile-overlay ${isMobileShow ? 'show' : ''}`}
                        onClick={() => setIsMobileShow(false)}
                    ></div>

                    <Sidebar
                        currentTab={currentTab}
                        setTab={handleTabChange}
                        onLogout={() => setIsEndSessionOpen(true)}
                        notificationsCount={notifications.length}
                        isMobileShow={isMobileShow}
                    />

                    <main className="main-content">
                        {renderTabContent()}
                    </main>

                    <EndSessionModal
                        isOpen={isEndSessionOpen}
                        sessionDate={enforcedSessionDate}
                        onClose={() => {
                            if (!enforcedSessionDate) setIsEndSessionOpen(false);
                        }}
                        onFinish={() => {
                            finishSession();
                            setIsEndSessionOpen(false);
                            setEnforcedSessionDate(null);
                            setIsLoggedIn(false);
                        }}
                    />
                </div>
            )}
        </div>
    );
}

export default App;
