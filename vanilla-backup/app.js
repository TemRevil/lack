/**
 * app.js - UI Controller & Logic
 */

// Initialize Store
const store = new StoreManager();

// Global State
let currentTab = 'operations';
let isAdmin = false;
let selectedDate = new Date(); // Defaults to today
let activeActionMenu = null; // Track open dropdown
let confirmCallback = null; // For confirm modal

// DOM Elements
const doc = document;
const els = {
    tabs: doc.querySelectorAll('.sidebar li'),
    sections: doc.querySelectorAll('.tab-content'),
    tables: {
        ops: doc.querySelector('#operations-table tbody'),
        parts: doc.querySelector('#storage-table tbody'),
        cust: doc.querySelector('#customers-table tbody')
    },
    modals: {
        op: doc.getElementById('operation-modal'),
        part: doc.getElementById('part-modal'),
        cust: doc.getElementById('customer-modal'),
        hist: doc.getElementById('customer-history-modal'),
        admin: doc.getElementById('admin-modal'),
        pass: doc.getElementById('change-password-modal'),
        confirm: doc.getElementById('confirm-modal'),
        endsession: doc.getElementById('end-session-modal'),
        addstock: doc.getElementById('add-stock-modal')
    },
    forms: {
        op: doc.getElementById('operation-form'),
        part: doc.getElementById('part-form'),
        cust: doc.getElementById('customer-form'),
        pay: doc.getElementById('pay-debt-form'),
        admin: doc.getElementById('admin-form'),
        pass: doc.getElementById('change-password-form'),
        endsession: doc.getElementById('end-session-form'),
        addstock: doc.getElementById('add-stock-form')
    },
    notif: {
        list: doc.getElementById('notifications-list'),
        badge: doc.getElementById('nav-notify-count')
    },
    themeToggle: doc.getElementById('theme-toggle'),
    // Calendar
    calBtn: doc.getElementById('date-picker-btn'),
    calDropdown: doc.getElementById('calendar-dropdown'),
    calGrid: doc.getElementById('calendar-grid'),
    calMonthDisplay: doc.getElementById('cal-month-year'),
    selectedDateDisplay: doc.getElementById('selected-date-display'),
    calPrev: doc.getElementById('cal-prev-month'),
    calNext: doc.getElementById('cal-next-month'),
    // Confirm elements
    confirmMsg: doc.getElementById('confirm-message'),
    btnConfirmYes: doc.getElementById('btn-confirm-yes'),
    btnConfirmNo: doc.getElementById('btn-confirm-no'),
    loginOverlay: doc.getElementById('system-login-screen'),
    loginForm: doc.getElementById('system-login-form'),
    licenseOverlay: doc.getElementById('license-screen'),
    licenseForm: doc.getElementById('license-form'),
    mainApp: doc.querySelector('.app-container'),
    sidebar: doc.querySelector('.sidebar'),
    mobileToggle: doc.getElementById('mobile-menu-toggle'),
    mobileOverlay: id('mobile-sidebar-overlay')
};

function id(name) { return doc.getElementById(name); }

// --- Initialization ---
function init() {
    if (!setupLicensing()) return;
    setupMobileNavigation();
    setupSystemLogin();
    setupNavigation();
    setupModals();
    setupForms();
    setupSettings();
    setupCalendar();
    loadTheme();

    // Autocomplete Setup
    setupOperationAutocomplete();

    // Initial Render
    renderOperations();
    updateNotifyBadge();

    // Global Event to close dropdowns
    window.addEventListener('click', (e) => {
        if (!e.target.closest('.action-cell')) closeAllActionMenus();
        if (!e.target.closest('.date-picker-trigger')) els.calDropdown.classList.remove('show');
        closeAllAutocompleteLists();
    });

    // Initialize Numeric Restriction
    initNumericInputRestriction();
}



function setupMobileNavigation() {
    const toggle = els.mobileToggle;
    const overlay = els.mobileOverlay;
    const sidebar = els.sidebar;

    const closeSidebar = () => {
        sidebar.classList.remove('show');
        overlay.classList.remove('show');
    };

    toggle.addEventListener('click', () => {
        sidebar.classList.add('show');
        overlay.classList.add('show');
    });

    overlay.addEventListener('click', closeSidebar);
}

function setupSystemLogin() {
    els.loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const pass = doc.getElementById('sys-pass-input').value;
        if (store.checkLogin(pass)) {
            els.loginOverlay.style.display = 'none';
            els.mainApp.classList.add('logged-in');
            showToast('تم تسجيل الدخول', 'success');
        } else {
            showToast('كلمة المرور غير صحيحة', 'error');
        }
    });

    // Check if already logged in (for dev/simpler logic we just always show login on load)
}

function setupLicensing() {
    const licensed = store.isLicensed();
    if (!licensed) {
        els.licenseOverlay.style.display = 'flex';
        els.mainApp.style.display = 'none';

        // Hide login overlay too just in case
        if (els.loginOverlay) els.loginOverlay.style.display = 'none';
    }

    els.licenseForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const code = doc.getElementById('license-input').value;
        if (store.activateLicense(code)) {
            location.reload(); // Reload to start app normally
        } else {
            showToast('كود التنشيط غير صحيح', 'error');
        }
    });

    doc.getElementById('btn-change-license')?.addEventListener('click', () => {
        showConfirm('هل تريد تغيير كود التنشيط؟ سيتم إعادة تشغيل النظام.', () => {
            store.activateLicense(null); // Clear license
            location.reload();
        });
    });

    return licensed;
}

function logoutSystem() {
    isAdmin = false;
    els.mainApp.classList.remove('logged-in');
    els.loginOverlay.style.display = 'flex';
    doc.getElementById('sys-pass-input').value = '';
}

function initNumericInputRestriction() {
    doc.body.addEventListener('input', (e) => {
        if (e.target.classList.contains('numeric-input')) {
            const val = e.target.value;
            e.target.value = val.replace(/[^0-9.]/g, '');
        }
    });
}




// --- Autocomplete Helper ---
function setupOperationAutocomplete() {
    // 1. Customer Input
    const custInput = doc.getElementById('op-customer-input');
    const custIdInput = doc.getElementById('op-customer-id');

    autocomplete(custInput, (val) => {
        const cv = val.toLowerCase();
        return store.getCustomers().filter(c => c.name.toLowerCase().includes(cv));
    }, (selectedCust) => {
        custInput.value = selectedCust.name;
        custIdInput.value = selectedCust.id;
    }, () => {
        const val = custInput.value;
        showConfirm(`العميل "${val}" غير موجود. هل تريد إضافته؟`, () => {
            els.modals.op.classList.remove('show');
            doc.getElementById('cust-name').value = val;
            openModal('cust');
        });
    });

    // 2. Part Input
    const partInput = doc.getElementById('op-part-input');
    const partIdInput = doc.getElementById('op-part-id');

    const updateOpPrice = () => {
        const partId = partIdInput.value;
        const qty = parseInt(doc.getElementById('op-quantity').value) || 1;
        const part = store.getPart(partId);
        if (part) {
            const total = part.price * qty;
            doc.getElementById('op-price-display').innerText = total;
            doc.getElementById('op-price-hidden').value = total;
        }
    };

    autocomplete(partInput, (val) => {
        const cv = val.toLowerCase();
        return store.getAvailableParts().filter(p =>
            p.name.toLowerCase().includes(cv) ||
            (p.code && p.code.toLowerCase().includes(cv))
        );
    }, (selectedPart) => {
        partInput.value = selectedPart.name;
        partIdInput.value = selectedPart.id;
        updateOpPrice();
    });

    doc.getElementById('op-quantity').addEventListener('input', updateOpPrice);
}

function autocomplete(inp, sourceFn, onSelect, onNoMatch = null) {
    let currentFocus;
    inp.addEventListener("input", function (e) {
        const val = this.value;
        closeAllAutocompleteLists();
        if (!val) return false;

        currentFocus = -1;
        const matches = sourceFn(val);

        const listDiv = doc.createElement("DIV");
        listDiv.setAttribute("id", this.id + "autocomplete-list");
        listDiv.setAttribute("class", "autocomplete-items");
        this.parentNode.appendChild(listDiv);

        if (matches.length === 0 && onNoMatch) {
            const item = doc.createElement("DIV");
            item.innerHTML = `<em>لا توجد نتائج. اضغط Enter لإضافة جديد</em>`;
            item.addEventListener("click", () => onNoMatch());
            listDiv.appendChild(item);
            return;
        }

        matches.forEach(match => {
            const item = doc.createElement("DIV");
            item.innerHTML = match.name + (match.code ? ` (${match.code})` : '');
            if (match.quantity) item.innerHTML += ` <small>- متوفر: ${match.quantity}</small>`;
            item.addEventListener("click", function (e) {
                onSelect(match);
                closeAllAutocompleteLists();
            });
            listDiv.appendChild(item);
        });
    });

    inp.addEventListener("keydown", function (e) {
        let x = doc.getElementById(this.id + "autocomplete-list");
        if (x) x = x.getElementsByTagName("div");
        if (e.keyCode == 40) { // Down
            currentFocus++;
            addActive(x);
        } else if (e.keyCode == 38) { // Up
            currentFocus--;
            addActive(x);
        } else if (e.keyCode == 13) { // Enter
            e.preventDefault();
            if (currentFocus > -1) {
                if (x) x[currentFocus].click();
            } else if (x && x.length === 1 && !x[0].innerText.includes('لا توجد نتائج')) {
                x[0].click();
            } else {
                if (onNoMatch) {
                    if (!x || x.length === 0 || x[0].innerText.includes('لا توجد نتائج')) onNoMatch();
                }
            }
        }
    });

    function addActive(x) {
        if (!x) return false;
        removeActive(x);
        if (currentFocus >= x.length) currentFocus = 0;
        if (currentFocus < 0) currentFocus = (x.length - 1);
        x[currentFocus].classList.add("autocomplete-active");
    }

    function removeActive(x) {
        for (var i = 0; i < x.length; i++) {
            x[i].classList.remove("autocomplete-active");
        }
    }
}

function closeAllAutocompleteLists(elmnt) {
    var x = doc.getElementsByClassName("autocomplete-items");
    for (var i = 0; i < x.length; i++) {
        if (elmnt != x[i] && elmnt != doc.getElementsByTagName("input")[0]) {
            x[i].parentNode.removeChild(x[i]);
        }
    }
}


// --- Navigation ---
function setupNavigation() {
    els.tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.dataset.tab;
            if (!target) return; // Skip buttons that are not tabs (like End Session)

            if (target === 'settings' && !isAdmin) {
                const settings = store.getSettings();
                if (settings.adminPassword && settings.adminPassword.trim() !== '') {
                    requestAdminAuth('settings');
                    return;
                }
            }

            switchTab(target);
        });
    });

    // Sorting
    doc.querySelectorAll('th[data-sort]').forEach(th => {
        th.addEventListener('click', () => {
            const table = th.closest('table');
            const tbody = table.querySelector('tbody');
            const index = Array.from(th.parentNode.children).indexOf(th);
            sortTable(tbody, index);
        });
    });

    // Clear Notifs
    doc.getElementById('btn-clear-notifications').addEventListener('click', () => {
        store.clearNotifications();
        renderNotifications();
        updateNotifyBadge();
    });

    // Search inputs
    doc.getElementById('storage-search').addEventListener('input', (e) => renderStorage(e.target.value));
    doc.getElementById('customer-search').addEventListener('input', (e) => renderCustomers(e.target.value));
}
function switchTab(tabName) {
    if (!tabName) return;

    // If leaving settings, revoke admin
    if (currentTab === 'settings' && tabName !== 'settings') {
        isAdmin = false;
    }

    els.tabs.forEach(t => t.classList.remove('active'));
    els.sections.forEach(s => s.classList.remove('active'));

    const tabEl = doc.querySelector(`[data-tab="${tabName}"]`);
    const secEl = doc.getElementById(tabName);

    if (tabEl) tabEl.classList.add('active');
    if (secEl) secEl.classList.add('active');

    currentTab = tabName;

    if (tabName === 'operations') renderOperations();
    if (tabName === 'storage') renderStorage();
    if (tabName === 'customers') renderCustomers();
    if (tabName === 'notifications') renderNotifications();
    if (tabName === 'settings') renderSettingsPasswords();
    updateNotifyBadge();

    // Close mobile sidebar on tab switch
    if (window.innerWidth <= 768) {
        els.sidebar.classList.remove('show');
        els.mobileOverlay.classList.remove('show');
    }
}

function updateNotifyBadge() {
    const notifs = store.getNotifications();
    const total = notifs.length;

    els.notif.badge.style.display = 'inline-block';
    els.notif.badge.innerText = total;
}

function sortTable(tbody, colIndex) {
    const rows = Array.from(tbody.querySelectorAll('tr'));
    const isAsc = tbody.getAttribute('data-sort-asc') === 'true'; // toggle

    rows.sort((a, b) => {
        const tA = a.children[colIndex].innerText.trim();
        const tB = b.children[colIndex].innerText.trim();

        const numA = parseFloat(tA.replace(/[^0-9.-]+/g, ""));
        const numB = parseFloat(tB.replace(/[^0-9.-]+/g, ""));

        if (!isNaN(numA) && !isNaN(numB) && !tA.includes(':')) {
            return isAsc ? numA - numB : numB - numA;
        }
        return isAsc ? tA.localeCompare(tB, 'ar') : tB.localeCompare(tA, 'ar');
    });

    tbody.innerHTML = '';
    rows.forEach(r => tbody.appendChild(r));
    tbody.setAttribute('data-sort-asc', !isAsc);
}


// --- Calendar Logic ---
let calViewDate = new Date();

function setupCalendar() {
    updateDateDisplay();
    renderCalendarGrid();

    els.calBtn.addEventListener('click', () => {
        els.calDropdown.classList.toggle('show');
    });

    els.calPrev.addEventListener('click', (e) => {
        e.stopPropagation();
        calViewDate.setMonth(calViewDate.getMonth() - 1);
        renderCalendarGrid();
    });

    els.calNext.addEventListener('click', (e) => {
        e.stopPropagation();
        calViewDate.setMonth(calViewDate.getMonth() + 1);
        renderCalendarGrid();
    });
}

function updateDateDisplay() {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    els.selectedDateDisplay.innerText = selectedDate.toLocaleDateString('ar-EG', options);
    renderOperations();
}

function renderCalendarGrid() {
    const monthNames = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
        "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
    els.calMonthDisplay.innerText = `${monthNames[calViewDate.getMonth()]} ${calViewDate.getFullYear()}`;

    const firstDay = new Date(calViewDate.getFullYear(), calViewDate.getMonth(), 1).getDay();
    const daysInMonth = new Date(calViewDate.getFullYear(), calViewDate.getMonth() + 1, 0).getDate();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    els.calGrid.innerHTML = '';

    const daysArr = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];
    daysArr.forEach(d => {
        const div = doc.createElement('div');
        div.className = 'calendar-day-name';
        div.innerText = d;
        els.calGrid.appendChild(div);
    });

    for (let i = 0; i < firstDay; i++) {
        const empty = doc.createElement('div');
        empty.className = 'calendar-day empty';
        els.calGrid.appendChild(empty);
    }

    for (let i = 1; i <= daysInMonth; i++) {
        const current = new Date(calViewDate.getFullYear(), calViewDate.getMonth(), i);
        const dayDiv = doc.createElement('div');
        dayDiv.className = 'calendar-day';
        dayDiv.innerText = i;

        if (current > today) {
            dayDiv.classList.add('empty');
            dayDiv.style.opacity = '0.3';
            dayDiv.style.cursor = 'not-allowed';
        } else {
            if (i === selectedDate.getDate() &&
                calViewDate.getMonth() === selectedDate.getMonth() &&
                calViewDate.getFullYear() === selectedDate.getFullYear()) {
                dayDiv.classList.add('selected');
            }
            dayDiv.addEventListener('click', (e) => {
                e.stopPropagation();
                selectedDate = current;
                updateDateDisplay();
                els.calDropdown.classList.remove('show');
                renderCalendarGrid();
            });
        }
        els.calGrid.appendChild(dayDiv);
    }
}

// --- Settings ---
function setupSettings() {
    doc.getElementById('import-file').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (re) => {
            const success = store.importData(re.target.result);
            if (success) {
                showToast('تم استعادة البيانات بنجاح', 'success');
                setTimeout(() => location.reload(), 1500);
            } else {
                showToast('فشل في استيراد الملف', 'error');
            }
        };
        reader.readAsText(file);
    });
}


// --- Modals ---
function setupModals() {
    // Open Buttons
    doc.getElementById('btn-add-operation').addEventListener('click', () => {
        // Date Check: Only allow adding operations for Today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const selected = new Date(selectedDate);
        selected.setHours(0, 0, 0, 0);

        if (selected.getTime() !== today.getTime()) {
            showToast('لا يمكن إضافة عمليات إلا في اليوم الحالي', 'warning');
            return;
        }

        doc.getElementById('op-customer-input').value = '';
        doc.getElementById('op-part-input').value = '';
        doc.getElementById('op-customer-id').value = '';
        doc.getElementById('op-part-id').value = '';
        openModal('op');
    });
    doc.getElementById('btn-add-part').addEventListener('click', () => {
        doc.getElementById('part-modal-title').innerText = 'إضافة قطعة';
        doc.getElementById('part-id').value = '';
        openModal('part');
    });
    doc.getElementById('btn-add-customer').addEventListener('click', () => {
        // Reset and Enable Balance for new customer
        doc.getElementById('cust-id').value = '';
        doc.getElementById('cust-balance').value = '0';
        doc.getElementById('cust-balance').disabled = false; // Enable for new
        openModal('cust');
    });

    // End Session Sidebar Button
    doc.getElementById('btn-end-session-sidebar').addEventListener('click', () => {
        prepareEndSessionModal();
        openModal('endsession');
    });

    // Close Buttons
    doc.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal');
            const type = getModalTypeFromId(modal.id);
            if (type) closeModal(type);
        });
    });

    // Confirm Modal Buttons
    els.btnConfirmYes.addEventListener('click', () => {
        if (confirmCallback) confirmCallback();
        closeModal('confirm');
    });
    els.btnConfirmNo.addEventListener('click', () => {
        closeModal('confirm');
    });

    // Payment Type Toggle
    doc.getElementById('op-payment-status').addEventListener('change', (e) => {
        const isPartial = e.target.value === 'partial';
        doc.getElementById('op-paid-amount-group').style.display = isPartial ? 'block' : 'none';
        doc.getElementById('op-paid-amount').required = isPartial;
    });
}

function getModalTypeFromId(id) {
    if (id === 'operation-modal') return 'op';
    if (id === 'part-modal') return 'part';
    if (id === 'customer-modal') return 'cust';
    if (id === 'customer-history-modal') return 'hist';
    if (id === 'admin-modal') return 'admin';
    if (id === 'change-password-modal') return 'pass';
    if (id === 'confirm-modal') return 'confirm';
    if (id === 'end-session-modal') return 'endsession';
    if (id === 'add-stock-modal') return 'addstock';
    return null;
}

function openModal(type) {
    if (els.modals[type]) els.modals[type].classList.add('show');
}

function closeModal(type) {
    if (els.modals[type]) els.modals[type].classList.remove('show');
    if (els.forms[type]) els.forms[type].reset();

    if (type === 'op') {
        doc.getElementById('op-paid-amount-group').style.display = 'none';
        doc.getElementById('op-paid-amount').required = false;
        doc.getElementById('op-price-display').innerText = '0';
    }

    if (type === 'addstock') {
        doc.getElementById('add-stock-part-name').innerText = '';
    }
}

// Custom Toast
window.showToast = (msg, type = 'info') => {
    const container = doc.getElementById('toast-container');
    const toast = doc.createElement('div');
    toast.className = `toast ${type}`;

    let icon = 'fa-info-circle';
    if (type === 'success') icon = 'fa-check-circle';
    if (type === 'error') icon = 'fa-exclamation-circle';
    if (type === 'warning') icon = 'fa-exclamation-triangle';

    toast.innerHTML = `<span>${msg}</span><i class="fa-solid ${icon}"></i>`;
    container.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => toast.classList.add('show'));

    // Remove after 3s
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
};

// Custom Confirm
window.showConfirm = (msg, onYes) => {
    els.confirmMsg.innerText = msg;
    confirmCallback = onYes;
    openModal('confirm');
};


// --- Forms ---
function setupForms() {
    // End Session Submit
    els.forms.endsession.addEventListener('submit', (e) => {
        e.preventDefault();

        // Password Check
        const pass = doc.getElementById('end-session-password').value;
        if (!store.checkAdmin(pass)) {
            showToast('كلمة المرور غير صحيحة', 'error');
            return;
        }

        const actualSafe = parseFloat(doc.getElementById('safe-actual-amount').value) || 0;
        const expectedSafe = calculateDailyTotal();
        const diff = actualSafe - expectedSafe;

        // 1. Download Backup
        const data = store.exportData();
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
        downloadFile(`backup_${dateStr}_${timeStr}.txt`, data);

        // 2. Print Report
        printEndSessionReport(expectedSafe, actualSafe, diff);

        closeModal('endsession');
        showToast('تم إغلاق اليومية بنجاح', 'success');

        // 3. Logout
        setTimeout(logoutSystem, 1000);
    });

    // Settings Password Changes
    doc.getElementById('change-login-pass-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const newPass = doc.getElementById('new-sys-pass').value;
        store.changeLoginPassword(newPass);
        showToast('تم تغيير كلمة مرور النظام', 'success');
        doc.getElementById('new-sys-pass').value = '';
        renderSettingsPasswords();
    });

    doc.getElementById('change-admin-pass-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const newPass = doc.getElementById('new-admin-pass').value;
        store.changeAdminPassword(newPass);
        showToast('تم تغيير كلمة مرور الإعدادات', 'success');
        doc.getElementById('new-admin-pass').value = '';
        renderSettingsPasswords();
    });

    // Calculate difference live
    doc.getElementById('safe-actual-amount').addEventListener('input', (e) => {
        const val = parseFloat(e.target.value) || 0;
        const expected = calculateDailyTotal();
        const diff = val - expected;
        const display = doc.getElementById('end-session-diff-display');
        const span = doc.getElementById('diff-value');

        display.style.display = 'block';
        if (diff === 0) {
            display.style.color = 'var(--success-color)';
            span.innerText = 'مطابق (0)';
        } else if (diff < 0) {
            display.style.color = 'var(--danger-color)';
            span.innerText = `عجز (${Math.abs(diff)})`;
        } else {
            display.style.color = 'var(--success-color)';
            span.innerText = `زيادة (${diff})`;
        }
    });

    // Operation Submit
    els.forms.op.addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = getFormData(e.target);
        const partId = doc.getElementById('op-part-id').value;
        const custId = doc.getElementById('op-customer-id').value;
        const formCustName = doc.getElementById('op-customer-input').value;

        if (!partId) { showToast('الرجاء اختيار قطعة صحيحة', 'error'); return; }

        let cust = store.getCustomer(custId);
        if (!cust && formCustName) {
            cust = store.getCustomers().find(c => c.name === formCustName);
            if (!cust) {
                cust = store.addCustomer({ name: formCustName, balance: 0 });
            }
        }
        if (!cust) { showToast('خطأ في تحديد العميل', 'error'); return; }

        const part = store.getPart(partId);
        const qty = parseInt(doc.getElementById('op-quantity').value) || 1;
        const totalAmount = part.price * qty;
        const status = fd['op-payment-status'];
        let paid = 0;
        if (status === 'paid') paid = totalAmount;
        else if (status === 'unpaid') paid = 0;
        else if (status === 'partial') paid = parseFloat(fd['op-paid-amount']) || 0;

        const newOp = store.addOperation({
            customerId: cust.id,
            customerName: cust.name,
            partId: part.id,
            partName: part.name,
            quantity: qty,
            price: totalAmount,
            paymentStatus: status,
            paidAmount: paid
        });

        closeModal('op');
        showToast('تمت العملية بنجاح', 'success');
        renderOperations();

        // Ask for print
        showConfirm('هل تريد طباعة الفاتورة؟', () => {
            printReceipt(newOp.id);
        });
    });

    // Part Submit
    els.forms.part.addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = getFormData(e.target);
        const id = doc.getElementById('part-id').value;
        const partData = {
            name: fd['part-name'],
            code: fd['part-code'],
            quantity: parseInt(fd['part-quantity']) || 0,
            price: parseFloat(fd['part-price']) || 0,
            threshold: parseInt(fd['part-threshold']) || 5
        };

        if (id) {
            store.updatePart(id, partData);
            showToast('تم تعديل بيانات القطعة', 'success');
        } else {
            store.addPart(partData);
            showToast('تم إضافة القطعة للمخزن', 'success');
        }
        closeModal('part');
        renderStorage();
    });

    // Customer Submit
    els.forms.cust.addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = getFormData(e.target);
        const id = doc.getElementById('cust-id').value;
        const custData = {
            name: fd['cust-name'],
            phone: fd['cust-phone'],
            address: fd['cust-address']
        };

        if (id) {
            store.updateCustomer(id, custData);
            showToast('تم تعديل العميل', 'success');
        } else {
            custData.balance = parseFloat(fd['cust-balance']) || 0;
            store.addCustomer(custData);
            showToast('تم إضافة العميل', 'success');
        }
        closeModal('cust');
        renderCustomers();
    });

    // Pay Debt Submit
    els.forms.pay.addEventListener('submit', (e) => {
        e.preventDefault();
        const amount = parseFloat(doc.getElementById('pay-debt-amount').value);
        const custId = doc.getElementById('pay-debt-cust-id').value;
        if (amount && custId) {
            store.payCustomerDebt(custId, amount);
            renderCustomerHistory(custId);
            renderCustomers();
            doc.getElementById('pay-debt-amount').value = '';
            showToast('تم تسجيل الدفع', 'success');
        }
    });

    // Add Stock Submit
    els.forms.addstock.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = doc.getElementById('add-stock-id').value;
        const qty = parseInt(doc.getElementById('add-stock-quantity').value) || 0;

        if (id && qty > 0) {
            const part = store.getPart(id);
            if (part) {
                store.updatePart(id, { quantity: part.quantity + qty });
                closeModal('addstock');
                showToast(`تم إضافة ${qty} إلى ${part.name}`, 'success');
                renderStorage();
            }
        }
    });

    // Admin Login Switch
    els.forms.admin.addEventListener('submit', (e) => {
        e.preventDefault();
        const pass = doc.getElementById('admin-password-input').value;
        if (store.checkAdmin(pass)) {
            closeModal('admin');
            if (adminSuccessCallback === 'settings') {
                isAdmin = true;
                switchTab('settings');
            } else if (typeof adminSuccessCallback === 'function') {
                adminSuccessCallback();
            }
            adminSuccessCallback = null;
        } else {
            showToast('كلمة المرور غير صحيحة', 'error');
        }
    });

    // Change Password Submit
    els.forms.pass.addEventListener('submit', (e) => {
        e.preventDefault();
        const oldPass = doc.getElementById('old-password').value;
        const newPass = doc.getElementById('new-password').value;

        // Check old password
        if (store.checkAdmin(oldPass)) {
            store.changeAdminPassword(newPass);
            closeModal('pass');
            showToast('تم تغيير كلمة المرور بنجاح', 'success');
        } else {
            showToast('كلمة المرور الحالية غير صحيحة', 'error');
        }
    });
}

function getFormData(form) {
    const data = {};
    for (let el of form.elements) {
        if (el.id) data[el.id] = el.value;
    }
    return data;
}

// --- Renderers ---
function renderOperations() {
    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(selectedDate.getDate()).padStart(2, '0');
    const isoDate = `${year}-${month}-${day}`;

    const ops = store.getOperations(isoDate);
    const tbody = els.tables.ops;
    tbody.innerHTML = '';

    ops.forEach(op => {
        const row = doc.createElement('tr');
        const time = new Date(op.timestamp).toLocaleTimeString('ar-EG');
        row.innerHTML = `
            <td>${op.customerName}</td>
            <td>${op.partName}</td>
            <td style="text-align:center;">${op.quantity || 1}</td>
            <td>${op.price}</td>
            <td dir="ltr">${time}</td>
            <td class="action-cell">
               ${createActionMenuHtml(op.id, 'op')}
            </td>
        `;
        tbody.appendChild(row);
    });
}

function renderStorage(filter = '') {
    const parts = store.getParts().filter(p => p.name.includes(filter) || (p.code && p.code.includes(filter)));
    const tbody = els.tables.parts;
    tbody.innerHTML = '';
    parts.forEach(p => {
        const row = doc.createElement('tr');
        row.innerHTML = `
            <td>${p.name}</td>
            <td>${p.code || '-'}</td>
            <td>${p.quantity}</td>
            <td>${p.price}</td>
            <td class="action-cell">
                ${createActionMenuHtml(p.id, 'part')}
            </td>
        `;
        tbody.appendChild(row);
    });
}

function renderCustomers(filter = '') {
    const custs = store.getCustomers().filter(c => c.name.includes(filter));
    const tbody = els.tables.cust;
    tbody.innerHTML = '';
    custs.forEach(c => {
        const row = doc.createElement('tr');
        row.style.cursor = 'pointer';
        const balClass = c.balance < 0 ? 'text-danger' : (c.balance > 0 ? 'text-success' : '');
        row.innerHTML = `
            <td>${c.name}</td>
            <td>${c.phone || '-'}</td>
            <td class="${balClass}" dir="ltr" style="text-align: center;">${c.balance.toLocaleString()}</td>
            <td class="action-cell">
                 ${createActionMenuHtml(c.id, 'cust')}
            </td>
        `;
        // One click opens history
        row.addEventListener('click', (e) => {
            // Only trigger if we didn't click help controls or menu
            if (!e.target.closest('.action-cell')) {
                renderCustomerHistory(c.id);
            }
        });
        tbody.appendChild(row);
    });
}

function renderNotifications() {
    const list = els.notif.list;
    list.innerHTML = '';
    const notifs = store.getNotifications();
    notifs.forEach(n => {
        const item = doc.createElement('div');
        item.className = `notification-item ${n.type}`;
        item.innerHTML = `<p>${n.text}</p><small>${n.time}</small>`;
        list.appendChild(item);
    });
}

window.renderCustomerHistory = (id) => {
    const cust = store.getCustomer(id);
    if (!cust) return;
    const balanceText = cust.balance < 0 ? `عليه: ${Math.abs(cust.balance)}` : `له: ${cust.balance}`;
    const balColor = cust.balance < 0 ? 'red' : 'green';
    doc.getElementById('history-customer-info').innerHTML = `
        <div style="display:flex; justify-content:space-between;">
            <span>${cust.name}</span>
            <span style="color:${balColor}">${balanceText}</span>
        </div>
    `;
    doc.getElementById('pay-debt-cust-id').value = id;
    const tbody = doc.getElementById('history-table-body');
    tbody.innerHTML = '';
    const txs = store.getCustomerTransactions(id);
    if (txs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center">لا توجد سجلات</td></tr>';
    } else {
        txs.forEach(t => {
            const tr = doc.createElement('tr');
            const amClass = t.amount < 0 ? 'text-danger' : 'text-success';
            tr.innerHTML = `
                <td style="font-size:0.8rem">${new Date(t.date).toLocaleString('ar-EG')}</td>
                <td>${t.note || '-'}</td>
                <td class="${amClass}" dir="ltr">${Math.abs(t.amount)}</td>
            `;
            tbody.appendChild(tr);
        });
    }
    openModal('hist');
};

// --- Action Menus ---
function createActionMenuHtml(id, type) {
    return `
        <button class="action-btn" onclick="toggleActionMenu('${id}', '${type}', event)">
            <i class="fa-solid fa-ellipsis-vertical"></i>
        </button>
        <div class="action-menu" id="menu-${type}-${id}" onclick="event.stopPropagation()">
            ${getActionItems(id, type)}
        </div>
    `;
}

function getActionItems(id, type) {
    let items = '';
    if (type === 'op') {
        items += `<div class="action-menu-item" onclick="printReceipt('${id}')"><i class="fa-solid fa-print"></i> طباعة</div>`;
        items += `<div class="action-menu-item danger" onclick="deleteOp('${id}')"><i class="fa-solid fa-trash"></i> حذف</div>`;
    } else if (type === 'part') {
        items += `<div class="action-menu-item" onclick="openAddStock('${id}')"><i class="fa-solid fa-plus"></i> إضافة مخزون</div>`;
        items += `<div class="action-menu-item" onclick="editPart('${id}')"><i class="fa-solid fa-pen"></i> تعديل البيانات</div>`;
        items += `<div class="action-menu-item danger" onclick="deletePart('${id}')"><i class="fa-solid fa-trash"></i> حذف</div>`;
    } else if (type === 'cust') {
        items += `<div class="action-menu-item" onclick="renderCustomerHistory('${id}')"><i class="fa-solid fa-clock-rotate-left"></i> السجل والديون</div>`;
        items += `<div class="action-menu-item" onclick="editCustomer('${id}')"><i class="fa-solid fa-pen"></i> تعديل البيانات</div>`;
        items += `<div class="action-menu-item danger" onclick="deleteCustomer('${id}')"><i class="fa-solid fa-trash"></i> حذف</div>`;
    }
    return items;
}

window.toggleActionMenu = (id, type, event) => {
    event.stopPropagation();
    const menuId = `menu-${type}-${id}`;
    const menu = doc.getElementById(menuId);
    closeAllActionMenus();
    if (menu) {
        menu.classList.add('show');
        activeActionMenu = menu;
    }
};

function closeAllActionMenus() {
    doc.querySelectorAll('.action-menu').forEach(m => m.classList.remove('show'));
    activeActionMenu = null;
}

// --- Global Actions & Settings ---
let adminSuccessCallback = null;

function requestAdminAuth(onSuccess) {
    adminSuccessCallback = onSuccess;
    doc.getElementById('admin-password-input').value = '';
    const modalTitle = doc.querySelector('#admin-modal h2');
    const modalBtn = doc.querySelector('#admin-form .submit-btn');

    if (onSuccess === 'settings') {
        modalTitle.innerText = 'تأكيد هوية المدير للوصول للإعدادات';
        modalBtn.innerText = 'دخول للإعدادات';
    } else {
        modalTitle.innerText = 'تأكيد هوية المدير لهذا الإجراء';
        modalBtn.innerText = 'تأكيد الإجراء';
    }

    openModal('admin');
}

window.deleteOp = (id) => {
    requestAdminAuth(() => {
        showConfirm('هل أنت متأكد من حذف هذه العملية؟', () => {
            if (store.deleteOperation(id)) {
                renderOperations();
                showToast('تم الحذف', 'warning');
            }
        });
    });
};

window.deletePart = (id) => {
    requestAdminAuth(() => {
        showConfirm('حذف هذه القطعة؟', () => {
            if (store.deletePart(id)) {
                renderStorage();
                showToast('تم الحذف', 'warning');
            }
        });
    });
};

window.printReceipt = (idOrOp) => {
    let op;
    if (typeof idOrOp === 'object') {
        op = idOrOp;
    } else {
        op = store.getOperations().find(o => o.id === idOrOp);
    }
    if (!op) return;

    const settings = store.getSettings();
    const todayStr = new Date(op.timestamp).toLocaleDateString('ar-EG');
    const timeStr = new Date(op.timestamp).toLocaleTimeString('ar-EG');

    // Change calculation
    const debt = op.price - op.paidAmount;
    const paidText = op.paymentStatus === 'paid' ? 'دفع بالكامل' : (op.paymentStatus === 'partial' ? 'دفع جزئي' : 'آجل');

    const html = `
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&display=swap');
            * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Cairo', sans-serif; }
            body { background: white; padding: 10px; width: 80mm; margin: 0 auto; direction: rtl; }
            .receipt { width: 100%; border: 1px solid #eee; padding: 10px; }
            .header { text-align: center; margin-bottom: 20px; }
            .header h1 { font-size: 1.4rem; font-weight: 700; margin-bottom: 5px; }
            .header p { font-size: 0.8rem; color: #555; line-height: 1.4; }
            .divider { border-top: 1px dashed #000; margin: 10px 0; }
            .stars { text-align: center; font-size: 1rem; margin: 5px 0; }
            .title { text-align: center; font-weight: 700; font-size: 1.1rem; margin-bottom: 5px; }
            .table { width: 100%; margin-bottom: 10px; border-collapse: collapse; }
            .table th { border-bottom: 1px solid #000; padding: 5px 0; font-size: 0.85rem; text-align: right; }
            .table td { padding: 8px 0; font-size: 0.9rem; vertical-align: top; }
            .row { display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 0.95rem; }
            .row-bold { font-weight: 700; font-size: 1.2rem; margin-top: 5px; }
            .footer { text-align: center; margin-top: 25px; }
            .footer p { font-size: 0.9rem; font-weight: 600; }
            .barcode { margin-top: 15px; height: 40px; background: repeating-linear-gradient(90deg, #000, #000 2px, #fff 2px, #fff 4px); opacity: 0.8; }
            @media print { body { width: 100%; padding: 0; } .receipt { border: none; } }
        </style>
        <div class="receipt">
            <div class="header">
                <h1>${settings.receipt.title}</h1>
                <p>العنوان: ${settings.receipt.address}</p>
                <p>تليفون: ${settings.receipt.phone}</p>
            </div>
            
            <div class="stars">*********************</div>
            <div class="title">فاتورة بيع</div>
            <div class="stars">*********************</div>
            
            <table class="table">
                <thead>
                    <tr>
                        <th style="width: 70%;">الوصف (Description)</th>
                        <th style="text-align: left;">السعر</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>
                            ${op.partName}<br>
                            <small>الكمية: ${op.quantity || 1} x ${op.price / (op.quantity || 1)}</small>
                        </td>
                        <td style="text-align: left;">${op.price}</td>
                    </tr>
                </tbody>
            </table>
            
            <div class="divider"></div>
            
            <div class="row row-bold">
                <span>الإجمالي (Total)</span>
                <span>${op.price}</span>
            </div>
            <div class="row">
                <span>المدفوع (Cash)</span>
                <span>${op.paidAmount}</span>
            </div>
            <div class="row">
                <span>المتبقي/الدين (Remaining)</span>
                <span>${debt}</span>
            </div>
            
            <div class="stars">*********************</div>
            <div style="font-size: 0.8rem; text-align: right; margin-top: 10px;">
                <p>العميل: ${op.customerName}</p>
                <p>التاريخ: ${todayStr} - ${timeStr}</p>
                <p>حالة الدفع: ${paidText}</p>
            </div>
            <div class="stars">*********************</div>
            
            <div class="footer">
                <p>${settings.receipt.footer}</p>
                <p>THANK YOU!</p>
                <div class="barcode"></div>
            </div>
        </div>
    `;

    const printWindow = window.open('', '', 'width=400,height=700');
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();

    // Auto print and close
    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 500);
};

window.openAddStock = (id) => {
    const part = store.getPart(id);
    if (!part) return;
    doc.getElementById('add-stock-id').value = part.id;
    doc.getElementById('add-stock-part-name').innerText = part.name;
    doc.getElementById('add-stock-quantity').value = '';
    openModal('addstock');
};

window.editPart = (id) => {
    const part = store.getPart(id);
    if (!part) return;
    doc.getElementById('part-modal-title').innerText = 'تعديل بيانات القطعة';
    doc.getElementById('part-id').value = part.id;
    doc.getElementById('part-name').value = part.name;
    doc.getElementById('part-code').value = part.code || '';
    doc.getElementById('part-quantity').value = part.quantity;
    doc.getElementById('part-price').value = part.price;
    doc.getElementById('part-threshold').value = part.threshold || 5;
    openModal('part');
};


window.deleteCustomer = (id) => {
    requestAdminAuth(() => {
        showConfirm('هل أنت متأكد؟ سيتم حذف العميل وسجلاته.', () => {
            if (store.deleteCustomer(id)) {
                renderCustomers();
                showToast('تم حذف العميل', 'warning');
            }
        });
    });
};

window.editCustomer = (id) => {
    const cust = store.getCustomer(id);
    if (!cust) return;
    doc.getElementById('cust-id').value = cust.id;
    doc.getElementById('cust-name').value = cust.name;
    doc.getElementById('cust-phone').value = cust.phone || '';
    doc.getElementById('cust-address').value = cust.address || '';

    // Set value and DISABLE balance editing for existing customers
    doc.getElementById('cust-balance').value = cust.balance;
    doc.getElementById('cust-balance').disabled = true;

    openModal('cust');
};



// --- End Session Helpers ---
function prepareEndSessionModal() {
    // 1. Calculate Expected Total for Today (Only 'Paid' or 'Partial' payments received today)
    const expected = calculateDailyTotal();

    // 2. Display it
    const summaryDiv = doc.getElementById('end-session-summary');
    summaryDiv.innerHTML = `
        <div style="display:flex; justify-content:space-between; margin-bottom:10px; font-size: 1.1rem;">
           <span>المبيعات النقدية اليوم (بالنظام):</span>
           <span style="font-weight:bold;">${expected}</span>
        </div>
        <p style="font-size:0.85rem; color:var(--text-secondary);">
           مشتقة من: عمليات الدفع الكامل + الدفعات الجزئية + سداد الديون المستلم اليوم.
        </p>
    `;

    // Reset inputs
    doc.getElementById('safe-actual-amount').value = '';
    doc.getElementById('end-session-password').value = '';
    doc.getElementById('end-session-diff-display').style.display = 'none';
}

function calculateDailyTotal() {
    const todayStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    return store.getDailyTotal(todayStr);
}

function renderSettingsPasswords() {
    const settings = store.getSettings();
    doc.getElementById('current-sys-pass').innerText = settings.loginPassword;
    doc.getElementById('current-admin-pass').innerText = settings.adminPassword;

    // Receipt settings
    doc.getElementById('receipt-title').value = settings.receipt.title;
    doc.getElementById('receipt-address').value = settings.receipt.address;
    doc.getElementById('receipt-phone').value = settings.receipt.phone;
    doc.getElementById('receipt-footer').value = settings.receipt.footer;

    // License Display
    const license = settings.license || '';
    const masked = license.length > 4 ? `XXXX-XXXX-XXXX-XXXX-${license.substr(-4)}` : 'غير متاح';
    doc.getElementById('license-display').innerText = masked;
}

function printEndSessionReport(expected, actual, diff) {
    const todayISO = new Date().toISOString().split('T')[0];
    const ops = store.getOperations(todayISO);
    const txs = store.getDailyTransactions(todayISO);

    // Filter manual debt payments
    const manualPayments = txs.filter(t => t.type === 'payment' && !t.note.includes('دفع للشراء'));

    const todayStr = new Date().toLocaleDateString('ar-EG');
    const timeStr = new Date().toLocaleTimeString('ar-EG');
    const diffText = diff === 0 ? 'مطابق' : (diff < 0 ? `عجز(${Math.abs(diff)})` : `زيادة(${diff})`);

    let opsHtml = '';
    if (ops.length > 0) {
        opsHtml = `
        < h4 > المبيعات:</h4 >
            <table>
                ${ops.map(o => `
                    <tr>
                        <td>${o.customerName}</td>
                        <td>${o.partName}</td>
                        <td>${o.paidAmount || (o.paymentStatus === 'paid' ? o.price : 0)}</td>
                    </tr>
                `).join('')}
            </table>
    `;
    }

    let paymentsHtml = '';
    if (manualPayments.length > 0) {
        paymentsHtml = `
        < h4 > التحصيلات:</h4 >
            <table>
                ${manualPayments.map(p => {
            const cust = store.getCustomer(p.customerId);
            return `
                        <tr>
                            <td>${cust ? cust.name : '?'}</td>
                            <td>${p.amount}</td>
                        </tr>
                    `;
        }).join('')}
            </table>
    `;
    }

    const settings = store.getSettings();
    const html = `
        <div class="thermal-receipt" style="direction: rtl; text-align: center; font-family: 'Cairo', sans-serif;">
            <h2 style="margin:0;">${settings.receipt.title}</h2>
            <p style="font-size:0.8rem;">${todayStr} - ${timeStr}</p>
            <hr>
            <div style="text-align: right; font-size: 0.9rem;">
                <p>المبيعات النقدية اليوم: ${expected}</p>
                <p>الموجود بالخزنة: ${actual}</p>
                <p>الفرق: ${diffText}</p>
            </div>
            <hr>
            ${opsHtml}
            ${paymentsHtml}
            <hr>
            <p style="font-size:0.7rem;">${settings.receipt.footer}</p>
        </div>
    `;

    // Inject into print area
    const printArea = doc.getElementById('print-area');
    printArea.innerHTML = html;
    window.print();
}

function setupSettings() {
    els.themeToggle.addEventListener('change', (e) => {
        store.toggleTheme(e.target.checked);
        loadTheme();
    });

    doc.getElementById('btn-export-data').addEventListener('click', () => {
        const data = store.exportData();
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
        downloadFile(`backup_manual_${dateStr}_${timeStr}.txt`, data);
    });
    doc.getElementById('import-file').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (re) => {
            const success = store.importData(re.target.result);
            if (success) {
                showToast('تم استعادة البيانات بنجاح', 'success');
                setTimeout(() => location.reload(), 1500);
            } else {
                showToast('فشل في استيراد الملف', 'error');
            }
        };
        reader.readAsText(file);
    });

    // Receipt Settings Submit
    doc.getElementById('receipt-settings-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const receipt = {
            title: doc.getElementById('receipt-title').value,
            address: doc.getElementById('receipt-address').value,
            phone: doc.getElementById('receipt-phone').value,
            footer: doc.getElementById('receipt-footer').value
        };
        store.updateReceiptSettings(receipt);
        showToast('تم حفظ إعدادات الوصل', 'success');
    });

    // Preview Receipt
    doc.getElementById('btn-preview-receipt').addEventListener('click', () => {
        const dummyOpId = 'dummy-id';
        const dummyOp = {
            id: dummyOpId,
            customerName: 'عميل تجريبي',
            partName: 'قطعة تجريبية (Test Part)',
            quantity: 2,
            price: 500,
            paidAmount: 500,
            paymentStatus: 'paid',
            timestamp: new Date().toISOString()
        };

        // Temporarily add a dummy operation to the store for preview if needed, 
        // or just pass it to the print function if we refactor it to accept an object.
        // For now, let's just use the current printReceipt logic but maybe a bit hacked.
        // Better: refactor printReceipt to take an op object.

        // Open Preview
        window.printReceipt(dummyOp);
    });
}

function loadTheme() {
    const theme = store.getSettings().theme;
    els.themeToggle.checked = (theme === 'dark');
    if (theme === 'dark') doc.body.setAttribute('data-theme', 'dark');
    else doc.body.removeAttribute('data-theme');
}

function downloadFile(filename, text) {
    const el = doc.createElement('a');
    el.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    el.setAttribute('download', filename);
    el.style.display = 'none';
    doc.body.appendChild(el);
    el.click();
    doc.body.removeChild(el);
}

// Start
init();
