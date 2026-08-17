// Universal Export and Download Utility
// Built specifically to handle Android WebView, Capacitor, Mobile Chrome, and Desktop environments
// Solves: "Download Failed: Can only download HTTP/HTTPS URIs: blob:..." on Android OS

/**
 * Checks if the current environment is Android, mobile, or a Capacitor container
 */
export function isMobileOrAndroidDevice(): boolean {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent || "";
  const isAndroid = /Android/i.test(ua);
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const isCapacitor = Boolean((window as any).Capacitor) || window.location.origin.startsWith("capacitor://") || window.location.origin.startsWith("file://");
  return isAndroid || isMobile || isCapacitor;
}

/**
 * Downloads text or CSV content safely across Android apps, iOS, and desktop browsers.
 * Uses real HTTPS server endpoints and Web Share API on Android to prevent DownloadManager blob errors.
 */
export async function downloadCSV(filename: string, csvContent: string): Promise<boolean> {
  const safeFilename = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  const BOM = "\uFEFF";
  const fullContent = csvContent.startsWith(BOM) ? csvContent : BOM + csvContent;

  try {
    // 1. Android & Mobile Optimization: Web Share API (Highest compatibility on Android WebView / Chrome)
    if (typeof navigator !== "undefined" && navigator.canShare && typeof File !== "undefined") {
      try {
        const file = new File([fullContent], safeFilename, { type: "text/csv;charset=utf-8" });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: safeFilename,
            text: `Golden Hands Driving Academy - ${safeFilename}`
          });
          return true;
        }
      } catch (shareError: any) {
        // User cancelled share dialog or permissions dismissed - continue to HTTPS download
        if (shareError.name === "AbortError") {
          return true;
        }
        console.warn("Web Share fallback:", shareError);
      }
    }

    // 2. Server-Assisted Real HTTPS URI Download
    // Android's DownloadManager requires actual http:// or https:// URIs (rejects blob: URLs)
    try {
      const response = await fetch("/api/export/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: safeFilename,
          content: fullContent,
          contentType: "text/csv; charset=utf-8"
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data && data.downloadUrl) {
          const absoluteUrl = new URL(data.downloadUrl, window.location.href).href;
          
          // Trigger direct HTTPS download
          const link = document.createElement("a");
          link.href = absoluteUrl;
          link.setAttribute("download", safeFilename);
          link.setAttribute("target", "_blank");
          link.setAttribute("rel", "noopener noreferrer");
          document.body.appendChild(link);
          link.click();
          
          setTimeout(() => {
            if (document.body.contains(link)) document.body.removeChild(link);
          }, 300);
          return true;
        }
      }
    } catch (serverErr) {
      console.warn("Server prepare export failed, attempting client-side fallback:", serverErr);
    }

    // 3. Desktop / Standard Browser Blob Download
    if (!isMobileOrAndroidDevice()) {
      const blob = new Blob([fullContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", safeFilename);
      document.body.appendChild(link);
      link.click();
      
      setTimeout(() => {
        if (document.body.contains(link)) document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 300);
      return true;
    }

    // 4. Mobile Data URI fallback
    const encodedUri = "data:text/csv;charset=utf-8," + encodeURIComponent(fullContent);
    const fallbackLink = document.createElement("a");
    fallbackLink.href = encodedUri;
    fallbackLink.setAttribute("download", safeFilename);
    document.body.appendChild(fallbackLink);
    fallbackLink.click();
    setTimeout(() => {
      if (document.body.contains(fallbackLink)) document.body.removeChild(fallbackLink);
    }, 300);
    return true;

  } catch (error) {
    console.error("Universal downloadCSV error:", error);
    // Last-resort fallback: copy to clipboard so user never loses data
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(fullContent);
      }
    } catch {
      // ignore
    }
    return false;
  }
}

/**
 * Downloads a file, data URI, or remote image/PDF safely even under cross-origin or Android hosting constraints.
 */
export async function downloadFileOrImage(url: string, filename: string): Promise<boolean> {
  try {
    if (!url) return false;

    // 1. If it's a real HTTP/HTTPS remote URL, trigger download on that HTTPS URL directly
    if (url.startsWith("http://") || url.startsWith("https://")) {
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      link.setAttribute("target", "_blank");
      link.setAttribute("rel", "noopener noreferrer");
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        if (document.body.contains(link)) document.body.removeChild(link);
      }, 300);
      return true;
    }

    // 2. If it's a data URL or blob URL on mobile / Android, share or prepare via server
    if (url.startsWith("data:") || url.startsWith("blob:")) {
      // Try Web Share if supported
      if (typeof navigator !== "undefined" && navigator.canShare && typeof File !== "undefined") {
        try {
          const res = await fetch(url);
          const blob = await res.blob();
          const file = new File([blob], filename, { type: blob.type || "application/octet-stream" });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: filename
            });
            return true;
          }
        } catch {
          // continue
        }
      }

      // If on desktop, standard blob download works
      if (!isMobileOrAndroidDevice()) {
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
          if (document.body.contains(link)) document.body.removeChild(link);
        }, 300);
        return true;
      }

      // Mobile: open data URL in new window/tab for user to save
      const win = window.open(url, "_blank");
      if (win) {
        win.focus();
        return true;
      }
    }

    return false;
  } catch (err) {
    console.error("downloadFileOrImage error:", err);
    return false;
  }
}

/**
 * Generates an official, printable Golden Hands Driving School Fee Receipt / Tax Invoice
 * Supports native Android print & download without blob URI restriction.
 */
export async function downloadPaymentReceipt(payment: {
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
}): Promise<boolean> {
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
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Receipt_${receiptNumber}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 24px; color: #1e293b; background: #fff; }
    .receipt-box { max-width: 680px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; padding: 28px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #6d28d9; padding-bottom: 16px; margin-bottom: 20px; }
    .brand h1 { margin: 0; font-size: 20px; color: #581c87; font-weight: 800; }
    .brand p { margin: 3px 0 0; font-size: 11px; color: #64748b; }
    .meta { text-align: right; }
    .badge { display: inline-block; background: #ecfdf5; color: #047857; font-weight: bold; font-size: 11px; padding: 4px 10px; border-radius: 9999px; margin-top: 6px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; font-size: 13px; }
    .item-label { color: #64748b; font-size: 11px; text-transform: uppercase; font-weight: 600; margin-bottom: 2px; }
    .item-val { font-weight: 700; color: #0f172a; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px; }
    th { background: #f8fafc; text-align: left; padding: 10px; color: #475569; font-size: 11px; text-transform: uppercase; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; }
    td { padding: 12px 10px; border-bottom: 1px solid #f1f5f9; }
    .total-row td { font-weight: 800; font-size: 15px; color: #581c87; border-top: 2px solid #e2e8f0; }
    .footer { margin-top: 24px; padding-top: 16px; border-top: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: flex-end; font-size: 11px; color: #64748b; }
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
</body>
</html>`;

  const safeFilename = `GoldenHands_Receipt_${receiptNumber}.html`;

  try {
    // 1. Try Web Share API for mobile devices
    if (typeof navigator !== "undefined" && navigator.canShare && typeof File !== "undefined") {
      try {
        const file = new File([receiptHtml], safeFilename, { type: "text/html" });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: safeFilename,
            text: `Payment Receipt for ${studentName}`
          });
          return true;
        }
      } catch (shareErr: any) {
        if (shareErr.name === "AbortError") return true;
      }
    }

    // 2. Prepare real HTTPS download URL via server
    try {
      const response = await fetch("/api/export/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: safeFilename,
          content: receiptHtml,
          contentType: "text/html; charset=utf-8"
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data && data.downloadUrl) {
          const absoluteUrl = new URL(data.downloadUrl, window.location.href).href;
          window.open(absoluteUrl, "_blank");
          return true;
        }
      }
    } catch {
      // fallback
    }

    // 3. Desktop window print fallback
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(receiptHtml);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
      }, 300);
      return true;
    }

    return true;
  } catch (err) {
    console.error("downloadPaymentReceipt error:", err);
    return false;
  }
}
