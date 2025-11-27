# LinkedIn Connection Scraper - Chrome Extension

A Chrome extension to scrape LinkedIn connection data from search results pages and export to CSV format.

## Features

- ✅ Scrape connection data from LinkedIn search results
- ✅ Extract: Name, Title, Location, Profile URL, Connection Degree, Mutual Connections, Followers, Verified Status
- ✅ Export data to CSV format
- ✅ Simple and intuitive UI
- ✅ Works with LinkedIn's current page structure

## Installation

### Step 1: Download/Clone the Extension

Make sure all files are in the same directory:
- `manifest.json`
- `content.js`
- `popup.html`
- `popup.js`
- `README.md`

### Step 2: Load Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top-right corner)
3. Click **"Load unpacked"** button
4. Select the folder containing all extension files
5. The extension should now appear in your extensions list

### Step 3: Add Extension Icon (Optional)

The extension references icon files (`icon16.png`, `icon48.png`, `icon128.png`). You can:
- Create simple icons and add them to the folder, OR
- Modify `manifest.json` to remove icon references temporarily

To remove icon references, edit `manifest.json` and remove the `icons` and `default_icon` sections.

## Usage

### Step 1: Navigate to LinkedIn Search Results

1. Go to LinkedIn and search for connections
2. Navigate to a search results page like:
   ```
   https://www.linkedin.com/search/results/people/?connectionOf=...
   ```
3. Make sure the connections are loaded on the page (scroll if needed)

### Step 2: Use the Extension

1. Click the extension icon in your Chrome toolbar
2. The popup will open
3. Click **"Scrape Connections"** button
4. Wait for the scraping to complete (you'll see a success message)
5. Click **"Download CSV"** to export the data

### Step 3: Open CSV File

The CSV file will be downloaded to your default download folder with a name like:
```
linkedin-connections-2025-01-15.csv
```

You can open it in Excel, Google Sheets, or any CSV viewer.

## Data Fields Exported

The CSV includes the following columns:

1. **Name** - Full name of the person
2. **Title** - Job title/description
3. **Location** - Location information
4. **Profile URL** - Full LinkedIn profile URL
5. **Connection Degree** - 1st, 2nd, 3rd, etc.
6. **Mutual Connections** - Information about mutual connections
7. **Followers** - Number of followers (if available)
8. **Verified** - Whether the profile is verified
9. **LinkedIn Member** - Whether they're a LinkedIn member
10. **Scraped At** - Timestamp of when data was scraped

## How It Works

1. **Content Script** (`content.js`):
   - Runs on LinkedIn search results pages
   - Extracts data from the DOM using CSS selectors
   - Sends data back to the popup when requested

2. **Popup** (`popup.html` + `popup.js`):
   - Provides user interface
   - Triggers scraping
   - Converts data to CSV format
   - Downloads the CSV file

3. **Manifest** (`manifest.json`):
   - Defines extension permissions
   - Registers content scripts
   - Configures extension settings

## Technical Details

### Permissions Required

- `activeTab`: To access the current LinkedIn tab
- `storage`: To temporarily store scraped data
- `host_permissions`: To run on LinkedIn domain

### Selectors Used

The extension uses the following selectors to find data:
- `div[data-view-name="people-search-result"]` - Main container
- `a[data-view-name="search-result-lockup-title"]` - Name link
- Various paragraph tags for title, location, etc.

## Limitations & Notes

⚠️ **Important:**
- This extension only scrapes data that's visible on the current page
- To get more results, you may need to scroll down and scrape again
- LinkedIn may update their HTML structure, which could break selectors
- Use responsibly and in accordance with LinkedIn's Terms of Service
- Don't scrape too frequently to avoid rate limiting

## Troubleshooting

### Extension icon not showing
- Check if you added icon files or removed icon references from manifest.json

### "No data scraped" error
- Make sure you're on a LinkedIn search results page
- Ensure the page has fully loaded
- Try scrolling down to load more results

### Selectors not working
- LinkedIn may have updated their HTML structure
- Open browser console (F12) to see error messages
- Update selectors in `content.js` if needed

## Updating Selectors

If LinkedIn changes their HTML structure, you may need to update selectors in `content.js`:

1. Open LinkedIn search results page
2. Right-click on a person's card → Inspect
3. Find the HTML structure
4. Update selectors in `extractPersonData()` function

## Legal Notice

This extension is for educational purposes. Make sure to:
- Comply with LinkedIn's Terms of Service
- Respect user privacy
- Use scraped data responsibly
- Don't use for spam or unsolicited communications

## Support

For issues or questions:
1. Check browser console for errors (F12)
2. Verify you're on the correct LinkedIn page
3. Make sure extension is enabled
4. Try reloading the extension

## License

This project is provided as-is for educational purposes.

# Linkedin-connection-scraper-extension
