import React, { useState, useContext, useEffect, useRef } from 'react';
import {
    CalendarCheck, Search, Plus, Trash2,
    Printer, Clock, User, Package, DollarSign,
    CheckCircle2, AlertCircle, Edit2, X
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

const CustomAutocomplete = ({ label, items, value, onSelect, onAddNew, placeholder, icon: Icon, displaySubtext, disabled, inputRef, onEnter }) => {
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
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            if (onEnter) onEnter(inputValue);
                        }
                    }}
                    onChange={(e) => {
                        const val = e.target.value;
                        setInputValue(val);
                        setShowList(true);

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
                    disabled={disabled}
                />
                {Icon && <Icon size={16} />}
            </div>
            {showList && !disabled && (inputValue || filtered.length > 0) && (
                <div className="action-menu show" style={{
                    position: 'absolute', top: '100%', left: 0, right: 0,
                    width: 'auto', maxHeight: '200px', overflowY: 'auto', zIndex: 100
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
                            {t('noItemsFound') || 'No items found'}
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
                                <span>{t('addNewItemPrefix') + `"${inputValue}"` + t('addNewItemSuffix')}</span>
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
        addOperation, updateOperation, deleteOperation, settings,
        addCustomer, addPart, t
    } = useContext(StoreContext);

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
    const [isEditMode, setIsEditMode] = useState(false);
    const [editingOpId, setEditingOpId] = useState(null);
    const [selectedOpId, setSelectedOpId] = useState(null);
    const invoiceRef = useRef(null);
    const [panelSize, setPanelSize] = useState('large'); // large | medium | small
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyPress = (e) => {
            if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

            const key = e.key.toLowerCase();

            // P or ح (Arabic Haa) for Printing
            if ((key === 'p' || key === 'ح') && selectedOpId) {
                const op = operations.find(o => o.id === selectedOpId);
                if (op) {
                    printReceipt(op, settings);
                    window.showToast?.(settings.language === 'ar' ? 'جاري الطباعة...' : 'Printing...', 'success');
                }
            }

            // O or خ (Arabic Khaa) for Opening New Operation
            if ((key === 'o' || key === 'خ') && selectedDate === getLocalDateString()) {
                e.preventDefault();
                if (settings?.security?.authOnAddOperation) {
                    window.requestAdminAuth?.(() => {
                        setIsEditMode(false);
                        setShowModal(true);
                    }, settings.language === 'ar' ? 'تأكيد الهوية لإدراج عملية جديدة' : 'Identity confirmation to insert new operation');
                } else {
                    setIsEditMode(false);
                    setShowModal(true);
                }
            }
        };
        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [selectedOpId, operations, settings, selectedDate]);

    // Quick shortcut: when / is pressed and the invoice panel is open, focus part search
    useEffect(() => {
        const handler = (e) => {
            if (e.key === '/' && showModal) {
                e.preventDefault();
                partSearchRef?.current?.focus?.();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [showModal]);

    // Observe invoice panel width to set responsive mode (watch modal width specifically)
    useEffect(() => {
        if (!invoiceRef.current) return;
        const el = invoiceRef.current;
        const obs = new ResizeObserver(entries => {
            for (const entry of entries) {
                const w = entry.contentRect.width;
                if (w <= 700) setPanelSize('small');
                else if (w <= 1100) setPanelSize('medium');
                else setPanelSize('large');
            }
        });
        obs.observe(el);
        return () => obs.disconnect();
    }, [invoiceRef, showModal]);

    // Quick Add States
    const [showQuickCust, setShowQuickCust] = useState(false);
    const [showQuickPart, setShowQuickPart] = useState(false);
    const [quickName, setQuickName] = useState('');
    const [targetItemIndex, setTargetItemIndex] = useState(-1);

    const initialFormData = {
        customerId: '',
        customerName: '',
        items: [], // Start with empty list
        price: '0', // total price
        paidAmount: '0',
        paymentStatus: 'paid',
        extraInputs: (settings.extraReceiptInputs || []).map(inp => ({ ...inp, value: '' }))
    };

    const [formData, setFormData] = useState(initialFormData);

    const handleQuickCustSubmit = (data) => {
        const newCust = addCustomer(data);
        setFormData(prev => ({ ...prev, customerId: newCust.id, customerName: newCust.name }));
        setShowQuickCust(false);
        window.showToast?.(t('customerAddedSuccess'), 'success');
    };

    const handleQuickPartSubmit = (data) => {
        const newPart = addPart(data);

        // Update currentItem with the newly created part
        setCurrentItem(prev => ({
            ...prev,
            partId: newPart.id,
            partName: newPart.name,
            unitPrice: String(newPart.price)
        }));

        setShowQuickPart(false);
        window.showToast?.(t('partAddedSuccess'), 'success');
    };

    const filteredOps = operations.filter(op => {
        const d = new Date(op.timestamp);
        const opDateString = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

        const matchesSearch = op.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (op.items || []).some(item => item.partName.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (op.partName && op.partName.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesDate = !selectedDate || opDateString === selectedDate;
        return matchesSearch && matchesDate;
    }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    const handleItemPartSelect = (index, part) => {
        const newItems = [...formData.items];
        let finalId = part.id;
        let finalName = part.name;
        let finalPrice = newItems[index].price;
        const normName = normalizeArabic(part.name);

        if (!finalId && part.name) {
            const match = parts.find(p => normalizeArabic(p.name) === normName);
            if (match) {
                finalId = match.id;
                finalName = match.name;
                finalPrice = String(match.price);
            }
        } else if (finalId) {
            const match = parts.find(p => p.id === finalId);
            if (match) {
                finalPrice = String(match.price);
                finalName = match.name;
            }
        }

        newItems[index] = {
            ...newItems[index],
            partId: finalId || '',
            partName: finalName,
            price: finalPrice
        };

        const total = newItems.reduce((acc, item) => acc + (parseFloat(item.price) * (parseInt(item.quantity) || 1)), 0);

        setFormData(prev => ({
            ...prev,
            items: newItems,
            price: String(total),
            paidAmount: prev.paymentStatus === 'paid' ? String(total) : prev.paidAmount
        }));
    };

    const [currentItem, setCurrentItem] = useState({ partId: '', partName: '', quantity: '1', unitPrice: '0' });
    const partSearchRef = useRef(null);

    const updateCartItem = (index, updates) => {
        setFormData(prev => {
            const items = prev.items.map((it, i) => i === index ? { ...it, ...updates } : it);
            const price = items.reduce((acc, item) => acc + ((parseInt(item.quantity) || 0) * (parseFloat(item.price) || 0)), 0);
            return { ...prev, items, price: String(price), paidAmount: prev.paymentStatus === 'paid' ? String(price) : prev.paidAmount };
        });
    };

    const addSelectedPart = (part) => {
        // Add selected part immediately to items with default quantity 1; if exists, increment quantity
        if (!part || !part.name) return;
        const partId = part.id || '';
        const name = part.name;
        const unitPrice = part.price ? parseFloat(part.price) : 0;
        const stock = parseInt(part.quantity) || 0;

        // Check if negative stock is allowed (default to true if undefined to be safe, or match settings default)
        const allowNegative = settings.security?.allowNegativeStock !== false;

        setFormData(prev => {
            const items = [...(prev.items || [])];

            // Try to find existing by id first, fallback to name
            const existingIndex = items.findIndex(i => (i.partId && partId && i.partId === partId) || (i.partName && normalizeArabic(i.partName) === normalizeArabic(name)));

            let requestedQty = 1;
            if (existingIndex >= 0) {
                requestedQty = (parseInt(items[existingIndex].quantity) || 0) + 1;
            }

            if (!allowNegative && requestedQty > stock) {
                window.showToast?.(t('requestedQuantityExceedsStock'), 'warning');
                return prev; // No change
            }

            if (existingIndex >= 0) {
                items[existingIndex] = {
                    ...items[existingIndex],
                    quantity: requestedQty,
                    price: items[existingIndex].price !== undefined ? items[existingIndex].price : unitPrice
                };
            } else {
                if (!allowNegative && 1 > stock) {
                    window.showToast?.(t('requestedQuantityExceedsStock'), 'warning');
                    return prev;
                }
                items.push({ partId, partName: name, quantity: 1, price: unitPrice });
            }

            const grandTotal = items.reduce((acc, item) => acc + ((parseInt(item.quantity) || 0) * (parseFloat(item.price) || 0)), 0);

            return {
                ...prev,
                items,
                price: String(grandTotal),
                paidAmount: prev.paymentStatus === 'paid' ? String(grandTotal) : prev.paidAmount
            };
        });

        // reset any currentItem inputs
        setCurrentItem({ partId: '', partName: '', quantity: '1', unitPrice: '0' });
    };

    const handleAddItemToList = () => {
        if (!currentItem.partId || !currentItem.partName) {
            window.showToast?.(t('selectPartFirst'), 'warning');
            return;
        }

        const qty = parseInt(currentItem.quantity) || 1;
        const unitPrice = parseFloat(currentItem.unitPrice) || 0;
        const itemTotal = qty * unitPrice;

        const newItem = {
            partId: currentItem.partId,
            partName: currentItem.partName,
            quantity: qty,
            price: unitPrice, // Store unit price
            total: itemTotal
        };

        const updatedItems = [...formData.items, newItem];
        const grandTotal = updatedItems.reduce((acc, item) => acc + (item.quantity * item.price), 0);

        setFormData(prev => ({
            ...prev,
            items: updatedItems,
            price: String(grandTotal),
            paidAmount: prev.paymentStatus === 'paid' ? String(grandTotal) : prev.paidAmount
        }));

        // Reset current item
        setCurrentItem({ partId: '', partName: '', quantity: '1', unitPrice: '0' });
    };

    const removeItemFromList = (index) => {
        const newItems = formData.items.filter((_, i) => i !== index);
        const total = newItems.reduce((acc, item) => acc + ((parseInt(item.quantity) || 0) * (parseFloat(item.price) || 0)), 0);

        setFormData(prev => ({
            ...prev,
            items: newItems,
            price: String(total),
            paidAmount: prev.paymentStatus === 'paid' ? String(total) : prev.paidAmount
        }));
    };

    const handleCustomerSelect = (cust) => {
        let finalId = '';
        let finalName = cust.name || '';

        // First, check if we have a direct ID match
        if (cust.id && customers.find(c => c.id === cust.id)) {
            finalId = cust.id;
            const matched = customers.find(c => c.id === cust.id);
            finalName = matched.name;
        }
        // If no ID or ID not found, search by normalized name
        else if (cust.name) {
            const normName = normalizeArabic(cust.name.trim());
            const match = customers.find(c => normalizeArabic(c.name) === normName);
            if (match) {
                finalId = match.id;
                finalName = match.name;
            }
        }

        setFormData(prev => ({
            ...prev,
            customerId: finalId,
            customerName: finalName
        }));
    };


    const handleExtraInput = (id, val) => {
        setFormData(prev => ({
            ...prev,
            extraInputs: prev.extraInputs.map(inp => inp.id === id ? { ...inp, value: val } : inp)
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!formData.items || formData.items.length === 0) {
            window.showToast?.(t('addAtLeastOneItem'), 'danger');
            return;
        }

        if (formData.items.some(i => !i.partId)) {
            window.showToast?.(t('selectPartFirst'), 'danger');
            return;
        }

        if (!formData.customerName.trim()) {
            window.showToast?.(t('selectCustomerFirst'), 'danger');
            return;
        }

        // Stock Validation
        if (settings.security?.allowNegativeStock === false) {
            for (const item of formData.items) {
                const part = parts.find(p => p.id === item.partId);
                if (part) {
                    const qty = parseInt(item.quantity) || 0;
                    if (qty > part.quantity) {
                        window.showToast?.(
                            `${t('insufficientStockFor')}: ${item.partName} (${t('quantityAvailable')}: ${part.quantity})`,
                            'danger'
                        );
                        return;
                    }
                }
            }
        }

        let finalCustomerId = formData.customerId;

        // Resolve customer if ID is missing (common in text input entry)
        if (!finalCustomerId && formData.customerName) {
            const normName = normalizeArabic(formData.customerName.trim());
            // 1) exact normalized name match
            let match = customers.find(c => normalizeArabic(c.name) === normName);
            // 2) fallback: includes match
            if (!match) match = customers.find(c => normalizeArabic(c.name).includes(normName) || normName.includes(normalizeArabic(c.name)));
            // 3) fallback: phone
            if (!match && /^[0-9]{3,}$/.test(formData.customerName.trim())) {
                const phone = formData.customerName.replace(/[^0-9]/g, '');
                match = customers.find(c => (c.phone || '').replace(/[^0-9]/g, '') === phone);
            }

            if (match) {
                finalCustomerId = match.id;
                formData.customerName = match.name; // normalize display name
            }
        }

        if (!finalCustomerId) {
            // Auto-create new customer if not found
            const newCust = addCustomer({ name: formData.customerName.trim(), phone: '', address: '' });
            finalCustomerId = newCust.id;
            window.showToast?.(t('newCustomerCreated'), 'success');
        }

        const total = parseFloat(formData.price) || 0;
        const opData = {
            ...formData,
            customerId: finalCustomerId,
            customerName: formData.customerName.trim(),
            price: total,
            paidAmount: formData.paymentStatus === 'paid' ? total : (formData.paymentStatus === 'unpaid' ? 0 : parseFloat(formData.paidAmount || 0)),
            items: formData.items.map(item => ({
                ...item,
                quantity: parseInt(item.quantity) || 1,
                price: parseFloat(item.price) || 0
            }))
        };

        if (isEditMode) {
            updateOperation(editingOpId, opData);
            window.showToast?.(t('updateOperationDetails'), 'success');
        } else {
            const now = new Date();
            const selectedDateObj = new Date(selectedDate);
            selectedDateObj.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
            opData.timestamp = selectedDateObj.toISOString();

            const newOp = addOperation(opData);
            if (window.customConfirm) {
                window.customConfirm(t('operationSuccess'), t('printInvoiceQuestion'), () => {
                    printReceipt(newOp, settings);
                });
            }
        }

        setShowModal(false);
        setFormData(initialFormData);
        setIsEditMode(false);
        setEditingOpId(null);
    };

    const openEditModal = (op) => {
        setEditingOpId(op.id);
        const opItems = op.items || [{ partId: op.partId, partName: op.partName, quantity: String(op.quantity), price: String(op.price) }];

        setFormData({
            customerId: op.customerId,
            customerName: op.customerName,
            items: opItems.map(i => ({ ...i, quantity: String(i.quantity), price: String(i.price / (i.quantity || 1)) })),
            price: String(op.price),
            paidAmount: String(op.paidAmount),
            paymentStatus: op.paymentStatus,
            extraInputs: (op.extraInputs || (settings.extraReceiptInputs || []).map(inp => ({ ...inp, value: '' })))
        });
        setIsEditMode(true);
        setShowModal(true);
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
                        <p>{t('operationsLog')}</p>
                        <p style={{ fontSize: '0.7rem', opacity: 0.5, marginTop: '0.25rem' }}>
                            {t('currentDate')}: {getLocalDateString()} |
                            {t('selectedDate')}: {selectedDate}
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
                    {selectedDate === getLocalDateString() && (
                        <button className="btn btn-primary" onClick={() => {
                            if (settings?.security?.authOnAddOperation) {
                                window.requestAdminAuth?.(() => {
                                    setIsEditMode(false);
                                    setFormData(initialFormData);
                                    setShowModal(true);
                                }, t('identityConfirmAddOp'));
                            } else {
                                setIsEditMode(false);
                                setFormData(initialFormData);
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
                            <th style={{ width: '15%' }}>{t('dateAndTime')}</th>
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
                                                        hour: '2-digit', minute: '2-digit', hour12: true
                                                    })}
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingLeft: '1.2rem' }}>
                                                <span dir="ltr" style={{ fontSize: 'var(--fs-xs)', opacity: 0.7 }}>
                                                    {new Date(op.timestamp).toLocaleDateString(settings.language === 'ar' ? 'ar-EG' : 'en-US', {
                                                        year: 'numeric', month: '2-digit', day: '2-digit'
                                                    })}
                                                </span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="font-medium">{op.customerName}</td>
                                    <td>
                                        {op.items ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                                                {op.items.map((item, idx) => (
                                                    <span key={idx} style={{ fontSize: '0.85em' }}>
                                                        {item.partName} {op.items.length > 1 && `(${item.quantity})`}
                                                    </span>
                                                ))}
                                            </div>
                                        ) : op.partName}
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        {op.items ? op.items.reduce((acc, curr) => acc + curr.quantity, 0) : op.quantity}
                                    </td>
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
                                                label: t('edit'),
                                                icon: <Edit2 size={16} />,
                                                onClick: () => {
                                                    const performEdit = () => openEditModal(op);
                                                    if (settings?.security?.authOnEditOperation) {
                                                        window.requestAdminAuth?.(performEdit, t('identityConfirmEditOp'));
                                                    } else {
                                                        performEdit();
                                                    }
                                                }
                                            },
                                            {
                                                label: t('delete'),
                                                icon: <Trash2 size={16} />,
                                                className: 'danger',
                                                onClick: () => {
                                                    const performDelete = () => {
                                                        window.customConfirm?.(t('delete'), t('deleteOperationConfirm'), () => {
                                                            deleteOperation(op.id);
                                                            window.showToast?.(t('delete'), 'success');
                                                        });
                                                    };
                                                    if (settings?.security?.authOnDeleteOperation) {
                                                        window.requestAdminAuth?.(performDelete, t('identityConfirmDeleteOp'));
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
                                    {searchTerm || selectedDate ? t('noSearchResults') : t('noOperations')}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Invoice Full Screen Modal (POS Style) */}
            {showModal && (
                <div className={`invoice-overlay ${showModal ? 'open' : ''}`} onClick={(e) => {
                    if (e.target.classList.contains('invoice-overlay')) {
                        setShowModal(false);
                        setIsEditMode(false);
                        setFormData(initialFormData);
                        setSidebarOpen(false);
                    }
                }}>
                    <div ref={invoiceRef} data-panel-size={panelSize} className="invoice-panel">
                        <form onSubmit={handleSubmit} className="pos-layout">
                            {/* LEFT SIDE: Operations (Items) */}
                            <div className="pos-main">
                                <div className="pos-header">
                                    <div>
                                        <h2>{isEditMode ? t('editOperation') : t('newOperation')}</h2>
                                        <div className="pos-date">
                                            <Clock size={14} /> {new Date().toLocaleDateString(settings.language === 'ar' ? 'ar-EG' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                        </div>
                                    </div>
                                    {panelSize === 'small' && (
                                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                            <button type="button" className="btn btn-ghost sidebar-toggle" onClick={() => setSidebarOpen(s => !s)}>
                                                <User size={16} /> {sidebarOpen ? t('close') : t('details')}
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Part Search (Big & Prominent) */}
                                <div className="pos-search-section">
                                    <CustomAutocomplete
                                        // label={t('addItem')} // Removed label for cleaner look
                                        items={parts.filter(p => p.quantity > 0)}
                                        value={currentItem.partName}
                                        onSelect={(p) => addSelectedPart(p)}
                                        onEnter={(val) => {
                                            const normVal = normalizeArabic(val.trim());
                                            const match = parts.find(p => normalizeArabic(p.name) === normVal) || parts.find(p => normalizeArabic(p.name).includes(normVal));
                                            if (match) addSelectedPart(match);
                                            else {
                                                setQuickName(val);
                                                setShowQuickPart(true); // Assuming quick add part logic exists
                                            }
                                        }}
                                        onAddNew={(val) => {
                                            setQuickName(val);
                                            setTargetItemIndex(-1);
                                            setShowQuickPart(true);
                                        }}
                                        placeholder={t('searchProductPlaceholder')}
                                        icon={Search}
                                        displaySubtext={(p) => `${t('stockAbbr') || t('stock')}: ${p.quantity} | ${t('price')}: ${p.price}`}
                                        inputRef={partSearchRef}
                                    />
                                </div>

                                {/* Items Table */}
                                <div className="pos-items-container">
                                    {formData.items && formData.items.length > 0 ? (
                                        <table className="pos-table">
                                            <thead>
                                                <tr>
                                                    <th width="40%">{t('part')}</th>
                                                    <th width="15%" className="text-center">{t('qty')}</th>
                                                    <th width="20%" className="text-center">{t('price')}</th>
                                                    <th width="20%" className="text-center">{t('total')}</th>
                                                    <th width="5%"></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {formData.items.map((item, index) => (
                                                    <tr key={index}>
                                                        <td>
                                                            <div className="pos-item-name">{item.partName}</div>
                                                            {item.partId && <div className="pos-item-meta">{t('stock')}: {parts.find(p => p.id === item.partId)?.quantity ?? '-'}</div>}
                                                        </td>
                                                        <td>
                                                            <input
                                                                type="text" // changed from number
                                                                className="pos-input center"
                                                                value={item.quantity}
                                                                onChange={(e) => {
                                                                    const val = e.target.value.replace(/[^0-9]/g, ''); // Integers only
                                                                    updateCartItem(index, { quantity: val })
                                                                }}
                                                            />
                                                        </td>
                                                        <td>
                                                            <input
                                                                type="text" // changed from number
                                                                className="pos-input center"
                                                                value={item.price}
                                                                disabled={settings?.security?.allowPriceEdit === false} // Check setting
                                                                onChange={(e) => {
                                                                    const val = e.target.value.replace(/[^0-9.]/g, ''); // Decimals allowed
                                                                    if ((val.match(/\./g) || []).length > 1) return; // Only one decimal point
                                                                    updateCartItem(index, { price: val })
                                                                }}
                                                            />
                                                        </td>
                                                        <td className="text-center font-bold">
                                                            {(parseFloat(item.quantity || 0) * parseFloat(item.price || 0)).toLocaleString()}
                                                        </td>
                                                        <td>
                                                            <button type="button" className="pos-btn-icon danger" onClick={() => removeItemFromList(index)}>
                                                                <Trash2 size={18} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    ) : (
                                        <div className="pos-empty-state">
                                            <Package size={48} />
                                            <p>{t('noPartsAdded')}</p>
                                            <span>{settings.language === 'ar' ? 'استخدم البحث أعلاه لإضافة منتجات' : 'Use search above to add products'}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* RIGHT SIDE: Checkout & Customer */}
                            <div className={`pos-sidebar ${panelSize === 'small' && sidebarOpen ? 'mobile-drawer' : ''}`} data-hidden={panelSize === 'small' && !sidebarOpen}>
                                {/* Customer Card */}
                                <div className="pos-card customer-card">
                                    <div className="card-label"><User size={14} /> {t('customer')}</div>
                                    <CustomAutocomplete
                                        items={customers}
                                        value={formData.customerName}
                                        onSelect={handleCustomerSelect}
                                        onAddNew={(val) => {
                                            setQuickName(val);
                                            setShowQuickCust(true);
                                        }}
                                        placeholder={settings.language === 'ar' ? 'اسم العميل...' : 'Customer Name...'}
                                        displaySubtext={(c) => c.phone}
                                    />

                                </div>

                                {/* Payment Details */}
                                <div className="pos-card payment-card">
                                    <div className="card-label"><DollarSign size={14} /> {t('paymentStats')}</div>

                                    <div className="pos-totals">
                                        <div className="total-row main">
                                            <span>{t('total')}</span>
                                            <span>{parseFloat(formData.price || 0).toLocaleString()} <small>{settings.currency || '$'}</small></span>
                                        </div>
                                    </div>

                                    <div className="payment-status-selector">
                                        <button type="button"
                                            className={`status-btn ${formData.paymentStatus === 'paid' ? 'active success' : ''}`}
                                            onClick={() => setFormData(p => ({ ...p, paymentStatus: 'paid', paidAmount: p.price }))}
                                        >
                                            <CheckCircle2 size={18} /> {t('fullyPaid')}
                                        </button>
                                        <button type="button"
                                            className={`status-btn ${formData.paymentStatus === 'partial' ? 'active warning' : ''}`}
                                            onClick={() => setFormData(p => ({ ...p, paymentStatus: 'partial' }))}
                                        >
                                            <Clock size={18} /> {t('partial')}
                                        </button>
                                        <button type="button"
                                            className={`status-btn ${formData.paymentStatus === 'unpaid' ? 'active danger' : ''}`}
                                            onClick={() => setFormData(p => ({ ...p, paymentStatus: 'unpaid', paidAmount: '0' }))}
                                        >
                                            <AlertCircle size={18} /> {t('debt')}
                                        </button>
                                    </div>

                                    {formData.paymentStatus === 'partial' && (
                                        <div className="partial-input-group">
                                            <label>{t('paidAmount')}</label>
                                            <input
                                                type="text" // changed from number
                                                value={formData.paidAmount}
                                                onChange={(e) => {
                                                    const val = e.target.value.replace(/[^0-9.]/g, ''); // Decimals allowed
                                                    if ((val.match(/\./g) || []).length > 1) return;
                                                    setFormData(p => ({ ...p, paidAmount: val }))
                                                }}
                                                className="pos-input"
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="pos-actions">
                                    <button type="button" className="pos-btn secondary" onClick={() => { setShowModal(false); setFormData(initialFormData); }}>
                                        {t('cancel')}
                                    </button>
                                    <button type="submit" className="pos-btn primary large">
                                        {isEditMode ? t('save') : t('completeSale')}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <Modal show={showQuickCust} onClose={() => setShowQuickCust(false)} title={t('quickAddNewCustomer')}>
                <CustomerForm initialData={{ name: quickName }} onSubmit={handleQuickCustSubmit} onCancel={() => setShowQuickCust(false)} />
            </Modal>

            <Modal show={showQuickPart} onClose={() => setShowQuickPart(false)} title={t('addPart')}>
                <PartForm initialData={{ name: quickName }} onSubmit={handleQuickPartSubmit} onCancel={() => setShowQuickPart(false)} />
            </Modal>
        </div>
    );
};

export default Operations;
