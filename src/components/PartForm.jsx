import React, { useState } from 'react';
import { Hash, DollarSign } from 'lucide-react';
import { useStore } from '../store/StoreContext';

const PartForm = ({ initialData, onSubmit, onCancel, isEditMode }) => {
    const { t, settings } = useStore();
    const [formData, setFormData] = useState({
        name: initialData?.name || '',
        code: initialData?.code || '',
        quantity: initialData?.quantity ? String(initialData.quantity) : '0',
        price: initialData?.price ? String(initialData.price) : '0',
        threshold: initialData?.threshold ? String(initialData.threshold) : '5'
    });

    const handleNumericInput = (field, value, isFloat = false) => {
        const regex = isFloat ? /[^0-9.]/g : /[^0-9]/g;
        const cleaned = value.replace(regex, '');
        setFormData(prev => ({ ...prev, [field]: cleaned }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit({
            ...formData,
            quantity: parseInt(formData.quantity) || 0,
            price: parseFloat(formData.price) || 0,
            threshold: parseInt(formData.threshold) || 5
        });
    };

    return (
        <form onSubmit={handleSubmit}>
            <div className="form-group">
                <label>{t('partName')}</label>
                <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={t('partName')}
                    autoFocus
                />
            </div>

            <div className="form-group">
                <label>{settings.language === 'ar' ? 'الكود (اختياري)' : 'Code (Optional)'}</label>
                <div className="input-with-icon">
                    <input
                        type="text"
                        value={formData.code}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    />
                    <Hash size={16} />
                </div>
            </div>

            <div className="settings-button-grid">
                <div className="form-group">
                    <label>{t('qty')}</label>
                    <input
                        type="text"
                        required
                        value={formData.quantity}
                        onChange={(e) => handleNumericInput('quantity', e.target.value)}
                    />
                </div>
                <div className="form-group">
                    <label>{t('price')}</label>
                    <div className="input-with-icon">
                        <input
                            type="text"
                            required
                            value={formData.price}
                            onChange={(e) => handleNumericInput('price', e.target.value, true)}
                        />
                        <DollarSign size={16} />
                    </div>
                </div>
            </div>

            <div className="form-group">
                <label>{settings.language === 'ar' ? 'تنبيه نقص المخزون عند وصول الكمية لـ' : 'Alert when stock drops to'}</label>
                <input
                    type="text"
                    required
                    value={formData.threshold}
                    onChange={(e) => handleNumericInput('threshold', e.target.value)}
                />
            </div>

            <div className="modal-footer" style={{ border: 'none', padding: 0, marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={onCancel}>{t('cancel')}</button>
                <button type="submit" className="btn btn-primary">{isEditMode ? t('save') : t('addPart')}</button>
            </div>
        </form>
    );
};

export default PartForm;
