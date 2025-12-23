import React, { useContext, useState } from 'react';
import {
    Settings as SettingsIcon, Moon, Sun, Download,
    Upload, FileText, Lock, ShieldAlert, Globe, Eye, EyeOff, Key,
    UserCheck, FileBarChart, Palette, Save, Printer, ShieldCheck
} from 'lucide-react';
import { StoreContext } from '../store/StoreContext';

const LicenseSection = ({ settings, setData, t, licenseData }) => (
    <section className="settings-section-card" style={{ padding: '1.5rem', width: '100%', maxWidth: '600px', margin: '0 auto' }}>
        <header className="settings-section-header" style={{ marginBottom: '1.5rem', paddingBottom: '1rem' }}>
            <div className="settings-section-icon security" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success-color)', width: '40px', height: '40px' }}>
                <ShieldCheck size={20} />
            </div>
            <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{t('license')}</h3>
            </div>
        </header>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="settings-item-row" style={{ cursor: 'default', padding: '0.75rem' }}>
                <div>
                    <span className="settings-item-label">{t('activationStatus')}</span>
                    <span className="settings-item-subtext" style={{ color: 'var(--success-color)', fontWeight: 700 }}>{t('activated')}</span>
                </div>
                <div style={{ color: 'var(--success-color)' }}>
                    <ShieldCheck size={20} />
                </div>
            </div>

            {licenseData && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', background: 'rgba(59, 130, 246, 0.05)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px dashed rgba(59, 130, 246, 0.2)' }}>
                    <div style={{ borderBottom: '1px solid rgba(59, 130, 246, 0.1)', paddingBottom: '0.75rem', marginBottom: '0.25rem' }}>
                        <span style={{ fontSize: '0.75rem', opacity: 0.6, display: 'block', marginBottom: '0.2rem' }}>{t('licensedTo')}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontWeight: 800, fontSize: '1.05rem', color: 'var(--accent-color)' }}>
                            <UserCheck size={18} />
                            {licenseData.LicensedTo || '---'}
                        </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <span style={{ fontSize: '0.75rem', opacity: 0.6, display: 'block', marginBottom: '0.2rem' }}>{t('activationDate')}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, fontSize: '0.9rem' }}>
                                <FileBarChart size={14} opacity={0.6} />
                                {licenseData.Date || '---'}
                            </div>
                        </div>
                        <div>
                            <span style={{ fontSize: '0.75rem', opacity: 0.6, display: 'block', marginBottom: '0.2rem' }}>{t('activationTime')}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, fontSize: '0.9rem' }}>
                                <Palette size={14} opacity={0.6} />
                                {licenseData.Time || '---'}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="password-box" style={{ padding: '1rem' }}>
                <div className="password-box-header" style={{ marginBottom: '0.5rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{t('activationKey')}</span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                        type="text"
                        readOnly
                        value={(() => {
                            if (!settings.license) return 'XXXX-XXXX-XXXX-XXXX';
                            const key = settings.license;
                            let masked = '';
                            let seen = 0;
                            for (let i = key.length - 1; i >= 0; i--) {
                                if (key[i] === '-') {
                                    masked = '-' + masked;
                                } else if (seen < 4) {
                                    masked = key[i] + masked;
                                    seen++;
                                } else {
                                    masked = '*' + masked;
                                }
                            }
                            return masked;
                        })()}
                        style={{
                            flex: 1,
                            background: 'var(--bg-body)',
                            textAlign: 'center',
                            fontFamily: 'monospace',
                            letterSpacing: '2px',
                            fontWeight: 700,
                            borderRadius: 'var(--radius-md)',
                            padding: '0.6rem'
                        }}
                    />
                    <button
                        className="btn btn-primary"
                        style={{ borderRadius: 'var(--radius-md)', padding: '0.6rem 1rem' }}
                        onClick={() => {
                            window.customConfirm?.(t('change'), t('changeKeyConfirm'), () => {
                                setData(prev => ({
                                    ...prev,
                                    settings: { ...prev.settings, license: null }
                                }));
                                window.location.reload();
                            });
                        }}
                    >
                        {t('change')}
                    </button>
                </div>
            </div>
        </div>
    </section>
);

const Settings = () => {
    const {
        settings, toggleTheme, updateReceiptSettings,
        exportData, importData, setData, data, t, licenseData
    } = useContext(StoreContext);

    const [activeTab, setActiveTab] = useState('general');
    const [appVersion, setAppVersion] = useState('1.0.0');

    React.useEffect(() => {
        if (window.electron?.getAppVersion) {
            window.electron.getAppVersion().then(v => setAppVersion(v));
        }

        if (window.electron?.onUpdateMessage) {
            window.electron.onUpdateMessage(() => {
                window.showToast?.(t('updateAvailable'), 'info');
            });
        }

        if (window.electron?.onUpdateDownloaded) {
            window.electron.onUpdateDownloaded(() => {
                window.showToast?.(t('updateDownloaded'), 'success');
            });
        }
    }, [t]);

    const handleReceiptUpdate = (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const receipt = {
            title: fd.get('title'),
            address: fd.get('address'),
            phone: fd.get('phone'),
            footer: fd.get('footer')
        };
        updateReceiptSettings(receipt);
        window.showToast?.(settings.language === 'ar' ? 'تم حفظ إعدادات الوصل' : 'Receipt settings saved', 'success');
    };

    const handlePasswordUpdate = (type, e) => {
        e.preventDefault();
        const pass = new FormData(e.target).get('password');
        setData(prev => ({
            ...prev,
            settings: { ...prev.settings, [type]: pass }
        }));
        e.target.reset();
        window.showToast?.(settings.language === 'ar' ? 'تم تغيير كلمة المرور بنجاح' : 'Password changed successfully', 'success');
    };

    const toggleSecurity = (key) => {
        setData(prev => ({
            ...prev,
            settings: {
                ...prev.settings,
                security: {
                    ...(prev?.settings?.security || {}),
                    [key]: !(prev?.settings?.security?.[key] ?? false)
                }
            }
        }));
    };

    const SecurityCheckbox = ({ label, subtext, settingKey }) => {
        const isActive = settings?.security?.[settingKey] ?? false;
        return (
            <div className="settings-item-row" onClick={() => toggleSecurity(settingKey)}>
                <div>
                    <span className="settings-item-label">{label}</span>
                    {subtext && <span className="settings-item-subtext">{subtext}</span>}
                </div>
                <div className={`toggle-switch ${isActive ? 'active' : ''}`}>
                    <div className="toggle-knob" />
                </div>
            </div>
        );
    };

    const onImport = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (re) => {
            if (importData(re.target.result)) {
                window.showToast?.(settings.language === 'ar' ? 'تم استعادة البيانات بنجاح' : 'Data restored successfully', 'success');
                setTimeout(() => window.location.reload(), 1000);
            } else {
                window.showToast?.(settings.language === 'ar' ? 'فشل في استيراد الملف' : 'Failed to import file', 'danger');
            }
        };
        reader.readAsText(file);
    };

    const setLanguage = (lang) => {
        setData(prev => ({
            ...prev,
            settings: { ...prev.settings, language: lang }
        }));
    };

    const tabs = [
        { id: 'general', label: t('language') + ' & ' + t('darkMode'), icon: <Palette size={20} /> },
        { id: 'security', label: t('securityPermissions'), icon: <ShieldAlert size={20} /> },
        { id: 'receipt', label: t('receiptSettings'), icon: <FileText size={20} /> },
        { id: 'data', label: t('backupAndDisplay'), icon: <Save size={20} /> },
        { id: 'license', label: t('license'), icon: <ShieldCheck size={20} /> },
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'general':
                return (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                        <section className="settings-section-card" style={{ padding: '1.5rem' }}>
                            <header className="settings-section-header" style={{ marginBottom: '1.5rem', paddingBottom: '1rem' }}>
                                <div className="settings-section-icon appearance" style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-color)', width: '40px', height: '40px' }}>
                                    <Globe size={20} />
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{t('language')}</h3>
                                </div>
                            </header>
                            <div className="settings-button-grid">
                                <button
                                    className={`btn ${settings.language === 'ar' ? 'btn-primary' : 'btn-secondary'}`}
                                    onClick={() => setLanguage('ar')}
                                    style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)' }}
                                >
                                    العربية
                                </button>
                                <button
                                    className={`btn ${settings.language === 'en' ? 'btn-primary' : 'btn-secondary'}`}
                                    onClick={() => setLanguage('en')}
                                    style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)' }}
                                >
                                    English
                                </button>
                            </div>
                        </section>

                        <section className="settings-section-card" style={{ padding: '1.5rem' }}>
                            <header className="settings-section-header" style={{ marginBottom: '1.5rem', paddingBottom: '1rem' }}>
                                <div className="settings-section-icon appearance" style={{ width: '40px', height: '40px' }}>
                                    {settings.theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{t('theme')}</h3>
                                </div>
                            </header>
                            <div className="settings-item-row" onClick={toggleTheme} style={{ padding: '0.75rem', marginBottom: '0.5rem' }}>
                                <div>
                                    <span className="settings-item-label">{settings.language === 'ar' ? 'الوضع الليلي' : 'Dark Mode'}</span>
                                </div>
                                <div className={`toggle-switch ${settings.theme === 'dark' ? 'active' : ''}`}>
                                    <div className="toggle-knob" />
                                </div>
                            </div>
                            <div className="settings-item-row" onClick={() => toggleSecurity('showSessionBalance')} style={{ padding: '0.75rem' }}>
                                <div>
                                    <span className="settings-item-label">{settings.language === 'ar' ? 'إظهار الرصيد اليومي' : 'Show Daily Balance'}</span>
                                </div>
                                <div className={`toggle-switch ${settings?.security?.showSessionBalance ? 'active' : ''}`}>
                                    <div className="toggle-knob" />
                                </div>
                            </div>
                        </section>

                        <section className="settings-section-card" style={{ padding: '1.5rem' }}>
                            <header className="settings-section-header" style={{ marginBottom: '1.5rem', paddingBottom: '1rem' }}>
                                <div className="settings-section-icon security" style={{ background: 'rgba(139, 92, 246, 0.1)', color: 'var(--accent-color)', width: '40px', height: '40px' }}>
                                    <Download size={20} />
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{t('checkForUpdates')}</h3>
                                </div>
                            </header>
                            <div className="settings-item-row" onClick={() => {
                                setData(prev => ({
                                    ...prev,
                                    settings: { ...prev.settings, autoCheckUpdates: !prev.settings.autoCheckUpdates }
                                }));
                            }} style={{ padding: '0.75rem', marginBottom: '1rem' }}>
                                <div>
                                    <span className="settings-item-label">{t('autoCheckUpdates')}</span>
                                </div>
                                <div className={`toggle-switch ${settings.autoCheckUpdates ? 'active' : ''}`}>
                                    <div className="toggle-knob" />
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <div style={{ fontSize: '0.85rem', opacity: 0.7, marginBottom: '0.25rem' }}>
                                    {t('systemVersion')}: <strong style={{ color: 'var(--accent-color)' }}>v{appVersion}</strong>
                                </div>
                                <button
                                    className="btn btn-primary"
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                                    onClick={() => {
                                        if (window.electron?.checkForUpdates) {
                                            window.electron.checkForUpdates();
                                            window.showToast?.(settings.language === 'ar' ? 'جاري البحث عن تحديثات...' : 'Checking for updates...', 'info');
                                        }
                                    }}
                                >
                                    <Download size={18} />
                                    {t('checkForUpdates')}
                                </button>
                            </div>
                        </section>
                    </div>
                );
            case 'security':
                return (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
                        <section className="settings-section-card" style={{ padding: '1.5rem' }}>
                            <header className="settings-section-header" style={{ marginBottom: '1.5rem', paddingBottom: '1rem' }}>
                                <div className="settings-section-icon security" style={{ width: '40px', height: '40px' }}>
                                    <ShieldAlert size={20} />
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{t('securityPermissions')}</h3>
                                </div>
                            </header>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                <div className="settings-item-subtext" style={{ fontWeight: 800, color: 'var(--accent-color)', marginBottom: '0.25rem', fontSize: '0.8rem' }}>{settings.language === 'ar' ? 'العمليات الأساسية' : 'Core Operations'}</div>
                                <SecurityCheckbox label={t('deleteOperations')} settingKey="authOnDeleteOperation" />
                                <SecurityCheckbox label={t('addOperations')} settingKey="authOnAddOperation" />

                                <div className="settings-item-subtext" style={{ fontWeight: 800, color: 'var(--accent-color)', marginTop: '0.75rem', marginBottom: '0.25rem', fontSize: '0.8rem' }}>{settings.language === 'ar' ? 'إدارة المخزن' : 'Storage Management'}</div>
                                <SecurityCheckbox label={t('deletePart')} settingKey="authOnDeletePart" />
                                <SecurityCheckbox label={t('addPart')} settingKey="authOnAddPart" />
                                <SecurityCheckbox label={t('editPart')} settingKey="authOnUpdatePart" />

                                <div className="settings-item-subtext" style={{ fontWeight: 800, color: 'var(--accent-color)', marginTop: '0.75rem', marginBottom: '0.25rem', fontSize: '0.8rem' }}>{settings.language === 'ar' ? 'العملاء والمالية' : 'Customers & Finance'}</div>
                                <SecurityCheckbox label={t('deleteCustomer')} settingKey="authOnDeleteCustomer" />
                                <SecurityCheckbox label={t('addTransaction')} settingKey="authOnAddTransaction" />
                                <SecurityCheckbox label={t('deleteTransaction')} settingKey="authOnDeleteTransaction" />
                            </div>
                        </section>

                        <section className="settings-section-card" style={{ padding: '1.5rem' }}>
                            <header className="settings-section-header" style={{ marginBottom: '1.5rem', paddingBottom: '1rem' }}>
                                <div className="settings-section-icon auth" style={{ width: '40px', height: '40px' }}>
                                    <Key size={20} />
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{t('passwords')}</h3>
                                </div>
                            </header>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div className="password-box" style={{ padding: '1rem' }}>
                                    <div className="password-box-header" style={{ marginBottom: '0.5rem' }}>
                                        <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{t('systemPassword')}</span>
                                        <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>{t('current')}: <code style={{ color: 'var(--accent-color)' }}>{settings.loginPassword}</code></span>
                                    </div>
                                    <form onSubmit={(e) => handlePasswordUpdate('loginPassword', e)} style={{ display: 'flex', gap: '0.5rem' }}>
                                        <input type="text" name="password" placeholder={settings.language === 'ar' ? 'جديدة...' : 'New...'} required style={{ padding: '0.5rem 0.75rem', fontSize: '0.9rem' }} />
                                        <button type="submit" className="btn btn-primary" style={{ borderRadius: 'var(--radius-md)', padding: '0.5rem 1rem' }}>{t('change')}</button>
                                    </form>
                                </div>

                                <div className="password-box" style={{ padding: '1rem' }}>
                                    <div className="password-box-header" style={{ marginBottom: '0.5rem' }}>
                                        <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{t('adminPassword')}</span>
                                        <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>{t('current')}: <code style={{ color: 'var(--accent-color)' }}>{settings.adminPassword}</code></span>
                                    </div>
                                    <form onSubmit={(e) => handlePasswordUpdate('adminPassword', e)} style={{ display: 'flex', gap: '0.5rem' }}>
                                        <input type="text" name="password" placeholder={settings.language === 'ar' ? 'جديدة...' : 'New...'} required style={{ padding: '0.5rem 0.75rem', fontSize: '0.9rem' }} />
                                        <button type="submit" className="btn btn-primary" style={{ borderRadius: 'var(--radius-md)', padding: '0.5rem 1rem' }}>{t('change')}</button>
                                    </form>
                                </div>
                            </div>
                        </section>
                    </div>
                );
            case 'receipt':
                return (
                    <section className="settings-section-card" style={{ padding: '1.5rem', maxWidth: '600px', margin: '0 auto' }}>
                        <header className="settings-section-header" style={{ marginBottom: '1.5rem', paddingBottom: '1rem' }}>
                            <div className="settings-section-icon receipt" style={{ width: '40px', height: '40px' }}>
                                <FileBarChart size={20} />
                            </div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{t('receiptSettings')}</h3>
                            </div>
                        </header>

                        <form onSubmit={handleReceiptUpdate}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label style={{ fontSize: '0.85rem' }}>{t('businessName')}</label>
                                    <input type="text" name="title" defaultValue={settings.receipt.title || ''} required style={{ padding: '0.5rem 0.75rem' }} />
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label style={{ fontSize: '0.85rem' }}>{t('detailedAddress')}</label>
                                    <input type="text" name="address" defaultValue={settings.receipt.address || ''} style={{ padding: '0.5rem 0.75rem' }} />
                                </div>
                                <div className="settings-button-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label style={{ fontSize: '0.85rem' }}>{t('phone')}</label>
                                        <input type="text" name="phone" defaultValue={settings.receipt.phone || ''} style={{ padding: '0.5rem 0.75rem' }} />
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label style={{ fontSize: '0.85rem' }}>{t('receiptFooter')}</label>
                                        <input type="text" name="footer" defaultValue={settings.receipt.footer || ''} style={{ padding: '0.5rem 0.75rem' }} />
                                    </div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.25rem' }}>
                                <button type="submit" className="btn btn-primary" style={{ padding: '0.6rem 1.25rem', flex: 1 }}>
                                    <Save size={16} /> {t('save')}
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-secondary receipt-preview-btn"
                                    style={{ padding: '0.6rem 1rem' }}
                                    onClick={() => {
                                        const mockOp = {
                                            id: 'PREVIEW',
                                            timestamp: new Date().toISOString(),
                                            customerName: 'Customer Preview',
                                            partName: 'Part Preview',
                                            quantity: 2,
                                            price: 1500,
                                            paidAmount: 1000,
                                            paymentStatus: 'partial'
                                        };
                                        import('../utils/printing').then(m => m.printReceipt(mockOp, settings));
                                    }}
                                >
                                    <Printer size={16} /> {t('preview')}
                                </button>
                            </div>
                        </form>
                    </section>
                );
            case 'data':
                return (
                    <section className="settings-section-card" style={{ padding: '1.5rem', maxWidth: '600px', margin: '0 auto' }}>
                        <header className="settings-section-header" style={{ marginBottom: '1.5rem', paddingBottom: '1rem' }}>
                            <div className="settings-section-icon appearance" style={{ width: '40px', height: '40px' }}>
                                <Save size={20} />
                            </div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{t('backupAndDisplay')}</h3>
                            </div>
                        </header>

                        <div className="settings-button-grid" style={{ marginTop: '0.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <button className="btn btn-secondary shadow-sm" style={{ padding: '1.25rem', borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', height: '120px' }} onClick={() => {
                                const now = new Date();
                                const blob = new Blob([exportData()], { type: 'text/plain' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `backup_${now.toISOString().split('T')[0]}.txt`;
                                a.click();
                                window.showToast?.(settings.language === 'ar' ? 'جاري تصدير البيانات...' : 'Exporting data...', 'success');
                            }}>
                                <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '0.75rem', borderRadius: '50%', color: 'var(--accent-color)' }}><Download size={24} /></div>
                                <span style={{ fontWeight: 700 }}>{t('exportData')}</span>
                            </button>

                            <label className="btn btn-secondary shadow-sm" style={{ padding: '1.25rem', borderRadius: 'var(--radius-lg)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', height: '120px' }}>
                                <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '0.75rem', borderRadius: '50%', color: 'var(--success-color)' }}><Upload size={24} /></div>
                                <span style={{ fontWeight: 700 }}>{t('importData')}</span>
                                <input type="file" hidden onChange={onImport} />
                            </label>
                        </div>
                    </section>
                );
            case 'license':
                return <LicenseSection settings={settings} setData={setData} t={t} licenseData={licenseData} />;
            default:
                return null;
        }
    };

    // Scroll active tab into view
    React.useEffect(() => {
        const activeBtn = document.querySelector(`.settings-tab-btn-${activeTab}`);
        if (activeBtn) {
            activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
    }, [activeTab]);

    const handleTabWheel = (e) => {
        // Allow horizontal scroll if it's a trackpad (deltaX present) logic?
        // But user asked "scroll between settings sections", implying switching.

        // Simple throttle/threshold
        if (Math.abs(e.deltaY) < 10 && Math.abs(e.deltaX) < 10) return;

        const dir = (e.deltaY > 0 || e.deltaX > 0) ? 1 : -1;
        const currentIndex = tabs.findIndex(t => t.id === activeTab);
        const nextIndex = Math.max(0, Math.min(tabs.length - 1, currentIndex + dir));

        if (nextIndex !== currentIndex) {
            setActiveTab(tabs[nextIndex].id);
        }
    };

    return (
        <div className="view-container">
            <header className="view-header">
                <div className="view-title">
                    <div className="view-icon">
                        <SettingsIcon size={24} />
                    </div>
                    <div>
                        <h1>{t('settings')}</h1>
                        <p>{settings.language === 'ar' ? 'إدارة إعدادات النظام' : 'Manage system settings'}</p>
                    </div>
                </div>
            </header>

            <div className="settings-view" style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1.5rem',
                height: 'calc(100% - 80px)',
                overflow: 'hidden'
            }}>
                {/* Horizontal Tabs Navigation */}
                <div
                    className="settings-tabs-container"
                    onWheel={handleTabWheel}
                    style={{
                        display: 'flex',
                        gap: '0.75rem',
                        overflowX: 'auto',
                        padding: '0 0.25rem 0.5rem 0.25rem',
                        flexShrink: 0,
                        borderBottom: '1px solid var(--border-color)',
                        scrollbarWidth: 'none',  /* Firefox */
                        msOverflowStyle: 'none'  /* IE 10+ */
                    }}>
                    <style>{`
                        .settings-tabs-container::-webkit-scrollbar { display: none; }
                    `}</style>
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            className={`btn settings-tab-btn-${tab.id} ${activeTab === tab.id ? 'btn-primary' : 'btn-ghost'}`}
                            onClick={() => setActiveTab(tab.id)}
                            style={{
                                whiteSpace: 'nowrap',
                                gap: '0.5rem',
                                padding: '0.75rem 1.25rem',
                                opacity: activeTab === tab.id ? 1 : 0.7,
                                fontWeight: activeTab === tab.id ? 700 : 500,
                                borderRadius: 'var(--radius-pill)',
                                flexShrink: 0,
                                border: activeTab === tab.id ? 'none' : '1px solid transparent'
                            }}
                        >
                            {tab.icon}
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </div>

                {/* Main Content Area */}
                <main className="settings-content" style={{ flex: 1, overflowY: 'auto', paddingRight: '0.5rem', width: '100%' }}>
                    {renderContent()}
                </main>

                {/* App Version Info */}
                <div style={{
                    textAlign: 'center',
                    padding: '1rem',
                    fontSize: 'var(--fs-xs)',
                    color: 'var(--text-secondary)',
                    opacity: 0.6,
                    borderTop: '1px solid var(--border-color)',
                    marginTop: 'auto'
                }}>
                    {settings.language === 'ar' ? 'إصدار النظام' : 'Gunter Management System'} v{appVersion}
                </div>
            </div>
        </div>
    );
};
export default Settings;
