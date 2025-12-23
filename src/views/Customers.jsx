import React, { useState, useContext } from 'react';
import {
    Users, Search, Plus, Phone, MapPin,
    UserPlus, Clock, Printer, Trash2, PenTool, Coins, History,
    CheckCircle2, AlertCircle
} from 'lucide-react';
import { StoreContext } from '../store/StoreContext';
import Modal from '../components/Modal';
import DropdownMenu from '../components/DropdownMenu';
import CustomerForm from '../components/CustomerForm';

const Customers = () => {
    const {
        customers, operations, transactions, deleteCustomer,
        addCustomer, updateCustomer, recordDirectTransaction,
        deleteTransaction, settings, t
    } = useContext(StoreContext);

    const [searchTerm, setSearchTerm] = useState('');
    const [showFormModal, setShowFormModal] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);

    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [customerForm, setCustomerForm] = useState({ id: '', name: '', phone: '', address: '' });
    const [directTx, setDirectTx] = useState({ amount: '', type: 'payment', note: '' });

    const filteredCustomers = customers.filter(customer =>
        customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.phone.includes(searchTerm)
    );


    const handleFormSubmit = (data) => {
        if (isEditMode) {
            updateCustomer(data.id, {
                name: data.name,
                phone: data.phone,
                address: data.address,
                balance: data.balance
            });
            window.showToast?.('تم تحديث بيانات العميل', 'success');
        } else {
            addCustomer(data);
            window.showToast?.('تم إضافة العميل بنجاح', 'success');
        }
        setShowFormModal(false);
    };

    const openAdd = () => {
        setIsEditMode(false);
        setCustomerForm({ id: '', name: '', phone: '', address: '', balance: '0' });
        setShowFormModal(true);
    };

    const openEdit = (customer) => {
        setIsEditMode(true);
        setCustomerForm({
            id: customer.id,
            name: customer.name,
            phone: customer.phone || '',
            address: customer.address || '',
            balance: String(customer.balance || 0)
        });
        setShowFormModal(true);
    };

    const openHistory = (customer) => {
        setSelectedCustomer(customer);
        setShowHistoryModal(true);
    };

    const handleDirectTxSubmit = (e) => {
        e.preventDefault();
        if (!selectedCustomer) return;

        const performAdd = () => {
            const msg = directTx.type === 'payment' ? 'تسديد دين / دفع مبلغ' : 'زيادة مديونية / سحب مبلغ';
            recordDirectTransaction(selectedCustomer.id, directTx.amount, directTx.type, directTx.note || msg);
            window.showToast?.('تم تسجيل العملية بنجاح', 'success');
            setDirectTx({ amount: '', type: 'payment', note: '' });
        };

        if (settings?.security?.authOnAddTransaction) {
            window.requestAdminAuth?.(performAdd, settings.language === 'ar' ? 'تأكيد الهوية لتسجيل عملة دفع / دين' : 'Identity confirmation to record payment/debt');
        } else {
            performAdd();
        }
    };

    const combinedHistory = selectedCustomer ? [
        ...operations.filter(op => op.customerId === selectedCustomer.id).map(op => ({
            id: op.id,
            timestamp: op.timestamp,
            label: `${op.partName} x ${op.quantity}`,
            amount: op.price,
            paid: op.paidAmount,
            source: 'operation'
        })),
        ...transactions.filter(tx => tx.customerId === selectedCustomer.id).map(tx => ({
            id: tx.id,
            timestamp: tx.timestamp,
            label: tx.note,
            amount: tx.type === 'debt' ? tx.amount : 0,
            paid: tx.type === 'payment' ? tx.amount : 0,
            source: 'transaction'
        }))
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)) : [];

    return (
        <div className="view-container">
            <header className="view-header">
                <div className="view-title">
                    <div className="view-icon">
                        <Users size={24} />
                    </div>
                    <div>
                        <h1>{t('customers')}</h1>
                        <p>{settings.language === 'ar' ? 'إدارة بيانات العملاء والتعاملات' : 'Manage customer data and transactions'}</p>
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
                    <button className="btn btn-primary" onClick={openAdd}>
                        <UserPlus size={18} /> {t('addCustomer')}
                    </button>
                </div>
            </header>

            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th style={{ width: '25%' }}>{t('customerName')}</th>
                            <th style={{ width: '20%' }}>{t('phone')}</th>
                            <th style={{ width: '30%' }}>{t('address')}</th>
                            <th style={{ width: '15%', textAlign: 'center' }}>{t('balance')}</th>
                            <th style={{ width: '10%', textAlign: 'center' }}>{t('actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredCustomers.length > 0 ? (
                            filteredCustomers.map(customer => (
                                <tr key={customer.id}>
                                    <td
                                        className="font-medium cursor-pointer hover-underline text-accent"
                                        onClick={() => openHistory(customer)}
                                    >
                                        {customer.name}
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <Phone size={14} className="text-secondary" />
                                            <span style={{ fontFamily: 'monospace' }}>{customer.phone || '-'}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <MapPin size={14} className="text-secondary" />
                                            <span style={{ fontSize: 'var(--fs-sm)' }}>{customer.address || '-'}</span>
                                        </div>
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        {(customer.balance || 0) > 0 ? (
                                            <span className="badge danger">
                                                <AlertCircle size={12} strokeWidth={3} />
                                                {(customer.balance || 0).toLocaleString()}
                                                <span style={{ fontSize: '0.75em', opacity: 0.8, marginInlineStart: '3px', fontWeight: 500 }}>({t('debt')})</span>
                                            </span>
                                        ) : (
                                            <span className="badge success">
                                                <CheckCircle2 size={12} strokeWidth={3} />
                                                {(customer.balance || 0).toLocaleString()}
                                            </span>
                                        )}
                                    </td>
                                    <td>
                                        <DropdownMenu options={[
                                            {
                                                label: t('history'),
                                                icon: <Clock size={16} />,
                                                onClick: () => openHistory(customer)
                                            },
                                            {
                                                label: t('edit'),
                                                icon: <PenTool size={16} />,
                                                onClick: () => openEdit(customer)
                                            },
                                            {
                                                label: t('delete'),
                                                icon: <Trash2 size={16} />,
                                                className: 'danger',
                                                onClick: () => {
                                                    const performDelete = () => {
                                                        window.customConfirm?.(t('delete'), `${t('delete')} "${customer.name}"؟`, () => {
                                                            deleteCustomer(customer.id);
                                                            window.showToast?.(t('delete'), 'success');
                                                        });
                                                    };

                                                    if (settings?.security?.authOnDeleteCustomer) {
                                                        window.requestAdminAuth?.(performDelete, settings.language === 'ar' ? 'تأكيد الهوية لحذف العميل' : 'Identity confirmation to delete customer');
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
                                <td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                                    {t('noCustomers')}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Customer Form Modal */}
            <Modal
                show={showFormModal}
                onClose={() => setShowFormModal(false)}
                title={isEditMode ? t('updateCustomer') : t('addCustomer')}
            >
                <CustomerForm
                    initialData={customerForm}
                    isEditMode={isEditMode}
                    onSubmit={handleFormSubmit}
                    onCancel={() => setShowFormModal(false)}
                />
            </Modal>

            {/* History Modal */}
            <Modal
                show={showHistoryModal}
                onClose={() => setShowHistoryModal(false)}
                title={`${t('history')}: ${selectedCustomer?.name}`}
                style={{ maxWidth: '800px' }}
            >
                {(() => {
                    const currentCust = customers.find(c => c.id === selectedCustomer?.id);
                    const bal = currentCust?.balance || 0;
                    return (
                        <div className="summary-box" style={{ background: 'var(--bg-input)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem', border: '1px solid var(--border-color)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontWeight: 600 }}>{settings.language === 'ar' ? 'إجمالي المديونية الحالية:' : 'Total Current Debt:'}</span>
                                <span style={{ fontSize: 'var(--fs-h2)', fontWeight: 800, color: bal > 0 ? 'var(--danger-color)' : 'var(--success-color)' }}>
                                    {Math.abs(bal).toLocaleString()}
                                </span>
                            </div>
                        </div>
                    );
                })()}

                <div className="table-container" style={{ maxHeight: '350px', marginBottom: '1.5rem', overflowY: 'auto' }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th style={{ width: '22%' }}>{t('date')}</th>
                                <th style={{ width: '40%' }}>{t('notes')}</th>
                                <th style={{ width: '19%', textAlign: 'center' }}>{t('total')}</th>
                                <th style={{ width: '19%', textAlign: 'center' }}>{t('paid')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {combinedHistory.length > 0 ? combinedHistory.map(item => (
                                <tr key={item.id}>
                                    <td style={{ fontSize: 'var(--fs-xs)', opacity: 0.7 }}>{new Date(item.timestamp).toLocaleDateString()}</td>
                                    <td className="font-medium" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        {item.label}
                                        {item.source === 'transaction' && (
                                            <button
                                                className="btn-icon text-danger"
                                                style={{ padding: '4px' }}
                                                onClick={() => {
                                                    const performDelete = () => {
                                                        window.customConfirm?.(t('delete'), `${t('delete')} ${t('addTransaction')}?`, () => {
                                                            deleteTransaction(item.id);
                                                            window.showToast?.(t('delete'), 'success');
                                                        });
                                                    };

                                                    if (settings?.security?.authOnDeleteTransaction) {
                                                        window.requestAdminAuth?.(performDelete, settings.language === 'ar' ? 'تأكيد الهوية لحذف سجل الدفع / الدين' : 'Identity confirmation to delete payment/debt record');
                                                    } else {
                                                        performDelete();
                                                    }
                                                }}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </td>
                                    <td style={{ color: item.amount > 0 ? 'var(--danger-color)' : 'inherit', textAlign: 'center' }}>{item.amount > 0 ? item.amount.toLocaleString() : '-'}</td>
                                    <td style={{ color: item.paid > 0 ? 'var(--success-color)' : 'inherit', textAlign: 'center' }} className="font-medium">{item.paid > 0 ? item.paid.toLocaleString() : '-'}</td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="4" style={{ textAlign: 'center', padding: '2rem', opacity: 0.5 }}>{t('noOperations')}</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
                    <h3 style={{ fontSize: 'var(--fs-h3)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Coins size={20} className="text-accent" /> {t('addTransaction')}
                    </h3>
                    <form onSubmit={handleDirectTxSubmit}>
                        <div className="settings-button-grid" style={{ marginBottom: '1rem' }}>
                            <div className="form-group">
                                <label style={{ fontSize: 'var(--fs-sm)' }}>{t('amount')}</label>
                                <input
                                    type="text"
                                    required
                                    value={directTx.amount}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/[^0-9]/g, '');
                                        setDirectTx({ ...directTx, amount: val });
                                    }}
                                    placeholder="0"
                                />
                            </div>
                            <div className="form-group">
                                <label style={{ fontSize: 'var(--fs-sm)' }}>{t('status')}</label>
                                <select
                                    value={directTx.type}
                                    onChange={(e) => setDirectTx({ ...directTx, type: e.target.value })}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <option value="payment">{t('payment')}</option>
                                    <option value="debt">{t('debt')}</option>
                                </select>
                            </div>
                        </div>
                        <div className="form-group">
                            <label style={{ fontSize: 'var(--fs-sm)' }}>{t('notes')}</label>
                            <input
                                type="text"
                                value={directTx.note}
                                onChange={(e) => setDirectTx({ ...directTx, note: e.target.value })}
                                placeholder={t('notes')}
                            />
                        </div>
                        <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem', borderRadius: 'var(--radius-md)' }}>
                            {t('save')}
                        </button>
                    </form>
                </div>
            </Modal>
        </div>
    );
};

export default Customers;
