import { translations } from './translations';

export const printReceipt = (op, settings) => {
    const isAr = settings.language === 'ar';
    const lang = settings.language || 'ar';
    const t = (key) => translations[lang][key] || key;

    const receipt = settings.receipt || {
        title: settings.receiptTitle || t('defaultReceiptTitle'),
        address: settings.receiptAddress || t('defaultReceiptAddress'),
        phone: settings.receiptPhone || '',
        footer: settings.receiptFooter || t('defaultReceiptFooter')
    };

    // Final fallback if specific object properties are empty strings
    if (!receipt.title) receipt.title = t('defaultReceiptTitle');
    if (!receipt.address) receipt.address = t('defaultReceiptAddress');
    if (!receipt.footer) receipt.footer = t('defaultReceiptFooter');
    const today = new Date(op.timestamp || new Date());
    const todayStr = today.toLocaleDateString(isAr ? 'ar-EG' : 'en-US');
    const timeStr = today.toLocaleTimeString(isAr ? 'ar-EG' : 'en-US');

    const debt = op.price - op.paidAmount;
    const paidText = isAr
        ? (op.paymentStatus === 'paid' ? 'دفع بالكامل' : (op.paymentStatus === 'partial' ? 'دفع جزئي' : 'آجل'))
        : (op.paymentStatus === 'paid' ? 'Fully Paid' : (op.paymentStatus === 'partial' ? 'Partial' : 'Debt'));

    const labels = {
        title: isAr ? 'فاتورة بيع' : 'Sales Invoice',
        address: isAr ? 'العنوان' : 'Address',
        phone: isAr ? 'تليفون' : 'Phone',
        desc: isAr ? 'الوصف' : 'Description',
        price: isAr ? 'السعر' : 'Price',
        qty: isAr ? 'الكمية' : 'Qty',
        total: isAr ? 'الإجمالي' : 'Total',
        cash: isAr ? 'المدفوع' : 'Cash',
        remaining: isAr ? 'المتبقي/الدين' : 'Remaining/Debt',
        customer: isAr ? 'العميل' : 'Customer',
        date: isAr ? 'التاريخ' : 'Date',
        status: isAr ? 'حالة الدفع' : 'Payment Status',
        thanks: isAr ? 'شكراً لزيارتكم!' : 'Thank you for your visit!'
    };

    const items = op.items || [{ partName: op.partName, quantity: op.quantity, price: op.price }];

    const extraInputsHtml = (op.extraInputs || [])
        .filter(inp => inp.value?.trim())
        .map(inp => `<p>${inp.label}: ${inp.value}</p>`)
        .join('');

    const html = `
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&display=swap');
            * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Cairo', sans-serif, system-ui; }
            body { background: white; padding: 10px; width: 80mm; margin: 0 auto; direction: ${isAr ? 'rtl' : 'ltr'}; }
            .receipt { width: 100%; border: 1px solid #eee; padding: 10px; }
            .header { text-align: center; margin-bottom: 20px; }
            .header h1 { font-size: 1.4rem; font-weight: 700; margin-bottom: 5px; }
            .header p { font-size: 0.8rem; color: #555; line-height: 1.4; }
            .divider { border-top: 1px dashed #000; margin: 10px 0; }
            .stars { text-align: center; font-size: 1rem; margin: 5px 0; }
            .title { text-align: center; font-weight: 700; font-size: 1.1rem; margin-bottom: 5px; }
            .table { width: 100%; margin-bottom: 10px; border-collapse: collapse; }
            .table th { border-bottom: 1px solid #000; padding: 5px 0; font-size: 0.85rem; text-align: ${isAr ? 'right' : 'left'}; }
            .table td { padding: 8px 0; font-size: 0.9rem; vertical-align: top; }
            .row { display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 0.95rem; }
            .row-bold { font-weight: 700; font-size: 1.2rem; margin-top: 5px; }
            .footer { text-align: center; margin-top: 25px; }
            .footer p { font-size: 0.9rem; font-weight: 600; }
            .barcode { margin-top: 15px; height: 30px; background: repeating-linear-gradient(90deg, #000, #000 2px, #fff 2px, #fff 4px); opacity: 0.5; }
            @media print { body { width: 100%; padding: 0; } .receipt { border: none; } }
        </style>
        <div class="receipt">
            <div class="header">
                <h1>${receipt.title}</h1>
                <p>${labels.address}: ${receipt.address}</p>
                <p>${labels.phone}: ${receipt.phone}</p>
                ${extraInputsHtml}
            </div>
            
            <div class="stars">*********************</div>
            <div class="title">${labels.title}</div>
            <div class="stars">*********************</div>
            
            <table class="table">
                <thead>
                    <tr>
                        <th style="width: 70%;">${labels.desc}</th>
                        <th style="text-align: ${isAr ? 'left' : 'right'};">${labels.price}</th>
                    </tr>
                </thead>
                <tbody>
                    ${items.map(item => `
                        <tr>
                            <td>
                                ${item.partName}<br>
                                <small>${labels.qty}: ${item.quantity || 1} x ${((item.price) / (item.quantity || 1)).toLocaleString()}</small>
                            </td>
                            <td style="text-align: ${isAr ? 'left' : 'right'};">${item.price.toLocaleString()}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            
            <div class="divider"></div>
            
            <div class="row row-bold">
                <span>${labels.total}</span>
                <span>${op.price.toLocaleString()}</span>
            </div>
            <div class="row">
                <span>${labels.cash}</span>
                <span>${op.paidAmount.toLocaleString()}</span>
            </div>
            <div class="row">
                <span>${labels.remaining}</span>
                <span>${debt.toLocaleString()}</span>
            </div>
            
            <div class="stars">*********************</div>
            <div style="font-size: 0.8rem; text-align: ${isAr ? 'right' : 'left'}; margin-top: 10px;">
                <p>${labels.customer}: ${op.customerName}</p>
                <p>${labels.date}: ${todayStr} - ${timeStr}</p>
                <p>${labels.status}: ${paidText}</p>
            </div>
            <div class="stars">*********************</div>
            
            <div class="footer">
                <p>${receipt.footer}</p>
                <p>${labels.thanks}</p>
                <div class="barcode"></div>
            </div>
        </div>
    `;

    const printWindow = window.open('', '', 'width=400,height=700');
    if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 500);
    }
};

export const printCustomerDebts = (customer, operations, settings) => {
    const isAr = settings.language === 'ar';
    const lang = settings.language || 'ar';
    const t_func = (key) => translations[lang][key] || key;

    const receipt = settings.receipt || {
        title: settings.receiptTitle || t_func('defaultReceiptTitle'),
        address: settings.receiptAddress || t_func('defaultReceiptAddress'),
        phone: settings.receiptPhone || '',
        footer: settings.receiptFooter || t_func('defaultReceiptFooter')
    };

    if (!receipt.title) receipt.title = t_func('defaultReceiptTitle');
    if (!receipt.address) receipt.address = t_func('defaultReceiptAddress');
    if (!receipt.footer) receipt.footer = t_func('defaultReceiptFooter');
    const todayStr = new Date().toLocaleDateString(isAr ? 'ar-EG' : 'en-US');

    const labels = {
        title: isAr ? 'كشف حساب عميل' : 'Customer Statement',
        customer: isAr ? 'العميل' : 'Customer',
        phone: isAr ? 'تليفون' : 'Phone',
        date: isAr ? 'التاريخ' : 'Date',
        totalOps: isAr ? 'عدد العمليات' : 'Total Operations',
        balance: isAr ? 'الرصيد الكلي المستحق' : 'Total Balance Due',
        history: isAr ? 'سجل المشتريات' : 'Purchase History',
        part: isAr ? 'القطعة' : 'Part',
        qty: isAr ? 'كمية' : 'Qty',
        price: isAr ? 'سعر' : 'Price',
        paid: isAr ? 'مدفوع' : 'Paid',
        remain: isAr ? 'متبقي' : 'Remain'
    };

    const unpaidOps = operations.filter(op => op.paymentStatus !== 'paid');

    const html = `
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&display=swap');
            * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Cairo', sans-serif, system-ui; }
            body { background: white; padding: 20px; width: 150mm; margin: 0 auto; direction: ${isAr ? 'rtl' : 'ltr'}; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 10px; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
            .info-item { border: 1px solid #ddd; padding: 10px; border-radius: 5px; }
            .info-label { font-size: 0.8rem; opacity: 0.6; display: block; }
            .info-value { font-weight: 700; font-size: 1.1rem; }
            .table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            .table th { background: #f0f0f0; border: 1px solid #000; padding: 8px; font-size: 0.9rem; }
            .table td { border: 1px solid #ddd; padding: 8px; font-size: 0.85rem; }
            .total-row { background: #f9f9f9; font-weight: 700; }
        </style>
        <div class="statement">
            <div class="header">
                <h1>${receipt.title}</h1>
                <h2>${labels.title}</h2>
                <p>${todayStr}</p>
            </div>

            <div class="info-grid">
                <div class="info-item">
                    <span class="info-label">${labels.customer}</span>
                    <span class="info-value">${customer.name}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">${labels.phone}</span>
                    <span class="info-value">${customer.phone || '---'}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">${labels.totalOps}</span>
                    <span class="info-value">${operations.length}</span>
                </div>
                <div class="info-item" style="border-color: var(--danger-color); background: rgba(239, 68, 68, 0.05);">
                    <span class="info-label" style="color: var(--danger-color)">${labels.balance}</span>
                    <span class="info-value" style="color: var(--danger-color)">${(customer.balance || 0).toLocaleString()}</span>
                </div>
            </div>

            <h3>${labels.history}</h3>
            <table class="table">
                <thead>
                    <tr>
                        <th>${labels.date}</th>
                        <th>${labels.part}</th>
                        <th>${labels.qty}</th>
                        <th>${labels.price}</th>
                        <th>${labels.paid}</th>
                        <th>${labels.remain}</th>
                    </tr>
                </thead>
                <tbody>
                    ${operations.slice(-20).map(op => {
        const items = op.items || [{ partName: op.partName, quantity: op.quantity, price: op.price }];
        return items.map((item, idx) => `
                            <tr>
                                ${idx === 0 ? `<td rowspan="${items.length}">${new Date(op.timestamp).toLocaleDateString()}</td>` : ''}
                                <td>${item.partName}</td>
                                <td style="text-align:center">${item.quantity}</td>
                                <td style="text-align:center">${item.price.toLocaleString()}</td>
                                ${idx === 0 ? `
                                    <td rowspan="${items.length}" style="text-align:center">${op.paidAmount.toLocaleString()}</td>
                                    <td rowspan="${items.length}" style="text-align:center">${(op.price - op.paidAmount).toLocaleString()}</td>
                                ` : ''}
                            </tr>
                        `).join('');
    }).join('')}
                    <tr class="total-row">
                        <td colspan="5" style="text-align:${isAr ? 'left' : 'right'}; padding-left: 20px; padding-right: 20px;">${labels.balance}</td>
                        <td style="text-align:center">${(customer.balance || 0).toLocaleString()}</td>
                    </tr>
                </tbody>
            </table>

            <div style="margin-top: 50px; text-align: center; font-size: 0.8rem; opacity: 0.5;">
                <p>${receipt.footer}</p>
            </div>
        </div>
    `;

    const printWindow = window.open('', '', 'width=800,height=1000');
    if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 500);
    }
}

export const printEndSessionReport = (expected, actual, diff, settings) => {
    const isAr = settings.language === 'ar';
    const lang = settings.language || 'ar';
    const t_func = (key) => translations[lang][key] || key;

    const receipt = settings.receipt || {
        title: settings.receiptTitle || t_func('defaultReceiptTitle'),
        address: settings.receiptAddress || t_func('defaultReceiptAddress'),
        phone: settings.receiptPhone || '',
        footer: settings.receiptFooter || t_func('defaultReceiptFooter')
    };

    if (!receipt.title) receipt.title = t_func('defaultReceiptTitle');
    if (!receipt.address) receipt.address = t_func('defaultReceiptAddress');
    if (!receipt.footer) receipt.footer = t_func('defaultReceiptFooter');
    const todayStr = new Date().toLocaleDateString(isAr ? 'ar-EG' : 'en-US');
    const timeStr = new Date().toLocaleTimeString(isAr ? 'ar-EG' : 'en-US');

    const diffText = isAr
        ? (diff === 0 ? 'مطابق' : (diff < 0 ? `عجز(${Math.abs(diff)})` : `زيادة(${diff})`))
        : (diff === 0 ? 'Balanced' : (diff < 0 ? `Shortage(${Math.abs(diff)})` : `Surplus(${diff})`));

    const labels = {
        title: isAr ? 'تقرير إغلاق اليومية' : 'Daily Close Report',
        expected: isAr ? 'المبيعات النقدية المتوقعة:' : 'Expected Cash Sales:',
        actual: isAr ? 'المبلغ الفعلي بالخزنة:' : 'Actual Cash in Safe:',
        diff: isAr ? 'الفرق (العجز/الزيادة):' : 'Difference (Shortage/Surplus):',
        signature: isAr ? 'توقيع المدير المسؤول' : 'Manager Signature'
    };

    const html = `
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&display=swap');
            * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Cairo', sans-serif, system-ui; }
            body { background: white; padding: 20px; width: 100mm; margin: 0 auto; direction: ${isAr ? 'rtl' : 'ltr'}; }
            .report { border: 2px solid #000; padding: 20px; }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
            .row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 1.1rem; }
            .row-bold { font-weight: 700; border-top: 1px dashed #000; padding-top: 10px; margin-top: 10px; }
        </style>
        <div class="report">
            <div class="header">
                <h2>${labels.title}</h2>
                <h3>${receipt.title}</h3>
                <p>${todayStr} - ${timeStr}</p>
            </div>
            <div class="row">
                <span>${labels.expected}</span>
                <span>${expected.toLocaleString()}</span>
            </div>
            <div class="row">
                <span>${labels.actual}</span>
                <span>${actual.toLocaleString()}</span>
            </div>
            <div class="row row-bold">
                <span>${labels.diff}</span>
                <span>${diffText}</span>
            </div>
            <div style="margin-top: 40px; text-align: center; border-top: 1px solid #000; padding-top: 10px;">
                <p>${labels.signature}</p>
                <div style="margin-top: 40px; border-bottom: 1px solid #000; width: 200px; margin-left: auto; margin-right: auto;"></div>
            </div>
        </div>
    `;

    const printWindow = window.open('', '', 'width=600,height=800');
    if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 500);
    }
};
