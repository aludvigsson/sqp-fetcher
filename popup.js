document.getElementById('fetchData').addEventListener('click', function() {
    const asin = document.getElementById('asinInput').value;
    chrome.runtime.sendMessage({action: 'fetchData', asin: asin});
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "CSV_DATA") {
        downloadCSV(message.payload);
    }
    if (message.type === 'UPDATE_PROGRESS') {
        console.log(`Received progress: ${message.progress}%`);
        const progressBar = document.getElementById("progressBar");
        const progressText = document.getElementById("progressText");
        progressBar.style.width = `${message.progress}%`;
        progressText.innerText = `Week ${message.currentWeek} of ${message.totalWeeks}`; // Update text

    }
});

function downloadCSV(csvData) {
    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', 'data.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}
