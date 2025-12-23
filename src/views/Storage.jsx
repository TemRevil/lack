import React, { useState, useContext } from 'react';
import { Boxes, Search, Plus, Trash2, PenTool, AlertTriangle, Hash, DollarSign, CheckCircle2, XCircle } from 'lucide-react';
import { StoreContext } from '../store/StoreContext';
import Modal from '../components/Modal';
import DropdownMenu from '../components/DropdownMenu';
import PartForm from '../components/PartForm';

const Storage = () => {
    const { parts, addPart, updatePart, deletePart, settings, t } = useContext(StoreContext);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [selectedId, setSelectedId] = useState(null);

    const [showStockModal, setShowStockModal] = useState(false);
    const [stockAmount, setStockAmount] = useState('0');

    const [formData, setFormData] = useState(null); // Used primarily for selected data in modals

    const filteredParts = parts.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.code && p.code.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const handleNumericInput = (field, value, isFloat = false, setter) => {
        const regex = isFloat ? /[^0-9.]/g : /[^0-9]/g;
        const cleaned = value.replace(regex, '');
        setter(prev => typeof prev === 'string' ? cleaned : { ...prev, [field]: cleaned });
    };

    const handleOpenAdd = () => {
        setEditMode(false);
        setFormData({ name: '', code: '', quantity: '0', price: '0', threshold: '5' });
        setShowModal(true);
    };

    const handleOpenEdit = (part) => {
        setEditMode(true);
        setSelectedId(part.id);
        setFormData({
            name: part.name,
            code: part.code || '',
            quantity: String(part.quantity),
            price: String(part.price),
            threshold: String(part.threshold || 5)
        });
        setShowModal(true);
    };

    const handleOpenStock = (part) => {
        setSelectedId(part.id);
        setStockAmount('0');
        setShowStockModal(true);
    };

    const handleStockSubmit = (e) => {
        e.preventDefault();
        const part = parts.find(p => p.id === selectedId);
        if (part) {
            updatePart(selectedId, { quantity: part.quantity + (parseInt(stockAmount) || 0) });
            window.showToast?.('تم تحديث المخزون بنجاح', 'success');
        }
        setShowStockModal(false);
    };

    const handleSubmit = (data) => {
        if (editMode) {
            updatePart(selectedId, data);
            window.showToast?.('تم تعديل القطعة بنجاح', 'success');
        } else {
            addPart(data);
            window.showToast?.('تم إضافة القطعة للمخزن', 'success');
        }
        setShowModal(false);
    };

    return (
        <div className="view-container">
            <header className="view-header">
                <div className="view-title">
                    <div className="view-icon">
                        <Boxes size={24} />
                    </div>
                    <div>
                        <h1>{t('storage')}</h1>
                        <p>{settings.language === 'ar' ? 'إدارة قطع الغيار والمخزون' : 'Manage spare parts and inventory'}</p>
                    </div>
                </div>
                <div className="view-actions">
                    <div className="search-box">
                        <Search className="search-icon" size={18} />
                        <input
                            type="text"
                            placeholder={t('search')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button className="btn btn-primary" onClick={() => {
                        if (settings?.security?.authOnAddPart) {
                            window.requestAdminAuth?.(handleOpenAdd, settings.language === 'ar' ? 'تأكيد الهوية لإضافة قطعة جديدة' : 'Identity confirmation to add new item');
                        } else {
                            handleOpenAdd();
                        }
                    }}>
                        <Plus size={18} /> {t('addPart')}
                    </button>
                </div>
            </header>

            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th style={{ width: '30%' }}>{t('partName')}</th>
                            <th style={{ width: '15%' }}>{settings.language === 'ar' ? 'الكود' : 'Code'}</th>
                            <th style={{ width: '15%', textAlign: 'center' }}>{t('qty')}</th>
                            <th style={{ width: '15%', textAlign: 'center' }}>{t('price')}</th>
                            <th style={{ width: '15%', textAlign: 'center' }}>{t('status')}</th>
                            <th style={{ width: '10%', textAlign: 'center' }}>{t('actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredParts.length > 0 ? (
                            filteredParts.map(part => (
                                <tr key={part.id}>
                                    <td className="font-medium">{part.name}</td>
                                    <td>{part.code || '-'}</td>
                                    <td style={{ textAlign: 'center' }}>{part.quantity}</td>
                                    <td style={{ textAlign: 'center' }}>{part.price.toLocaleString()}</td>
                                    <td style={{ textAlign: 'center' }}>
                                        {part.quantity === 0 ? (
                                            <span className="badge danger">
                                                <XCircle size={12} strokeWidth={3} />
                                                {settings.language === 'ar' ? 'نفذ' : 'Out of Stock'}
                                            </span>
                                        ) : part.quantity <= (part.threshold || 5) ? (
                                            <span className="badge warning">
                                                <AlertTriangle size={12} strokeWidth={3} />
                                                {t('lowStock')}
                                            </span>
                                        ) : (
                                            <span className="badge success">
                                                <CheckCircle2 size={12} strokeWidth={3} />
                                                {settings.language === 'ar' ? 'متوفر' : 'In Stock'}
                                            </span>
                                        )}
                                    </td>
                                    <td>
                                        <DropdownMenu options={[
                                            {
                                                label: t('edit'),
                                                icon: <PenTool size={16} />,
                                                onClick: () => {
                                                    if (settings?.security?.authOnUpdatePart) {
                                                        window.requestAdminAuth?.(() => handleOpenEdit(part), settings.language === 'ar' ? 'تأكيد الهوية لتعديل بيانات القطعة' : 'Identity confirmation to edit item info');
                                                    } else {
                                                        handleOpenEdit(part);
                                                    }
                                                }
                                            },
                                            {
                                                label: settings.language === 'ar' ? 'إضافة مخزون' : 'Add Stock',
                                                icon: <Plus size={16} />,
                                                onClick: () => {
                                                    if (settings?.security?.authOnUpdatePart) {
                                                        window.requestAdminAuth?.(() => handleOpenStock(part), settings.language === 'ar' ? 'تأكيد الهوية لإضافة مخزون' : 'Identity confirmation to add stock');
                                                    } else {
                                                        handleOpenStock(part);
                                                    }
                                                }
                                            },
                                            {
                                                label: settings.language === 'ar' ? 'حذف من المخزن' : 'Delete Item',
                                                icon: <Trash2 size={16} />,
                                                className: 'danger',
                                                onClick: () => {
                                                    const performDelete = () => {
                                                        window.customConfirm?.(t('delete'), `${t('delete')} "${part.name}"?`, () => {
                                                            deletePart(part.id);
                                                            window.showToast?.(t('delete'), 'success');
                                                        });
                                                    };

                                                    if (settings?.security?.authOnDeletePart) {
                                                        window.requestAdminAuth?.(performDelete, settings.language === 'ar' ? 'تأكيد الهوية لحذف قطعة من المخزن' : 'Identity confirmation to delete item');
                                                    } else {
                                                        performDelete();
                                                    }
                                                }
                                            }
                                        ]} />
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                                    {searchTerm ? 'لا توجد نتائج تطابق بحثك' : 'المخزن فارغ حالياً'}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Main Part Modal */}
            <Modal
                show={showModal}
                onClose={() => setShowModal(false)}
                title={editMode ? t('updatePart') : t('addPart')}
            >
                <PartForm
                    initialData={formData}
                    isEditMode={editMode}
                    onSubmit={handleSubmit}
                    onCancel={() => setShowModal(false)}
                />
            </Modal>

            {/* Quick Stock Modal */}
            <Modal
                show={showStockModal}
                onClose={() => setShowStockModal(false)}
                title={settings.language === 'ar' ? 'تحديث كمية المخزون' : 'Update Stock Quantity'}
            >
                <form onSubmit={handleStockSubmit}>
                    <div className="form-group">
                        <label>{(settings.language === 'ar' ? 'الكمية المراد إضافتها لـ ' : 'Quantity to add for ') + parts.find(p => p.id === selectedId)?.name}</label>
                        <input
                            type="text"
                            required
                            autoFocus
                            value={String(stockAmount ?? '0')}
                            onChange={(e) => handleNumericInput('stockAmount', e.target.value, false, setStockAmount)}
                            placeholder="0"
                            style={{ [settings.language === 'ar' ? 'paddingRight' : 'paddingLeft']: '1rem' }}
                        />
                    </div>
                    <div className="modal-footer" style={{ border: 'none', padding: 0, marginTop: '1.5rem' }}>
                        <button type="button" className="btn btn-secondary" onClick={() => setShowStockModal(false)}>{t('cancel')}</button>
                        <button type="submit" className="btn btn-primary">{settings.language === 'ar' ? 'إضافة للمخزن' : 'Add to Stock'}</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Storage;
