// Popup script for LinkedIn Connection Scraper

let scrapedData = [];

// Check scraping status periodically
let statusCheckInterval = null;

// Check if we're on a LinkedIn search page
document.addEventListener('DOMContentLoaded', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (!tab.url.includes('linkedin.com/search/results/people')) {
    showStatus('Please navigate to LinkedIn search results page first!', 'error');
    document.getElementById('scrapeBtn').disabled = true;
    return;
  }
  
  // Check for existing data
  await loadStoredData();
  
  // Check if scraping is in progress
  checkScrapingStatus();
  
  // Set up periodic status check
  statusCheckInterval = setInterval(checkScrapingStatus, 1000);
});

// Clean up interval when popup closes
window.addEventListener('beforeunload', () => {
  if (statusCheckInterval) {
    clearInterval(statusCheckInterval);
  }
});

// Load stored data
async function loadStoredData() {
  const stored = await chrome.storage.local.get(['linkedinData']);
  if (stored.linkedinData && stored.linkedinData.length > 0) {
    scrapedData = stored.linkedinData;
    showCount(scrapedData.length);
    document.getElementById('downloadBtn').style.display = 'block';
    showStatus(`${scrapedData.length} connections found. Click Download CSV to export.`, 'success');
  }
}

// Check scraping status from background
async function checkScrapingStatus() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'getScrapingStatus' });
    if (response && response.inProgress) {
      const status = response.status;
      if (status) {
        updateProgress(status);
        document.getElementById('scrapeBtn').disabled = true;
        document.getElementById('scrapeBtn').textContent = '🔄 Scraping...';
      }
    } else {
      // Scraping not in progress, check for new data
      await loadStoredData();
      document.getElementById('scrapeBtn').disabled = false;
      document.getElementById('scrapeBtn').textContent = '📥 Scrape Connections';
    }
  } catch (error) {
    // Background might not be ready, ignore
  }
}

// Update progress display
function updateProgress(status) {
  const progressDiv = document.getElementById('progressDiv');
  const progressText = document.getElementById('progressText');
  const progressFill = document.getElementById('progressFill');
  
  if (status && status.totalPages > 0) {
    progressDiv.style.display = 'block';
    progressText.textContent = status.status || `Scraping page ${status.currentPage} of ${status.totalPages}...`;
    const percent = status.totalPages > 0 ? (status.currentPage / status.totalPages) * 100 : 0;
    progressFill.style.width = `${percent}%`;
    
    if (status.connectionsFound > 0) {
      showCount(status.connectionsFound);
    }
  }
}

// Scrape button handler - now uses background script
document.getElementById('scrapeBtn').addEventListener('click', async () => {
  const btn = document.getElementById('scrapeBtn');
  const pageInput = document.getElementById('pageInput');
  const progressDiv = document.getElementById('progressDiv');
  
  const numPages = parseInt(pageInput.value) || 1;
  
  if (numPages < 1 || numPages > 100) {
    showStatus('Please enter a valid page number (1-100)', 'error');
    return;
  }
  
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab.url.includes('linkedin.com/search/results/people')) {
      showStatus('Please navigate to LinkedIn search results page first!', 'error');
      return;
    }
    
    btn.disabled = true;
    btn.textContent = '🔄 Starting...';
    showStatus(`Starting to scrape ${numPages} page(s)...`, 'info');
    progressDiv.style.display = 'block';
    
    // Start scraping in background
    const response = await chrome.runtime.sendMessage({
      action: 'startScraping',
      numPages: numPages,
      tabId: tab.id
    });
    
    if (response && response.success) {
      // Scraping started in background, popup can be closed
      showStatus(`Scraping started! You can close this popup. Check the extension badge for progress.`, 'info');
      
      // Update UI to show it's running
      btn.textContent = '🔄 Scraping in Background...';
      
      // The status will be updated by the periodic check
    } else {
      showStatus(`Error: ${response?.error || 'Failed to start scraping'}`, 'error');
      btn.disabled = false;
      btn.textContent = '📥 Scrape Connections';
      progressDiv.style.display = 'none';
    }
  } catch (error) {
    console.error('Error:', error);
    showStatus(`Error: ${error.message}. Please try again.`, 'error');
    btn.disabled = false;
    btn.textContent = '📥 Scrape Connections';
    progressDiv.style.display = 'none';
  }
});

// Download CSV button handler - loads data from storage if needed
document.getElementById('downloadBtn').addEventListener('click', async () => {
  // Reload data from storage in case popup was closed and reopened
  await loadStoredData();
  
  if (scrapedData.length === 0) {
    showStatus('No data to download! Please scrape first.', 'error');
    return;
  }
  
  downloadCSV(scrapedData);
  showStatus(`Downloaded ${scrapedData.length} connections!`, 'success');
});

// Function to convert data to CSV
function convertToCSV(data) {
  if (data.length === 0) return '';
  
  // Define headers
  const headers = [
    'Name',
    'Title',
    'Location',
    'Profile URL',
    'Connection Degree',
    'Mutual Connections',
    'Followers',
    'Verified',
    'LinkedIn Member',
    'Scraped At'
  ];
  
  // Create CSV rows
  const rows = data.map(person => {
    return [
      escapeCSV(person.name || ''),
      escapeCSV(person.title || ''),
      escapeCSV(person.location || ''),
      escapeCSV(person.profileUrl || ''),
      escapeCSV(person.connectionDegree || ''),
      escapeCSV(person.mutualConnections || ''),
      escapeCSV(person.followers || ''),
      person.verified ? 'Yes' : 'No',
      person.linkedinMember ? 'Yes' : 'No',
      escapeCSV(person.scrapedAt || '')
    ];
  });
  
  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');
  
  return csvContent;
}

// Escape CSV values
function escapeCSV(value) {
  if (value === null || value === undefined) return '';
  
  const stringValue = String(value);
  
  // If value contains comma, quote, or newline, wrap in quotes and escape quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  
  return stringValue;
}

// Download CSV file
function downloadCSV(data) {
  const csv = convertToCSV(data);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  // Create filename with timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  const filename = `linkedin-connections-${timestamp}.csv`;
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Show status message
function showStatus(message, type) {
  const statusDiv = document.getElementById('status');
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;
  
  // Auto-hide success messages after 3 seconds
  if (type === 'success') {
    setTimeout(() => {
      statusDiv.style.display = 'none';
    }, 3000);
  }
}

// Show count
function showCount(count) {
  const countDiv = document.getElementById('countDisplay');
  countDiv.textContent = `${count} connections`;
  countDiv.style.display = 'block';
}

