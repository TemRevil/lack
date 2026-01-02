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
import { Menu, Download } from 'lucide-react';

function App() {
    const {
        isLicensed, activateLicense, settings,
        notifications, checkAppUpdates, activeSessionDate, finishSession,
        updateState, downloadUpdate, downloadRollback, clearUpdateState
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
                <div className="modal-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }}>
                    <div className="modal-content" style={{
                        textAlign: 'center',
                        padding: '2.5rem',
                        width: '450px',
                        maxWidth: '90%',
                        background: 'var(--bg-glass-modal)',
                        border: '1px solid var(--border-color)',
                        boxShadow: 'var(--shadow-xl)',
                        borderRadius: 'var(--radius-xl)'
                    }}>
                        <div style={{ marginBottom: '1.5rem', color: 'var(--accent-color)' }}>
                            <Download size={48} className={updateState.downloading ? "spin-slow" : ""} />
                        </div>
                        <h3 style={{ marginBottom: '0.75rem', fontWeight: 800 }}>
                            {updateState.isRollback
                                ? (settings.language === 'ar' ? 'الرجوع لإصدار سابق' : 'Version Rollback')
                                : (settings.language === 'ar' ? 'تحديث النظام' : 'System Update')}
                        </h3>
                        <p style={{ marginBottom: '1.5rem', fontSize: '1rem', opacity: 0.8 }}>{updateState.message}</p>

                        {updateState.downloading || updateState.downloaded ? (
                            <>
                                <div style={{
                                    width: '100%', height: '12px', background: 'var(--bg-input)',
                                    borderRadius: 'var(--radius-pill)', overflow: 'hidden',
                                    border: '1px solid var(--border-color)'
                                }}>
                                    <div style={{
                                        width: `${updateState.progress}%`, height: '100%',
                                        background: 'linear-gradient(90deg, var(--accent-color), #60a5fa)',
                                        transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                                        boxShadow: '0 0 10px rgba(59, 130, 246, 0.4)'
                                    }}></div>
                                </div>
                                <div style={{ marginTop: '0.75rem', fontSize: '0.85rem', fontWeight: 700, opacity: 0.6 }}>
                                    {updateState.progress}%
                                </div>
                            </>
                        ) : (
                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1rem' }}>
                                <button
                                    className="btn btn-primary"
                                    onClick={() => {
                                        if (updateState.isRollback) {
                                            // Rolling back is usually handled by the specific button in Settings,
                                            // which calls downloadRollback directly.
                                        } else {
                                            downloadUpdate?.();
                                        }
                                    }}
                                >
                                    {settings.language === 'ar' ? 'تحديث الآن' : 'Update Now'}
                                </button>
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => clearUpdateState?.()}
                                >
                                    {settings.language === 'ar' ? 'لاحقاً' : 'Later'}
                                </button>
                            </div>
                        )}
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
