import React, { useState, useContext, useEffect } from 'react';
import { Power, Download, Printer, ShieldCheck, AlertCircle } from 'lucide-react';
import { StoreContext } from '../store/StoreContext';
import { printEndSessionReport } from '../utils/printing';

const EndSessionModal = ({ isOpen, onClose, onFinish, sessionDate }) => {
    const {
        data, settings, exportData,
        operations, transactions, t
    } = useContext(StoreContext);

    const [actualAmount, setActualAmount] = useState('');
    const [password, setPassword] = useState('');
    const [stats, setStats] = useState({
        opsCount: 0,
        paidTotal: 0,
        newDebtTotal: 0
    });
    const [expectedAmount, setExpectedAmount] = useState(0);

    const targetDate = sessionDate || new Date().toISOString().split('T')[0];

    useEffect(() => {
        if (isOpen) {
            const dateToUse = targetDate;

            // 1. Operations for targetDate
            const dailyOps = (operations || []).filter(op =>
                op.timestamp && typeof op.timestamp === 'string' && op.timestamp.startsWith(dateToUse)
            );

            const opsPaid = dailyOps.reduce((acc, op) => acc + (parseFloat(op.paidAmount) || 0), 0);
            const opsDebt = dailyOps.reduce((acc, op) => {
                const total = parseFloat(op.price) || 0;
                const paid = parseFloat(op.paidAmount) || 0;
                return acc + (total > paid ? total - paid : 0);
            }, 0);

            // 2. Manual Transactions for targetDate
            const dailyTx = (transactions || []).filter(tx =>
                tx.timestamp && typeof tx.timestamp === 'string' && tx.timestamp.startsWith(dateToUse)
            );

            const txPaid = dailyTx.filter(t => t.type === 'payment').reduce((acc, t) => acc + (parseFloat(t.amount) || 0), 0);
            const txDebt = dailyTx.filter(t => t.type === 'debt').reduce((acc, t) => acc + (parseFloat(t.amount) || 0), 0);

            const totalPaid = opsPaid + txPaid;
            const totalDebt = opsDebt + txDebt;

            setStats({
                opsCount: dailyOps.length,
                paidTotal: totalPaid,
                newDebtTotal: totalDebt
            });
            setExpectedAmount(totalPaid);
        }
    }, [isOpen, data, operations, transactions, targetDate]);

    const handleNumericInput = (val) => {
        const cleaned = val.replace(/[^0-9.]/g, '');
        setActualAmount(cleaned);
    };

    if (!isOpen) return null;
    const currentExpected = stats.paidTotal; // Use paidTotal from stats for consistency
    const diff = (parseFloat(actualAmount) || 0) - currentExpected;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (password !== settings.adminPassword) {
            window.showToast?.(t('incorrectAdminPassword'), 'danger');
            return;
        }

        const backup = exportData();
        const now = new Date();
        const blob = new Blob([backup], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `backup_${targetDate}.txt`;
        link.click();

        printEndSessionReport(currentExpected, parseFloat(actualAmount) || 0, diff, settings);

        onFinish();
    };

    return (
        <div className="modal-overlay">
            <div className="modal card" style={{ maxWidth: '550px', width: '95%', maxHeight: '90vh' }}>
                <div className="modal-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--danger-color)' }}>
                        <Power size={24} />
                        <h2 style={{ margin: 0, fontSize: 'var(--fs-h2)' }}>
                            {t('endSession')}
                        </h2>
                    </div>
                    {!sessionDate && (
                        <button className="close-modal" onClick={onClose}>&times;</button>
                    )}
                </div>

                <div className="modal-body" style={{ paddingRight: '0.5rem' }}>
                    <div style={{
                        marginBottom: '1rem',
                        padding: '0.5rem 1rem',
                        background: 'rgba(59, 130, 246, 0.1)',
                        borderRadius: 'var(--radius-md)',
                        color: 'var(--accent-color)',
                        fontWeight: 700,
                        fontSize: '0.9rem',
                        textAlign: 'center'
                    }}>
                        {targetDate}
                    </div>

                    <div className="summary-box" style={{
                        background: 'var(--bg-input)',
                        padding: '1.25rem',
                        borderRadius: 'var(--radius-lg)',
                        marginBottom: '1.5rem',
                        border: '1px solid var(--border-color)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.75rem'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.9rem', opacity: 0.8 }}>{t('todayOpsCount')}</span>
                            <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--accent-color)' }}>{stats.opsCount} {t('operations')}</span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.75rem' }}>
                            <span style={{ fontSize: '0.9rem', opacity: 0.8 }}>{t('todayCashSales')}</span>
                            <span style={{ fontWeight: 800, fontSize: '1.25rem', color: 'var(--success-color)' }}>{stats.paidTotal.toLocaleString()}</span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.9rem', opacity: 0.8 }}>{t('todayNewDebt')}</span>
                            <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--warning-color)' }}>{stats.newDebtTotal.toLocaleString()}</span>
                        </div>

                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0.5rem 0 0', lineHeight: 1.4 }}>
                            * {t('cashSalesNote')}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label>{t('actualCashInSafe')}</label>
                            <input
                                type="text"
                                required
                                autoFocus
                                placeholder="0"
                                value={actualAmount}
                                onChange={(e) => handleNumericInput(e.target.value)}
                            />
                        </div>

                        {actualAmount && (
                            <div style={{
                                marginBottom: '1.5rem',
                                padding: '1rem',
                                borderRadius: 'var(--radius-md)',
                                background: diff === 0 ? 'rgba(16, 185, 129, 0.1)' : (diff < 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)'),
                                border: `1px solid ${diff === 0 ? 'var(--success-color)' : (diff < 0 ? 'var(--danger-color)' : 'var(--success-color)')}`,
                                fontWeight: 700,
                                color: diff === 0 ? 'var(--success-color)' : (diff < 0 ? 'var(--danger-color)' : 'var(--success-color)'),
                                textAlign: 'center'
                            }}>
                                {t('difference')} {diff === 0 ? t('balanced') : (diff < 0 ? `${t('shortage')} (${Math.abs(diff).toLocaleString()})` : `${t('surplus')} (${diff.toLocaleString()})`)}
                            </div>
                        )}

                        <div className="form-group">
                            <label>{t('adminPassword')}</label>
                            <div className="input-with-icon">
                                <input
                                    type="password"
                                    required
                                    placeholder={t('password') + '...'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                                <ShieldCheck size={18} />
                            </div>
                        </div>

                        <div className="modal-footer" style={{ border: 'none', padding: 0, marginTop: '2rem', display: 'block' }}>
                            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '1rem', background: 'var(--danger-color)', border: 'none', fontSize: '1rem', fontWeight: 700 }}>
                                {t('closePrintBackup')}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default EndSessionModal;
