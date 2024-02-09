document.addEventListener('DOMContentLoaded', function() {

	// Reset error message
	const errorMessage = document.getElementById("errorMessage");
	errorMessage.innerText = "";
	errorMessage.style.display = "none";

    chrome.storage.local.get(['asinInput', 'startDate', 'endDate', 'isSingleFilePerAsin'], function(result) {
        if (result.asinInput) {
            document.getElementById('asinInput').value = result.asinInput;
        }
        if (result.startDate) {
            document.getElementById('startDateInput').value = result.startDate;
        }
        if (result.endDate) {
            document.getElementById('endDateInput').value = result.endDate;
        }
        if (result.isSingleFilePerAsin) {
            document.getElementById('isSingleFilePerAsin').checked = result.isSingleFilePerAsin;
        }
        // Optionally, you could trigger data fetching automatically if the saved state indicates a process was ongoing.
    });
});

document.getElementById('fetchData').addEventListener('click', function() {

	// Reset progress message
    const progressBar = document.getElementById("progressBar");
    const progressText = document.getElementById("progressText");
    progressBar.style.width = `0%`;
    progressText.innerText = "";

	// Reset error message
	const errorMessage = document.getElementById("errorMessage");
	errorMessage.innerText = "";
	errorMessage.style.display = "none";

	// Get user input
    const asinInput = document.getElementById('asinInput').value;
    const asins = asinInput.split(/\s+|,/).filter(asin => asin.trim() !== ''); // Split by whitespace or comma and filter out empty strings
    const startDate = document.getElementById('startDateInput').value;
    const endDate = document.getElementById('endDateInput').value;
    const marketplace = document.getElementById('marketplaceSuffix').innerText;
	const isSingleFilePerAsin = document.getElementById('isSingleFilePerAsin').checked;

	// Save to Chrome storage
    chrome.storage.local.set({ asinInput, startDate, endDate, isSingleFilePerAsin }, function() {
        console.log('SQP Fetcher input data saved');
    });

    asins.forEach(asin => {
        chrome.runtime.sendMessage({action: 'fetchData', asin: asin.trim(), startDate, endDate, marketplace, isSingleFilePerAsin});
    });
});
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "CSV_DATA") {
        downloadCSV(message.payload, message.startDate, message.endDate, message.ASIN);
    }
    if (message.type === 'UPDATE_PROGRESS') {
        console.log(`Received progress for ASIN ${message.ASIN}: ${message.progress}%`);
        const progressBar = document.getElementById("progressBar");
        const progressText = document.getElementById("progressText");
        progressBar.style.width = `${message.progress}%`;
        progressText.innerText = `ASIN ${message.ASIN}: Week ${message.week} - Progress ${message.progress}%`; // Update text with ASIN and week information
    }
    if (message.type === "ERROR") {
		const errorMessage = document.getElementById("errorMessage");
    	errorMessage.innerText = message.message;
	    errorMessage.style.display = "block";
	    errorMessage.style.backgroundColor = "red";
    }
});



function downloadCSV(csvData, startDate, endDate, ASIN) {
    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');

    const filename = `${startDate}-${endDate}-${ASIN}.csv`;



    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', filename); // Use the formatted filename
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

function getMarketplaceSuffix(callback) {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        // Ensure you have at least one result before accessing the array
        if (tabs[0]) {
            var url = new URL(tabs[0].url);
            var hostname = url.hostname;

            if (hostname.includes('.com')) callback('US');
            else if (hostname.includes('.co.uk')) callback('UK');
            else if (hostname.includes('.de')) callback('DE');
            else callback(null); // or a default value
        }
    });
}

// Using the function with a callback because chrome.tabs.query is asynchronous
getMarketplaceSuffix(function(suffix) {
    updateMarketplaceDisplay(suffix); // Update display upon window load
});

function updateMarketplaceDisplay(marketplaceSuffix) {
    const marketplaceDisplay = document.getElementById('marketplaceSuffix');
    marketplaceDisplay.innerText = marketplaceSuffix;
}
