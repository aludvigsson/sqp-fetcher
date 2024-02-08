let allCSVData = [];
const columnMapping = {
    "qp-asin-query": "Search Query",
    "qp-asin-query-rank": "Search Query Score",
    "qp-asin-query-volume": "Search Query Volume",
    "qp-asin-impressions": "Impressions: Total Count",
    "qp-asin-count-impressions": "Impressions: ASIN Count",
    "qp-asin-share-impressions": "Impressions: ASIN Share %",
    "qp-asin-clicks": "Clicks: Total Count",
    "qp-click-rate": "Clicks: Click Rate %",
    "qp-asin-count-clicks": "Clicks: ASIN Count",
    "qp-asin-share-clicks": "Clicks: ASIN Share %",
    "qp-asin-median-query-price-clicks": "Clicks: Price (Median)",
    "qp-asin-median-price-clicks": "Clicks: ASIN Price (Median)",
    "qp-asin-same-day-shipping-clicks": "Clicks: Same Day Shipping Speed",
    "qp-asin-one-day-shipping-clicks": "Clicks: 1D Shipping Speed",
    "qp-asin-two-day-shipping-clicks": "Clicks: 2D Shipping Speed",
    "qp-asin-cart-adds": "Cart Adds: Total Count",
    "qp-asin-cart-add-rate": "Cart Adds: Cart Add Rate %",
    "qp-asin-count-cart-adds": "Cart Adds: ASIN Count",
    "qp-asin-share-cart-adds": "Cart Adds: ASIN Share %",
    "qp-asin-median-query-price-cart-adds": "Cart Adds: Price (Median)",
    "qp-asin-median-price-cart-adds": "Cart Adds: ASIN Price (Median)",
    "qp-asin-same-day-shipping-cart-adds": "Cart Adds: Same Day Shipping Speed",
    "qp-asin-one-day-shipping-cart-adds": "Cart Adds: 1D Shipping Speed",
    "qp-asin-two-day-shipping-cart-adds": "Cart Adds: 2D Shipping Speed",
    "qp-asin-purchases": "Purchases: Total Count",
    "qp-asin-purchase-rate": "Purchases: Purchase Rate %",
    "qp-asin-count-purchases": "Purchases: ASIN Count",
    "qp-asin-share-purchases": "Purchases: ASIN Share %",
    "qp-asin-median-query-price-purchases": "Purchases: Price (Median)",
    "qp-asin-median-price-purchases": "Purchases: ASIN Price (Median)",
    "qp-asin-same-day-shipping-purchases": "Purchases: Same Day Shipping Speed",
    "qp-asin-one-day-shipping-purchases": "Purchases: 1D Shipping Speed",
    "qp-asin-two-day-shipping-purchases": "Purchases: 2D Shipping Speed",
    "week": "Week",
    "asin": "ASIN",
    "marketplace": "Marketplace"
};


// Function to get current week number
function getWeekNumber(d) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

const currentWeekNumber = getWeekNumber(new Date());
const startDate = new Date("2023-01-01");

function jsonToCSV(jsonData, week, asin, marketplace) {
    const rows = jsonData.reportsV2[0].rows;
    rows.forEach(row => {
        row['week'] = week;
        row['asin'] = asin;
        row['marketplace'] = marketplace;

        // Wrap 'Search Query' in quotes if it contains a comma
        if (row['qp-asin-query'].includes(',')) {
            row['qp-asin-query'] = `"${row['qp-asin-query']}"`;
        }
    });

    rows.sort((a, b) => parseInt(a['qp-asin-query-rank']) - parseInt(b['qp-asin-query-rank']));
    allCSVData.push(...rows);
}

async function fetchData(asin, weekEndDate, marketplace) {
    console.log(marketplace);
    const payload = {
        viewId: "query-performance-asin-view",
        filterSelections: [
            { id: "asin", value: asin, valueType: "ASIN" },
            { id: "reporting-range", value: "weekly", valueType: null },
            { id: "weekly-week", value: weekEndDate, valueType: "weekly" }
        ],
        selectedCountries: [marketplace.toLowerCase()],
        reportId: "query-performance-asin-report-table",
        reportOperations: [
            {
                reportId: "query-performance-asin-report-table",
                reportType: "TABLE",
                pageNumber: 1,
                pageSize: 100,
                sortByColumnId: "qp-asin-query-rank",
                ascending: true
            }
        ],
    };

    let baseUrl = 'https://sellercentral.amazon.';
    switch (marketplace) {
        case 'UK':
            baseUrl += 'co.uk';
            break;
        case 'DE':
            baseUrl += 'de';
            break;
        case 'US':
        default:
            baseUrl += 'com';
    }

    const url = `${baseUrl}/api/brand-analytics/v1/dashboard/query-performance/reports`;

    await fetch(url, {
        method: 'POST',
        headers: {
            'accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
    })
        .then(response => response.json())
        .then(data => {
            jsonToCSV(data, weekEndDate, asin, marketplace);  // Changed this line
        })
        .catch(error => console.error("Fetch or Parsing failed: ", error));

    await new Promise(resolve => setTimeout(resolve, Math.random() * 6000 + 1000));
}

async function fetchAllData(asin, startDate, endDate, marketplace) {
    allCSVData = []; // Clearing the array for a new ASIN

    const start = new Date(startDate);
    const end = new Date(endDate);
    const totalWeeks = Math.ceil((end - start) / (7 * 24 * 60 * 60 * 1000));

    let currentWeek = 0;
    let currentStartDate = new Date(startDate);

    for (let i = 0; i < totalWeeks; i++) {
        // Calculate the end date of the week (Saturday)
        const weekEndDate = new Date(currentStartDate);
        const dayOfWeek = weekEndDate.getDay(); // Sunday = 0, Monday = 1, ..., Saturday = 6
        const daysToAdd = 6 - dayOfWeek; // Number of days to add to reach Saturday
        weekEndDate.setDate(currentStartDate.getDate() + daysToAdd);

        // Format the week's end date into a string
        const weekEndStr = `${weekEndDate.getFullYear()}-${String(weekEndDate.getMonth() + 1).padStart(2, '0')}-${String(weekEndDate.getDate()).padStart(2, '0')}`;

        // Fetch data for the week
        await fetchData(asin, weekEndStr, marketplace);

        // Update progress
        currentWeek++;
        chrome.runtime.sendMessage({
            type: "UPDATE_PROGRESS",
            progress: (currentWeek / totalWeeks) * 100,
            currentWeek: currentWeek,
            totalWeeks: totalWeeks,
            ASIN: asin,
            week: weekEndStr // Use formatted weekEndStr for the week
        });

        // Move to the start of the next week
        currentStartDate.setDate(currentStartDate.getDate() + 7);
    }


    const orderedApiNames = Object.keys(columnMapping);

    // Use the ordered API names to rearrange each row
    const reorderedRows = allCSVData.map(row => {
        return orderedApiNames.map(name => row[name] || '').join(',');
    });

    // Use the real header names in the CSV
    const realHeaderNames = Object.values(columnMapping).join(',');
    reorderedRows.unshift(realHeaderNames);

    const csvData = reorderedRows.join('\n');
    chrome.runtime.sendMessage({type: "CSV_DATA", payload: csvData, startDate: startDate, endDate: endDate, ASIN: asin});

}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'fetchData') {
        const { asin, startDate, endDate, marketplace } = message;
        fetchAllData(asin, startDate, endDate, marketplace);
    }
});
