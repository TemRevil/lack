import React, { useContext, useEffect, useRef } from 'react';
import { X, Printer } from 'lucide-react';
import { StoreContext } from '../store/StoreContext';
import { generateReceiptHtml, printReceipt } from '../utils/printing';

const ReceiptModal = ({ show, onClose, operation, operationId }) => {
    const { settings, t, operations } = useContext(StoreContext);
    const contentRef = useRef(null);

    // Resolve operation: either passed directly or found by ID
    const targetOperation = operation || (operationId ? operations.find(op => op.id === operationId) : null);

    // Close on ESC
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape' && show) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [show, onClose]);

    if (!show || !targetOperation) return null;

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 30000,
                background: 'rgba(0,0,0,0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}
            onClick={onClose}
        >
            <div
                style={{
                    background: 'var(--bg-surface)',
                    width: '90%',
                    maxWidth: '450px',
                    maxHeight: '90vh',
                    borderRadius: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{ padding: '15px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{t('viewReceipt')}</h3>
                    <button onClick={onClose} className="btn-icon">
                        <X size={20} />
                    </button>
                </div>

                {/* Receipt Preview Content */}
                <div
                    ref={contentRef}
                    style={{
                        flex: 1,
                        overflowY: 'auto',
                        padding: '30px',
                        background: '#f1f5f9', // Contrast background
                        display: 'flex',       // Center the paper
                        justifyContent: 'center',
                        alignItems: 'flex-start', // Start from top
                        color: '#000',
                        fontFamily: 'Cairo, sans-serif',
                        direction: settings.language === 'ar' ? 'rtl' : 'ltr'
                    }}
                >
                    <div dangerouslySetInnerHTML={{ __html: generateReceiptHtml(targetOperation, settings) }} />
                </div>

                {/* Footer / Actions */}
                <div style={{ padding: '15px 20px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '12px', justifyContent: 'flex-end', background: 'var(--bg-surface)' }}>
                    <button className="btn btn-secondary" onClick={onClose}>
                        {t('close')}
                    </button>
                    <button className="btn btn-primary" onClick={() => printReceipt(targetOperation, settings)}>
                        <Printer size={18} /> {t('print')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ReceiptModal;
