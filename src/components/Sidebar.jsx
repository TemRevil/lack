import React from 'react';
import { CalendarCheck, Boxes, Users, Bell, Settings, Power, Wallet, LogOut } from 'lucide-react';
import { useStore } from '../store/StoreContext';

const Sidebar = ({ currentTab, setTab, onLogout, onEndSession, notificationsCount, isMobileShow }) => {
    const { getDailyCollectedTotal, settings, t } = useStore();
    const dailyTotal = getDailyCollectedTotal();
    const showBalance = settings?.security?.showSessionBalance ?? true;
    const menuItems = [
        { id: 'operations', label: t('operations'), icon: CalendarCheck },
        { id: 'storage', label: t('storage'), icon: Boxes },
        { id: 'customers', label: t('customers'), icon: Users },
        { id: 'notifications', label: t('notifications'), icon: Bell, badge: notificationsCount },
        { id: 'settings', label: t('settings'), icon: Settings },
    ];

    return (
        <aside className={`sidebar ${isMobileShow ? 'show' : ''}`}>
            <div className="brand">
                <i className="fa-solid fa-gears" style={{ fontSize: 'var(--fs-h2)' }}></i>
                <h2>{settings?.appTitle ? settings.appTitle.substring(0, 20) : t('appName')}</h2>
            </div>

            {showBalance && (
                <div className="session-summary" style={{
                    margin: '0 0.5rem 1.5rem',
                    padding: '1rem',
                    background: 'rgba(52, 211, 153, 0.1)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid rgba(52, 211, 153, 0.2)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.25rem'
                }}>
                    <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--success-color)', fontWeight: 700, opacity: 0.8 }}>{t('dailyBalance')}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Wallet size={16} className="text-success" />
                        <span style={{ fontSize: 'var(--fs-h3)', fontWeight: 800, color: 'var(--text-primary)' }}>
                            {dailyTotal.toLocaleString()}
                        </span>
                    </div>
                </div>
            )}
            <nav>
                <ul className="nav-links">
                    {menuItems.map(item => (
                        <li
                            key={item.id}
                            className={currentTab === item.id ? 'active' : ''}
                            onClick={() => setTab(item.id)}
                        >
                            <div className="nav-item-group">
                                <item.icon size={20} />
                                <span>{item.label}</span>
                            </div>
                            {item.badge > 0 && <span className="badge">{item.badge}</span>}
                        </li>
                    ))}
                    <li className="nav-logout" onClick={onEndSession} style={{ marginTop: 'auto' }}>
                        <div className="nav-item-group">
                            <Power size={20} />
                            <span>{t('endSession')}</span>
                        </div>
                    </li>
                    <li className="nav-logout-only" onClick={onLogout} title={t('logoutOnly')} style={{
                        marginTop: '0.5rem',
                        color: 'var(--text-secondary)',
                        background: 'rgba(255, 255, 255, 0.02)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0.75rem',
                        borderRadius: 'var(--radius-md)',
                        cursor: 'pointer',
                        transition: 'var(--transition)',
                        border: '1px solid transparent'
                    }}>
                        <div className="nav-item-group" style={{ gap: '1rem', width: '100%', justifyContent: 'flex-start' }}>
                            <LogOut size={20} />
                            <span>{t('logoutOnly')}</span>
                        </div>
                    </li>
                </ul>
            </nav>
        </aside>
    );
};

export default Sidebar;
