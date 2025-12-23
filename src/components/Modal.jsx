import React from 'react';

const Modal = ({ show, onClose, title, children, style = {} }) => {
    React.useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape' && show) {
                onClose();
            }
        };
        if (show) {
            window.addEventListener('keydown', handleEsc);
        }
        return () => window.removeEventListener('keydown', handleEsc);
    }, [show, onClose]);

    if (!show) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal card" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', ...style }}>
                <button className="close-modal" onClick={onClose} aria-label="Close">&times;</button>
                <div className="modal-header" style={{ marginBottom: '1.5rem' }}>
                    <h2>{title}</h2>
                </div>
                <div className="modal-body">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default Modal;
