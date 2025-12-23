import React, { useState } from 'react';
import { Key, Globe } from 'lucide-react';
import { useStore } from '../store/StoreContext';

const LicenseScreen = ({ onActivate }) => {
    const { t, settings, setData } = useStore();
    const [code, setCode] = useState('');
    const [name, setName] = useState('');

    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onActivate(code, name);
        } finally {
            setLoading(false);
        }
    };

    const toggleLang = () => {
        setData(prev => ({
            ...prev,
            settings: { ...prev.settings, language: settings.language === 'ar' ? 'en' : 'ar' }
        }));
    };

    return (
        <div className="login-overlay">
            <div className="login-box card shadow-2xl">
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.5rem' }}>
                    <button
                        onClick={toggleLang}
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', gap: '0.5rem', borderRadius: 'var(--radius-md)' }}
                    >
                        <Globe size={16} /> {settings.language === 'ar' ? 'English' : 'العربية'}
                    </button>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
                    <div style={{ padding: '1rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '50%', color: 'var(--accent-color)' }}>
                        <Key size={40} />
                    </div>
                </div>
                <h2>{t('activateSystem')}</h2>
                <p style={{ fontSize: '0.95rem', lineHeight: '1.6' }}>
                    {t('activateDesc')}
                </p>
                <form onSubmit={handleSubmit} className="license-form-group">
                    <input
                        type="text"
                        placeholder={settings.language === 'ar' ? 'اسم المرخص له' : 'Licensed To (Name)'}
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="search-input"
                        style={{ maxWidth: '100%', width: '100%', marginBottom: '1rem' }}
                        disabled={loading}
                    />
                    <input
                        type="text"
                        placeholder="XXXXX-XXXXX-XXXXX-XXXXX-XXXXX"
                        required
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        className="search-input"
                        style={{ maxWidth: '100%', width: '100%', marginBottom: '1rem' }}
                        disabled={loading}
                    />
                    <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '1rem' }} disabled={loading}>
                        {loading ? (settings.language === 'ar' ? 'جاري التحقق...' : 'Verifying...') : (<><Key size={18} /> {t('activateNow')}</>)}
                    </button>
                    <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {t('licenseWarning')}
                    </div>
                </form>
            </div>
        </div>
    );
};

export default LicenseScreen;
