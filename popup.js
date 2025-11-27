// Popup script for LinkedIn Connection Scraper

let scrapedData = [];

// Check if we're on a LinkedIn search page
document.addEventListener('DOMContentLoaded', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (!tab.url.includes('linkedin.com/search/results/people')) {
    showStatus('Please navigate to LinkedIn search results page first!', 'error');
    document.getElementById('scrapeBtn').disabled = true;
    return;
  }
  
  // Check for existing data
  const stored = await chrome.storage.local.get(['linkedinData']);
  if (stored.linkedinData && stored.linkedinData.length > 0) {
    scrapedData = stored.linkedinData;
    showCount(scrapedData.length);
    document.getElementById('downloadBtn').style.display = 'block';
    showStatus(`${scrapedData.length} connections found. Click Download CSV to export.`, 'success');
  }
});

// Function to update URL with page parameter
function updateUrlPage(url, page) {
  try {
    const urlObj = new URL(url);
    urlObj.searchParams.set('page', page.toString());
    return urlObj.toString();
  } catch (error) {
    console.error('Error updating URL:', error);
    return url;
  }
}

// Function to wait for page to load
function waitForPageLoad(tabId, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    const checkLoad = async () => {
      try {
        const response = await chrome.tabs.sendMessage(tabId, { action: 'checkPageReady' });
        if (response && response.ready) {
          resolve(true);
        } else if (Date.now() - startTime > timeout) {
          reject(new Error('Page load timeout'));
        } else {
          setTimeout(checkLoad, 500);
        }
      } catch (error) {
        // Message might fail if page is still loading
        if (Date.now() - startTime > timeout) {
          reject(new Error('Page load timeout'));
        } else {
          setTimeout(checkLoad, 500);
        }
      }
    };
    
    // Wait a bit before first check
    setTimeout(checkLoad, 1000);
  });
}

// Function to scrape a single page
async function scrapePage(tabId, pageNumber) {
  // Update progress
  const progressDiv = document.getElementById('progressDiv');
  const progressText = document.getElementById('progressText');
  const progressFill = document.getElementById('progressFill');
  const pageInput = document.getElementById('pageInput');
  const totalPages = parseInt(pageInput.value) || 1;
  
  progressDiv.style.display = 'block';
  progressText.textContent = `Scraping page ${pageNumber} of ${totalPages}...`;
  progressFill.style.width = `${(pageNumber / totalPages) * 100}%`;
  
  try {
    // Wait for page to be ready
    await waitForPageLoad(tabId, 15000);
    
    // Give it a bit more time for content to render
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Scrape the page
    const response = await chrome.tabs.sendMessage(tabId, { action: 'scrape' });
    
    if (response && response.success) {
      return response.data || [];
    } else {
      console.error('Scraping failed for page', pageNumber, response);
      return [];
    }
  } catch (error) {
    console.error('Error scraping page', pageNumber, error);
    return [];
  }
}

// Scrape button handler
document.getElementById('scrapeBtn').addEventListener('click', async () => {
  const btn = document.getElementById('scrapeBtn');
  const pageInput = document.getElementById('pageInput');
  const progressDiv = document.getElementById('progressDiv');
  
  btn.disabled = true;
  btn.textContent = '🔄 Scraping...';
  
  const numPages = parseInt(pageInput.value) || 1;
  
  if (numPages < 1 || numPages > 100) {
    showStatus('Please enter a valid page number (1-100)', 'error');
    btn.disabled = false;
    btn.textContent = '📥 Scrape Connections';
    return;
  }
  
  showStatus(`Starting to scrape ${numPages} page(s)...`, 'info');
  progressDiv.style.display = 'block';
  
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab.url.includes('linkedin.com/search/results/people')) {
      showStatus('Please navigate to LinkedIn search results page first!', 'error');
      btn.disabled = false;
      btn.textContent = '📥 Scrape Connections';
      progressDiv.style.display = 'none';
      return;
    }
    
    // Get base URL
    let baseUrl = tab.url;
    
    // Remove existing page parameter if present
    try {
      const urlObj = new URL(baseUrl);
      urlObj.searchParams.delete('page');
      baseUrl = urlObj.toString();
    } catch (e) {
      // If URL parsing fails, use as is
    }
    
    scrapedData = [];
    
    // Scrape each page
    for (let page = 1; page <= numPages; page++) {
      // Update URL with page number
      const pageUrl = updateUrlPage(baseUrl, page);
      
      // Navigate to the page
      await chrome.tabs.update(tab.id, { url: pageUrl });
      
      // Wait for navigation to complete
      await new Promise(resolve => {
        const listener = (tabId, changeInfo) => {
          if (tabId === tab.id && changeInfo.status === 'complete') {
            chrome.tabs.onUpdated.removeListener(listener);
            resolve();
          }
        };
        chrome.tabs.onUpdated.addListener(listener);
      });
      
      // Scrape this page
      const pageData = await scrapePage(tab.id, page);
      
      if (pageData.length > 0) {
        scrapedData = scrapedData.concat(pageData);
        showStatus(`Page ${page}/${numPages}: Found ${pageData.length} connections`, 'info');
      } else {
        showStatus(`Page ${page}/${numPages}: No connections found (page may not exist)`, 'info');
        // If no data found, likely reached the end of results
        break;
      }
      
      // Add delay between pages to avoid rate limiting
      if (page < numPages) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    // Hide progress
    progressDiv.style.display = 'none';
    
    if (scrapedData.length > 0) {
      // Store in chrome storage
      await chrome.storage.local.set({ linkedinData: scrapedData });
      
      showCount(scrapedData.length);
      showStatus(`Successfully scraped ${scrapedData.length} connections from ${numPages} page(s)!`, 'success');
      document.getElementById('downloadBtn').style.display = 'block';
    } else {
      showStatus('No connections found. Please check if the page has results.', 'error');
    }
  } catch (error) {
    console.error('Error:', error);
    showStatus(`Error: ${error.message}. Please try again.`, 'error');
    progressDiv.style.display = 'none';
  } finally {
    btn.disabled = false;
    btn.textContent = '📥 Scrape Connections';
  }
});

// Download CSV button handler
document.getElementById('downloadBtn').addEventListener('click', () => {
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

