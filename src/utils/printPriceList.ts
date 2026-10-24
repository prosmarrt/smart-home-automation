import type { DevicePrice } from '@/types/types';

export function printPriceList(prices: DevicePrice[], title: string = 'Device Price List') {
  // Create a new window for printing
  const printWindow = window.open('', '_blank');
  
  if (!printWindow) {
    alert('Please allow popups to print the price list');
    return;
  }

  // Group prices by category
  const groupedPrices = prices.reduce((acc, price) => {
    const category = price.category.replace(/_/g, ' ').toUpperCase();
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(price);
    return acc;
  }, {} as Record<string, DevicePrice[]>);

  // Generate HTML content
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>${title}</title>
        <style>
          @media print {
            @page {
              size: A4;
              margin: 20mm;
            }
            body {
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
            }
          }
          
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
            color: #333;
          }
          
          .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 3px solid #2196F3;
            padding-bottom: 20px;
          }
          
          .header h1 {
            margin: 0;
            color: #2196F3;
            font-size: 28px;
          }
          
          .header .date {
            color: #666;
            font-size: 14px;
            margin-top: 10px;
          }
          
          .category-section {
            margin-bottom: 40px;
            page-break-inside: avoid;
          }
          
          .category-title {
            background: #2196F3;
            color: white;
            padding: 12px 16px;
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 15px;
            border-radius: 4px;
          }
          
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          
          thead {
            background: #f5f5f5;
          }
          
          th {
            text-align: left;
            padding: 12px;
            font-weight: 600;
            border-bottom: 2px solid #ddd;
            color: #555;
          }
          
          td {
            padding: 10px 12px;
            border-bottom: 1px solid #eee;
          }
          
          tr:hover {
            background: #f9f9f9;
          }
          
          .price {
            font-weight: bold;
            color: #2196F3;
            text-align: right;
          }
          
          .footer {
            margin-top: 40px;
            text-align: center;
            color: #999;
            font-size: 12px;
            border-top: 1px solid #ddd;
            padding-top: 20px;
          }
          
          .no-print {
            margin: 20px 0;
            text-align: center;
          }
          
          .no-print button {
            background: #2196F3;
            color: white;
            border: none;
            padding: 12px 24px;
            font-size: 16px;
            border-radius: 4px;
            cursor: pointer;
            margin: 0 10px;
          }
          
          .no-print button:hover {
            background: #1976D2;
          }
          
          @media print {
            .no-print {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${title}</h1>
          <div class="date">Generated on ${new Date().toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}</div>
        </div>
        
        <div class="no-print">
          <button onclick="window.print()">Print Price List</button>
          <button onclick="window.close()">Close</button>
        </div>
        
        ${Object.entries(groupedPrices).map(([category, categoryPrices]) => `
          <div class="category-section">
            <div class="category-title">${category}</div>
            <table>
              <thead>
                <tr>
                  <th>Device Name</th>
                  <th>Brand</th>
                  <th>Model</th>
                  <th>Protocol</th>
                  <th>Gang</th>
                  <th>Description</th>
                  <th class="price">Unit Price (EGP)</th>
                </tr>
              </thead>
              <tbody>
                ${categoryPrices.map(price => `
                  <tr>
                    <td>${price.device_name || '-'}</td>
                    <td>${price.brand || '-'}</td>
                    <td>${price.model || '-'}</td>
                    <td>${price.protocol || '-'}</td>
                    <td>${price.gang || '-'}</td>
                    <td>${price.description || '-'}</td>
                    <td class="price">EGP ${price.unit_price.toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `).join('')}
        
        <div class="footer">
          <p>This price list is confidential and for internal use only.</p>
          <p>&copy; ${new Date().getFullYear()} Smart Home Automation. All rights reserved.</p>
        </div>
      </body>
    </html>
  `;

  // Write content and trigger print
  printWindow.document.write(htmlContent);
  printWindow.document.close();
}
