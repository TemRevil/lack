import React, { useContext } from 'react';
import { Bell, Trash2, Info, AlertTriangle, XCircle, CheckCircle } from 'lucide-react';
import { StoreContext } from '../store/StoreContext';

const Notifications = () => {
    const { notifications, clearNotifications, settings, t } = useContext(StoreContext);

    const getIcon = (type) => {
        switch (type) {
            case 'success': return <CheckCircle size={20} className="text-success" />;
            case 'warning': return <AlertTriangle size={20} className="text-warning" />;
            case 'danger': return <XCircle size={20} className="text-danger" />;
            default: return <Info size={20} className="text-accent" />;
        }
    };

    return (
        <div className="view-container">
            <header className="view-header">
                <div className="view-title">
                    <div className="view-icon">
                        <Bell size={24} />
                    </div>
                    <div>
                        <h1>{t('notifications')}</h1>
                        <p>{settings.language === 'ar' ? 'تنبيهات النظام ومراقبة المخزون' : 'System alerts and inventory monitoring'}</p>
                    </div>
                </div>
                <div className="view-actions">
                    <button className="btn btn-secondary" onClick={clearNotifications} disabled={notifications.length === 0}>
                        <Trash2 size={18} /> {t('clearAll')}
                    </button>
                </div>
            </header>

            <div className="notifications-list">
                {notifications.length > 0 ? (
                    notifications.map(note => (
                        <div key={note.id} className={`notification-item ${note.type}`}>
                            <div className="notification-icon">
                                {getIcon(note.type)}
                            </div>
                            <div className="notification-content">
                                <p>{note.text}</p>
                                <span className="notification-time">{note.time}</span>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="empty-state">
                        <Bell size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                        <p>{t('noNotifications')}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Notifications;
