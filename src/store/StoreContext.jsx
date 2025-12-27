import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../utils/translations';
import { db, auth, storage } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ref, getDownloadURL } from 'firebase/storage';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { Database, validators, generateId } from '../utils/database';

const StoreContext = createContext();

// Initialize database
const database = new Database('mech_system_db_v3');

export const StoreProvider = ({ children }) => {
    const [data, setData] = useState(database.data);

    // Save to localStorage whenever data changes
    useEffect(() => {
        database.data = data;
        database.save();

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

    const [isLicenseValid, setIsLicenseValid] = useState(false);
    const [licenseData, setLicenseData] = useState(null);

    // Updater UI state
    const [updateState, setUpdateState] = useState({
        checking: false,
        available: false,
        availableVersion: null,
        downloading: false,
        progress: 0,
        downloaded: false
    });

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

            // Offline mode: Allow entry if a license key exists
            if (!navigator.onLine) {
                console.log("Device is offline. Using local license key for access.");
                setIsLicenseValid(true);
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
                    // If online and key not found or not "Used", reject
                    setIsLicenseValid(false);
                    setLicenseData(null);
                }
            } catch (error) {
                console.error("License validation failed:", error);
                // If network error during validation while thinking we are online, still allow access
                if (error.message?.includes('network') || error.code === 'unavailable') {
                    setIsLicenseValid(true);
                } else {
                    setIsLicenseValid(false);
                    setLicenseData(null);
                }
            }
        };

        validateCurrentLicense();

        // Listen for connectivity changes
        window.addEventListener('online', validateCurrentLicense);
        window.addEventListener('offline', validateCurrentLicense);
        return () => {
            window.removeEventListener('online', validateCurrentLicense);
            window.removeEventListener('offline', validateCurrentLicense);
        };
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

    // Automatic Session Management
    useEffect(() => {
        const checkSession = () => {
            const today = new Date().toISOString().split('T')[0];
            const activeDate = data.activeSessionDate;
            const autoStart = data.settings?.autoStartNewDay;

            if (autoStart && activeDate && activeDate !== today) {
                setData(prev => ({
                    ...prev,
                    activeSessionDate: today
                }));
                // Optional: add a notification
                setTimeout(() => addNotification(
                    data.settings.language === 'ar' ? `بدأ يوم عمل جديد تلقائياً: ${today}` : `New business day started automatically: ${today}`,
                    'success'
                ), 100);
            }
        };

        checkSession();
        const interval = setInterval(checkSession, 60000); // Check every minute
        return () => clearInterval(interval);
    }, [data.activeSessionDate, data.settings?.autoStartNewDay, data.settings?.language]);

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
            // Updated to handle multiple items
            // Normalize items: ensure numeric quantity and resolve partId by name if missing
            const items = (op.items || [{ partId: op.partId, partName: op.partName, quantity: op.quantity, price: op.price }]).map(it => {
                const qty = parseInt(it.quantity) || 1;
                const price = parseFloat(it.price) || 0;
                let partId = it.partId;
                if (!partId && it.partName) {
                    const match = prev.parts.find(p => p.name && p.name.toLowerCase() === (it.partName || '').toLowerCase());
                    if (match) partId = match.id;
                }
                return { ...it, quantity: qty, price, partId };
            });

            const updatedParts = prev.parts.map(p => {
                const item = items.find(i => i.partId === p.id);
                if (item) {
                    const currentQty = !isNaN(p.quantity) ? p.quantity : 0;
                    const opQty = !isNaN(item.quantity) ? item.quantity : 1;
                    const newQty = currentQty - opQty;
                    if (newQty <= (p.threshold || 5)) {
                        setTimeout(() => addNotification(`تنبيه: مخزون منخفض للقطعة "${p.name}" (المتبقي: ${newQty})`, 'danger'), 0);
                    }
                    return { ...p, quantity: newQty };
                }
                return p;
            });

            // Update customer balance
            const total = op.price; // total price for all items
            const paid = op.paidAmount || 0;
            const balanceChange = (op.paymentStatus === 'paid') ? 0 : (total - paid);

            const updatedCustomers = prev.customers.map(c =>
                c.id === op.customerId ? { ...c, balance: (c.balance || 0) + balanceChange } : c
            );
            return {
                ...prev,
                activeSessionDate: prev.activeSessionDate || new Date().toISOString().split('T')[0],
                operations: [...prev.operations, newOp],
                parts: updatedParts,
                customers: updatedCustomers
            };
        });
        return newOp;
    };

    const updateOperation = (id, updatedOp) => {
        setData(prev => {
            const oldOp = prev.operations.find(o => o.id === id);
            if (!oldOp) return prev;

            // 1. Revert old parts changes
            // Normalize old items and resolve missing partIds by name against prev.parts
            const oldItemsRaw = oldOp.items || [{ partId: oldOp.partId, partName: oldOp.partName, quantity: oldOp.quantity }];
            const oldItems = oldItemsRaw.map(it => {
                const qty = parseInt(it.quantity) || 1;
                let partId = it.partId;
                if (!partId && it.partName) {
                    const match = prev.parts.find(p => p.name && p.name.toLowerCase() === (it.partName || '').toLowerCase());
                    if (match) partId = match.id;
                }
                return { ...it, quantity: qty, partId };
            });

            const revertedParts = prev.parts.map(p => {
                const oldItem = oldItems.find(i => i.partId === p.id);
                if (oldItem) {
                    return { ...p, quantity: (p.quantity || 0) + (parseInt(oldItem.quantity) || 1) };
                }
                return p;
            });

            // 2. Revert old customer balance change
            const oldTotal = oldOp.price;
            const oldPaid = oldOp.paidAmount || 0;
            const oldBalanceChange = (oldOp.paymentStatus === 'paid') ? 0 : (oldTotal - oldPaid);
            const revertedCustomers = prev.customers.map(c =>
                c.id === oldOp.customerId ? { ...c, balance: (c.balance || 0) - oldBalanceChange } : c
            );

            // 3. Apply new parts changes
            // Normalize new items and resolve partIds by name against revertedParts (use prev.parts base)
            const newItemsRaw = updatedOp.items || [{ partId: updatedOp.partId, partName: updatedOp.partName, quantity: updatedOp.quantity }];
            const newItems = newItemsRaw.map(it => {
                const qty = parseInt(it.quantity) || 1;
                let partId = it.partId;
                if (!partId && it.partName) {
                    const match = revertedParts.find(p => p.name && p.name.toLowerCase() === (it.partName || '').toLowerCase());
                    if (match) partId = match.id;
                }
                return { ...it, quantity: qty, partId };
            });

            const finalParts = revertedParts.map(p => {
                const newItem = newItems.find(i => i.partId === p.id);
                if (newItem) {
                    return { ...p, quantity: p.quantity - (parseInt(newItem.quantity) || 1) };
                }
                return p;
            });

            // 4. Apply new customer balance change
            const newTotal = updatedOp.price;
            const newPaid = updatedOp.paidAmount || 0;
            const newBalanceChange = (updatedOp.paymentStatus === 'paid') ? 0 : (newTotal - newPaid);
            const finalCustomers = revertedCustomers.map(c =>
                c.id === updatedOp.customerId ? { ...c, balance: (c.balance || 0) + newBalanceChange } : c
            );

            return {
                ...prev,
                operations: prev.operations.map(o => o.id === id ? { ...o, ...updatedOp } : o),
                parts: finalParts,
                customers: finalCustomers
            };
        });
    };

    const deleteOperation = (id) => {
        setData(prev => {
            const op = prev.operations.find(o => o.id === id);
            if (!op) return prev;

            const itemsRaw = op.items || [{ partId: op.partId, partName: op.partName, quantity: op.quantity }];
            const items = itemsRaw.map(it => {
                const qty = parseInt(it.quantity) || 1;
                let partId = it.partId;
                if (!partId && it.partName) {
                    const match = prev.parts.find(p => p.name && p.name.toLowerCase() === (it.partName || '').toLowerCase());
                    if (match) partId = match.id;
                }
                return { ...it, quantity: qty, partId };
            });

            const updatedParts = prev.parts.map(p => {
                const item = items.find(i => i.partId === p.id);
                if (item) {
                    return { ...p, quantity: (p.quantity || 0) + (item.quantity || 1) };
                }
                return p;
            });

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
        const customerId = generateId();

        // Ensure we ALWAYS have a valid ID
        if (!customerId || customerId === '') {
            const retryId = '_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
            const newCust = { id: retryId, balance: 0, ...cust };
            setData(prev => ({ ...prev, customers: [...prev.customers, newCust] }));
            return newCust;
        }

        const newCust = { id: customerId, balance: 0, ...cust };
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
        if (!customerId) {
            console.warn('recordDirectTransaction called without customerId - aborting to prevent applying to all customers');
            return;
        }
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
                activeSessionDate: prev.activeSessionDate || new Date().toISOString().split('T')[0],
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
                if (manual) {
                    window.showToast?.(translations[data.settings.language].checkingForUpdates || 'Checking for updates...', 'info');
                    setUpdateState(prev => ({ ...prev, checking: true }));
                }

                const res = await window.electron.checkForUpdates(manual);

                if (manual) {
                    const currentVersion = await window.electron.getAppVersion();
                    // Fallback "Up to date" notification if regular event didn't fire with an update
                    // We assume that if update was found, the listener handles it. 
                    // But if we are here and res.updateInfo matches current, or is missing we say up to date.

                    if (res?.updateInfo?.version && res.updateInfo.version === currentVersion) {
                        addNotification(translations[data.settings.language].upToDate.replace('%v', currentVersion), 'success');
                    } else if (!res?.updateInfo) {
                        // Sometimes result is null if no update found
                        addNotification(translations[data.settings.language].upToDate.replace('%v', currentVersion), 'success');
                    }
                }

                setUpdateState(prev => ({ ...prev, checking: false }));
                return { updateFound: false };
            } catch (err) {
                console.warn('Electron update check warning:', err);
                // "Error: Please check update first" often means we tried to download without checking, 
                // or checked too frequently. We can suppress it or show a friendlier message.

                if (manual) {
                    // Check if it's the specific "Please check update first" error (which is actually harmless/confusing in this flow sometimes)
                    if (err.message && err.message.includes('Please check update first')) {
                        // It might mean a check is already running or state is mismatched.
                        // We can try to re-run check or just ignore. 
                        // For now, let's treat it as a temporary glich.
                    } else {
                        addNotification(data.settings.language === 'ar' ? 'فشل التحقق من التحديثات' : 'Failed to check updates', 'danger');
                    }
                }
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

    // Setup Electron auto-updater IPC listeners (if available) and manage UI state
    React.useEffect(() => {
        if (!window.electron) return;

        const onAvailable = (info) => {
            // mark available and store version
            setUpdateState(prev => ({ ...prev, available: true, availableVersion: info.version || null, checking: false }));
            addNotification(translations[data.settings.language].updateAvailableNoDownloading.replace('%v', info.version || ''), 'info');
        };
        const onNotAvailable = (info) => {
            // Check if we were actively requesting an update check
            if (updateState.checking) {
                const currentV = info.version || 'unknown';
                addNotification(translations[data.settings.language].upToDate.replace('%v', currentV), 'success');
            }
            setUpdateState(prev => ({ ...prev, checking: false }));
        };
        const onDownloaded = (info) => {
            setUpdateState(prev => ({ ...prev, downloaded: true, downloading: false, progress: 100 }));
            const lang = data.settings?.language || 'en';
            const message = lang === 'ar' ? 'تم تنزيل التحديث. هل تريد تثبيته الآن؟' : 'Update downloaded. Install now?';
            if (window.confirm(message)) {
                window.electron.installUpdate();
            } else {
                addNotification(lang === 'ar' ? 'التحديث جاهز للتثبيت لاحقًا' : 'Update ready to install', 'info');
            }
        };
        const onError = (err) => {
            setUpdateState(prev => ({ ...prev, checking: false, downloading: false }));
            const lang = data.settings?.language || 'en';
            addNotification(lang === 'ar' ? 'خطأ في التحديث' : 'Update error', 'danger');
            console.error('Updater error:', err);
        };
        const onProgress = (progress) => {
            // Update UI progress only; do not spam notifications
            if (progress && typeof progress.percent !== 'undefined') {
                setUpdateState(prev => ({ ...prev, downloading: true, progress: Math.round(progress.percent) }));
            }
        };

        window.electron.onUpdateAvailable(onAvailable);
        window.electron.onUpdateNotAvailable(onNotAvailable);
        window.electron.onUpdateDownloaded(onDownloaded);
        window.electron.onUpdateError(onError);
        window.electron.onUpdateDownloadProgress(onProgress);

        // helper functions to trigger updater actions from the renderer
        const downloadUpdate = () => {
            if (window.electron?.downloadUpdate) {
                window.electron.downloadUpdate();
                setUpdateState(prev => ({ ...prev, downloading: true, progress: 0 }));
            }
        };
        const installUpdate = () => {
            if (window.electron?.installUpdate) {
                window.electron.installUpdate();
            }
        };
        const clearUpdateState = () => setUpdateState({ checking: false, available: false, availableVersion: null, downloading: false, progress: 0, downloaded: false });

        // expose helpers to window for simple use (also returned via context below)
        window._gunterDownloadUpdate = downloadUpdate;
        window._gunterInstallUpdate = installUpdate;
        window._gunterClearUpdateState = clearUpdateState;

        return () => {
            // No-op: ipcRenderer.on doesn't return unsubscribe; in preload they are simple additions - leave it as-is for now
        };
    }, [data.settings.language]);

    const value = {
        data,
        isLicensed,
        activateLicense,
        addOperation,
        updateOperation,
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
        exportData,
        importData,
        setData,
        recordDirectTransaction,
        finishSession: () => setData(prev => ({ ...prev, activeSessionDate: null })),
        activeSessionDate: data.activeSessionDate,
        licenseData,
        checkAppUpdates,
        // Updater helpers & state
        updateState,
        downloadUpdate: () => window._gunterDownloadUpdate?.(),
        installUpdate: () => window._gunterInstallUpdate?.(),
        clearUpdateState: () => window._gunterClearUpdateState?.(),
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
