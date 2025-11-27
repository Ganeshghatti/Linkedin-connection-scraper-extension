// LinkedIn Connection Scraper Content Script

// Function to extract data from a single person card
function extractPersonData(personElement) {
  try {
    // Get profile URL
    const profileLink = personElement.querySelector('a[href*="/in/"]');
    const profileUrl = profileLink ? profileLink.href : '';
    
    // Extract name
    const nameLink = personElement.querySelector('a[data-view-name="search-result-lockup-title"]');
    const name = nameLink ? nameLink.textContent.trim() : '';
    
    // Extract title/job description
    const titleElements = personElement.querySelectorAll('p');
    let title = '';
    let location = '';
    let connectionDegree = '';
    
    titleElements.forEach(p => {
      const text = p.textContent.trim();
      // Title is usually the first substantial paragraph after the name
      if (!title && text && !text.includes('•') && !text.includes('mutual') && 
          !text.includes('followers') && text.length > 10) {
        const nameP = p.querySelector('a[data-view-name="search-result-lockup-title"]');
        if (!nameP) {
          title = text;
        }
      }
      
      // Location usually comes after title
      if (title && !location && text && 
          (text.includes(',') || text.includes('India') || text.includes('United States'))) {
        location = text;
      }
      
      // Connection degree (2nd, 3rd, etc.)
      if (text.includes('•') && (text.includes('2nd') || text.includes('3rd') || text.includes('1st'))) {
        const match = text.match(/•\s*(\d+)(st|nd|rd|th)?/);
        if (match) {
          connectionDegree = match[0].replace('•', '').trim();
        }
      }
    });
    
    // Extract mutual connections info
    // Look for paragraphs with links that have data-view-name="search-result-social-proof-insight"
    let mutualConnections = '';
    const allLinks = personElement.querySelectorAll('a[data-view-name="search-result-social-proof-insight"]');
    if (allLinks.length > 0) {
      // Find the paragraph containing mutual connection links
      for (const link of allLinks) {
        const linkText = link.textContent.trim();
        if (linkText.toLowerCase().includes('mutual connection') || 
            linkText.toLowerCase().includes('mutual connections') ||
            linkText === 'is a mutual connection') {
          // Get the parent paragraph
          const parentP = link.closest('p');
          if (parentP) {
            mutualConnections = parentP.textContent.trim();
            break;
          }
        }
      }
      
      // If not found, try to find by checking all paragraphs for "mutual" keyword
      if (!mutualConnections) {
        const allParagraphs = personElement.querySelectorAll('p');
        for (const p of allParagraphs) {
          const text = p.textContent.trim();
          if (text.toLowerCase().includes('mutual connection') && 
              !text.toLowerCase().includes('followers')) {
            mutualConnections = text;
            break;
          }
        }
      }
    }
    
    // Extract followers count if available
    // Find the SVG with id="people-small" and then get the sibling paragraph
    let followers = '';
    const followersSvg = personElement.querySelector('svg[id="people-small"]');
    if (followersSvg) {
      // The followers text is usually in a sibling div or the next sibling
      const parentDiv = followersSvg.closest('div');
      if (parentDiv) {
        // Look for paragraph or link with "followers" text in the same parent
        const followerLink = parentDiv.querySelector('a[data-view-name="search-result-social-proof-insight"]');
        if (followerLink) {
          const followerText = followerLink.textContent.trim();
          if (followerText.toLowerCase().includes('followers')) {
            followers = followerText;
          }
        } else {
          // Fallback: check all paragraphs in the parent div
          const allP = parentDiv.querySelectorAll('p');
          for (const p of allP) {
            const text = p.textContent.trim();
            if (text.toLowerCase().includes('followers')) {
              followers = text;
              break;
            }
          }
        }
      }
    }
    
    // Additional fallback: search all paragraphs for followers text
    if (!followers) {
      const allParagraphs = personElement.querySelectorAll('p');
      for (const p of allParagraphs) {
        const text = p.textContent.trim();
        if (text.toLowerCase().includes('followers') && 
            !text.toLowerCase().includes('mutual')) {
          followers = text;
          break;
        }
      }
    }
    
    // Check if verified (has verified badge)
    const verified = personElement.querySelector('svg[id="verified-small"]') !== null;
    const linkedinMember = personElement.querySelector('svg[id="linkedin-bug-small"]') !== null;
    
    return {
      name: name,
      title: title,
      location: location,
      profileUrl: profileUrl,
      connectionDegree: connectionDegree,
      mutualConnections: mutualConnections,
      followers: followers,
      verified: verified,
      linkedinMember: linkedinMember,
      scrapedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error extracting person data:', error);
    return null;
  }
}

// Main scraping function
function scrapeConnections() {
  const results = [];
  
  // Find all person result containers
  const personResults = document.querySelectorAll('div[data-view-name="people-search-result"]');
  
  console.log(`Found ${personResults.length} person results`);
  
  personResults.forEach((personElement, index) => {
    const personData = extractPersonData(personElement);
    if (personData && personData.name) {
      results.push(personData);
    }
  });
  
  return results;
}

// Function to scroll and load more results (optional - can be triggered manually)
function scrollToLoadMore() {
  window.scrollTo(0, document.body.scrollHeight);
  
  // Wait a bit for content to load
  return new Promise(resolve => {
    setTimeout(resolve, 2000);
  });
}

// Function to check if page is ready
function checkPageReady() {
  // Check if person results are present in DOM
  const personResults = document.querySelectorAll('div[data-view-name="people-search-result"]');
  return personResults.length > 0 || document.readyState === 'complete';
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'scrape') {
    try {
      const data = scrapeConnections();
      sendResponse({ success: true, data: data, count: data.length });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
    return true; // Required for async response
  }
  
  if (request.action === 'checkPageReady') {
    const ready = checkPageReady();
    sendResponse({ ready: ready });
    return true;
  }
  
  if (request.action === 'scrollAndScrape') {
    scrollToLoadMore().then(() => {
      const data = scrapeConnections();
      sendResponse({ success: true, data: data, count: data.length });
    });
    return true;
  }
});

// Auto-scrape on page load (optional - comment out if you want manual trigger only)
// window.addEventListener('load', () => {
//   setTimeout(() => {
//     const data = scrapeConnections();
//     console.log('Auto-scraped data:', data);
//   }, 2000);
// });

