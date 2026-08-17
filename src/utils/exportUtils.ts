// Universal Export and Download Utility
// Supports reliable CSV, Document, PDF Receipt, and Digital ID Card generation

/**
 * Downloads text or CSV content as a file with UTF-8 BOM encoding for perfect Excel compatibility.
 */
export function downloadCSV(filename: string, csvContent: string): boolean {
  try {
    // Add UTF-8 Byte Order Mark (BOM) so Excel opens UTF-8 characters and currency symbols properly
    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename.endsWith(".csv") ? filename : `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 150);
    return true;
  } catch (error) {
    console.error("downloadCSV error:", error);
    // Fallback using Data URI
    try {
      const encodedUri = "data:text/csv;charset=utf-8," + encodeURIComponent(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return true;
    } catch (fallbackError) {
      console.error("Fallback CSV download error:", fallbackError);
      return false;
    }
  }
}

/**
 * Downloads a file, data URI, or remote image/PDF safely even under cross-origin or Vercel hosting constraints.
 */
export async function downloadFileOrImage(url: string, filename: string): Promise<boolean> {
  try {
    if (!url) return false;

    // 1. If it's a data URL or Blob URL, trigger direct download
    if (url.startsWith("data:") || url.startsWith("blob:")) {
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        if (document.body.contains(link)) document.body.removeChild(link);
      }, 100);
      return true;
    }

    // 2. If it's a remote URL, fetch as blob first to circumvent cross-origin download restrictions
    try {
      const response = await fetch(url, { mode: "cors" });
      if (response.ok) {
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = objectUrl;
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
          document.body.removeChild(link);
          URL.revokeObjectURL(objectUrl);
        }, 200);
        return true;
      }
    } catch {
      // Fallback for CORS restricted origins (e.g. external CDN)
    }

    // 3. Fallback: Open in new tab for user to view/save
    const win = window.open(url, "_blank");
    if (win) {
      win.focus();
      return true;
    }

    const fallbackLink = document.createElement("a");
    fallbackLink.href = url;
    fallbackLink.target = "_blank";
    fallbackLink.rel = "noopener noreferrer";
    fallbackLink.setAttribute("download", filename);
    document.body.appendChild(fallbackLink);
    fallbackLink.click();
    document.body.removeChild(fallbackLink);
    return true;
  } catch (err) {
    console.error("downloadFileOrImage error:", err);
    return false;
  }
}

/**
 * Generates an official, printable Golden Hands Driving School Fee Receipt / Tax Invoice
 */
export function downloadPaymentReceipt(payment: {
  id?: string;
  transactionId?: string;
  amount: number;
  purpose?: string;
  paymentMethod?: string;
  mode?: string;
  date?: string;
  status?: string;
  studentName?: string;
  studentPhone?: string;
  studentEmail?: string;
  courseName?: string;
}) {
  const receiptNumber = payment.id || payment.transactionId || `RCP-${Date.now().toString().slice(-6)}`;
  const dateStr = payment.date || new Date().toISOString().split("T")[0];
  const studentName = payment.studentName || "Registered Student";
  const amountVal = Number(payment.amount || 0);
  const paymentMode = payment.paymentMethod || payment.mode || "UPI / Online";
  const course = payment.courseName || "Four-Wheeler Comprehensive Driving Program";
  const purpose = payment.purpose || "Course Fee Installment";

  const receiptHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Receipt_${receiptNumber}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 40px; color: #1e293b; background: #fff; }
    .receipt-box { max-width: 680px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; padding: 36px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #6d28d9; padding-bottom: 20px; margin-bottom: 24px; }
    .brand h1 { margin: 0; font-size: 22px; color: #581c87; font-weight: 800; }
    .brand p { margin: 4px 0 0; font-size: 11px; color: #64748b; }
    .meta { text-align: right; }
    .badge { display: inline-block; background: #ecfdf5; color: #047857; font-weight: bold; font-size: 12px; padding: 4px 10px; border-radius: 9999px; margin-top: 6px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; font-size: 13px; }
    .item-label { color: #64748b; font-size: 11px; text-transform: uppercase; font-weight: 600; margin-bottom: 2px; }
    .item-val { font-weight: 700; color: #0f172a; }
    table { width: 100%; border-collapse: collapse; margin: 24px 0; font-size: 13px; }
    th { background: #f8fafc; text-align: left; padding: 10px; color: #475569; font-size: 11px; text-transform: uppercase; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; }
    td { padding: 12px 10px; border-bottom: 1px solid #f1f5f9; }
    .total-row td { font-weight: 800; font-size: 15px; color: #581c87; border-top: 2px solid #e2e8f0; }
    .footer { margin-top: 32px; padding-top: 20px; border-top: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: flex-end; font-size: 11px; color: #64748b; }
    .stamp { text-align: center; border: 1px dashed #a855f7; border-radius: 10px; padding: 8px 16px; background: #faf5ff; }
    .stamp-text { font-size: 10px; font-weight: 800; color: #7e22ce; text-transform: uppercase; }
    @media print { body { padding: 0; } .receipt-box { box-shadow: none; border: none; } }
  </style>
</head>
<body>
  <div class="receipt-box">
    <div class="header">
      <div class="brand">
        <h1>GOLDEN HANDS MOTOR DRIVING ACADEMY</h1>
        <p>Govt. Approved RTO DL-02 Partner • Bhubaneswar, Odisha</p>
        <p>Contact: +91 98765 43210 • Email: info@goldenhands.edu.in</p>
      </div>
      <div class="meta">
        <div class="item-label">OFFICIAL RECEIPT</div>
        <div style="font-weight:800; font-size:14px; font-family: monospace;">#${receiptNumber}</div>
        <div class="badge">PAID • VERIFIED</div>
      </div>
    </div>

    <div class="grid">
      <div>
        <div class="item-label">Billed To</div>
        <div class="item-val">${studentName}</div>
        <div style="color:#64748b; font-size:12px;">${payment.studentPhone || "Bhubaneswar Student"}</div>
      </div>
      <div style="text-align: right;">
        <div class="item-label">Payment Date & Method</div>
        <div class="item-val">${dateStr}</div>
        <div style="color:#64748b; font-size:12px;">Mode: ${paymentMode}</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th>Course Program</th>
          <th style="text-align:right;">Amount (INR)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>${purpose}</strong><br><span style="font-size:11px; color:#64748b;">RTO Compliant Certified Dual-Control Instruction</span></td>
          <td>${course}</td>
          <td style="text-align:right; font-weight:700;">₹${amountVal.toLocaleString("en-IN")}.00</td>
        </tr>
        <tr class="total-row">
          <td colspan="2">TOTAL AMOUNT PAID</td>
          <td style="text-align:right;">₹${amountVal.toLocaleString("en-IN")}.00</td>
        </tr>
      </tbody>
    </table>

    <div class="footer">
      <div>
        <p>• Computer-generated digital receipt registered with Academy Ledger.</p>
        <p>• Retain this receipt for RTO practical test clearance & vehicle badge issuance.</p>
      </div>
      <div class="stamp">
        <div class="stamp-text">GOLDEN HANDS ACADEMY</div>
        <div style="font-size:9px; color:#9333ea;">ACCOUNTS VERIFIED ✓</div>
      </div>
    </div>
  </div>
  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 200);
    };
  </script>
</body>
</html>`;

  const blob = new Blob([receiptHtml], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", `GoldenHands_Receipt_${receiptNumber}.html`);
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 200);
}
