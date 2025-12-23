import React, { useState, useContext, useEffect } from 'react';
import { Power, Download, Printer, ShieldCheck, AlertCircle } from 'lucide-react';
import { StoreContext } from '../store/StoreContext';
import { printEndSessionReport } from '../utils/printing';

const EndSessionModal = ({ isOpen, onClose, onFinish }) => {
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

    useEffect(() => {
        if (isOpen) {
            const todayStr = new Date().toISOString().split('T')[0];

            // 1. Operations today
            const dailyOps = (operations || []).filter(op =>
                op.timestamp && typeof op.timestamp === 'string' && op.timestamp.startsWith(todayStr)
            );

            const opsPaid = dailyOps.reduce((acc, op) => acc + (parseFloat(op.paidAmount) || 0), 0);
            const opsDebt = dailyOps.reduce((acc, op) => {
                const total = parseFloat(op.price) || 0;
                const paid = parseFloat(op.paidAmount) || 0;
                return acc + (total > paid ? total - paid : 0);
            }, 0);

            // 2. Manual Transactions today
            const dailyTx = (transactions || []).filter(tx =>
                tx.timestamp && typeof tx.timestamp === 'string' && tx.timestamp.startsWith(todayStr)
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
    }, [isOpen, data, operations, transactions]);

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
        link.download = `backup_${now.toISOString().split('T')[0]}.txt`;
        link.click();

        printEndSessionReport(currentExpected, parseFloat(actualAmount) || 0, diff, settings);

        onFinish();
    };

    return (
        <div className="modal-overlay">
            <div className="modal card" style={{ maxWidth: '500px' }}>
                <div className="modal-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--danger-color)' }}>
                        <Power size={24} />
                        <h2 style={{ margin: 0 }}>{t('endSession')}</h2>
                    </div>
                    <button className="close-modal" onClick={onClose}>&times;</button>
                </div>

                <div className="summary-box" style={{
                    background: 'var(--bg-input)',
                    padding: '1.5rem',
                    borderRadius: 'var(--radius-lg)',
                    marginBottom: '1.5rem',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem'
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
                            fontWeight: 700,
                            color: diff === 0 ? 'var(--success-color)' : (diff < 0 ? 'var(--danger-color)' : 'var(--success-color)')
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

                    <div className="modal-footer" style={{ border: 'none', padding: 0, marginTop: '2rem' }}>
                        <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '1rem', background: 'var(--danger-color)', border: 'none' }}>
                            {t('closePrintBackup')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EndSessionModal;
