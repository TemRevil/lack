import React, { useState, useContext, useEffect, useRef } from 'react';
import {
    CalendarCheck, Search, Plus, Trash2,
    Printer, Clock, User, Package, DollarSign,
    CheckCircle2, AlertCircle
} from 'lucide-react';
import { StoreContext } from '../store/StoreContext';
import Modal from '../components/Modal';
import DropdownMenu from '../components/DropdownMenu';
import { printReceipt } from '../utils/printing';
import CustomerForm from '../components/CustomerForm';
import PartForm from '../components/PartForm';
import CustomDatePicker from '../components/CustomDatePicker';

// Helper to normalize Arabic text for better matching
const normalizeArabic = (text) => {
    if (!text) return '';
    return text
        .trim()
        .toLowerCase()
        .replace(/[أإآ]/g, 'ا')
        .replace(/ة/g, 'ه')
        .replace(/[ىي]/g, 'ي');
};

const CustomAutocomplete = ({ label, items, value, onSelect, onAddNew, placeholder, icon: Icon, displaySubtext }) => {
    const { settings, t } = useContext(StoreContext);
    const [inputValue, setInputValue] = useState(value || '');
    const [showList, setShowList] = useState(false);
    const containerRef = useRef(null);

    const normalizedInput = normalizeArabic(inputValue);
    const filtered = items.filter(item =>
        normalizeArabic(item.name).includes(normalizedInput)
    );

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) setShowList(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Sync input when value prop changes externally
    useEffect(() => {
        setInputValue(value || '');
    }, [value]);

    return (
        <div className="form-group" ref={containerRef} style={{ position: 'relative' }}>
            <label>{label}</label>
            <div className="input-with-icon">
                <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => {
                        const val = e.target.value;
                        setInputValue(val);
                        setShowList(true);

                        // Auto-match if name exactly matches an existing item (normalized)
                        const normVal = normalizeArabic(val);
                        const match = items.find(i => normalizeArabic(i.name) === normVal);
                        if (match) {
                            onSelect(match);
                        } else {
                            onSelect({ name: val, id: '' });
                        }
                    }}
                    onFocus={() => setShowList(true)}
                    placeholder={placeholder}
                    required
                />
                {Icon && <Icon size={16} />}
            </div>
            {showList && (inputValue || filtered.length > 0) && (
                <div className="action-menu show" style={{
                    position: 'absolute', top: '100%', left: 0, right: 0,
                    width: 'auto', maxHeight: '200px', overflowY: 'auto'
                }}>
                    {filtered.map(item => (
                        <div
                            key={item.id || item.name}
                            className="action-menu-item"
                            onClick={() => {
                                setInputValue(item.name);
                                onSelect(item);
                                setShowList(false);
                            }}
                        >
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span>{item.name}</span>
                                    {item.code && (
                                        <span style={{
                                            fontSize: '0.7em',
                                            background: 'var(--bg-hover)',
                                            padding: '0.1rem 0.35rem',
                                            borderRadius: '4px',
                                            opacity: 0.8
                                        }}>
                                            #{item.code}
                                        </span>
                                    )}
                                </div>
                                {displaySubtext && item.id && <small style={{ opacity: 0.6 }}>{displaySubtext(item)}</small>}
                            </div>
                        </div>
                    ))}
                    {filtered.length === 0 && items.length === 0 && (
                        <div className="action-menu-item" style={{ opacity: 0.6, cursor: 'default' }}>
                            {t('noCustomersFound') || 'No items found'}
                        </div>
                    )}
                    {onAddNew && inputValue.trim() && !filtered.some(i => normalizeArabic(i.name) === normalizeArabic(inputValue)) && (
                        <div
                            className="action-menu-item"
                            style={{ borderTop: '1px solid var(--border-color)', color: 'var(--accent-color)', fontWeight: 700 }}
                            onClick={() => {
                                onAddNew(inputValue);
                                setShowList(false);
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Plus size={14} />
                                <span>{(settings.language === 'ar' ? 'إضافة ' : 'Add ') + `"${inputValue}"` + (settings.language === 'ar' ? ' كجديد...' : ' as new...')}</span>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const Operations = () => {
    const {
        operations, parts, customers,
        addOperation, deleteOperation, settings,
        addCustomer, addPart, t
    } = useContext(StoreContext);

    // Helper function to get local date as YYYY-MM-DD string
    const getLocalDateString = () => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDate, setSelectedDate] = useState(getLocalDateString());
    const [showModal, setShowModal] = useState(false);
    const [selectedOpId, setSelectedOpId] = useState(null); // Track selected row for printing shortcut

    // Keyboard shortcut for printing selected operation
    useEffect(() => {
        const handleKeyPress = (e) => {
            if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
            if (e.key.toLowerCase() === 'p' && selectedOpId) {
                const op = operations.find(o => o.id === selectedOpId);
                if (op) {
                    printReceipt(op, settings);
                    window.showToast?.(settings.language === 'ar' ? 'جاري الطباعة...' : 'Printing...', 'success');
                }
            }
        };
        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [selectedOpId, operations, settings]);

    // Auto-update date when day changes (without requiring app refresh)
    // Only updates if the user is currently viewing today's date
    useEffect(() => {
        const checkDateChange = () => {
            const currentDate = getLocalDateString(); // Use local date, not UTC
            const currentSelectedDate = selectedDate;

            // Only auto-update if the user is currently viewing today
            // This allows manual date selection to persist
            if (currentSelectedDate === currentDate) {
                // User is viewing today, so if day changes, update automatically
                const newCurrentDate = getLocalDateString();
                if (currentSelectedDate !== newCurrentDate) {
                    setSelectedDate(newCurrentDate);
                }
            }
            // If user has manually selected a different date, don't force update
        };

        // Check immediately on mount
        checkDateChange();

        // Check every 30 seconds for more responsive updates
        const intervalId = setInterval(checkDateChange, 30000);

        // Cleanup on unmount
        return () => clearInterval(intervalId);
    }, [selectedDate]);

    // Quick Add States
    const [showQuickCust, setShowQuickCust] = useState(false);
    const [showQuickPart, setShowQuickPart] = useState(false);
    const [quickName, setQuickName] = useState('');

    const [formData, setFormData] = useState({
        customerId: '',
        customerName: '',
        partId: '',
        partName: '',
        quantity: '1',
        price: '0',
        paidAmount: '0',
        paymentStatus: 'paid'
    });

    const handleQuickCustSubmit = (data) => {
        const newCust = addCustomer(data);
        setFormData(prev => ({ ...prev, customerId: newCust.id, customerName: newCust.name }));
        setShowQuickCust(false);
        window.showToast?.(t('customerAddedSuccess'), 'success');
    };

    const handleQuickPartSubmit = (data) => {
        const newPart = addPart(data);
        setFormData(prev => ({
            ...prev,
            partId: newPart.id,
            partName: newPart.name,
            price: String(newPart.price * (parseInt(prev.quantity) || 1)),
            paidAmount: prev.paymentStatus === 'paid' ? String(newPart.price * (parseInt(prev.quantity) || 1)) : prev.paidAmount
        }));
        setShowQuickPart(false);
        window.showToast?.(t('partAddedSuccess'), 'success');
    };

    const filteredOps = operations.filter(op => {
        // Convert timestamp to local date string YYYY-MM-DD for comparison
        const d = new Date(op.timestamp);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const opDate = `${year}-${month}-${day}`;

        const matchesSearch = op.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            op.partName.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesDate = !selectedDate || opDate === selectedDate;
        return matchesSearch && matchesDate;
    }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    const handlePartSelect = (part) => {
        let finalId = part.id;
        let finalPrice = formData.price;
        let finalName = part.name;
        const normName = normalizeArabic(part.name);

        // Auto-match by name if ID is missing
        if (!finalId && part.name) {
            const match = parts.find(p => normalizeArabic(p.name) === normName);
            if (match) {
                finalId = match.id;
                finalName = match.name;
                const qty = parseInt(formData.quantity) || 1;
                finalPrice = String(match.price * qty);
            }
        } else if (finalId) {
            // Selected from list
            const qty = parseInt(formData.quantity) || 1;
            const match = parts.find(p => p.id === finalId);
            if (match) {
                finalPrice = String(match.price * qty);
                finalName = match.name;
            }
        }

        setFormData(prev => ({
            ...prev,
            partId: finalId || '',
            partName: finalName,
            price: finalPrice,
            paidAmount: prev.paymentStatus === 'paid' ? finalPrice : prev.paidAmount
        }));
    };

    const handleNumericInput = (field, value, isFloat = false) => {
        const regex = isFloat ? /[^0-9.]/g : /[^0-9]/g;
        const cleaned = value.replace(regex, '');
        // For price calculation update if field is quantity
        setFormData(prev => {
            let next = { ...prev, [field]: cleaned };
            if (field === 'quantity') {
                const part = parts.find(p => p.id === formData.partId);
                const qtyVal = parseInt(cleaned) || 0;
                const newPrice = part ? part.price * qtyVal : prev.price;
                next.price = String(newPrice);
                if (prev.paymentStatus === 'paid') next.paidAmount = String(newPrice);
            }
            return next;
        });
    };

    const handleCustomerSelect = (cust) => {
        // Fallback: If no ID provided but name matches an existing customer exactly
        let finalId = cust.id;
        if (!finalId && cust.name) {
            const normName = normalizeArabic(cust.name);
            const match = customers.find(c => normalizeArabic(c.name) === normName);
            if (match) finalId = match.id;
        }

        setFormData(prev => ({
            ...prev,
            customerId: finalId || '',
            customerName: cust.name
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        // 1. Validate Part Selection (Must be from storage)
        if (!formData.partId) {
            window.showToast?.(t('selectPartFirst'), 'danger');
            return;
        }

        // 2. Validate Customer (Name is required)
        if (!formData.customerName.trim()) {
            window.showToast?.(t('selectCustomerFirst'), 'danger');
            return;
        }

        let finalCustomerId = formData.customerId;
        let customerFound = !!finalCustomerId;

        // Final fallback: Check by name if ID is still missing
        if (!finalCustomerId && formData.customerName) {
            const normName = normalizeArabic(formData.customerName);
            const match = customers.find(c => normalizeArabic(c.name) === normName);
            if (match) {
                finalCustomerId = match.id;
                customerFound = true;
            }
        }

        // Prevent implicit addition. User must select or use the "Add New" button which sets customerId.
        if (!customerFound) {
            const msg = settings.language === 'ar'
                ? `العميل "${formData.customerName}" غير مسجل. يرجى اختياره من القائمة أو الضغط على "إضافة كجديد"`
                : `Customer "${formData.customerName}" not found. Please select from list or click "Add as new"`;
            window.showToast?.(msg, 'warning');
            return;
        }

        const total = parseFloat(formData.price) || 0;

        // Calculate timestamp based on selectedDate
        const now = new Date();
        const selectedDateObj = new Date(selectedDate);
        // Combine selected date with current time
        selectedDateObj.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());

        const opData = {
            ...formData,
            customerId: finalCustomerId,
            customerName: formData.customerName.trim(),
            quantity: parseInt(formData.quantity) || 1,
            price: total,
            paidAmount: formData.paymentStatus === 'paid' ? total : (formData.paymentStatus === 'unpaid' ? 0 : parseFloat(formData.paidAmount || 0)),
            timestamp: selectedDateObj.toISOString() // Use the constructed date
        };

        const newOp = addOperation(opData);

        // No longer forcing update to current date
        // const currentDate = getLocalDateString();
        // setSelectedDate(currentDate);

        setShowModal(false);
        setFormData({ customerId: '', customerName: '', partId: '', partName: '', quantity: '1', price: '0', paidAmount: '0', paymentStatus: 'paid' });

        if (window.customConfirm) {
            window.customConfirm(t('operationSuccess'), t('printInvoiceQuestion'), () => {
                printReceipt(newOp, settings);
            });
        }
    };

    return (
        <div className="view-container">
            <header className="view-header">
                <div className="view-title">
                    <div className="view-icon">
                        <CalendarCheck size={24} />
                    </div>
                    <div>
                        <h1>{t('operations')}</h1>
                        <p>{settings.language === 'ar' ? 'سجل المبيعات والتعاملات الحالية' : 'Daily sales and current transactions log'}</p>
                        <p style={{ fontSize: '0.7rem', opacity: 0.5, marginTop: '0.25rem' }}>
                            {settings.language === 'ar' ? 'التاريخ الحالي' : 'Current'}: {getLocalDateString()} |
                            {settings.language === 'ar' ? ' المختار' : ' Selected'}: {selectedDate}
                        </p>
                    </div>
                </div>
                <div className="view-actions">
                    <CustomDatePicker
                        value={selectedDate}
                        onChange={(val) => setSelectedDate(val)}
                    />
                    <div className="search-box">
                        <Search className="search-icon" size={18} />
                        <input
                            type="text"
                            placeholder={t('search')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    {/* Only allow adding on Today */}
                    {selectedDate === getLocalDateString() && (
                        <button className="btn btn-primary" onClick={() => {
                            if (settings?.security?.authOnAddOperation) {
                                window.requestAdminAuth?.(() => setShowModal(true), settings.language === 'ar' ? 'تأكيد الهوية لإدراج عملية جديدة' : 'Identity confirmation to insert new operation');
                            } else {
                                setShowModal(true);
                            }
                        }}>
                            <Plus size={18} /> {t('newOperation')}
                        </button>
                    )}
                </div>
            </header>

            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th style={{ width: '15%' }}>{settings.language === 'ar' ? 'التاريخ والوقت' : 'Date & Time'}</th>
                            <th style={{ width: '20%' }}>{t('customer')}</th>
                            <th style={{ width: '20%' }}>{t('part')}</th>
                            <th style={{ width: '10%', textAlign: 'center' }}>{t('qty')}</th>
                            <th style={{ width: '15%', textAlign: 'center' }}>{t('total')}</th>
                            <th style={{ width: '10%', textAlign: 'center' }}>{t('status')}</th>
                            <th style={{ width: '10%', textAlign: 'center' }}>{t('actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredOps.length > 0 ? (
                            filteredOps.map(op => (
                                <tr
                                    key={op.id}
                                    onClick={() => setSelectedOpId(op.id)}
                                    style={{
                                        cursor: 'pointer',
                                        background: selectedOpId === op.id ? 'rgba(59, 130, 246, 0.08)' : undefined,
                                        borderLeft: selectedOpId === op.id ? '4px solid var(--primary-color)' : undefined
                                    }}
                                >
                                    <td>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <Clock size={14} style={{ color: 'var(--accent-color)' }} />
                                                <span dir="ltr" style={{ fontSize: 'var(--fs-sm)', fontWeight: 700, color: 'var(--text-primary)' }}>
                                                    {new Date(op.timestamp).toLocaleTimeString(settings.language === 'ar' ? 'ar-EG' : 'en-US', {
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                        hour12: true
                                                    })}
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingLeft: '1.2rem' }}>
                                                <span dir="ltr" style={{ fontSize: 'var(--fs-xs)', opacity: 0.7 }}>
                                                    {new Date(op.timestamp).toLocaleDateString(settings.language === 'ar' ? 'ar-EG' : 'en-US', {
                                                        year: 'numeric',
                                                        month: '2-digit',
                                                        day: '2-digit'
                                                    })}
                                                </span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="font-medium">{op.customerName}</td>
                                    <td>{op.partName}</td>
                                    <td style={{ textAlign: 'center' }}>{op.quantity}</td>
                                    <td className="font-medium" style={{ textAlign: 'center' }}>{op.price.toLocaleString()}</td>
                                    <td style={{ textAlign: 'center' }}>
                                        {op.paymentStatus === 'paid' ? (
                                            <span className="badge success">
                                                <CheckCircle2 size={12} strokeWidth={3} /> {t('fullyPaid')}
                                            </span>
                                        ) : op.paymentStatus === 'partial' ? (
                                            <span className="badge warning">
                                                <Clock size={12} strokeWidth={3} /> {t('partial')}
                                            </span>
                                        ) : (
                                            <span className="badge danger">
                                                <AlertCircle size={12} strokeWidth={3} /> {t('debt')}
                                            </span>
                                        )}
                                    </td>
                                    <td>
                                        <DropdownMenu options={[
                                            {
                                                label: t('preview'),
                                                icon: <Printer size={16} />,
                                                onClick: () => printReceipt(op, settings)
                                            },
                                            {
                                                label: t('delete'),
                                                icon: <Trash2 size={16} />,
                                                className: 'danger',
                                                onClick: () => {
                                                    const performDelete = () => {
                                                        window.customConfirm?.(t('delete'), settings.language === 'ar' ? 'هل أنت متأكد من حذف هذه العملية؟ سيتم استرجاع الكمية للمخزن وتعديل مديونية العميل.' : 'Are you sure you want to delete this operation? Stock quantity will be restored and customer debt will be adjusted.', () => {
                                                            deleteOperation(op.id);
                                                            window.showToast?.(t('delete'), 'success');
                                                        });
                                                    };

                                                    if (settings?.security?.authOnDeleteOperation) {
                                                        window.requestAdminAuth?.(performDelete, settings.language === 'ar' ? 'تأكيد الهوية لحذف العملية' : 'Identity confirmation to delete operation');
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
                                <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                                    {searchTerm || selectedDate ? (settings.language === 'ar' ? 'لا توجد نتائج تطابق بحثك و تاريخك بالتحديد' : 'No results matching your search and specific date') : t('noOperations')}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <Modal
                show={showModal}
                onClose={() => setShowModal(false)}
                title={t('newOperation')}
            >
                <form onSubmit={handleSubmit}>
                    <CustomAutocomplete
                        label={t('customer')}
                        items={customers}
                        value={formData.customerName}
                        onSelect={handleCustomerSelect}
                        onAddNew={(val) => {
                            setQuickName(val);
                            setShowQuickCust(true);
                        }}
                        placeholder={customers.length === 0
                            ? (settings.language === 'ar' ? 'لا يوجد عملاء.. أضف واحد أولاً' : 'No customers.. add one first')
                            : (settings.language === 'ar' ? 'اختر عميل من القائمة...' : 'Choose a customer from the list...')}
                        icon={User}
                        displaySubtext={(c) => c.phone ? `${t('phone')}: ${c.phone}` : ''}
                    />

                    <CustomAutocomplete
                        label={t('part')}
                        items={parts.filter(p => p.quantity > 0)}
                        value={formData.partName}
                        onSelect={handlePartSelect}
                        onAddNew={(val) => {
                            setQuickName(val);
                            setShowQuickPart(true);
                        }}
                        placeholder={settings.language === 'ar' ? 'يجب اختيار قطعة مسجلة بالمخزن...' : 'Must choose a piece registered in stock...'}
                        icon={Package}
                        displaySubtext={(p) => `${settings.language === 'ar' ? 'متوفر' : 'Available'}: ${p.quantity} - ${t('price')}: ${p.price}`}
                    />

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
                            <label>{settings.language === 'ar' ? 'إجمالي السعر' : 'Total Price'}</label>
                            <div className="input-with-icon">
                                <input
                                    type="text"
                                    required
                                    readOnly
                                    value={formData.price}
                                    style={{ background: 'var(--bg-input)' }}
                                />
                                <DollarSign size={16} />
                            </div>
                        </div>
                    </div>

                    <div className="form-group">
                        <label>{t('paymentStatus')}</label>
                        <select
                            value={formData.paymentStatus}
                            onChange={(e) => {
                                const status = e.target.value;
                                setFormData(prev => ({
                                    ...prev,
                                    paymentStatus: status,
                                    paidAmount: status === 'paid' ? prev.price : (status === 'unpaid' ? '0' : prev.paidAmount)
                                }));
                            }}
                        >
                            <option value="paid">{t('fullyPaid')}</option>
                            <option value="partial">{t('partial')}</option>
                            <option value="unpaid">{t('unpaid')}</option>
                        </select>
                    </div>

                    {formData.paymentStatus === 'partial' && (
                        <div className="form-group">
                            <label>{t('paidAmount')}</label>
                            <input
                                type="text"
                                required
                                placeholder="0"
                                value={formData.paidAmount}
                                onChange={(e) => handleNumericInput('paidAmount', e.target.value, true)}
                            />
                        </div>
                    )}

                    <div className="modal-footer" style={{ border: 'none', padding: 0, marginTop: '1.5rem' }}>
                        <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>{t('cancel')}</button>
                        <button type="submit" className="btn btn-primary">{settings.language === 'ar' ? 'حفظ العملية' : 'Save Operation'}</button>
                    </div>
                </form>
            </Modal>

            {/* Quick Add Customer Modal */}
            <Modal
                show={showQuickCust}
                onClose={() => setShowQuickCust(false)}
                title={settings.language === 'ar' ? 'إضافة عميل جديد بسرعة' : 'Quick Add New Customer'}
            >
                <CustomerForm
                    initialData={{ name: quickName }}
                    onSubmit={handleQuickCustSubmit}
                    onCancel={() => setShowQuickCust(false)}
                />
            </Modal>

            {/* Quick Add Part Modal */}
            <Modal
                show={showQuickPart}
                onClose={() => setShowQuickPart(false)}
                title={t('addPart')}
            >
                <PartForm
                    initialData={{ name: quickName }}
                    onSubmit={handleQuickPartSubmit}
                    onCancel={() => setShowQuickPart(false)}
                />
            </Modal>
        </div>
    );
};

export default Operations;
