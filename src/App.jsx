import React, { useState } from 'react';
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
import Modal from './components/Modal';
import { Menu, Lock } from 'lucide-react';
import { useEffect } from 'react';

function App() {
    const {
        isLicensed, activateLicense, settings,
        notifications
    } = useStore();

    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [currentTab, setCurrentTab] = useState('operations');
    const [isMobileShow, setIsMobileShow] = useState(false);
    const [isEndSessionOpen, setIsEndSessionOpen] = useState(false);

    useEffect(() => {
        document.documentElement.lang = settings.language || 'ar';
    }, [settings.language]);

    // Global Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            const isInput = ['INPUT', 'TEXTAREA'].includes(e.target.tagName);

            // Navigation (1-5) - Blocked if typing
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

            // Escape - Works even if typing
            if (e.key === 'Escape') {
                // 1. If End Session modal is explicitly open, close it
                if (isEndSessionOpen) {
                    setIsEndSessionOpen(false);
                    return;
                }

                // 2. If any other modal is open (detected via DOM), ignore (let modal handle it)
                if (document.querySelector('.modal-overlay')) {
                    // However, we must ensure that internal modals also handle ESC even if in input
                    // Modal.jsx listener (Step 399) does not check for input, so it works.
                    return;
                }

                // 3. If in Settings, go back to Operations
                if (currentTab === 'settings') {
                    setCurrentTab('operations');
                } else {
                    // 4. Otherwise, open End Session
                    setIsEndSessionOpen(true);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isEndSessionOpen, currentTab]);

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

    // Global Wrapper to ensure Toast/Confirm are always available
    return (
        <div key={settings.theme} data-theme={settings.theme}>
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
                        onClose={() => setIsEndSessionOpen(false)}
                        onFinish={() => {
                            setIsEndSessionOpen(false);
                            setIsLoggedIn(false);
                        }}
                    />
                </div>
            )}
        </div>
    );
}

export default App;
