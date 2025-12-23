import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

let toastTimeout;

const Toast = () => {
    const [toast, setToast] = useState(null);

    useEffect(() => {
        window.showToast = (message, type = 'success') => {
            clearTimeout(toastTimeout);
            setToast({ message, type });
            toastTimeout = setTimeout(() => setToast(null), 3000);
        };
    }, []);

    if (!toast) return null;

    return (
        <div
            className={`toast ${toast.type}`}
            style={{
                position: 'fixed',
                bottom: '2rem',
                right: '2rem',
                zIndex: 99999,
                padding: '1rem 1.5rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-glass-modal)',
                border: '1px solid var(--border-color)',
                boxShadow: 'var(--shadow-lg)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                animation: 'fadeIn 0.3s ease',
                backdropFilter: 'blur(12px)'
            }}
        >
            {toast.type === 'success' ? <CheckCircle2 color="var(--success-color)" size={18} /> : <AlertCircle color="var(--danger-color)" size={18} />}
            <span style={{ fontWeight: 600 }}>{toast.message}</span>
            <button className="btn-icon" onClick={() => setToast(null)}><X size={14} /></button>
        </div>
    );
};

export default Toast;
