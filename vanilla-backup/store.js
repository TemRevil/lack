/**
 * StoreManager handles all data persistence / business logic
 * using localStorage.
 */
class StoreManager {
    constructor() {
        this.DB_KEY = 'mech_system_db_v2'; // Bump version to force clean slate or handle migration if needed
        this.defaultData = {
            operations: [],
            parts: [],
            customers: [],
            notifications: [],
            transactions: [],
            settings: {
                theme: 'light',
                loginPassword: '123456',
                adminPassword: '123456',
                receipt: {
                    title: 'اسم المركز / المحل',
                    address: 'العنوان بالتفصيل',
                    phone: '01000000000',
                    footer: 'شكراً لزيارتكم!'
                },
                license: null
            }
        };
        this.data = this.loadData();
    }

    // --- Core Data Helpers ---
    loadData() {
        const stored = localStorage.getItem(this.DB_KEY);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                // Ensure legacy data has all new fields
                if (!parsed.transactions) parsed.transactions = [];
                if (!parsed.settings) parsed.settings = { ...this.defaultData.settings };

                // MIGRATION: If passwords were the old defaults, update them to 123456
                if (parsed.settings.loginPassword === '123' || !parsed.settings.loginPassword) {
                    parsed.settings.loginPassword = '123456';
                }
                if (parsed.settings.adminPassword === 'admin' || parsed.settings.adminPassword === '123' || !parsed.settings.adminPassword) {
                    parsed.settings.adminPassword = '123456';
                }
                if (!parsed.settings.receipt) {
                    parsed.settings.receipt = { ...this.defaultData.settings.receipt };
                }
                if (parsed.settings.license === undefined) {
                    parsed.settings.license = null;
                }

                return parsed;
            } catch (e) {
                console.error('Data corruption detected', e);
                return { ...this.defaultData };
            }
        }
        return { ...this.defaultData };
    }

    saveData() {
        localStorage.setItem(this.DB_KEY, JSON.stringify(this.data));
    }

    generateId() {
        return '_' + Math.random().toString(36).substr(2, 9);
    }

    // --- Operations (Sales) ---
    addOperation(op) {
        const newOp = {
            id: this.generateId(),
            timestamp: new Date().toISOString(),
            ...op
        };
        this.data.operations.push(newOp);

        // Update stock
        this.updateStock(op.partId, -(op.quantity || 1));

        // Financials
        // Total Cost: op.price
        // Paid: op.paidAmount (if paid/partial) or 0 (if unpaid)
        // Debt: op.price - op.paidAmount

        const total = op.price;
        const paid = (op.paymentStatus === 'paid') ? total : (op.paidAmount || 0);
        const debt = total - paid;

        // 1. Record Sale Transaction (The cost of the item)
        this.addTransaction({
            customerId: op.customerId,
            type: 'sale',
            amount: -total, // It costs them money (negative balance impact usually? OR just track debit)
            // Let's stick to: Balance = Money they gave us - Money they owe us ??
            // User Rule: "if customer have to pay money for me with red color" -> Negative Balance = Debt.
            // So buying something REDUCES their balance. Paying INCREASES it.
            note: `شراء قطعة: ${op.partName} (الكمية: ${op.quantity || 1})`,
            date: newOp.timestamp
        });

        // 2. Record Payment (if any)
        if (paid > 0) {
            this.addTransaction({
                customerId: op.customerId,
                type: 'payment',
                amount: paid,
                note: `دفع للشراء: ${op.partName}`,
                date: newOp.timestamp
            });
        }

        // Update Customer Balance
        // Balance change = Paid - Cost
        this.updateCustomerBalance(op.customerId, paid - total);

        this.saveData();
        return newOp;
    }

    getOperations(dateFilter = null) {
        if (!dateFilter) return this.data.operations;
        return this.data.operations.filter(op => op.timestamp.startsWith(dateFilter));
    }

    deleteOperation(id) {
        const opIndex = this.data.operations.findIndex(o => o.id === id);
        if (opIndex === -1) return false;

        const op = this.data.operations[opIndex];

        // Revert stock
        this.updateStock(op.partId, (op.quantity || 1));

        // Revert Financials
        // We need to reverse the effect on balance
        const total = op.price;
        const paid = (op.paymentStatus === 'paid') ? total : (op.paidAmount || 0);

        // Previously: Balance += (Paid - Total)
        // Revert: Balance -= (Paid - Total) => Balance += (Total - Paid)
        this.updateCustomerBalance(op.customerId, total - paid);

        // Log reversal transaction
        this.addTransaction({
            customerId: op.customerId,
            type: 'refund',
            amount: total - paid, // effectively restores the balance
            note: `حذف عملية بيع: ${op.partName} (الكمية: ${op.quantity || 1})`,
            date: new Date().toISOString()
        });

        this.data.operations.splice(opIndex, 1);
        this.addNotification(`تم حذف عملية بيع للعميل ${op.customerName}`, 'warning');
        this.saveData();
        return true;
    }

    // --- Inventory (Parts) ---
    addPart(part) {
        const newPart = { id: this.generateId(), ...part };
        this.data.parts.push(newPart);
        this.saveData();
        return newPart;
    }

    updatePart(id, updates) {
        const index = this.data.parts.findIndex(p => p.id === id);
        if (index > -1) {
            this.data.parts[index] = { ...this.data.parts[index], ...updates };
            this.saveData();
            return true;
        }
        return false;
    }

    deletePart(id) {
        const index = this.data.parts.findIndex(p => p.id === id);
        if (index > -1) {
            this.data.parts.splice(index, 1);
            this.saveData();
            return true;
        }
        return false;
    }

    getParts() {
        return this.data.parts;
    }

    getAvailableParts() {
        // filter out zero quantity for the modal
        return this.data.parts.filter(p => p.quantity > 0);
    }

    getPart(id) {
        return this.data.parts.find(p => p.id === id);
    }

    updateStock(partId, change) {
        const part = this.getPart(partId);
        if (part) {
            part.quantity = parseInt(part.quantity) + change;
            if (part.quantity <= part.threshold) {
                this.addNotification(`تنبيه: مخزون منخفض للقطعة "${part.name}" (المتبقى: ${part.quantity})`, 'danger');
            }
            this.saveData();
        }
    }

    // --- Customers ---
    addCustomer(cust) {
        const newCust = { id: this.generateId(), ...cust };
        this.data.customers.push(newCust);
        this.saveData();
        return newCust;
    }

    updateCustomer(id, updates) {
        const index = this.data.customers.findIndex(c => c.id === id);
        if (index > -1) {
            this.data.customers[index] = { ...this.data.customers[index], ...updates };
            this.saveData();
            return true;
        }
        return false;
    }

    deleteCustomer(id) {
        const index = this.data.customers.findIndex(c => c.id === id);
        if (index > -1) {
            this.data.customers.splice(index, 1);
            this.saveData();
            return true;
        }
        return false;
    }

    updateCustomerBalance(id, amount) {
        const customer = this.data.customers.find(c => c.id === id);
        if (customer) {
            customer.balance = (parseFloat(customer.balance) || 0) + amount;
            this.saveData();
        }
    }

    payCustomerDebt(customerId, amount) {
        this.updateCustomerBalance(customerId, amount);
        this.addTransaction({
            customerId,
            type: 'payment',
            amount: amount,
            note: 'تسديد دين / دفع مبلغ',
            date: new Date().toISOString()
        });
        this.saveData();
    }

    getCustomers() {
        return this.data.customers;
    }

    getCustomer(id) {
        return this.data.customers.find(c => c.id === id);
    }

    // --- Transactions ---
    addTransaction(tx) {
        this.data.transactions.push({
            id: this.generateId(),
            ...tx
        });
        // Sort by date desc
        this.data.transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    getCustomerTransactions(customerId) {
        return this.data.transactions.filter(t => t.customerId === customerId);
    }

    getDailyTotal(dateStr) {
        let total = 0;
        this.data.transactions.forEach(tx => {
            if (tx.type === 'payment' && tx.date.startsWith(dateStr)) {
                total += parseFloat(tx.amount);
            }
        });
        return total;
    }

    getDailyTransactions(dateStr) {
        return this.data.transactions.filter(tx => tx.date.startsWith(dateStr));
    }

    // --- Notifications ---
    addNotification(text, type = 'info') {
        const note = {
            id: this.generateId(),
            text,
            type,
            time: new Date().toLocaleTimeString('ar-EG'),
            read: false
        };
        this.data.notifications.unshift(note);
        this.saveData();
    }

    getNotifications() {
        return this.data.notifications;
    }

    clearNotifications() {
        this.data.notifications = [];
        this.saveData();
    }

    // --- Settings & Auth ---
    checkLogin(password) {
        return password === this.data.settings.loginPassword;
    }

    checkAdmin(password) {
        return password === this.data.settings.adminPassword;
    }

    changeLoginPassword(newPass) {
        this.data.settings.loginPassword = newPass;
        this.saveData();
    }

    changeAdminPassword(newPass) {
        this.data.settings.adminPassword = newPass;
        this.saveData();
    }

    toggleTheme(isDark) {
        this.data.settings.theme = isDark ? 'dark' : 'light';
        this.saveData();
    }

    updateReceiptSettings(receipt) {
        this.data.settings.receipt = receipt;
        this.saveData();
    }

    // --- Licensing ---
    getValidLicenseCodes() {
        // Obfuscated codes (Base64)
        return [
            'OEYySzQtTTlYN1EtUDFMNVYtUjNONlctVDBZOFo=',
            'QzVIM0otRzlTMUQtSzdGNEEtTDBQMk8tQjZNOE4=',
            'UTFMVzJFLVIzVDRZLVU1STZPLVA3QThTLUQ5RjBH',
            'WjlYOEMtN1Y2QjUtTjRNM0stMkwxSjAtUTVXNEU=',
            'UDBPOUktOFU3WTYtVDVSNEUtM1cyUTEtQTBaOVg='
        ].map(c => atob(c));
    }

    isLicensed() {
        return !!this.data.settings.license && this.getValidLicenseCodes().includes(this.data.settings.license);
    }

    activateLicense(code) {
        if (!code) {
            this.data.settings.license = null;
            this.saveData();
            return true;
        }
        if (this.getValidLicenseCodes().includes(code)) {
            this.data.settings.license = code;
            this.saveData();
            return true;
        }
        return false;
    }

    getSettings() {
        return this.data.settings;
    }

    // --- Import/Export ---
    exportData() {
        // Create a copy to avoid modifying live data
        const backup = JSON.parse(JSON.stringify(this.data));
        // Remove license from backup
        if (backup.settings) {
            delete backup.settings.license;
        }

        const str = JSON.stringify(backup, null, 2);
        return btoa(unescape(encodeURIComponent(str)));
    }

    importData(encodedStr) {
        try {
            const jsonStr = decodeURIComponent(escape(atob(encodedStr)));
            const parsed = JSON.parse(jsonStr);
            if (parsed && parsed.operations && parsed.parts) {
                // Preserve current license if it exists
                const currentLicense = this.data.settings.license;

                this.data = parsed;

                // Ensure settings object exists and restore license
                if (!this.data.settings) this.data.settings = { ...this.defaultData.settings };
                this.data.settings.license = currentLicense;

                this.saveData();
                return true;
            }
        } catch (e) {
            console.error(e);
            return false;
        }
        return false;
    }
}
