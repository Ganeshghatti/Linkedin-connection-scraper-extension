// Background Service Worker for LinkedIn Connection Scraper

let scrapingInProgress = false;
let currentScrapingStatus = null;

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'startScraping') {
    if (scrapingInProgress) {
      sendResponse({ success: false, error: 'Scraping already in progress' });
      return true;
    }
    
    // Start scraping in background
    startBackgroundScraping(request.numPages, request.tabId)
      .then(result => {
        sendResponse({ success: true, result });
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });
    
    return true; // Keep channel open for async response
  }
  
  if (request.action === 'getScrapingStatus') {
    sendResponse({ 
      inProgress: scrapingInProgress,
      status: currentScrapingStatus 
    });
    return true;
  }
  
  if (request.action === 'stopScraping') {
    scrapingInProgress = false;
    currentScrapingStatus = null;
    updateBadge('', '');
    sendResponse({ success: true });
    return true;
  }
});

// Clear badge on extension startup
chrome.runtime.onStartup.addListener(() => {
  updateBadge('', '');
});

// Clear badge when extension is installed/updated
chrome.runtime.onInstalled.addListener(() => {
  updateBadge('', '');
});

// Handle notification clicks - clear notification
chrome.notifications.onClicked.addListener((notificationId) => {
  chrome.notifications.clear(notificationId);
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
async function waitForPageLoad(tabId, timeout = 15000) {
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

// Update extension badge
function updateBadge(text, color = '#667eea') {
  chrome.action.setBadgeText({ text: text });
  chrome.action.setBadgeBackgroundColor({ color: color });
}

// Show notification
async function showNotification(title, message, type = 'basic') {
  try {
    await chrome.notifications.create({
      type: type,
      iconUrl: 'icon48.png',
      title: title,
      message: message,
      priority: 2
    });
  } catch (error) {
    // Notifications might not be available, ignore
    console.log('Notification not available:', error);
  }
}

// Main background scraping function
async function startBackgroundScraping(numPages, tabId) {
  scrapingInProgress = true;
  currentScrapingStatus = {
    currentPage: 0,
    totalPages: numPages,
    connectionsFound: 0,
    status: 'Starting...'
  };
  
  // Update badge to show scraping started
  updateBadge('...', '#ff9800');
  
  try {
    // Get tab info
    const tab = await chrome.tabs.get(tabId);
    if (!tab.url.includes('linkedin.com/search/results/people')) {
      throw new Error('Not on a LinkedIn search results page');
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
    
    let allData = [];
    
    // Scrape each page
    for (let page = 1; page <= numPages; page++) {
      if (!scrapingInProgress) {
        throw new Error('Scraping was stopped');
      }
      
      // Update status
      currentScrapingStatus.currentPage = page;
      currentScrapingStatus.status = `Scraping page ${page} of ${numPages}...`;
      
      // Update badge with progress
      const progressPercent = Math.round((page / numPages) * 100);
      updateBadge(`${page}/${numPages}`, '#ff9800');
      
      broadcastStatus();
      
      // Update URL with page number
      const pageUrl = updateUrlPage(baseUrl, page);
      
      // Navigate to the page
      await chrome.tabs.update(tabId, { url: pageUrl });
      
      // Wait for navigation to complete
      await new Promise(resolve => {
        const listener = (updatedTabId, changeInfo) => {
          if (updatedTabId === tabId && changeInfo.status === 'complete') {
            chrome.tabs.onUpdated.removeListener(listener);
            resolve();
          }
        };
        chrome.tabs.onUpdated.addListener(listener);
      });
      
      // Scrape this page
      const pageData = await scrapePage(tabId, page);
      
      if (pageData.length > 0) {
        allData = allData.concat(pageData);
        currentScrapingStatus.connectionsFound = allData.length;
        currentScrapingStatus.status = `Page ${page}/${numPages}: Found ${pageData.length} connections`;
        broadcastStatus();
      } else {
        currentScrapingStatus.status = `Page ${page}/${numPages}: No connections found (reached end)`;
        broadcastStatus();
        // If no data found, likely reached the end of results
        break;
      }
      
      // Add delay between pages to avoid rate limiting
      if (page < numPages && scrapingInProgress) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    // Store results
    if (allData.length > 0) {
      await chrome.storage.local.set({ linkedinData: allData });
      currentScrapingStatus.status = `Completed! Scraped ${allData.length} connections from ${currentScrapingStatus.currentPage} page(s)`;
      currentScrapingStatus.connectionsFound = allData.length;
      
      // Update badge to show completion
      updateBadge('✓', '#4caf50');
      
      // Show notification
      await showNotification(
        'Scraping Complete!',
        `Successfully scraped ${allData.length} connections. Click the extension to download CSV.`,
        'basic'
      );
    } else {
      currentScrapingStatus.status = 'No connections found';
      updateBadge('!', '#f44336');
      await showNotification('Scraping Complete', 'No connections found on the pages.', 'basic');
    }
    
    broadcastStatus();
    
    scrapingInProgress = false;
    
    return {
      success: true,
      data: allData,
      count: allData.length,
      pagesScraped: currentScrapingStatus.currentPage
    };
    
  } catch (error) {
    scrapingInProgress = false;
    currentScrapingStatus.status = `Error: ${error.message}`;
    updateBadge('✗', '#f44336');
    await showNotification('Scraping Failed', error.message, 'basic');
    broadcastStatus();
    throw error;
  } finally {
    // Clear badge after 5 seconds if not already updated
    setTimeout(() => {
      if (!scrapingInProgress) {
        chrome.action.setBadgeText({ text: '' });
      }
    }, 5000);
  }
}

// Broadcast status to any listening popups
function broadcastStatus() {
  chrome.runtime.sendMessage({
    action: 'scrapingStatusUpdate',
    status: currentScrapingStatus
  }).catch(() => {
    // Ignore errors if no listeners
  });
}

// Listen for storage changes to notify popup
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes.linkedinData) {
    chrome.runtime.sendMessage({
      action: 'dataUpdated',
      count: changes.linkedinData.newValue?.length || 0
    }).catch(() => {
      // Ignore errors if no listeners
    });
  }
});

