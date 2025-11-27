# Step-by-Step Guide: LinkedIn Connection Scraper

## Overview
This guide will help you build and use a Chrome extension that scrapes LinkedIn connection data and exports it to CSV.

---

## PART 1: SETUP THE EXTENSION

### Step 1: Create the Extension Files
All files have been created in your directory. Verify you have:
- ✅ `manifest.json` - Extension configuration
- ✅ `content.js` - Scraping logic
- ✅ `popup.html` - User interface
- ✅ `popup.js` - Popup functionality
- ✅ `README.md` - Documentation

### Step 2: Prepare Icons (Optional)
The extension needs icon files. You have two options:

**Option A: Create Simple Icons**
- Create three PNG files: `icon16.png` (16x16), `icon48.png` (48x48), `icon128.png` (128x128)
- Place them in the same folder

**Option B: Remove Icon Requirements**
1. Open `manifest.json`
2. Remove or comment out these sections:
   ```json
   "default_icon": { ... },
   "icons": { ... }
   ```
3. Save the file

### Step 3: Load Extension in Chrome

1. **Open Chrome Extensions Page**
   - Type `chrome://extensions/` in the address bar
   - OR: Menu (⋮) → Extensions → Manage Extensions

2. **Enable Developer Mode**
   - Toggle the switch in the top-right corner

3. **Load the Extension**
   - Click **"Load unpacked"** button
   - Navigate to your extension folder: `Linkedin connnection scraper`
   - Click "Select Folder"

4. **Verify Installation**
   - You should see "LinkedIn Connection Scraper" in your extensions list
   - The extension icon should appear in your toolbar (or in the extensions menu)

---

## PART 2: USING THE EXTENSION

### Step 1: Open LinkedIn Search Results Page

1. Go to LinkedIn and log in
2. Navigate to a connections search page, for example:
   ```
   https://www.linkedin.com/search/results/people/?origin=FACETED_SEARCH&network=["F","S","O"]&connectionOf="..."
   ```
3. Make sure the page loads completely and shows connection results

### Step 2: Scrape the Data

1. **Click the Extension Icon**
   - Look for the extension icon in your Chrome toolbar
   - If not visible, click the puzzle icon (🧩) to see all extensions
   - Click "LinkedIn Connection Scraper"

2. **The Popup Opens**
   - You'll see a popup with instructions
   - Click the **"Scrape Connections"** button

3. **Wait for Scraping**
   - The button will show "🔄 Scraping..."
   - A status message will appear
   - When done, you'll see "Successfully scraped X connections!"

### Step 3: Download CSV

1. After scraping, the **"Download CSV"** button appears
2. Click **"Download CSV"** button
3. The file downloads automatically
4. Check your Downloads folder for: `linkedin-connections-YYYY-MM-DD.csv`

### Step 4: View Your Data

Open the CSV file in:
- **Excel** (Windows/Mac)
- **Google Sheets** (upload to Google Drive)
- **Numbers** (Mac)
- Any text editor

---

## PART 3: UNDERSTANDING THE CODE

### How the Scraper Works

#### 1. Content Script (`content.js`)
- Runs automatically on LinkedIn pages
- Finds all person cards using: `div[data-view-name="people-search-result"]`
- Extracts data from each card:
  - Name from `a[data-view-name="search-result-lockup-title"]`
  - Title, location from paragraph tags
  - Profile URL from link `href`
  - Connection degree (1st, 2nd, 3rd)
  - Mutual connections info

#### 2. Popup Script (`popup.js`)
- Sends message to content script to scrape
- Receives scraped data
- Converts data array to CSV format
- Creates download link and triggers download

#### 3. Data Structure
Each person's data is stored as:
```javascript
{
  name: "John Doe",
  title: "Software Engineer at Company",
  location: "New York, NY",
  profileUrl: "https://www.linkedin.com/in/johndoe/",
  connectionDegree: "2nd",
  mutualConnections: "5 mutual connections",
  followers: "",
  verified: false,
  linkedinMember: false,
  scrapedAt: "2025-01-15T10:30:00.000Z"
}
```

---

## PART 4: TROUBLESHOOTING

### Problem: Extension icon doesn't appear
**Solution:**
- Check if you removed icon requirements from manifest.json
- Or add placeholder icon files

### Problem: "Please navigate to LinkedIn search results page"
**Solution:**
- Make sure URL contains `linkedin.com/search/results/people`
- Refresh the page
- Reload the extension

### Problem: No data scraped (0 connections)
**Solution:**
1. Open browser console (F12)
2. Check for JavaScript errors
3. Verify page structure hasn't changed
4. Try scrolling down to load more results first
5. Click "Scrape" again

### Problem: Some data missing
**Solution:**
- LinkedIn may have different card layouts
- The scraper extracts what's available
- Some fields might be empty for certain profiles

### Problem: Selectors not working (LinkedIn updated)
**Solution:**
1. Inspect a person card on LinkedIn (Right-click → Inspect)
2. Find the current HTML structure
3. Update selectors in `content.js` → `extractPersonData()` function

---

## PART 5: ADVANCED USAGE

### Scraping Multiple Pages

Currently, the extension scrapes only the current page. To get more results:

1. Scroll down on LinkedIn page to load more results
2. Click "Scrape Connections" again
3. New data will replace old data
4. Or manually navigate to page 2, 3, etc., and scrape each

### Modifying Extracted Fields

To extract additional data:
1. Open `content.js`
2. Find `extractPersonData()` function
3. Add new selectors to extract additional information
4. Update CSV headers in `popup.js` → `convertToCSV()` function

### Auto-Scrolling (Advanced)

To automatically scroll and scrape:
1. Uncomment the auto-scroll code in `content.js`
2. Add delay between scrolls to avoid being rate-limited
3. **Use with caution** - may trigger LinkedIn's anti-bot measures

---

## IMPORTANT NOTES

### Rate Limiting
- Don't scrape too frequently
- Wait between scraping sessions
- Respect LinkedIn's servers

### Legal & Ethical
- ✅ Use for personal/professional purposes
- ✅ Comply with LinkedIn Terms of Service
- ❌ Don't use for spam
- ❌ Don't sell scraped data
- ❌ Don't scrape without permission

### Data Privacy
- Scraped data is stored locally only
- No data is sent to external servers
- CSV files are saved to your computer only

---

## QUICK REFERENCE

| Action | Steps |
|--------|-------|
| **Install** | `chrome://extensions/` → Developer Mode → Load Unpacked |
| **Use** | Open LinkedIn search → Click extension → Scrape → Download |
| **Debug** | F12 → Console tab → Check errors |
| **Update** | Reload extension in `chrome://extensions/` |

---

## NEXT STEPS

After successful scraping:
1. ✅ Review your CSV data
2. ✅ Clean/format data as needed
3. ✅ Use for networking, outreach, analysis
4. ✅ Keep backup of important data

---

## Support

If you encounter issues:
1. Check browser console (F12) for errors
2. Verify extension is enabled
3. Test on a fresh LinkedIn page
4. Reload the extension

Happy Scraping! 🎉

