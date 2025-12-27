import { translations } from './translations';

export const generateReceiptHtml = (op, settings) => {
    const isAr = settings?.language === 'ar';
    const lang = settings?.language || 'en';
    const t = (key) => translations[lang]?.[key] || key;

    const receipt = settings?.receipt || {
        title: settings?.receiptTitle || t('defaultReceiptTitle'),
        address: settings?.receiptAddress || t('defaultReceiptAddress'),
        phone: settings?.receiptPhone || '',
        footer: settings?.receiptFooter || t('defaultReceiptFooter')
    };

    if (!receipt.title) receipt.title = t('defaultReceiptTitle');
    if (!receipt.address) receipt.address = t('defaultReceiptAddress');
    if (!receipt.footer) receipt.footer = t('defaultReceiptFooter');

    const today = new Date(op.timestamp || new Date());
    const dateStr = today.toLocaleDateString(isAr ? 'ar-EG' : 'en-US');
    const timeStr = today.toLocaleTimeString(isAr ? 'ar-EG' : 'en-US');

    const opTotal = parseFloat(op.price || 0);
    const opPaid = parseFloat(op.paidAmount || 0);
    const debt = opTotal - opPaid;

    const balanceText = debt > 0
        ? `${t('onHim')}: ${debt.toLocaleString()}`
        : (debt < 0 ? `${t('forHim')}: ${Math.abs(debt).toLocaleString()}` : `${t('remaining')}: 0`);

    const paymentStatusText = op.paymentStatus === 'paid'
        ? t('fullyPaid')
        : (op.paymentStatus === 'partial' ? t('partial') : t('unpaid'));

    const labels = {
        retailReceipt: isAr ? 'فاتورة بيع' : 'RETAIL RECEIPT',
        phone: t('phone'),
        date: t('date'),
        time: t('time'),
        customer: t('customer'),
        status: t('paymentStatus'),
        itemDescription: isAr ? 'الصنف / الخدمة' : 'Item / Service',
        qty: t('qty'),
        total: t('total'),
        subtotal: isAr ? 'الإجمالي الفرعي' : 'Subtotal',
        paid: isAr ? 'المدفوع' : 'Cash Paid',
        grandTotal: isAr ? 'الإجمالي النهائي' : 'GRAND TOTAL',
        balance: t('currentBalance') || (isAr ? 'رصيد الحساب' : 'Account Balance'),
        thankYou: isAr ? 'شكراً لثقتكم بنا!' : 'Thank you for choosing us!'
    };

    const items = op.items || [{ partName: op.partName, quantity: op.quantity, price: op.price }];

    const extraInputsHtml = (op.extraInputs || [])
        .filter(inp => inp.value?.trim())
        .map(inp => `<p style="margin:2px 0;">${inp.label}: ${inp.value}</p>`)
        .join('');

    return `
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&family=Inter:wght@400;600;700;800&display=swap');
            
            .receipt-content-wrapper { 
                background: white; 
                padding: 15px; 
                width: 80mm; 
                margin: 0 auto; 
                color: #000;
                direction: ${isAr ? 'rtl' : 'ltr'};
                font-family: ${isAr ? "'Cairo', sans-serif" : "'Inter', sans-serif"};
            }
            .receipt-content-wrapper * { margin: 0; padding: 0; box-sizing: border-box; }
            
            .receipt-header { text-align: center; margin-bottom: 12px; }
            .receipt-header h1 { font-size: 1.6rem; font-weight: 800; margin-bottom: 4px; letter-spacing: -0.5px; }
            .receipt-header p { font-size: 0.75rem; color: #444; line-height: 1.3; }
            
            .receipt-type-badge { 
                text-align: center;
                font-weight: 800;
                font-size: 0.95rem;
                background: #000;
                color: #fff;
                padding: 6px;
                border-radius: 4px;
                margin: 15px 0;
                letter-spacing: ${isAr ? '0' : '2px'};
            }

            .info-section { 
                font-size: 0.75rem; 
                margin-bottom: 15px;
                border-bottom: 1px dashed #ccc;
                padding-bottom: 10px;
                display: flex;
                flex-direction: column;
                gap: 3px;
            }
            .info-row { display: flex; justify-content: space-between; }
            .info-row b { color: #555; }

            .receipt-table { width: 100%; border-collapse: collapse; margin: 10px 0; }
            .receipt-table th { 
                font-size: 0.7rem; 
                text-transform: uppercase; 
                border-bottom: 2px solid #000; 
                padding: 6px 0;
                color: #000;
                text-align: ${isAr ? 'right' : 'left'};
            }
            .receipt-table td { 
                padding: 8px 0; 
                font-size: 0.8rem; 
                border-bottom: 1px solid #eee;
                vertical-align: middle;
            }
            
            .unit-price { font-size: 0.65rem; color: #666; display: block; margin-top: 2px; }

            .totals-section { margin-top: 15px; }
            .total-row { 
                display: flex; 
                justify-content: space-between; 
                padding: 5px 0;
                font-size: 0.9rem;
            }
            .total-row.grand-total { 
                font-weight: 800; 
                font-size: 1.2rem; 
                border-top: 2px solid #000; 
                margin-top: 5px; 
                padding-top: 8px;
            }

            .balance-container {
                margin: 15px 0;
                padding: 10px;
                border: 2px solid #000;
                border-radius: 6px;
                text-align: center;
                background: #fdfdfd;
            }
            .balance-title { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; color: #666; margin-bottom: 4px; }
            .balance-value { font-size: 1.1rem; font-weight: 800; }

            .footer-note { 
                text-align: center; 
                margin-top: 25px; 
                font-size: 0.75rem; 
                color: #444;
            }
            .social-divider { text-align: center; color: #ccc; margin: 12px 0; font-size: 0.8rem; }
            
            @media print {
                .receipt-content-wrapper { padding: 0; width: 100%; }
            }
        </style>

        <div class="receipt-content-wrapper">
            <div class="receipt-header">
                <h1>${receipt.title}</h1>
                <p>${receipt.address}</p>
                <p>${labels.phone}: ${receipt.phone}</p>
                <div style="font-size: 0.7rem; color: #666; margin-top: 4px;">${extraInputsHtml}</div>
            </div>

            <div class="receipt-type-badge">${labels.retailReceipt}</div>

            <div class="info-section">
                <div class="info-row">
                    <span><b>${labels.date}:</b> ${dateStr}</span>
                    <span><b>${labels.time}:</b> ${timeStr}</span>
                </div>
                <div class="info-row">
                    <span><b>${labels.customer}:</b> ${op.customerName || (isAr ? 'عميل نقدي' : 'Cash Customer')}</span>
                </div>
                <div class="info-row">
                    <span><b>${labels.status}:</b> ${paymentStatusText}</span>
                </div>
            </div>

            <table class="receipt-table">
                <thead>
                    <tr>
                        <th style="width: 55%;">${labels.itemDescription}</th>
                        <th style="text-align: center; width: 15%;">${labels.qty}</th>
                        <th style="text-align: ${isAr ? 'left' : 'right'}; width: 30%;">${labels.total}</th>
                    </tr>
                </thead>
                <tbody>
                    ${items.map(item => {
        const itemQty = parseFloat(item.quantity || 1);
        const itemPrice = parseFloat(item.price || 0);
        return `
                            <tr>
                                <td>
                                    <span style="font-weight: 600;">${item.partName || ''}</span>
                                    <span class="unit-price">${isAr ? 'سعر الوحدة' : 'Unit'}: ${(itemPrice / itemQty).toLocaleString()}</span>
                                </td>
                                <td style="text-align: center; font-weight: 700;">${itemQty}</td>
                                <td style="text-align: ${isAr ? 'left' : 'right'}; font-weight: 700;">${itemPrice.toLocaleString()}</td>
                            </tr>
                        `;
    }).join('')}
                </tbody>
            </table>

            <div class="totals-section">
                <div class="total-row">
                    <span style="color:#666;">${labels.subtotal}</span>
                    <span>${opTotal.toLocaleString()}</span>
                </div>
                <div class="total-row">
                    <span style="color:#666;">${labels.paid}</span>
                    <span>${opPaid.toLocaleString()}</span>
                </div>
                <div class="total-row grand-total">
                    <span>${labels.grandTotal}</span>
                    <span>${opTotal.toLocaleString()}</span>
                </div>
            </div>

            <div class="balance-container">
                <div class="balance-title">${labels.balance}</div>
                <div class="balance-value">${balanceText}</div>
            </div>

            <div class="social-divider">✦ ✦ ✦ ✦ ✦ ✦ ✦</div>

            <div class="footer-note">
                <p style="font-weight:700; margin-bottom:5px;">${receipt.footer}</p>
                <p>${labels.thankYou}</p>
                <div style="margin-top:15px; height:25px; background:repeating-linear-gradient(90deg, #000, #000 2px, #fff 2px, #fff 4px); opacity:0.1;"></div>
            </div>
        </div>
    `;
};

export const printReceipt = (op, settings) => {
    const html = generateReceiptHtml(op, settings);
    const win = window.open('', '', 'width=800,height=900');
    win.document.write('<html><head><title>Receipt Viewer</title></head><body>' + html + '</body></html>');
    win.document.close();
    win.focus();
    setTimeout(() => {
        win.print();
        win.close();
    }, 500);
};

export const printCustomerDebts = (customer, operations, settings) => {
    const isAr = settings?.language === 'ar';
    const lang = settings?.language || 'ar';
    const t_func = (key) => translations[lang]?.[key] || key;

    const labels = {
        title: isAr ? 'كشف حساب عميل' : 'Customer Account Statement',
        customer: isAr ? 'اسم العميل' : 'Customer Name',
        phone: isAr ? 'رقم الهاتف' : 'Phone Number',
        balance: isAr ? 'الرصيد المتبقي' : 'Remaining Balance',
        date: isAr ? 'التاريخ' : 'Date',
        total: isAr ? 'الإجمالي' : 'Total',
        paid: isAr ? 'المدفوع' : 'Paid',
        notes: isAr ? 'ملاحظات' : 'Notes',
        totalOps: isAr ? 'إجمالي العمليات' : 'Total Operations',
    };

    const html = `
        <html>
        <head>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&display=swap');
                body { font-family: 'Cairo', sans-serif; direction: ${isAr ? 'rtl' : 'ltr'}; padding: 40px; color: #333; }
                .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #eee; padding-bottom: 20px; }
                .header h1 { margin: 0; color: #000; font-size: 24px; }
                .customer-info { display: flex; flex-wrap: wrap; gap: 20px; margin-bottom: 30px; }
                .info-item { flex: 1; min-width: 200px; padding: 15px; border: 1px solid #eee; border-radius: 8px; }
                .info-label { font-size: 12px; color: #666; display: block; margin-bottom: 5px; }
                .info-value { font-size: 16px; font-weight: 700; color: #000; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th { background: #f8f9fa; padding: 12px; text-align: center; border-bottom: 2px solid #dee2e6; font-size: 14px; }
                td { padding: 12px; border-bottom: 1px solid #eee; font-size: 14px; text-align: center; }
                .total-row { background: #f8f9fa; font-weight: 700; }
                .badge { padding: 4px 8px; border-radius: 4px; font-size: 12px; }
                .badge-danger { background: #fee2e2; color: #ef4444; }
                .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #999; }
                @media print {
                    body { padding: 20px; }
                    .no-print { display: none; }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>${labels.title}</h1>
                <p>${new Date().toLocaleDateString(isAr ? 'ar-EG' : 'en-US')} - ${new Date().toLocaleTimeString(isAr ? 'ar-EG' : 'en-US')}</p>
            </div>

            <div class="customer-info">
                <div class="info-item">
                    <span class="info-label">${labels.customer}</span>
                    <span class="info-value">${customer.name}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">${labels.phone}</span>
                    <span class="info-value">${customer.phone || '-'}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">${labels.totalOps}</span>
                    <span class="info-value">${operations.length}</span>
                </div>
                 <div class="info-item" style="border-color: ${(customer.balance || 0) >= 0 ? '#ef4444' : '#22c55e'}; background: ${(customer.balance || 0) >= 0 ? 'rgba(239, 68, 68, 0.05)' : 'rgba(34, 197, 94, 0.05)'};">
                    <span class="info-label" style="color: ${(customer.balance || 0) >= 0 ? '#ef4444' : '#22c55e'}">
                        ${(customer.balance || 0) >= 0 ? t_func('onHim') : t_func('forHim')}
                    </span>
                    <span class="info-value" style="color: ${(customer.balance || 0) >= 0 ? '#ef4444' : '#22c55e'}">
                        ${Math.abs(customer.balance || 0).toLocaleString()}
                    </span>
                </div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th>${labels.date}</th>
                        <th style="width: 40%;">${labels.notes}</th>
                        <th>${labels.total}</th>
                        <th>${labels.paid}</th>
                        <th>${labels.balance}</th>
                    </tr>
                </thead>
                <tbody>
                    ${operations.map(op => {
        const opTotal = parseFloat(op.price || 0);
        const opPaid = parseFloat(op.paidAmount || 0);
        const debt = opTotal - opPaid;
        const items = op.items || [{ partName: op.partName, quantity: op.quantity }];
        return `
                            <tr>
                                <td>${new Date(op.timestamp).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}</td>
                                <td style="text-align:${isAr ? 'right' : 'left'}">
                                    ${items.map(i => `${i.partName} (${i.quantity})`).join(', ')}
                                </td>
                                <td>${opTotal.toLocaleString()}</td>
                                <td>${opPaid.toLocaleString()}</td>
                                <td>${debt.toLocaleString()}</td>
                            </tr>
                        `;
    }).join('')}
                    <tr class="total-row">
                         <td colspan="4" style="text-align:${isAr ? 'left' : 'right'}; padding-left: 20px; padding-right: 20px;">
                            ${(customer.balance || 0) >= 0 ? t_func('onHim') : t_func('forHim')}
                        </td>
                        <td style="text-align:center">${Math.abs(customer.balance || 0).toLocaleString()}</td>
                    </tr>
                </tbody>
            </table>

            <div class="footer">
                <p>Gunter - ${labels.title}</p>
            </div>
        </body>
        </html>
    `;

    const win = window.open('', '', 'width=1000,height=900');
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => {
        win.print();
        win.close();
    }, 500);
};
export const printEndSessionReport = (expected, actual, diff, settings) => {
    const isAr = settings?.language === 'ar';
    const lang = settings?.language || 'ar';
    const t = (key) => translations[lang]?.[key] || key;

    const html = `
        <html>
        <head>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;800&display=swap');
                body { font-family: 'Cairo', sans-serif; direction: ${isAr ? 'rtl' : 'ltr'}; padding: 50px; color: #333; line-height: 1.6; }
                .report-card { max-width: 600px; margin: 0 auto; border: 2px solid #eee; padding: 40px; border-radius: 12px; }
                .header { text-align: center; margin-bottom: 40px; }
                .header h1 { margin: 0; font-size: 28px; color: #000; font-weight: 800; }
                .header p { color: #666; margin-top: 5px; }
                .summary-item { display: flex; justify-content: space-between; padding: 15px 0; border-bottom: 1px solid #eee; font-size: 18px; }
                .summary-item b { color: #000; }
                .diff-box { 
                    margin-top: 30px; 
                    padding: 20px; 
                    border-radius: 8px; 
                    text-align: center; 
                    font-size: 22px; 
                    font-weight: 800;
                    background: ${diff === 0 ? '#f0fdf4' : (diff < 0 ? '#fef2f2' : '#f0fdf4')};
                    color: ${diff === 0 ? '#166534' : (diff < 0 ? '#991b1b' : '#166534')};
                    border: 2px solid ${diff === 0 ? '#166534' : (diff < 0 ? '#991b1b' : '#166534')};
                }
                .footer { margin-top: 50px; text-align: center; font-size: 14px; color: #999; border-top: 1px solid #eee; padding-top: 20px; }
                @media print { body { padding: 20px; } }
            </style>
        </head>
        <body>
            <div class="report-card">
                <div class="header">
                    <h1>${t('endSessionReport') || (isAr ? 'تقرير نهاية الوردية' : 'End Session Report')}</h1>
                    <p>${new Date().toLocaleDateString(isAr ? 'ar-EG' : 'en-US')} | ${new Date().toLocaleTimeString(isAr ? 'ar-EG' : 'en-US')}</p>
                </div>

                <div class="summary-item">
                    <span>${t('expectedCash') || (isAr ? 'النقد المتوقع' : 'Expected Cash')}</span>
                    <b>${expected.toLocaleString()}</b>
                </div>
                <div class="summary-item">
                    <span>${t('actualCashInSafe') || (isAr ? 'النقد الفعلي' : 'Actual Cash')}</span>
                    <b>${actual.toLocaleString()}</b>
                </div>

                <div class="diff-box">
                    ${t('difference')}: ${diff === 0 ? (isAr ? 'مطابق' : 'Balanced') : diff.toLocaleString()}
                    <div style="font-size: 14px; margin-top: 5px; font-weight: 400;">
                        ${diff < 0 ? (isAr ? '(عجز)' : '(Shortage)') : (diff > 0 ? (isAr ? '(زيادة)' : '(Surplus)') : '')}
                    </div>
                </div>

                <div class="footer">
                    <p>Gunter POS System - ${isAr ? 'نظام جنتر للمبيعات' : 'Sales Management'}</p>
                    <p>${isAr ? 'تم استخراج التقرير بواسطة المشرف' : 'Report generated by Admin'}</p>
                </div>
            </div>
        </body>
        </html>
    `;

    const win = window.open('', '', 'width=1000,height=900');
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => {
        win.print();
        win.close();
    }, 500);
};
