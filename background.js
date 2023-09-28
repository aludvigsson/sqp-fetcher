let allCSVData = [];

// Function to get current week number
function getWeekNumber(d) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

const currentWeekNumber = getWeekNumber(new Date());
const startDate = new Date("2023-01-01");

function jsonToCSV(jsonData, week) {
    const rows = jsonData.reportsV2[0].rows;
    rows.forEach(row => row['week'] = week);
    rows.sort((a, b) => parseInt(a['qp-asin-query-rank']) - parseInt(b['qp-asin-query-rank']));
    allCSVData.push(...rows);

}

async function fetchData(asin, weekEndDate) {
    const payload = {
        viewId: "query-performance-asin-view",
        filterSelections: [
            { id: "asin", value: asin, valueType: "ASIN" },
            { id: "reporting-range", value: "weekly", valueType: null },
            { id: "weekly-week", value: weekEndDate, valueType: "weekly" }
        ],
        selectedCountries: ["us"],
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

    await fetch('https://sellercentral.amazon.com/api/brand-analytics/v1/dashboard/query-performance/reports', {
        method: 'POST',
        headers: {
            'accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
    })
        .then(response => response.json())
        .then(data => {
            jsonToCSV(data, weekEndDate);  // Changed this line
        })
        .catch(error => console.error("Fetch or Parsing failed: ", error));

    await new Promise(resolve => setTimeout(resolve, Math.random() * 6000 + 1000));
}

async function fetchAllData(asin) {

    let currentWeek = 0; // Initialize current week to 0
    const totalWeeks = currentWeekNumber - 1; // Define totalWeeks as currentWeekNumber - 1

    for (let i = 1; i < currentWeekNumber; i++) {  //
        const weekEndDate = new Date(startDate);
        weekEndDate.setDate(startDate.getDate() + 6);
        const weekEndStr = `${weekEndDate.getFullYear()}-${String(weekEndDate.getMonth() + 1).padStart(2, '0')}-${String(weekEndDate.getDate()).padStart(2, '0')}`;
        await fetchData(asin, weekEndStr);
        currentWeek++;
        chrome.runtime.sendMessage({
            type: "UPDATE_PROGRESS",
            progress: (currentWeek / totalWeeks) * 100,
            currentWeek: currentWeek,
            totalWeeks: totalWeeks
        });
        console.log(`Sent progress: ${(currentWeek / totalWeeks) * 100}%`);

        startDate.setDate(startDate.getDate() + 7);


    }
    const header = Object.keys(allCSVData[0]).join(',');
    const csvRows = allCSVData.map(row => Object.values(row).join(','));
    csvRows.unshift(header);
    const csvData = csvRows.join('\n');

    chrome.runtime.sendMessage({type: "CSV_DATA", payload: csvData});

}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'fetchData') {
        const asin = message.asin;
        fetchAllData(asin);
    }
});