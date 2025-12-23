import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { useStore } from '../store/StoreContext';

const ConfirmDialog = () => {
    const { t } = useStore();
    const [config, setConfig] = useState(null);

    useEffect(() => {
        window.customConfirm = (title, message, onConfirm) => {
            setConfig({ title, message, onConfirm });
        };
    }, []);

    if (!config) return null;

    return (
        <Modal
            show={true}
            title={config.title}
            onClose={() => setConfig(null)}
        >
            <p style={{ marginBottom: '2rem', fontSize: '1.1rem' }}>{config.message}</p>
            <div className="modal-footer" style={{ border: 'none', padding: 0 }}>
                <button
                    className="btn btn-secondary"
                    onClick={() => setConfig(null)}
                >
                    {t('cancel')}
                </button>
                <button
                    className="btn btn-primary"
                    onClick={() => {
                        config.onConfirm();
                        setConfig(null);
                    }}
                >
                    {t('confirm')}
                </button>
            </div>
        </Modal>
    );
};

export default ConfirmDialog;
