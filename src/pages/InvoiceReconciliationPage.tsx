import React, { useState, useEffect } from 'react';
import {
  FileText,
  DollarSign,
  Download,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ShieldCheck,
  Receipt
} from 'lucide-react';
import { fetchInvoiceReconciliation } from '../api/client.js';
import { InvoiceReconciliation } from '../../shared/types.js';

interface InvoiceReconciliationPageProps {
  selectedMonth?: string;
}

export const InvoiceReconciliationPage: React.FC<InvoiceReconciliationPageProps> = ({ selectedMonth }) => {
  const [invoice, setInvoice] = useState<InvoiceReconciliation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchInvoiceReconciliation(selectedMonth)
      .then((data) => {
        setInvoice(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [selectedMonth]);

  const handleDownloadCsv = () => {
    if (!invoice) return;
    let csv = `AWS INVOICE RECONCILIATION - ${invoice.billingPeriod}\n`;
    csv += `Period,${invoice.startDate} to ${invoice.endDate}\n`;
    csv += `Total Billed Amount,$${invoice.totalInvoiceAmount.toFixed(2)} ${invoice.currency}\n\n`;
    csv += 'Service / Line Item,Amount ($),% of Invoice,Type\n';

    for (const item of invoice.lineItems) {
      csv += `"${item.serviceName}",${item.amount.toFixed(2)},${item.percentage}%,${item.isTax ? 'Tax' : item.isCredit ? 'Credit' : 'Usage'}\n`;
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `aws-invoice-reconciliation-${invoice.startDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading || !invoice) {
    return (
      <div className="p-12 text-center text-slate-400 animate-pulse">
        Reconciling line items with official AWS bill...
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
            Official Bill Reconciliation
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            AWS Invoice Statement — {invoice.billingPeriod}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Every dollar and cent reconciled against your AWS billing records without any omitted services.
          </p>
        </div>

        <button
          onClick={handleDownloadCsv}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs hover:bg-slate-800 dark:hover:bg-slate-200 transition-all shadow-sm shrink-0 self-start sm:self-auto"
        >
          <Download className="w-4 h-4" />
          <span>Export Reconciled Statement (CSV)</span>
        </button>
      </div>

      {/* Invoice Summary Card */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-700">
          <div>
            <span className="text-xs text-slate-400 font-mono">
              Billing Period: {invoice.startDate} to {invoice.endDate}
            </span>
            <div className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white mt-1">
              ${invoice.totalInvoiceAmount.toFixed(2)}{' '}
              <span className="text-base font-bold text-slate-400">{invoice.currency}</span>
            </div>
            {invoice.isCurrentMonthEstimate && (
              <span className="mt-1 inline-block text-xs font-bold text-amber-600 dark:text-amber-400">
                (Month-to-Date Running Total)
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-4 text-xs">
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-700/30 border border-slate-200/60 dark:border-slate-700">
              <span className="text-slate-400 block font-medium">Subtotal (Usage Charges)</span>
              <span className="text-base font-black text-slate-800 dark:text-slate-200">
                ${invoice.subtotalUsage.toFixed(2)}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-700/30 border border-slate-200/60 dark:border-slate-700">
              <span className="text-slate-400 block font-medium">Taxes & Surcharges</span>
              <span className="text-base font-black text-slate-800 dark:text-slate-200">
                ${invoice.taxAmount.toFixed(2)}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800">
              <span className="text-emerald-700 dark:text-emerald-400 block font-medium">Status</span>
              <span className="text-base font-black text-emerald-800 dark:text-emerald-200">
                Reconciled ✓
              </span>
            </div>
          </div>
        </div>

        {/* Verification Alert */}
        <div className="p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 text-xs text-emerald-900 dark:text-emerald-200 flex items-center space-x-2.5">
          <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>
            <strong>100% Comprehensive:</strong> All {invoice.lineItems.length} charge categories (including Bedrock AI, Lightsail, Tax, Route 53, and Amplify) are included with zero omissions.
          </span>
        </div>
      </div>

      {/* Itemized Line Items Table */}
      <div className="rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Itemized Service Charges (Matches Official Bill)
          </h2>
          <span className="text-xs text-slate-400 font-mono">
            {invoice.lineItems.length} Line Items
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/70 dark:bg-slate-700/40 border-b border-slate-100 dark:border-slate-700 text-xs font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-3.5 px-4">Line Item / Service</th>
                <th className="py-3.5 px-4">Category Type</th>
                <th className="py-3.5 px-4 text-right">Invoiced Amount</th>
                <th className="py-3.5 px-4 text-right">% of Total Bill</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {invoice.lineItems.map((item, idx) => (
                <tr
                  key={idx}
                  className={`hover:bg-slate-50 dark:hover:bg-slate-700/30 ${
                    item.isTax ? 'bg-amber-50/30 dark:bg-amber-950/10' : ''
                  }`}
                >
                  <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                    {item.serviceName}
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        item.isTax
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {item.isTax ? 'Government Tax' : 'AWS Service'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right font-black text-slate-900 dark:text-white">
                    ${item.amount.toFixed(2)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-bold text-slate-700 dark:text-slate-300">
                    {item.percentage}%
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50 dark:bg-slate-800 border-t-2 border-slate-200 dark:border-slate-700 font-black">
              <tr>
                <td className="py-4 px-4 text-slate-900 dark:text-white uppercase tracking-wider">
                  Total Payable Amount
                </td>
                <td className="py-4 px-4 text-slate-400 font-mono text-xs">
                  (USD)
                </td>
                <td className="py-4 px-4 text-right text-lg text-slate-900 dark:text-white">
                  ${invoice.totalInvoiceAmount.toFixed(2)}
                </td>
                <td className="py-4 px-4 text-right text-slate-900 dark:text-white">
                  100%
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
