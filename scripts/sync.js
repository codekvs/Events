const https = require('https');
const http = require('http');
const fs = require('fs');
const Papa = require('papaparse');
const { URL } = require('url');

/**
 * Fetch data from URL
 */
function fetchURL(url) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const client = parsedUrl.protocol === 'https:' ? https : http;
    
    client.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(data);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
        }
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Fetch Google Sheet and convert to JSON
 */
async function fetchAndConvert(sheetUrl, outputFile, sheetName) {
  console.log(`\n📥 Fetching ${sheetName}...`);
  
  if (!sheetUrl) {
    console.log(`⚠️  Warning: ${sheetName} URL not provided, skipping...`);
    return;
  }
  
  try {
    // Fetch CSV from Google Sheets
    const csvText = await fetchURL(sheetUrl);
    
    // Parse CSV to JSON
    const parsed = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      transformHeader: (header) => header.trim()
    });
    
    if (parsed.errors.length > 0) {
      console.log('⚠️  Parsing warnings:');
      parsed.errors.forEach(err => {
        console.log(`   - Row ${err.row}: ${err.message}`);
      });
    }
    
    // Clean and validate data
    const cleanedData = parsed.data.map(row => {
      const cleaned = {};
      for (const key in row) {
        if (row.hasOwnProperty(key)) {
          cleaned[key] = typeof row[key] === 'string' ? row[key].trim() : row[key];
        }
      }
      return cleaned;
    });
    
    // Create data directory if it doesn't exist
    if (!fs.existsSync('data')) {
      fs.mkdirSync('data');
    }
    
    // Save as JSON with pretty formatting
    fs.writeFileSync(outputFile, JSON.stringify(cleanedData, null, 2));
    
    console.log(`✅ Saved: ${outputFile} (${cleanedData.length} records)`);
    
  } catch (error) {
    console.error(`❌ Error fetching ${sheetName}:`, error.message);
    throw error;
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🏏 Starting Village Cricket Data Sync...\n');
  console.log('==========================================');
  
  const matchesUrl = process.env.MATCHES_SHEET_URL;
  const highlightsUrl = process.env.HIGHLIGHTS_SHEET_URL;
  const announcementsUrl = process.env.ANNOUNCEMENTS_SHEET_URL;
  const teamUrl = process.env.TEAM_SHEET_URL;
  const familyUrl = process.env.FAMILY_SHEET_URL;
  
  if (!matchesUrl && !highlightsUrl && !announcementsUrl && !teamUrl && !familyUrl) {
    console.error('\n❌ Error: No Google Sheet URLs provided!');
    console.error('Please set at least one sheet URL in GitHub secrets.');
    process.exit(1);
  }
  
  try {
    // Fetch all sheets
    if (matchesUrl) {
      await fetchAndConvert(matchesUrl, 'data/matches.json', 'Matches');
    }
    
    if (highlightsUrl) {
      await fetchAndConvert(highlightsUrl, 'data/highlights.json', 'Highlights');
    }
    
    if (announcementsUrl) {
      await fetchAndConvert(announcementsUrl, 'data/announcements.json', 'Announcements');
    }
    
    if (teamUrl) {
      await fetchAndConvert(teamUrl, 'data/team.json', 'Team');
    }
    
    if (familyUrl) {
      await fetchAndConvert(familyUrl, 'data/family.json', 'Family Photos');
    }
    
    console.log('\n==========================================');
    console.log('✅ All data synced successfully!');
    console.log('==========================================\n');
    
  } catch (error) {
    console.error('\n==========================================');
    console.error('❌ Sync failed:', error.message);
    console.error('==========================================\n');
    process.exit(1);
  }
}

// Run the script
main();