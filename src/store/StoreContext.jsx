import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../utils/translations';
import { db, auth } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
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

        const applyTheme = () => {
            const theme = data.settings.theme || 'system';
            let effectiveTheme = theme;

            if (theme === 'system') {
                effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            }

            if (effectiveTheme === 'dark') {
                document.documentElement.setAttribute('data-theme', 'dark');
            } else {
                document.documentElement.removeAttribute('data-theme');
            }
        };

        applyTheme();

        // Listen for system theme changes if in system mode
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const listener = () => {
            if (data.settings.theme === 'system') applyTheme();
        };
        mediaQuery.addEventListener('change', listener);
        return () => mediaQuery.removeEventListener('change', listener);
    }, [data.settings.theme, data]);

    // Data Integrity & Migration Effect
    useEffect(() => {
        const ensureIds = () => {
            let changed = false;
            const newData = { ...data };

            // 1. Ensure all customers have valid IDs
            if (newData.customers) {
                const fixedCustomers = newData.customers.map(c => {
                    if (!c.id || c.id === '') {
                        changed = true;
                        return { ...c, id: generateId('cust') };
                    }
                    return c;
                });
                if (changed) newData.customers = fixedCustomers;
            }

            // 2. Ensure all parts have valid IDs
            if (newData.parts) {
                const fixedParts = newData.parts.map(p => {
                    if (!p.id || p.id === '') {
                        changed = true;
                        return { ...p, id: generateId('part') };
                    }
                    return p;
                });
                if (changed) newData.parts = fixedParts;
            }

            // 3. Ensure all operations have valid IDs and customerId references
            if (newData.operations) {
                const fixedOps = newData.operations.map(op => {
                    let opChanged = false;
                    const newOp = { ...op };
                    if (!op.id || op.id === '') {
                        opChanged = true;
                        newOp.id = generateId('op');
                    }
                    // Try to recover missing customerId by name if needed
                    if (!op.customerId && op.customerName) {
                        const match = newData.customers.find(c => c.name === op.customerName);
                        if (match) {
                            opChanged = true;
                            newOp.customerId = match.id;
                        }
                    }
                    if (opChanged) changed = true;
                    return newOp;
                });
                if (changed) newData.operations = fixedOps;
            }

            if (changed) {
                console.log("🛠️ Data integrity fix applied: Missing IDs generated");
                setData(newData);
            }
        };

        ensureIds();
    }, []);

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
        downloaded: false,
        show: false,
        message: '',
        lastDownloadedPath: null,
        isRollback: false
    });

    // SHA-256 Hashing Helper
    const hashKey = async (key) => {
        if (!key) return '';
        const msgBuffer = new TextEncoder().encode(key.trim());
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    };

    const checkLicense = async (code) => {
        const keyToCheck = code || data.settings.license;
        if (!keyToCheck) {
            if (!code) setIsLicenseValid(false);
            return false;
        }

        // Offline mode: Allow access if license key exists locally
        if (!navigator.onLine) {
            console.log("🔒 Offline mode detected - allowing access with stored license key");
            if (!code) {
                setIsLicenseValid(true);
                // Keep existing license data if available
            }
            return true;
        }

        try {
            const docRef = doc(db, "Activision Keys", keyToCheck.trim());
            const docSnap = await getDoc(docRef);

            if (docSnap.exists() && docSnap.data().Status === "Used") {
                if (!code) {
                    setIsLicenseValid(true);
                    setLicenseData(docSnap.data());
                }
                console.log("✅ License validated successfully");
                return true;
            } else {
                if (!code) {
                    setIsLicenseValid(false);
                    setLicenseData(null);
                }
                console.log("❌ License validation failed - invalid or unused key");
                return false;
            }
        } catch (error) {
            console.error("⚠️ License check error:", error);
            // Network errors during validation - allow offline access
            if (error.message?.includes('network') || error.code === 'unavailable' || error.code === 'permission-denied') {
                console.log("🔒 Network error - allowing offline access with stored license");
                if (!code) setIsLicenseValid(true);
                return true;
            } else {
                if (!code) {
                    setIsLicenseValid(false);
                    setLicenseData(null);
                }
                return false;
            }
        }
    };

    const validateCurrentLicense = () => checkLicense();

    useEffect(() => {
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
            time: new Date().toLocaleTimeString(data.settings.language === 'ar' ? 'ar-EG' : 'en-US'),
            read: false
        };
        setData(prev => ({
            ...prev,
            notifications: [note, ...prev.notifications]
        }));

        const isAr = data.settings.language === 'ar';
        const notificationTitle = type === 'danger' ? (isAr ? '⚠️ تنبيه' : '⚠️ Alert') :
            type === 'warning' ? (isAr ? '⚡ تحذير' : '⚡ Warning') :
                type === 'success' ? (isAr ? '✅ نجاح' : '✅ Success') : (isAr ? 'ℹ️ إشعار' : 'ℹ️ Notification');

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
        // Enforce ID generation and prevent empty ID from op spreading
        const newOp = {
            timestamp: new Date().toISOString(),
            ...op,
            id: (op.id && op.id !== '') ? op.id : generateId('op')
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
                        const alertMsg = (translations[data.settings.language || 'en'].lowStockAlert || 'Low stock: %p')
                            .replace('%p', p.name)
                            .replace('%q', newQty);
                        setTimeout(() => addNotification(alertMsg, 'danger'), 0);
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
        const opDetail = data.operations.find(o => o.id === id);
        const t = translations[data.settings.language || 'en'];

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

        if (opDetail) {
            const partDisplayName = opDetail.items && opDetail.items.length > 0
                ? opDetail.items.map(i => i.partName).join(', ')
                : (opDetail.partName || '-');
            const msg = (t.operationDeleted || 'Deleted: %p for %c')
                .replace('%p', partDisplayName)
                .replace('%c', opDetail.customerName || '-');
            addNotification(msg, 'warning');
        } else {
            addNotification(t.saleDeleted || 'Sale deletion', 'warning');
        }
    };

    const addPart = (part) => {
        const newPart = {
            ...part,
            id: (part.id && part.id !== '') ? part.id : generateId('part')
        };
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
        const customerId = (cust.id && cust.id !== '') ? cust.id : generateId('cust');
        const newCust = { balance: 0, ...cust, id: customerId };
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
        console.log(`🔍 [Update Check] Starting... Manual: ${manual}, Auto-enabled: ${data.settings.autoUpdateEnabled}`);

        // Only check if manually requested OR if auto-updates are enabled
        if (!manual && !data.settings.autoUpdateEnabled) {
            console.log('⏭️ [Update Check] Skipped - Auto-updates disabled');
            return { updateFound: false, disabled: true };
        }

        if (data.settings.pinnedVersion && !manual) {
            console.log(`📌 [Update Check] Skipped - Version pinned to ${data.settings.pinnedVersion}`);
            return { pinned: true };
        }

        // Prefer Electron auto-updater when running in Electron
        if (window.electron && window.electron.checkForUpdates) {
            console.log('🖥️ [Update Check] Using Electron auto-updater');
            try {
                if (manual) {
                    window.showToast?.(translations[data.settings.language].checkingForUpdates || 'Checking for updates...', 'info');
                    setUpdateState(prev => ({ ...prev, checking: true }));
                }

                // Add timeout to prevent stuck loading
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('Update check timeout')), 30000); // 30 second timeout
                });

                const updatePromise = window.electron.checkForUpdates(manual);
                console.log('⏳ [Update Check] Waiting for response (30s timeout)...');

                const res = await Promise.race([updatePromise, timeoutPromise]);
                console.log('✅ [Update Check] Response received:', res);

                if (manual) {
                    const currentVersion = await window.electron.getAppVersion();
                    console.log(`📦 [Update Check] Current version: ${currentVersion}`);

                    if (res?.updateInfo?.version && res.updateInfo.version === currentVersion) {
                        console.log('✅ [Update Check] Already up to date');
                        addNotification(translations[data.settings.language].upToDate.replace('%v', currentVersion), 'success');
                    } else if (!res?.updateInfo) {
                        console.log('✅ [Update Check] No update available');
                        addNotification(translations[data.settings.language].upToDate.replace('%v', currentVersion), 'success');
                    }
                }

                setUpdateState(prev => ({ ...prev, checking: false }));
                return { updateFound: false };
            } catch (err) {
                console.error('❌ [Update Check] Error:', err);
                setUpdateState(prev => ({ ...prev, checking: false }));

                if (manual) {
                    if (err.message && err.message.includes('timeout')) {
                        console.warn('⏱️ [Update Check] Timeout after 30 seconds');
                        addNotification(data.settings.language === 'ar' ? 'انتهت مهلة التحقق من التحديثات' : 'Update check timed out', 'warning');
                    } else if (err.message && err.message.includes('Please check update first')) {
                        console.log('ℹ️ [Update Check] Duplicate check ignored');
                        // Silently ignore this specific error
                    } else {
                        console.error('💥 [Update Check] Failed:', err.message);
                        addNotification(data.settings.language === 'ar' ? 'فشل التحقق من التحديثات' : 'Failed to check updates', 'danger');
                    }
                }
                return { error: true };
            }
        }

        console.log('ℹ️ [Update Check] No Electron updater available');
        return { updateFound: false };
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

        const lang = data.settings?.language || 'en';
        const t = (key) => translations[lang][key] || translations['en'][key] || key;

        const onAvailable = (info) => {
            console.log('📢 [Update Available] Version:', info.version);
            setUpdateState(prev => ({
                ...prev,
                checking: false,
                available: true,
                availableVersion: info.version,
                show: true,
                message: t('updateAvailableNoDownloading').replace('%v', info.version)
            }));
            addNotification(t('updateAvailableNoDownloading').replace('%v', info.version), 'info');
        };
        const onNotAvailable = (info) => {
            setUpdateState(prev => ({ ...prev, checking: false, available: false }));
        };
        const onDownloaded = (info) => {
            console.log('✅ [Update Downloaded] Info:', info);
            setUpdateState(prev => ({
                ...prev,
                downloading: false,
                downloaded: true,
                progress: 100,
                message: t('installingUpdate'),
                lastDownloadedPath: info.downloadedFile || null
            }));
            addNotification(t('downloadComplete'), 'info');

            // Automatically install after 2 seconds
            setTimeout(() => {
                if (updateState.lastDownloadedPath || info.downloadedFile) {
                    if (window.electron?.installFromPath) {
                        window.electron.installFromPath(info.downloadedFile || updateState.lastDownloadedPath);
                    }
                } else if (window.electron?.installUpdate) {
                    window.electron.installUpdate();
                }
            }, 2000);
        };
        const onError = (err) => {
            setUpdateState(prev => ({ ...prev, checking: false, downloading: false, show: false }));
            addNotification(t('updateError') || 'Update error', 'danger');
            console.error('Updater error:', err);
        };
        const onProgress = (progress) => {
            if (progress && typeof progress.percent !== 'undefined') {
                const percent = Math.round(progress.percent);
                setUpdateState(prev => ({
                    ...prev,
                    downloading: true,
                    progress: percent,
                    show: true,
                    message: `${t('downloading')} ${percent}%`
                }));

                // If stuck at 0% for too long, something is wrong
                if (percent === 0) {
                    console.warn('Download progress at 0%');
                }
            }
        };

        const onLog = (msg) => {
            console.log(`[Update] ${msg}`);
            if (msg.includes('Update execution started') || msg.includes('Starting download from URL')) {
                setUpdateState(prev => ({ ...prev, show: true, progress: 0, message: t('startingUpdate') }));
            } else if (msg.includes('Downloading:')) {
                const match = msg.match(/(\d+)%/);
                if (match) {
                    setUpdateState(prev => ({
                        ...prev,
                        show: true,
                        progress: parseInt(match[1]),
                        message: `${t('downloading')} ${match[1]}%`
                    }));
                }
            } else if (msg.includes('Download 100% complete')) {
                setUpdateState(prev => ({ ...prev, progress: 100, message: t('downloadComplete') }));
            } else if (msg.includes('Launching installer')) {
                setUpdateState(prev => ({ ...prev, message: t('installingUpdate') }));
            } else if (msg.includes('Error')) {
                setUpdateState(prev => ({ ...prev, message: msg }));
                setTimeout(() => setUpdateState(prev => ({ ...prev, show: false })), 3000);
            }
        };

        const removeListeners = () => {
            if (window.electron?.removeAllUpdateListeners) {
                window.electron.removeAllUpdateListeners();
            }
        };

        window.electron.onUpdateAvailable(onAvailable);
        window.electron.onUpdateNotAvailable(onNotAvailable);
        window.electron.onUpdateDownloaded(onDownloaded);
        window.electron.onUpdateError(onError);
        window.electron.onUpdateDownloadProgress(onProgress);
        window.electron.onUpdateLog(onLog);

        const downloadUpdate = async () => {
            console.log('📥 [Update Download] Calling window.electron.downloadUpdate()...');
            if (window.electron?.downloadUpdate) {
                setUpdateState(prev => ({
                    ...prev,
                    downloading: true,
                    progress: 0,
                    show: true,
                    message: t('startingUpdate'),
                    isRollback: false
                }));

                try {
                    const downloadTimeout = setTimeout(() => {
                        console.warn('⏱️ [Update Download] Timeout - no progress after 60s');
                        setUpdateState(prev => ({ ...prev, downloading: false, show: false }));
                        addNotification(t('downloadError') || 'Download timed out', 'danger');
                    }, 60000);

                    await window.electron.downloadUpdate();
                    console.log('✅ [Update Download] downloadUpdate promise resolved');
                    clearTimeout(downloadTimeout);
                } catch (err) {
                    console.error('❌ [Update Download] Failed:', err);
                    setUpdateState(prev => ({ ...prev, downloading: false, show: false }));
                    addNotification(t('downloadError') || 'Download failed', 'danger');
                }
            }
        };
        const installUpdate = () => {
            console.log('📦 [Update Install] Installing update...');
            if (updateState.lastDownloadedPath && window.electron?.installFromPath) {
                window.electron.installFromPath(updateState.lastDownloadedPath);
                console.log('✅ [Update Install] Triggered from path');
            } else if (window.electron?.installUpdate) {
                window.electron.installUpdate();
                console.log('✅ [Update Install] Triggered via autoUpdater');
            } else {
                console.error('❌ [Update Install] Not available');
            }
        };

        const downloadRollback = async (url, version) => {
            console.log(`🔄 [Rollback Download] Starting rollback to ${version}...`);
            if (window.electron?.downloadFromUrl) {
                setUpdateState({
                    checking: false,
                    available: false,
                    availableVersion: version,
                    downloading: true,
                    progress: 0,
                    downloaded: false,
                    show: true,
                    message: t('startingUpdate'),
                    lastDownloadedPath: null,
                    isRollback: true
                });

                try {
                    await window.electron.downloadFromUrl(url);
                    console.log('✅ [Rollback Download] Finished');
                } catch (err) {
                    console.error('❌ [Rollback Download] Error:', err);
                    setUpdateState(prev => ({ ...prev, downloading: false, show: false }));
                    addNotification(t('downloadError') || 'Rollback failed', 'danger');
                }
            }
        };

        const clearUpdateState = () => setUpdateState({
            checking: false,
            available: false,
            availableVersion: null,
            downloading: false,
            progress: 0,
            downloaded: false,
            show: false,
            message: '',
            lastDownloadedPath: null,
            isRollback: false
        });

        window._gunterDownloadUpdate = downloadUpdate;
        window._gunterDownloadRollback = downloadRollback;
        window._gunterInstallUpdate = installUpdate;
        window._gunterClearUpdateState = clearUpdateState;

        return () => {
            removeListeners();
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
        checkAppUpdates,
        updateState,
        downloadUpdate: window._gunterDownloadUpdate,
        downloadRollback: window._gunterDownloadRollback,
        installUpdate: window._gunterInstallUpdate,
        clearUpdateState: window._gunterClearUpdateState,
        finishSession: () => setData(prev => ({ ...prev, activeSessionDate: null })),
        activeSessionDate: data.activeSessionDate,
        licenseData,
        checkLicenseConnection: validateCurrentLicense,
        checkLicense,
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
