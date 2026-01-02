import React, { useContext, useState } from 'react';
import {
    Settings as SettingsIcon, Moon, Sun, Download,
    Upload, FileText, Lock, ShieldAlert, Globe, Eye, EyeOff, Key,
    UserCheck, FileBarChart, Palette, Save, Printer, ShieldCheck, Phone, Plus, Trash2, History, RotateCcw
} from 'lucide-react';
import { StoreContext } from '../store/StoreContext';
import { printReceipt } from '../utils/printing';

const LicenseSection = ({ settings, setData, t, licenseData, checkLicenseConnection }) => {
    const [checking, setChecking] = useState(false);

    const handleCheck = async () => {
        setChecking(true);
        try {
            const isValid = await checkLicenseConnection();
            if (isValid) {
                window.showToast?.(t('activated'), 'success');
            } else {
                window.showToast?.(t('licenseWarning'), 'danger');
            }
        } catch (error) {
            window.showToast?.(t('licenseWarning'), 'danger');
        } finally {
            setChecking(false);
        }
    };

    return (
        <section className="settings-section-card" style={{ padding: '1.5rem', width: '100%', maxWidth: '600px', margin: '0 auto' }}>
            <header className="settings-section-header" style={{ marginBottom: '1.5rem', paddingBottom: '1rem' }}>
                <div className="settings-section-icon security" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success-color)', width: '40px', height: '40px' }}>
                    <ShieldCheck size={20} />
                </div>
                <div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{t('activation')}</h3>
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
                            className={`btn ${checking ? 'btn-secondary' : 'btn-primary'}`}
                            style={{ borderRadius: 'var(--radius-md)', padding: '0.6rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                            onClick={handleCheck}
                            disabled={checking}
                        >
                            <RotateCcw size={16} className={checking ? 'spin' : ''} />
                            {t('checkConnection')}
                        </button>
                        <button
                            className="btn btn-secondary"
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

                <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem' }}>
                    <a
                        href={`https://wa.me/201001308280?text=${encodeURIComponent(t('whatsappMessage'))}`}
                        onClick={(e) => {
                            const url = `https://wa.me/201001308280?text=${encodeURIComponent(t('whatsappMessage'))}`;
                            if (window.electron?.openExternal) {
                                e.preventDefault();
                                window.electron.openExternal(url);
                            }
                        }}
                        className="btn btn-secondary"
                        style={{ borderRadius: 'var(--radius-md)', padding: '0.6rem 1rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                        target="_blank" rel="noreferrer noopener"
                    >
                        <Phone size={16} />
                        <span>{t('callUs')}</span>
                    </a>
                </div>

            </div>
        </section>
    );
};

const Settings = () => {
    const {
        settings, toggleTheme, updateReceiptSettings,
        exportData, importData, setData, data, t, licenseData,
        checkAppUpdates, updateState, downloadUpdate, installUpdate, clearUpdateState,
        checkLicenseConnection
    } = useContext(StoreContext);

    const [activeTab, setActiveTab] = useState('general');
    const [appVersion, setAppVersion] = useState('1.0.0');
    const [releases, setReleases] = useState([]);
    const [fetching, setFetching] = useState(false);
    const [selectedVersion, setSelectedVersion] = useState('');

    React.useEffect(() => {
        if (window.electron?.getAppVersion) {
            window.electron.getAppVersion().then(v => setAppVersion(v));
        }

        const fetchReleases = async () => {
            setFetching(true);
            try {
                const response = await fetch('https://api.github.com/repos/TemRevil/gunter/releases');
                const data = await response.json();
                if (Array.isArray(data)) {
                    const fetchedReleases = data.map(rel => ({
                        version: rel.tag_name.replace('v', ''),
                        date: new Date(rel.published_at).toLocaleDateString(),
                        url: rel.assets.find(a => a.name.endsWith('.exe'))?.browser_download_url || rel.html_url
                    }));
                    setReleases(fetchedReleases);
                    if (fetchedReleases.length > 0) setSelectedVersion(fetchedReleases[0].version);
                }
            } catch (err) {
                console.error("Failed to fetch releases:", err);
            } finally {
                setFetching(false);
            }
        };

        fetchReleases();
    }, []);

    const togglePinVersion = (version) => {
        const isPinned = settings.pinnedVersion === version;
        setData(prev => ({
            ...prev,
            settings: {
                ...prev.settings,
                pinnedVersion: isPinned ? null : version,
                autoCheckUpdates: isPinned ? true : false
            }
        }));
        window.showToast?.(isPinned ? t('unpinVersion') : t('pinnedVersionActive'), 'success');
    };

    const handleRollback = async (version) => {
        const rel = releases.find(r => r.version === version);
        if (!rel || !rel.url) {
            window.showToast?.('Download URL not found', 'danger');
            return;
        }

        console.log(`🔄 [Rollback] Downloading version ${version} from:`, rel.url);

        window.customConfirm?.(t('rollbackUpdate'), `${t('applyVersionConfirm')} v${version}?`, async () => {
            console.log('📥 [Rollback] User confirmed, opening download...');

            // Open the download URL
            if (window.electron?.openExternal) {
                window.electron.openExternal(rel.url);
                window.showToast?.(`Downloading v${version}...`, 'info');
            } else {
                window.open(rel.url, '_blank');
                window.showToast?.(`Opening download for v${version}...`, 'info');
            }
        });
    };

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

    const addExtraInput = () => {
        if (settings.extraReceiptInputs?.length >= 3) return;
        setData(prev => ({
            ...prev,
            settings: {
                ...prev.settings,
                extraReceiptInputs: [
                    ...(prev.settings.extraReceiptInputs || []),
                    { id: Date.now(), label: '' }
                ]
            }
        }));
    };

    const updateExtraInput = (id, label) => {
        setData(prev => ({
            ...prev,
            settings: {
                ...prev.settings,
                extraReceiptInputs: prev.settings.extraReceiptInputs.map(inp => inp.id === id ? { ...inp, label } : inp)
            }
        }));
    };

    const removeExtraInput = (id) => {
        setData(prev => ({
            ...prev,
            settings: {
                ...prev.settings,
                extraReceiptInputs: prev.settings.extraReceiptInputs.filter(inp => inp.id !== id)
            }
        }));
    };

    const tabs = [
        { id: 'general', label: t('appearanceAndLanguage'), icon: <Palette size={20} /> },
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
                            <header className="settings-section-header" style={{ width: '100%', marginBottom: '1.5rem', paddingBottom: '1rem' }}>
                                <div className="settings-section-icon appearance" style={{ width: '40px', height: '40px' }}><Globe size={20} /></div>
                                <div><h3 style={{ margin: 0, fontSize: '1.1rem' }}>{t('appearanceAndLanguage')}</h3></div>
                            </header>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                <div>
                                    <label style={{ fontSize: '0.85rem', marginBottom: '0.5rem', display: 'block', opacity: 0.7 }}>{t('language')}</label>
                                    <div className="settings-button-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                        <button className={`btn ${settings.language === 'ar' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setLanguage('ar')} style={{ padding: '0.75rem' }}>العربية</button>
                                        <button className={`btn ${settings.language === 'en' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setLanguage('en')} style={{ padding: '0.75rem' }}>English</button>
                                    </div>
                                </div>

                                <div>
                                    <label style={{ fontSize: '0.85rem', marginBottom: '0.5rem', display: 'block', opacity: 0.7 }}>{t('themeMode')}</label>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                                        {[
                                            { id: 'light', icon: <Sun size={16} />, label: t('light') },
                                            { id: 'dark', icon: <Moon size={16} />, label: t('dark') },
                                            { id: 'system', icon: <Globe size={16} />, label: t('system') }
                                        ].map(mode => (
                                            <button
                                                key={mode.id}
                                                className={`btn ${settings.theme === mode.id ? 'btn-primary' : 'btn-secondary'}`}
                                                onClick={() => setData(prev => ({ ...prev, settings: { ...prev.settings, theme: mode.id } }))}
                                                style={{ padding: '0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                                            >
                                                {mode.icon} {mode.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="settings-item-row" onClick={() => toggleSecurity('showSessionBalance')} style={{ padding: '0.75rem' }}>
                                    <div><span className="settings-item-label">{settings.language === 'ar' ? 'إظهار الرصيد اليومي' : 'Show Daily Balance'}</span></div>
                                    <div className={`toggle-switch ${settings?.security?.showSessionBalance ? 'active' : ''}`}><div className="toggle-knob" /></div>
                                </div>

                                <div className="settings-item-row" onClick={() => setData(prev => ({ ...prev, settings: { ...prev.settings, autoStartNewDay: !prev.settings.autoStartNewDay } }))} style={{ padding: '0.75rem' }}>
                                    <div>
                                        <span className="settings-item-label">{t('autoStartNewDay')}</span>
                                        <span className="settings-item-subtext">{settings.language === 'ar' ? 'بدء يوم جديد تلقائياً عند تغيير وقت النظام' : 'Automatically start new day when system clock changes'}</span>
                                    </div>
                                    <div className={`toggle-switch ${settings.autoStartNewDay ? 'active' : ''}`}><div className="toggle-knob" /></div>
                                </div>
                            </div>
                        </section>

                        <section className="settings-section-card" style={{ padding: '1.5rem' }}>
                            <header className="settings-section-header" style={{ marginBottom: '1.5rem', paddingBottom: '1rem' }}>
                                <div className="settings-section-icon appearance" style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-color)', width: '40px', height: '40px' }}>
                                    <Palette size={20} />
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{t('appTitle')}</h3>
                                </div>
                            </header>
                            <div className="form-group">
                                <label>{t('maxTitleLength')}</label>
                                <input
                                    type="text"
                                    maxLength={20}
                                    placeholder="Gunter"
                                    value={settings.appTitle || ''}
                                    onChange={(e) => setData(prev => ({ ...prev, settings: { ...prev.settings, appTitle: e.target.value } }))}
                                />
                            </div>
                        </section>

                        {window.electron && (
                            <section className="settings-section-card" style={{ padding: '1.5rem' }}>
                                <header className="settings-section-header" style={{ marginBottom: '1.5rem', paddingBottom: '1rem' }}>
                                    <div className="settings-section-icon security" style={{ background: 'rgba(139, 92, 246, 0.1)', color: 'var(--accent-color)', width: '40px', height: '40px' }}>
                                        <Download size={20} />
                                    </div>
                                    <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{t('checkForUpdates')}</h3>
                                </header>
                                <div className="settings-item-row" onClick={() => {
                                    setData(prev => ({
                                        ...prev,
                                        settings: { ...prev.settings, autoUpdateEnabled: !prev.settings.autoUpdateEnabled }
                                    }));
                                }} style={{ padding: '0.75rem', marginBottom: '1rem' }}>
                                    <div><span className="settings-item-label">{t('autoCheckUpdates')}</span></div>
                                    <div className={`toggle-switch ${settings.autoUpdateEnabled ? 'active' : ''}`}><div className="toggle-knob" /></div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <div style={{ fontSize: '0.85rem', opacity: 0.7 }}>
                                        {t('systemVersion')}: <strong style={{ color: 'var(--accent-color)' }}>v{appVersion}</strong>
                                    </div>
                                    <button
                                        className="btn btn-primary"
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                                        onClick={() => checkAppUpdates(true)}
                                    >
                                        <Download size={18} /> {t('checkForUpdates')}
                                    </button>

                                    <div style={{ marginTop: '1.25rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                                            <History size={16} />
                                            <h4 style={{ margin: 0 }}>{t('releases')}</h4>
                                        </div>

                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <select
                                                value={selectedVersion}
                                                onChange={(e) => setSelectedVersion(e.target.value)}
                                                style={{ flex: 1, padding: '0.75rem' }}
                                            >
                                                {releases.map(rel => (
                                                    <option key={rel.version} value={rel.version}>
                                                        v{rel.version} ({rel.date}) {rel.version === appVersion ? `[${t('current')}]` : ''}
                                                    </option>
                                                ))}
                                            </select>
                                            <button
                                                className="btn btn-primary"
                                                onClick={() => handleRollback(selectedVersion)}
                                                disabled={selectedVersion === appVersion && !fetching}
                                            >
                                                <RotateCcw size={16} />
                                            </button>
                                            <button
                                                className={`btn ${settings.pinnedVersion === selectedVersion ? 'btn-primary' : 'btn-secondary'}`}
                                                onClick={() => togglePinVersion(selectedVersion)}
                                                title={t('pinVersion')}
                                            >
                                                <Lock size={16} />
                                            </button>
                                        </div>
                                        {settings.pinnedVersion && (
                                            <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--accent-color)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                <Lock size={12} /> {t('pinnedVersionActive')}: v{settings.pinnedVersion}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </section>
                        )}
                    </div>
                );
            case 'security':
                return (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
                        <section className="settings-section-card" style={{ padding: '1.5rem' }}>
                            <header className="settings-section-header" style={{ marginBottom: '1.5rem', paddingBottom: '1rem' }}>
                                <div className="settings-section-icon security" style={{ width: '40px', height: '40px' }}><ShieldAlert size={20} /></div>
                                <div><h3 style={{ margin: 0, fontSize: '1.1rem' }}>{t('securityPermissions')}</h3></div>
                            </header>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                <div className="settings-item-subtext" style={{ fontWeight: 800, color: 'var(--accent-color)', marginBottom: '0.25rem', fontSize: '0.8rem' }}>{settings.language === 'ar' ? 'العمليات الأساسية' : 'Core Operations'}</div>
                                <SecurityCheckbox label={t('deleteOperations')} settingKey="authOnDeleteOperation" />
                                <SecurityCheckbox label={t('addOperations')} settingKey="authOnAddOperation" />
                                <SecurityCheckbox label={t('authOnEditOperation')} settingKey="authOnEditOperation" />
                                <SecurityCheckbox label={settings.language === 'ar' ? 'السماح بتعديل السعر' : 'Allow Price Edit'} settingKey="allowPriceEdit" subtext={settings.language === 'ar' ? 'السماح بتغيير السعر في نافذة البيع' : 'Allow changing item price in sales window'} />
                                <SecurityCheckbox label={settings.language === 'ar' ? 'البيع في حالة عدم توفر مخزون' : 'Allow Negative Stock Sales'} settingKey="allowNegativeStock" subtext={settings.language === 'ar' ? 'إتمام العملية حتى لو الكمية غير متوفرة' : 'Complete sale even if stock is insufficient'} />

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
                                <div className="settings-section-icon auth" style={{ width: '40px', height: '40px' }}><Key size={20} /></div>
                                <div><h3 style={{ margin: 0, fontSize: '1.1rem' }}>{t('passwords')}</h3></div>
                            </header>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div className="password-box" style={{ padding: '1rem' }}>
                                    <div className="password-box-header" style={{ marginBottom: '0.5rem' }}>
                                        <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{t('systemPassword')}</span>
                                        <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>{t('current')}: <code style={{ color: 'var(--accent-color)' }}>{settings.loginPassword}</code></span>
                                    </div>
                                    <form onSubmit={(e) => handlePasswordUpdate('loginPassword', e)} style={{ display: 'flex', gap: '0.5rem' }}>
                                        <input type="text" name="password" placeholder="..." required style={{ padding: '0.5rem 0.75rem' }} />
                                        <button type="submit" className="btn btn-primary">{t('change')}</button>
                                    </form>
                                </div>
                                <div className="password-box" style={{ padding: '1rem' }}>
                                    <div className="password-box-header" style={{ marginBottom: '0.5rem' }}>
                                        <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{t('adminPassword')}</span>
                                        <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>{t('current')}: <code style={{ color: 'var(--accent-color)' }}>{settings.adminPassword}</code></span>
                                    </div>
                                    <form onSubmit={(e) => handlePasswordUpdate('adminPassword', e)} style={{ display: 'flex', gap: '0.5rem' }}>
                                        <input type="text" name="password" placeholder="..." required style={{ padding: '0.5rem 0.75rem' }} />
                                        <button type="submit" className="btn btn-primary">{t('change')}</button>
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
                            <div className="settings-section-icon receipt" style={{ width: '40px', height: '40px' }}><FileBarChart size={20} /></div>
                            <div><h3 style={{ margin: 0, fontSize: '1.1rem' }}>{t('receiptSettings')}</h3></div>
                        </header>
                        <form onSubmit={handleReceiptUpdate}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label style={{ fontSize: '0.85rem' }}>{t('businessName')}</label>
                                    <input type="text" name="title" defaultValue={settings.receipt?.title || settings.receiptTitle || ''} placeholder={t('defaultReceiptTitle')} />
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label style={{ fontSize: '0.85rem' }}>{t('detailedAddress')}</label>
                                    <input type="text" name="address" defaultValue={settings.receipt?.address || settings.receiptAddress || ''} placeholder={t('defaultReceiptAddress')} />
                                </div>
                                <div className="settings-button-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div className="form-group" style={{ marginBottom: 0 }}><label>{t('phone')}</label><input type="text" name="phone" defaultValue={settings.receipt?.phone || settings.receiptPhone || ''} placeholder="0123456789" /></div>
                                    <div className="form-group" style={{ marginBottom: 0 }}><label>{t('receiptFooter')}</label><input type="text" name="footer" defaultValue={settings.receipt?.footer || settings.receiptFooter || ''} placeholder={t('defaultReceiptFooter')} /></div>
                                </div>
                            </div>
                            <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                    <h4 style={{ margin: 0 }}>{t('extraReceiptInputs')}</h4>
                                    <button type="button" className="btn btn-secondary btn-sm" onClick={addExtraInput} disabled={settings.extraReceiptInputs?.length >= 3}>
                                        <Plus size={14} /> {t('add')}
                                    </button>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {(settings.extraReceiptInputs || []).map(inp => (
                                        <div key={inp.id} style={{ display: 'flex', gap: '0.5rem' }}>
                                            <input
                                                type="text"
                                                placeholder={t('receiptInputLabel')}
                                                value={inp.label}
                                                onChange={(e) => updateExtraInput(inp.id, e.target.value)}
                                                style={{ flex: 1 }}
                                            />
                                            <button type="button" className="btn btn-ghost" onClick={() => removeExtraInput(inp.id)} style={{ color: 'var(--danger-color)' }}><Trash2 size={18} /></button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.25rem' }}>
                                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}><Save size={16} /> {t('save')}</button>
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    style={{ flex: 1 }}
                                    onClick={() => {
                                        const mockReceipt = {
                                            id: 'TEST-001',
                                            timestamp: new Date().toISOString(),
                                            customerName: settings.language === 'ar' ? 'عميل تجريبي' : 'Test Customer',
                                            items: [
                                                { partName: settings.language === 'ar' ? 'قطعة غيار رقم 1' : 'Spare Part #1', quantity: 2, price: 500 },
                                                { partName: settings.language === 'ar' ? 'خدمة صيانة' : 'Maintenance Service', quantity: 1, price: 300 }
                                            ],
                                            price: 800,
                                            paidAmount: 500,
                                            paymentStatus: 'partial',
                                            extraInputs: (settings.extraReceiptInputs || []).map(inp => ({ label: inp.label, value: settings.language === 'ar' ? 'نموذج' : 'Sample' }))
                                        };
                                        printReceipt(mockReceipt, settings);
                                    }}
                                >
                                    <Printer size={16} /> {t('testPrint')}
                                </button>
                            </div>
                        </form>
                    </section>
                );
            case 'data':
                return (
                    <section className="settings-section-card" style={{ padding: '1.5rem', maxWidth: '600px', margin: '0 auto' }}>
                        <header className="settings-section-header" style={{ marginBottom: '1.5rem', paddingBottom: '1rem' }}>
                            <div className="settings-section-icon appearance" style={{ width: '40px', height: '40px' }}><Save size={20} /></div>
                            <div><h3 style={{ margin: 0, fontSize: '1.1rem' }}>{t('backupAndDisplay')}</h3></div>
                        </header>
                        <div className="settings-button-grid" style={{ marginTop: '0.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <button className="btn btn-secondary shadow-sm" style={{ padding: '1.25rem', borderRadius: 'var(--radius-lg)', height: '120px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }} onClick={() => {
                                const now = new Date();
                                const blob = new Blob([exportData()], { type: 'text/plain' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `backup_${now.toISOString().split('T')[0]}.txt`;
                                a.click();
                            }}>
                                <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '0.75rem', borderRadius: '50%', color: 'var(--accent-color)' }}><Download size={24} /></div>
                                <span style={{ fontWeight: 700 }}>{t('exportData')}</span>
                            </button>
                            <label className="btn btn-secondary shadow-sm" style={{ padding: '1.25rem', borderRadius: 'var(--radius-lg)', height: '120px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
                                <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '0.75rem', borderRadius: '50%', color: 'var(--success-color)' }}><Upload size={24} /></div>
                                <span style={{ fontWeight: 700 }}>{t('importData')}</span>
                                <input type="file" hidden onChange={onImport} />
                            </label>
                        </div>
                    </section>
                );
            case 'license':
                return <LicenseSection settings={settings} setData={setData} t={t} licenseData={licenseData} checkLicenseConnection={checkLicenseConnection} />;
            default:
                return null;
        }
    };

    return (
        <div className="view-container">
            <header className="view-header">
                <div className="view-title">
                    <div className="view-icon"><SettingsIcon size={24} /></div>
                    <div><h1>{t('settings')}</h1><p>{settings.language === 'ar' ? 'إدارة إعدادات النظام' : 'Manage system settings'}</p></div>
                </div>
            </header>
            <div className="settings-view" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: 'calc(100% - 80px)', overflow: 'hidden', padding: '1rem' }}>
                <nav className="settings-tabs-container" style={{
                    display: 'flex',
                    gap: '0.75rem',
                    overflowX: 'auto',
                    padding: '0.75rem 1rem',
                    background: 'var(--bg-surface)',
                    borderRadius: 'var(--radius-xl)',
                    margin: '0 auto',
                    width: 'fit-content',
                    maxWidth: '100%',
                    border: '1px solid var(--border-color)',
                    boxShadow: 'var(--shadow-sm)'
                }}>
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            className={`btn settings-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab.id)}
                            style={{
                                whiteSpace: 'nowrap',
                                gap: '0.6rem',
                                padding: '0.75rem 1.75rem',
                                borderRadius: 'var(--radius-lg)',
                                border: activeTab === tab.id ? '1px solid var(--accent-color)' : '1px solid transparent',
                                background: activeTab === tab.id ? 'var(--accent-color)' : 'transparent',
                                color: activeTab === tab.id ? 'white' : 'var(--text-secondary)',
                                fontWeight: activeTab === tab.id ? 700 : 600,
                                transition: 'all 0.2s ease',
                                boxShadow: activeTab === tab.id ? 'var(--shadow-md)' : 'none'
                            }}
                        >
                            {React.cloneElement(tab.icon, { size: 18 })}
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </nav>
                <main className="settings-content" style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
                    {renderContent()}
                </main>
            </div>
        </div>
    );
};

export default Settings;
