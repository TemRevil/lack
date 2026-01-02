import React, { useState } from 'react';
import { Lock, Globe } from 'lucide-react';
import { useStore } from '../store/StoreContext';

const LoginScreen = ({ onLogin }) => {
    const { t, settings, setData } = useStore();
    const [password, setPassword] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        onLogin(password);
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
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
                    <button
                        onClick={toggleLang}
                        className="btn btn-secondary"
                        style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', gap: '0.5rem' }}
                    >
                        <Globe size={16} /> {settings.language === 'ar' ? 'English' : 'العربية'}
                    </button>
                </div>
                <h2><Lock size={24} /> {t('login')}</h2>
                <p>{t('loginDesc')}</p>
                <form onSubmit={handleSubmit}>
                    <input
                        type="password"
                        placeholder={t('password') + '...'}
                        required
                        autoFocus
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '1rem', fontSize: '1.1rem' }}>
                        {t('enter')}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default LoginScreen;
