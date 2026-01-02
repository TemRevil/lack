import React, { useState, useEffect } from 'react';
import { useStore } from '../store/StoreContext';
import Modal from './Modal';
import { Lock } from 'lucide-react';

const AdminAuthModal = () => {
    const { settings, t } = useStore();
    const [isOpen, setIsOpen] = useState(false);
    const [password, setPassword] = useState('');
    const [onSuccess, setOnSuccess] = useState(null);
    const [title, setTitle] = useState('');

    useEffect(() => {
        window.requestAdminAuth = (callback, customTitle) => {
            setOnSuccess(() => callback);
            if (customTitle) setTitle(customTitle);
            else setTitle(t('confirmAdminIdentity'));
            setIsOpen(true);
            setPassword('');
        };
    }, [t]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (password === settings.adminPassword) {
            setIsOpen(false);
            if (onSuccess) onSuccess();
        } else {
            window.showToast?.(t('incorrectAdminPassword'), 'danger');
        }
    };

    if (!isOpen) return null;

    const isAr = settings.language === 'ar';

    return (
        <Modal
            show={isOpen}
            onClose={() => setIsOpen(false)}
            title={title}
        >
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>{t('adminPasswordConfirm')}</label>
                    <div className="input-with-icon">
                        <input
                            type="password"
                            required
                            autoFocus
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder={t('enterAdminPassword')}
                        />
                        <Lock size={16} />
                    </div>
                </div>
                <div className="modal-footer" style={{ gap: '1rem', marginTop: '2rem' }}>
                    <button type="button" className="btn btn-secondary" style={{ flex: 1, borderRadius: 'var(--radius-md)' }} onClick={() => setIsOpen(false)}>{t('cancel')}</button>
                    <button type="submit" className="btn btn-primary" style={{ flex: 1, borderRadius: 'var(--radius-md)' }}>{t('confirm')}</button>
                </div>
            </form>
        </Modal>
    );
};

export default AdminAuthModal;
