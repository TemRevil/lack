/**
 * Database Utility Layer
 * Provides schema validation, ID generation, and data migration
 */

/**
 * Generate a unique ID with optional prefix
 * @param {string} prefix - Optional prefix (e.g., 'cust', 'part', 'op')
 * @returns {string} Unique ID like 'cust_abc123xyz'
 */
export const generateId = (prefix = '') => {
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substring(2, 11);
    const id = `${timestamp}${randomPart}`;
    return prefix ? `${prefix}_${id}` : `_${id}`;
};

/**
 * Get current date as YYYY-MM-DD string
 */
export const getLocalDateString = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * Data validators with schema enforcement
 */
export const validators = {
    customer: (data) => {
        if (!data || typeof data !== 'object') {
            throw new Error('Invalid customer data');
        }
        if (!data.name || !data.name.trim()) {
            throw new Error('Customer name is required');
        }

        return {
            id: data.id && data.id !== '' ? data.id : generateId('cust'),
            name: data.name.trim(),
            phone: data.phone || '',
            address: data.address || '',
            balance: typeof data.balance === 'number' ? data.balance : 0,
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
    },

    part: (data) => {
        if (!data || typeof data !== 'object') {
            throw new Error('Invalid part data');
        }
        if (!data.name || !data.name.trim()) {
            throw new Error('Part name is required');
        }

        return {
            id: data.id && data.id !== '' ? data.id : generateId('part'),
            name: data.name.trim(),
            code: data.code || '',
            quantity: Math.max(0, parseInt(data.quantity) || 0),
            price: Math.max(0, parseFloat(data.price) || 0),
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
    },

    operation: (data) => {
        if (!data || typeof data !== 'object') {
            throw new Error('Invalid operation data');
        }
        if (!data.customerId) {
            throw new Error('Customer is required');
        }
        if (!data.items || data.items.length === 0) {
            throw new Error('At least one item is required');
        }

        // Validate items
        const validatedItems = data.items.map(item => {
            if (!item.partId) throw new Error('Part ID is required for all items');

            return {
                partId: item.partId,
                partName: item.partName || '',
                quantity: Math.max(1, parseInt(item.quantity) || 1),
                unitPrice: Math.max(0, parseFloat(item.price || item.unitPrice) || 0)
            };
        });

        // Calculate total price
        const totalPrice = validatedItems.reduce((sum, item) =>
            sum + (item.quantity * item.unitPrice), 0
        );

        // Validate paid amount
        let paidAmount = Math.max(0, parseFloat(data.paidAmount) || 0);
        if (paidAmount > totalPrice) paidAmount = totalPrice;

        return {
            id: data.id && data.id !== '' ? data.id : generateId('op'),
            customerId: data.customerId,
            customerName: data.customerName || '',
            items: validatedItems,
            price: totalPrice, // Keep 'price' for compatibility
            totalPrice,
            paidAmount,
            paymentStatus: data.paymentStatus || 'paid',
            extraInputs: data.extraInputs || [],
            timestamp: data.timestamp || new Date().toISOString(),
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
    },

    transaction: (data) => {
        if (!data || typeof data !== 'object') {
            throw new Error('Invalid transaction data');
        }
        if (!data.customerId) {
            throw new Error('Customer is required');
        }
        if (!data.amount || parseFloat(data.amount) <= 0) {
            throw new Error('Amount must be greater than 0');
        }

        return {
            id: data.id && data.id !== '' ? data.id : generateId('tx'),
            customerId: data.customerId,
            amount: parseFloat(data.amount),
            type: data.type || 'payment',
            note: data.note || '',
            timestamp: data.timestamp || new Date().toISOString(),
            createdAt: data.createdAt || new Date().toISOString()
        };
    }
};

/**
 * Database class for managing localStorage
 */
export class Database {
    constructor(storageKey = 'mech_system_db_v3') {
        this.storageKey = storageKey;
        this.data = this.load();
    }

    /**
     * Load data from localStorage
     */
    load() {
        try {
            const encoded = localStorage.getItem(this.storageKey);
            if (!encoded) {
                console.log('📦 Initializing new database...');
                return this.getDefaultData();
            }

            // UTF-8 safe decoding
            const data = JSON.parse(decodeURIComponent(escape(atob(encoded))));

            // Check if migration is needed
            if (!data.version || data.version < 3) {
                console.log('🔄 Database migration needed...');
                return this.migrate(data);
            }

            // Ensure existing databases get default passwords and core arrays
            try {
                if (!data.settings) data.settings = this.getDefaultData().settings;
                if (typeof data.settings.loginPassword === 'undefined' || data.settings.loginPassword === '') {
                    data.settings.loginPassword = '0';
                }
                if (typeof data.settings.adminPassword === 'undefined' || data.settings.adminPassword === '') {
                    data.settings.adminPassword = '0';
                }
                // Ensure core arrays exist to avoid undefined property access in UI
                if (!Array.isArray(data.customers)) data.customers = [];
                // Ensure each customer has a stable id to avoid empty-id collisions
                data.customers = data.customers.map(c => ({
                    ...c,
                    id: (c && c.id) ? c.id : generateId('cust')
                }));
                if (!Array.isArray(data.parts)) data.parts = [];
                if (!Array.isArray(data.operations)) data.operations = [];
                if (!Array.isArray(data.transactions)) data.transactions = [];
                if (!Array.isArray(data.notifications)) data.notifications = [];
                // Persist any fixes
                this.data = data;
                this.save();
            } catch (e) {
                console.warn('Could not ensure default settings/arrays:', e);
            }

            return data;
        } catch (error) {
            console.error('❌ Database load error:', error);
            console.log('📦 Creating fresh database...');
            return this.getDefaultData();
        }
    }

    /**
     * Save data to localStorage
     */
    save() {
        try {
            this.data.metadata.lastModified = new Date().toISOString();
            // UTF-8 safe encoding
            const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(this.data))));
            localStorage.setItem(this.storageKey, encoded);
            return true;
        } catch (error) {
            console.error('❌ Database save error:', error);
            return false;
        }
    }

    /**
     * Migrate old database structure to v3
     */
    migrate(oldData) {
        console.log('🔄 Starting migration to v3...');

        // Create backup with UTF-8 safe encoding
        try {
            const backupEncoded = btoa(unescape(encodeURIComponent(JSON.stringify(oldData))));
            localStorage.setItem(this.storageKey + '_backup', backupEncoded);
            console.log('✅ Backup created');
        } catch (e) {
            console.warn('⚠️ Could not create backup');
        }

        const newData = this.getDefaultData();

        // Preserve settings
        newData.settings = oldData.settings || newData.settings;
        // Ensure migrated settings have default passwords
        if (!newData.settings.loginPassword || newData.settings.loginPassword === '') {
            newData.settings.loginPassword = '0';
        }
        if (!newData.settings.adminPassword || newData.settings.adminPassword === '') {
            newData.settings.adminPassword = '0';
        }

        // Migrate customers
        let fixedCustomers = 0;
        newData.customers = (oldData.customers || []).map((c, idx) => {
            try {
                if (!c.id || c.id === '') fixedCustomers++;
                return validators.customer({
                    ...c,
                    id: c.id && c.id !== '' ? c.id : undefined // Let validator generate new ID
                });
            } catch (error) {
                console.warn(`⚠️ Skipping invalid customer at index ${idx}:`, error.message);
                return null;
            }
        }).filter(Boolean);

        // Migrate parts
        let fixedParts = 0;
        newData.parts = (oldData.parts || []).map((p, idx) => {
            try {
                if (!p.id || p.id === '') fixedParts++;
                return validators.part({
                    ...p,
                    id: p.id && p.id !== '' ? p.id : undefined
                });
            } catch (error) {
                console.warn(`⚠️ Skipping invalid part at index ${idx}:`, error.message);
                return null;
            }
        }).filter(Boolean);

        // Migrate operations (convert single-part to multi-part)
        let fixedOperations = 0;
        newData.operations = (oldData.operations || []).map((op, idx) => {
            try {
                if (!op.id || op.id === '') fixedOperations++;

                // Convert old single-part format to new multi-part format
                const items = op.items || [{
                    partId: op.partId,
                    partName: op.partName,
                    quantity: op.quantity || 1,
                    unitPrice: (parseFloat(op.price) || 0) / (parseInt(op.quantity) || 1) // Calculate unit price
                }];

                return validators.operation({
                    ...op,
                    id: op.id && op.id !== '' ? op.id : undefined,
                    items
                });
            } catch (error) {
                console.warn(`⚠️ Skipping invalid operation at index ${idx}:`, error.message);
                return null;
            }
        }).filter(Boolean);

        // Migrate transactions
        let fixedTransactions = 0;
        newData.transactions = (oldData.transactions || []).map((tx, idx) => {
            try {
                if (!tx.id || tx.id === '') fixedTransactions++;
                return validators.transaction({
                    ...tx,
                    id: tx.id && tx.id !== '' ? tx.id : undefined
                });
            } catch (error) {
                console.warn(`⚠️ Skipping invalid transaction at index ${idx}:`, error.message);
                return null;
            }
        }).filter(Boolean);

        console.log('✅ Migration complete:');
        console.log(`   - Customers: ${newData.customers.length} (fixed ${fixedCustomers} empty IDs)`);
        console.log(`   - Parts: ${newData.parts.length} (fixed ${fixedParts} empty IDs)`);
        console.log(`   - Operations: ${newData.operations.length} (fixed ${fixedOperations} empty IDs)`);
        console.log(`   - Transactions: ${newData.transactions.length} (fixed ${fixedTransactions} empty IDs)`);

        // Save migrated data
        this.data = newData;
        this.save();

        // Show success notification after a brief delay
        setTimeout(() => {
            if (window.showToast) {
                window.showToast(
                    `Database upgraded! Fixed ${fixedCustomers + fixedParts + fixedOperations + fixedTransactions} empty IDs.`,
                    'success'
                );
            }
        }, 1000);

        return newData;
    }

    /**
     * Get default database structure
     */
    getDefaultData() {
        return {
            version: 3,
            metadata: {
                createdAt: new Date().toISOString(),
                lastModified: new Date().toISOString(),
                activeSessionDate: getLocalDateString()
            },
            customers: [],
            parts: [],
            operations: [],
            transactions: [],
            notifications: [],
            settings: {
                theme: 'dark',
                language: 'ar',
                loginPassword: '0',
                adminPassword: '',
                receiptTitle: '',
                receiptAddress: '',
                receiptPhone: '',
                receiptFooter: '',
                receipt: {
                    title: '',
                    address: '',
                    phone: '',
                    footer: ''
                },
                license: '',
                licensedTo: '',
                security: {
                    authOnViewBalance: false,
                    authOnDeleteOperation: false,
                    authOnEditOperation: false,
                    authOnDeletePart: false,
                    authOnDeleteTransaction: false,
                    showSessionBalance: true,
                    allowPriceEdit: true,
                    allowNegativeStock: true
                },
                autoStartNewDay: false,
                appTitle: '',
                extraReceiptInputs: []
            }
        };
    }

    /**
     * Restore from backup
     */
    restoreFromBackup() {
        try {
            const backup = localStorage.getItem(this.storageKey + '_backup');
            if (!backup) {
                throw new Error('No backup found');
            }
            localStorage.setItem(this.storageKey, backup);
            this.data = this.load();
            return true;
        } catch (error) {
            console.error('Restore failed:', error);
            return false;
        }
    }
}

export default Database;
