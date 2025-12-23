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
        notifications, checkAppUpdates
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

    useEffect(() => {
        if (window.electron?.onUpdateLog) {
            window.electron.onUpdateLog((msg) => {
                console.log(`[Update Operation] ${msg}`);
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
