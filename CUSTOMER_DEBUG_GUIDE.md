# Customer Database Debugging Guide

## How to Debug the "Customer not found" Issue

### Step 1: Check Customer Data in Console
Open your browser DevTools (F12) and run this in the Console tab:

```javascript
// Check raw localStorage data
const data = localStorage.getItem('mech_system_db_v3');
if (data) {
    const parsed = JSON.parse(atob(data));
    console.table(parsed.customers.map(c => ({ 
        id: c.id, 
        name: c.name, 
        phone: c.phone,
        balance: c.balance 
    })));
}
```

### Step 2: Watch the Debug Logs
When you try to add an operation with a customer:

1. **Open DevTools Console (F12)**
2. **Type a customer name** in the customer field
3. **Watch for these logs:**
   - 🔍 Customer Select Debug - Shows what you typed
   - ✅ Name match found - Customer was found
   - ❌ No match found - Customer NOT found (shows available customers)
   - 📝 Setting formData - Shows what's being saved
   - 📤 Submit Debug - Shows final formData before submit
   - 🎯 Final customer ID - The ID that will be used

### Step 3: Common Issues & Solutions

#### Issue 1: Customer exists but not found
**Symptom:** You see the customer in the list, but it says "not found"
**Solution:** 
- Check for extra spaces in the customer name
- Check if name has special Arabic characters
- The normalization might not be working

#### Issue 2: Customer ID is empt

y ('')
**Symptom:** Debug shows `customerId: ''`
**Solution:**
- The customer might not have been saved with an ID
- Try re-adding the customer
- Check if customers have valid IDs: `customers.every(c => c.id)`

#### Issue 3: localStorage corruption
**Symptom:** Weird behavior, customers disappearing
**Solution:**
1. Export your data (Settings -> Backup)
2. Clear localStorage: `localStorage.clear()`
3. Reload page
4. Import your backup

### Step 4: Test Customer Normalization
Run this in console to test if "ahmed" matches "Ahmed":

```javascript
const normalizeArabic = (text) => {
    if (!text) return '';
    return text
        .trim()
        .toLowerCase()
        .replace(/[أإآ]/g, 'ا')
        .replace(/ة/g, 'ه')
        .replace(/[ىي]/g, 'ي');
};

// Test
console.log(normalizeArabic('ahmed'));
console.log(normalizeArabic('Ahmed'));
console.log(normalizeArabic('أحمد'));
// All should output the same normalized version
```

### Step 5: Verify Customer Search
```javascript
// Get all customers
const getCustomers = () => {
    const data = localStorage.getItem('mech_system_db_v3');
    if (data) {
        const parsed = JSON.parse(atob(data));
        return parsed.customers;
    }
    return [];
};

// Search for a customer
const findCustomer = (name) => {
    const customers = getCustomers();
    const normalized = normalizeArabic(name);
    const found = customers.find(c => normalizeArabic(c.name) === normalized);
    console.log('Search for:', name);
    console.log('Normalized:', normalized);
    console.log('Found:', found);
    return found;
};

// Test it
findCustomer('ahmed');
```

## What the Debug Logs Tell You

### Good Flow (Working):
```
🔍 Customer Select Debug: { input: {id: '_abc123', name: 'ahmed'}, allCustomers: [...] }
✅ Direct ID match: { id: '_abc123', name: 'ahmed' }
📝 Setting formData: { customerId: '_abc123', customerName: 'ahmed' }
📤 Submit Debug - FormData: { customerId: '_abc123', customerName: 'ahmed', ... }
🎯 Final customer ID: _abc123
```

### Bad Flow (Not Working):
```
🔍 Customer Select Debug: { input: {id: '', name: 'ahmed'}, allCustomers: [...] }
❌ No match found for: ahmed (Available: محمد, علي, فاطمة)
📝 Setting formData: { customerId: '', customerName: 'ahmed' }
📤 Submit Debug - FormData: { customerId: '', customerName: 'ahmed', ... }
🎯 Final customer ID: 
❌ Customer validation failed: { customerName: 'ahmed', availableCustomers: [...] }
```

## localStorage Structure

Your customer data is stored like this:
```json
{
  "customers": [
    {
      "id": "_abc123xyz",
      "name": "أحمد",
      "phone": "0123456789",
      "address": "Cairo",
      "balance": 0
    }
  ],
  "operations": [...],
  "parts": [...],
  ...
}
```

**Important Notes:**
1. Every customer MUST have a unique `id` field
2. Names are case-insensitive for matching
3. Arabic normalization handles ا/أ/إ/آ variations
4. The data is base64-encoded in localStorage

## Emergency Data Recovery

If everything fails:
```javascript
// Export current data
function emergencyBackup() {
    const data = localStorage.getItem('mech_system_db_v3');
    if (data) {
        const blob = new Blob([data], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `emergency-backup-${new Date().toISOString()}.txt`;
        a.click();
    }
}
emergencyBackup();
```
