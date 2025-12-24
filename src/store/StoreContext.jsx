import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../utils/translations';
import { db, auth, storage } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ref, getDownloadURL } from 'firebase/storage';
import { signInWithEmailAndPassword } from 'firebase/auth';

const StoreContext = createContext();

const DB_KEY = 'mech_system_db_v3'; // Bump version for React migration

const defaultData = {
    operations: [],
    parts: [],
    customers: [],
    notifications: [],
    transactions: [],
    settings: {
        theme: 'light',
        loginPassword: '0',
        adminPassword: '0',
        receipt: {
            title: 'اسم المركز / المحل',
            address: 'العنوان بالتفصيل',
            phone: '01000000000',
            footer: 'شكراً لزيارتكم!'
        },
        license: null,
        language: 'en',
        security: {
            showSessionBalance: true,
            authOnDeleteOperation: true,
            authOnDeleteCustomer: true,
            authOnDeletePart: true,
            authOnDeleteTransaction: true,
            authOnAddTransaction: false,
            authOnAddPart: false,
            authOnUpdatePart: false,
            authOnAddOperation: false
        },
        autoCheckUpdates: true
    }
};

export const StoreProvider = ({ children }) => {
    const [data, setData] = useState(() => {
        const stored = localStorage.getItem(DB_KEY);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                const finalSettings = {
                    ...defaultData.settings,
                    ...(parsed.settings || {}),
                    security: {
                        ...defaultData.settings.security,
                        ...(parsed.settings?.security || {})
                    }
                };

                // Forced migration: if password is the old default '1' or '123456', move it to '0'
                if (finalSettings.loginPassword === '1' || finalSettings.loginPassword === '123456') {
                    finalSettings.loginPassword = '0';
                }
                if (finalSettings.adminPassword === '1' || finalSettings.adminPassword === '123456') {
                    finalSettings.adminPassword = '0';
                }

                return {
                    ...defaultData,
                    ...parsed,
                    settings: finalSettings
                };
            } catch (e) {
                return defaultData;
            }
        }
        return defaultData;
    });

    useEffect(() => {
        localStorage.setItem(DB_KEY, JSON.stringify(data));
        // Also update theme on body
        if (data.settings.theme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            document.documentElement.removeAttribute('data-theme');
        }
    }, [data]);

    useEffect(() => {
        const autoLogin = async () => {
            try {
                // 1. Read credentials from Firestore /Control/E
                // Note: For this to work initially, rules must allow unauthenticated 
                // read on this specific path, or we use the hardcoded values if reading fails.
                const controlRef = doc(db, "Control", "E");
                const controlSnap = await getDoc(controlRef);

                let email = "gunter-v@gunter.com";
                let password = "!@wqsdXD@#1@1";

                if (controlSnap.exists()) {
                    email = controlSnap.data().Email;
                    password = controlSnap.data().Password;
                }

                // 2. Perform Sign In
                await signInWithEmailAndPassword(auth, email, password);
                console.log("Auto-login successful");
            } catch (error) {
                console.error("Auto-login failed:", error);
            }
        };

        autoLogin();
    }, []);

    const generateId = () => '_' + Math.random().toString(36).substr(2, 9);

    const [isLicenseValid, setIsLicenseValid] = useState(false);
    const [licenseData, setLicenseData] = useState(null);

    // SHA-256 Hashing Helper
    const hashKey = async (key) => {
        if (!key) return '';
        const msgBuffer = new TextEncoder().encode(key.trim());
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    };

    useEffect(() => {
        const validateCurrentLicense = async () => {
            if (!data.settings.license) {
                setIsLicenseValid(false);
                return;
            }
            try {
                // Check Firestore for the license key
                const docRef = doc(db, "Activision Keys", data.settings.license.trim());
                const docSnap = await getDoc(docRef);

                if (docSnap.exists() && docSnap.data().Status === "Used") {
                    setIsLicenseValid(true);
                    setLicenseData(docSnap.data());
                } else {
                    setIsLicenseValid(false);
                    setLicenseData(null);
                }
            } catch (error) {
                console.error("License validation failed:", error);
                setLicenseData(null);
            }
        };

        validateCurrentLicense();
    }, [data.settings.license]);

    const isLicensed = () => isLicenseValid;

    const activateLicense = async (code, licensedToName) => {
        try {
            const trimmedCode = code.trim();
            const docRef = doc(db, "Activision Keys", trimmedCode);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const keyData = docSnap.data();

                // Prevent using already activated keys
                if (keyData.Status === "Used") {
                    return false;
                }

                const now = new Date();
                const dateStr = now.toLocaleDateString('en-GB').split('/').join('-'); // "23-12-2025"
                const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }); // "2:46 PM"

                // Update Firestore to mark as used (or just re-confirm if already used)
                const updateData = {
                    ...keyData,
                    Status: "Used",
                    Date: dateStr,
                    Time: timeStr,
                    LicensedTo: licensedToName || 'Unknown'
                };
                await setDoc(docRef, updateData, { merge: true });

                setData(prev => ({
                    ...prev,
                    settings: { ...prev.settings, license: trimmedCode }
                }));
                setIsLicenseValid(true);
                setLicenseData(updateData);
                return true;
            }
            return false;
        } catch (e) {
            console.error("Activation error:", e);
            return false;
        }
    };

    const addNotification = (text, type = 'info') => {
        const note = {
            id: generateId(),
            text,
            type,
            time: new Date().toLocaleTimeString('ar-EG'),
            read: false
        };
        setData(prev => ({
            ...prev,
            notifications: [note, ...prev.notifications]
        }));

        const notificationTitle = type === 'danger' ? '⚠️ تنبيه' :
            type === 'warning' ? '⚡ تحذير' :
                type === 'success' ? '✅ نجاح' : 'ℹ️ إشعار';

        // Send Windows notification if running in Electron
        if (window.electron?.sendNotification) {
            window.electron.sendNotification(notificationTitle, text);
        } else if ('Notification' in window) {
            // Standard Web Notification
            if (Notification.permission === 'granted') {
                new Notification(notificationTitle, { body: text, icon: '/icon.svg' });
            } else if (Notification.permission !== 'denied') {
                Notification.requestPermission().then(permission => {
                    if (permission === 'granted') {
                        new Notification(notificationTitle, { body: text, icon: '/icon.svg' });
                    }
                });
            }
        }
    };

    const clearNotifications = () => {
        setData(prev => ({ ...prev, notifications: [] }));
    };

    const addOperation = (op) => {
        const newOp = {
            id: generateId(),
            timestamp: new Date().toISOString(),
            ...op
        };
        setData(prev => {
            const part = prev.parts.find(p => p.id === op.partId);
            const updatedParts = prev.parts.map(p => {
                if (p.id === op.partId) {
                    const currentQty = !isNaN(p.quantity) ? p.quantity : 0;
                    const opQty = !isNaN(op.quantity) ? op.quantity : 1;
                    const newQty = currentQty - opQty;
                    if (newQty <= (p.threshold || 5)) {
                        setTimeout(() => addNotification(`تنبيه: مخزون منخفض للقطعة "${p.name}" (المتبقى: ${newQty})`, 'danger'), 0);
                    }
                    return { ...p, quantity: newQty };
                }
                return p;
            });

            // Update customer balance if needed (logic from original store.js)
            const total = op.price;
            const paid = op.paidAmount || 0;
            const balanceChange = (op.paymentStatus === 'paid') ? 0 : (total - paid);

            const updatedCustomers = prev.customers.map(c =>
                c.id === op.customerId ? { ...c, balance: (c.balance || 0) + balanceChange } : c
            );

            return {
                ...prev,
                operations: [...prev.operations, newOp],
                parts: updatedParts,
                customers: updatedCustomers
            };
        });
        return newOp;
    };

    const deleteOperation = (id) => {
        setData(prev => {
            const op = prev.operations.find(o => o.id === id);
            if (!op) return prev;

            const updatedParts = prev.parts.map(p =>
                p.id === op.partId ? { ...p, quantity: p.quantity + (op.quantity || 1) } : p
            );

            // Reverse balance change
            const total = op.price;
            const paid = op.paidAmount || 0;
            const balanceChange = (op.paymentStatus === 'paid') ? 0 : (total - paid);

            const updatedCustomers = prev.customers.map(c =>
                c.id === op.customerId ? { ...c, balance: (c.balance || 0) - balanceChange } : c
            );

            return {
                ...prev,
                operations: prev.operations.filter(o => o.id !== id),
                parts: updatedParts,
                customers: updatedCustomers
            };
        });

        const opDetail = data.operations.find(o => o.id === id);
        if (opDetail) {
            addNotification(`تم حذف عملية: ${opDetail.partName} للعميل ${opDetail.customerName}`, 'warning');
        } else {
            addNotification(`تم حذف عملية بيع لم يتم استرجاع قيمتها بالكامل`, 'warning');
        }
    };

    const addPart = (part) => {
        const newPart = { id: generateId(), ...part };
        setData(prev => ({ ...prev, parts: [...prev.parts, newPart] }));
        return newPart;
    };

    const updatePart = (id, updates) => {
        setData(prev => ({
            ...prev,
            parts: prev.parts.map(p => p.id === id ? { ...p, ...updates } : p)
        }));
    };

    const deletePart = (id) => {
        setData(prev => ({ ...prev, parts: prev.parts.filter(p => p.id !== id) }));
    };

    const addCustomer = (cust) => {
        const newCust = { id: generateId(), balance: 0, ...cust };
        setData(prev => ({ ...prev, customers: [...prev.customers, newCust] }));
        return newCust;
    };

    const updateCustomer = (id, updates) => {
        setData(prev => ({
            ...prev,
            customers: prev.customers.map(c => c.id === id ? { ...c, ...updates } : c)
        }));
    };

    const recordDirectTransaction = (customerId, amount, type, note) => {
        const tx = {
            id: generateId(),
            customerId,
            amount: parseFloat(amount) || 0,
            type, // 'payment' (customer paid me) or 'debt' (customer took debt)
            note,
            timestamp: new Date().toISOString()
        };

        setData(prev => {
            // If payment: balance decreases (he owes less)
            // If debt: balance increases (he owes more)
            const balanceChange = (type === 'payment') ? -tx.amount : tx.amount;

            const updatedCustomers = prev.customers.map(c =>
                c.id === customerId ? { ...c, balance: (c.balance || 0) + balanceChange } : c
            );

            return {
                ...prev,
                transactions: [...(prev.transactions || []), tx],
                customers: updatedCustomers
            };
        });
    };

    const deleteTransaction = (id) => {
        setData(prev => {
            const tx = (prev.transactions || []).find(t => t.id === id);
            if (!tx) return prev;

            // Reverse balance change
            const balanceChange = (tx.type === 'payment') ? tx.amount : -tx.amount;

            const updatedCustomers = prev.customers.map(c =>
                c.id === tx.customerId ? { ...c, balance: (c.balance || 0) + balanceChange } : c
            );

            return {
                ...prev,
                transactions: prev.transactions.filter(t => t.id !== id),
                customers: updatedCustomers
            };
        });
    };

    const deleteCustomer = (id) => {
        setData(prev => ({ ...prev, customers: prev.customers.filter(c => c.id !== id) }));
    };

    const toggleTheme = () => {
        setData(prev => ({
            ...prev,
            settings: { ...prev.settings, theme: prev.settings.theme === 'light' ? 'dark' : 'light' }
        }));
    };

    const updateReceiptSettings = (receipt) => {
        setData(prev => ({
            ...prev,
            settings: { ...prev.settings, receipt }
        }));
    };

    const getDailyCollectedTotal = () => {
        const todayStr = new Date().toISOString().split('T')[0];

        // 1. Paid amounts from operations today (Cash IN)
        const opsTotal = (data.operations || []).reduce((acc, op) => {
            if (op.timestamp && op.timestamp.startsWith(todayStr)) {
                return acc + (parseFloat(op.paidAmount) || 0);
            }
            return acc;
        }, 0);

        // 2. Direct transactions today (Cash IN / OUT)
        const txTotal = (data.transactions || []).reduce((acc, tx) => {
            if (tx.timestamp && tx.timestamp.startsWith(todayStr)) {
                if (tx.type === 'payment') {
                    return acc + (parseFloat(tx.amount) || 0); // Customer paid the shop
                } else if (tx.type === 'debt') {
                    return acc - (parseFloat(tx.amount) || 0); // Shop gave cash/value to customer
                }
            }
            return acc;
        }, 0);

        return opsTotal + txTotal;
    };

    const exportData = () => {
        const backup = JSON.parse(JSON.stringify(data));
        delete backup.settings.license;
        const str = JSON.stringify(backup, null, 2);
        return btoa(unescape(encodeURIComponent(str)));
    };

    const checkAppUpdates = async (manual = false) => {
        // Prefer Electron auto-updater when running in Electron
        if (window.electron && window.electron.checkForUpdates) {
            try {
                if (manual) window.showToast?.(settings.language === 'ar' ? 'جاري البحث عن تحديثات...' : 'Checking for updates...', 'info');
                const res = await window.electron.checkForUpdates(manual);

                // res usually contains updateInfo etc. The actual update events are emitted via IPC and handled elsewhere.
                if (res && res.updateInfo && res.updateInfo.version && res.updateInfo.version !== (await window.electron.getAppVersion())) {
                    // Let the renderer event listeners handle notifications and download prompts
                    return { updateFound: true, version: res.updateInfo.version };
                }

                if (manual) addNotification(translations[data.settings.language].upToDate.replace('%v', await window.electron.getAppVersion()), 'success');
                return { updateFound: false, version: await window.electron.getAppVersion() };
            } catch (err) {
                console.error('Electron update check failed:', err);
                if (manual) addNotification(settings.language === 'ar' ? 'فشل التحقق من التحديثات' : 'Failed to check updates', 'danger');
                return { error: true };
            }
        }

        // Fallback: non-electron environment or no updater available - existing Firestore check
        try {
            let currentVersion = '1.0.0';
            if (window.electron?.getAppVersion) {
                currentVersion = await window.electron.getAppVersion();
            }

            // Get latest version from Firestore
            const versionRef = doc(db, "Control", "Version");
            const versionSnap = await getDoc(versionRef);

            if (versionSnap.exists()) {
                const remoteData = versionSnap.data();
                const latestVersion = remoteData.LatestVersion;

                if (latestVersion && latestVersion !== currentVersion) {
                    // Get download URL from Firebase Storage using static filename
                    try {
                        const fileRef = ref(storage, `Setup/GunterSetup.exe`);
                        const downloadURL = await getDownloadURL(fileRef);
                        console.log("Got download URL from Storage:", downloadURL);

                        addNotification(translations[data.settings.language].updateAvailable.replace('%v', latestVersion), 'info');
                        return { updateFound: true, version: latestVersion, url: downloadURL };
                    } catch (storageErr) {
                        console.error("Update file not found in Firebase Storage:", storageErr);
                        if (manual) addNotification("Update file not available", "warning");
                        return { error: true, message: "Update file not found" };
                    }
                } else if (manual) {
                    addNotification(translations[data.settings.language].upToDate.replace('%v', currentVersion), 'success');
                }
            }
            return { updateFound: false, version: currentVersion };
        } catch (error) {
            console.error("Update check failed:", error);
            if (manual) addNotification("فشل التحقق من التحديثات", "danger");
            return { error: true };
        }
    };

    const importData = (encodedStr) => {
        try {
            const jsonStr = decodeURIComponent(escape(atob(encodedStr)));
            const parsed = JSON.parse(jsonStr);
            if (parsed && parsed.operations) {
                const currentLicense = data.settings.license;
                setData({ ...parsed, settings: { ...parsed.settings, license: currentLicense } });
                return true;
            }
        } catch (e) {
            return false;
        }
        return false;
    };

    // Setup Electron auto-updater IPC listeners (if available)
    React.useEffect(() => {
        if (!window.electron) return;

        const onAvailable = (info) => {
            addNotification(translations[data.settings.language].updateAvailable.replace('%v', info.version || ''), 'info');
        };
        const onDownloaded = (info) => {
            const lang = data.settings?.language || 'en';
            const message = lang === 'ar' ? 'تم تنزيل التحديث. هل تريد تثبيته الآن؟' : 'Update downloaded. Install now?';
            if (window.confirm(message)) {
                window.electron.installUpdate();
            } else {
                addNotification(lang === 'ar' ? 'التحديث جاهز للتثبيت لاحقًا' : 'Update ready to install', 'info');
            }
        };
        const onError = (err) => {
            const lang = data.settings?.language || 'en';
            addNotification(lang === 'ar' ? 'خطأ في التحديث' : 'Update error', 'danger');
            console.error('Updater error:', err);
        };
        const onProgress = (progress) => {
            // Simple progress notification - can be improved
            const lang = data.settings?.language || 'en';
            if (progress && progress.percent) {
                addNotification(lang === 'ar' ? `جاري التنزيل: ${Math.round(progress.percent)}%` : `Downloading: ${Math.round(progress.percent)}%`, 'info');
            }
        };

        window.electron.onUpdateAvailable(onAvailable);
        window.electron.onUpdateDownloaded(onDownloaded);
        window.electron.onUpdateError(onError);
        window.electron.onUpdateDownloadProgress(onProgress);

        return () => {
            // No-op: ipcRenderer.on doesn't return unsubscribe; in preload they are simple additions - leave it as-is for now
        };
    }, [data.settings.language]);

    const value = {
        data,
        isLicensed,
        activateLicense,
        addOperation,
        deleteOperation,
        addPart,
        updatePart,
        deletePart,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        deleteTransaction,
        addNotification,
        clearNotifications,
        toggleTheme,
        updateReceiptSettings,
        getDailyCollectedTotal,
        importData,
        setData,
        recordDirectTransaction,
        licenseData,
        checkAppUpdates,
        // Short hands for convenience
        operations: data.operations,
        transactions: data.transactions || [],
        parts: data.parts,
        customers: data.customers,
        notifications: data.notifications,
        settings: data.settings,
        t: (key) => {
            const lang = data.settings.language || 'ar';
            return translations[lang][key] || key;
        }
    };

    return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
};

export { StoreContext };
export const useStore = () => useContext(StoreContext);
