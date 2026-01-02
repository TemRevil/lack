// Debug utility - Add this temporarily to check customer data
export const debugCustomerData = () => {
    const data = localStorage.getItem('mech_system_db_v3');
    if (data) {
        try {
            const parsed = JSON.parse(atob(data));
            console.log('=== CUSTOMER DEBUG ===');
            console.log('Total customers:', parsed.customers?.length || 0);
            console.log('Customers:', parsed.customers?.map(c => ({ id: c.id, name: c.name })));
            console.log('======================');
            return parsed.customers;
        } catch (e) {
            console.error('Error parsing customer data:', e);
        }
    }
    return [];
};

// Run this in console: debugCustomerData()
