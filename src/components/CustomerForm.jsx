import React, { useState } from 'react';
import { useStore } from '../store/StoreContext';

const CustomerForm = ({ initialData, onSubmit, onCancel, isEditMode }) => {
    const { t } = useStore();
    const [customerForm, setCustomerForm] = useState({
        id: initialData?.id || '',
        name: initialData?.name || '',
        phone: initialData?.phone || '',
        address: initialData?.address || '',
        balance: initialData?.balance || '0'
    });

    const handleNumericInput = (field, val) => {
        const cleaned = val.replace(/[^0-9.]/g, '');
        setCustomerForm(prev => ({ ...prev, [field]: cleaned }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit({
            ...customerForm,
            balance: parseFloat(customerForm.balance) || 0
        });
    };

    return (
        <form onSubmit={handleSubmit}>
            <div className="form-group">
                <label>{t('customerName')}</label>
                <input
                    type="text"
                    required
                    value={customerForm.name}
                    onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                    placeholder={t('customerName')}
                    autoFocus
                />
            </div>
            <div className="settings-button-grid">
                <div className="form-group">
                    <label>{t('phone')}</label>
                    <input
                        type="text"
                        value={customerForm.phone}
                        onChange={(e) => handleNumericInput('phone', e.target.value)}
                        placeholder="01xxxxxxxxx"
                    />
                </div>
                <div className="form-group">
                    <label>{t('balance')}</label>
                    <input
                        type="text"
                        value={customerForm.balance}
                        onChange={(e) => handleNumericInput('balance', e.target.value)}
                        placeholder="0"
                    />
                </div>
            </div>
            <div className="form-group">
                <label>{t('address')}</label>
                <textarea
                    value={customerForm.address}
                    onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })}
                    placeholder={t('address')}
                    style={{
                        width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-color)', background: 'var(--bg-input)',
                        color: 'var(--text-primary)', minHeight: '100px', fontFamily: 'inherit'
                    }}
                />
            </div>
            <div className="modal-footer" style={{ border: 'none', padding: 0, marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={onCancel}>{t('cancel')}</button>
                <button type="submit" className="btn btn-primary">{isEditMode ? t('save') : t('addCustomer')}</button>
            </div>
        </form>
    );
};

export default CustomerForm;
