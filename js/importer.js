// Robust Multi-Format Itinerary Importer - WanderSmart
// Full native PDF extraction (Mozilla PDF.js), Excel (.xlsx/.csv via SheetJS), and smart Hebrew Bidi parser.

const ItineraryImporter = {
  // Check and fix Visual Hebrew (reversed Hebrew text often found in exported PDFs)
  fixReversedHebrew(text) {
    if (!text) return '';

    // Check if line contains typical reversed Hebrew words
    const reversedIndicators = ['םוי', 'הניו', 'ןולמ', 'ןורבנוש', 'גרובפוה', 'םויס', 'העש', 'קראפ', 'ךרד'];
    const isReversed = reversedIndicators.some(w => text.includes(w)) || 
                       // or starts with final letters (ם, ן, ץ, ף, ך) at the beginning of words
                       /(^|\s)[םןץףך][א-ת]/.test(text);

    if (isReversed) {
      // Reverse each sequence of Hebrew characters while preserving English and numbers
      return text.replace(/[\u0590-\u05FF]+/g, (match) => {
        return match.split('').reverse().join('');
      });
    }

    return text;
  },

  // Parse structured text into rich itinerary cards
  parseTextItinerary(rawText, targetDay = 'auto') {
    if (!rawText || !rawText.trim()) return [];

    const lines = rawText.split(/\r?\n/)
      .map(l => this.fixReversedHebrew(l.trim()))
      .filter(l => l.length > 0);

    const parsedItems = [];
    let currentDay = typeof targetDay === 'number' ? targetDay : 1;

    // Day header matchers: יום 1, יום א', Day 1, 18.10, 18/10
    const dayHeaderRegex = /(?:יום|day)\s*(\d+|[א-ה]['']?)|(?:(\d{1,2})[\/.](\d{1,2}))/i;
    const hebrewDayLetterMap = { 'א': 1, "א'": 1, 'ב': 2, "ב'": 2, 'ג': 3, "ג'": 3, 'ד': 4, "ד'": 4, 'ה': 5, "ה'": 5 };

    // Common Vienna locations for instant coordinates & indoor detection
    const viennaKnownSpots = {
      'שונברון': { lat: 48.1848, lng: 16.3122, indoor: true, category: 'palace' },
      'schonbrunn': { lat: 48.1848, lng: 16.3122, indoor: true, category: 'palace' },
      'הופבורג': { lat: 48.2067, lng: 16.3658, indoor: true, category: 'palace' },
      'hofburg': { lat: 48.2067, lng: 16.3658, indoor: true, category: 'palace' },
      'סטפנוס': { lat: 48.2084, lng: 16.3735, indoor: true, category: 'landmark' },
      'שטפנסדום': { lat: 48.2084, lng: 16.3735, indoor: true, category: 'landmark' },
      'stephan': { lat: 48.2084, lng: 16.3735, indoor: true, category: 'landmark' },
      'בלוודר': { lat: 48.1915, lng: 16.3809, indoor: true, category: 'museum' },
      'belvedere': { lat: 48.1915, lng: 16.3809, indoor: true, category: 'museum' },
      'עירייה': { lat: 48.2108, lng: 16.3581, indoor: false, category: 'landmark' },
      'rathaus': { lat: 48.2108, lng: 16.3581, indoor: false, category: 'landmark' },
      'פראטר': { lat: 48.2155, lng: 16.4002, indoor: false, category: 'landmark' },
      'prater': { lat: 48.2155, lng: 16.4002, indoor: false, category: 'landmark' },
      'הונדרטוואסר': { lat: 48.2073, lng: 16.3943, indoor: false, category: 'landmark' },
      'hundertwasser': { lat: 48.2073, lng: 16.3943, indoor: false, category: 'landmark' },
      'פרויד': { lat: 48.2186, lng: 16.3631, indoor: true, category: 'museum' },
      'freud': { lat: 48.2186, lng: 16.3631, indoor: true, category: 'museum' },
      'נאשמרקט': { lat: 48.1983, lng: 16.3639, indoor: false, category: 'market' },
      'naschmarkt': { lat: 48.1983, lng: 16.3639, indoor: false, category: 'market' },
      'אלברטינה': { lat: 48.2047, lng: 16.3683, indoor: true, category: 'museum' },
      'albertina': { lat: 48.2047, lng: 16.3683, indoor: true, category: 'museum' },
      'בית קברות': { lat: 48.1511, lng: 16.4384, indoor: false, category: 'landmark' },
      'קברות': { lat: 48.1511, lng: 16.4384, indoor: false, category: 'landmark' },
      'cemetery': { lat: 48.1511, lng: 16.4384, indoor: false, category: 'landmark' },
      'אופרה': { lat: 48.2030, lng: 16.3690, indoor: true, category: 'landmark' },
      'opera': { lat: 48.2030, lng: 16.3690, indoor: true, category: 'landmark' }
    };

    lines.forEach((rawLine, index) => {
      let line = rawLine.trim();

      // Skip generic noise or page numbers
      if (/^(עמוד|page|\d+$|http|www|www\.)/i.test(line) || line.length < 2) {
        return;
      }

      // Check for Day headers
      const dayMatch = line.match(dayHeaderRegex);
      if (dayMatch && targetDay === 'auto') {
        if (dayMatch[1]) {
          const num = parseInt(dayMatch[1], 10);
          if (!isNaN(num)) {
            currentDay = num;
          } else if (hebrewDayLetterMap[dayMatch[1]]) {
            currentDay = hebrewDayLetterMap[dayMatch[1]];
          }
        }
        // If the line only contains the day header, continue to next line
        if (line.replace(dayHeaderRegex, '').trim().length < 3) {
          return;
        }
      }

      // Extract time like 09:00 or 10:30
      const timeMatch = line.match(/(\d{1,2}:\d{2})/);
      let timeStr = timeMatch ? timeMatch[1] : '';

      // Clean line: remove numbers prefix like "1. ", "• ", "- "
      let cleanName = line
        .replace(/(\d{1,2}:\d{2})/, '')
        .replace(/^[-*•\d.)\s]+/, '')
        .trim();

      if (!cleanName || cleanName.length < 2) return;

      // Extract notes in parentheses or after dash
      let notes = '';
      if (cleanName.includes('-')) {
        const parts = cleanName.split('-');
        cleanName = parts[0].trim();
        notes = parts.slice(1).join('-').trim();
      } else if (cleanName.includes('(')) {
        const pMatch = cleanName.match(/(.*?)\((.*?)\)/);
        if (pMatch) {
          cleanName = pMatch[1].trim();
          notes = pMatch[2].trim();
        }
      }

      // Find matching known spot in Vienna
      let matchedSpot = null;
      const lowerName = cleanName.toLowerCase();
      for (const [key, spot] of Object.entries(viennaKnownSpots)) {
        if (lowerName.includes(key)) {
          matchedSpot = spot;
          break;
        }
      }

      const lat = matchedSpot ? matchedSpot.lat : (48.2082 + (Math.random() - 0.5) * 0.035);
      const lng = matchedSpot ? matchedSpot.lng : (16.3738 + (Math.random() - 0.5) * 0.035);
      const isIndoor = matchedSpot ? matchedSpot.indoor : true;
      const category = matchedSpot ? matchedSpot.category : 'landmark';

      parsedItems.push({
        id: 'imported_' + Date.now() + '_' + index,
        nameHe: cleanName,
        name: cleanName,
        day: Number(typeof targetDay === 'number' ? targetDay : currentDay) || 1,
        order: parsedItems.length + 1,
        category: category,
        isIndoor: isIndoor,
        lat: lat,
        lng: lng,
        address: cleanName + ', Vienna',
        officialHours: 'בדקי באתר הרשמי (יובא מתוכנית)',
        officialHoursVerified: !!matchedSpot,
        durations: {
          full: { label: 'סיור מלא', minutes: 90 },
          medium: { label: 'ביקור ממוצע', minutes: 50 },
          quick: { label: 'עצירת צילום', minutes: 20 }
        },
        selectedDuration: 'medium',
        pricing: {
          regular: 16.0,
          viennaPass: 0,
          viennaCityCardDiscount: 2.5,
          viennaFlexiPassEligible: true
        },
        aiGuide: {
          story: `יעד מקסים שיובא מהתוכנית שלך בוינה: ${cleanName}.`,
          secretFact: 'מומלץ להגיע בשעות הבוקר כדי ליהנות מחוויה רגועה ללא עומסים.',
          photoTip: 'החזית המרכזית מצטלמת נהדר באור יום.'
        },
        nearby: {
          food: [
            {
              nameHe: 'קפה וינאי סמוך',
              name: 'Viennese Café',
              distanceMin: 3,
              signatureDish: 'מלנג\' וינאי קלאסי ושטרודל תפוחים חם 👑'
            }
          ],
          restrooms: {
            name: 'שירותים ציבוריים בקרבת מקום',
            distanceMin: 2,
            cost: '0.50 €',
            cleanliness: '4.7/5',
            accessible: true
          }
        },
        notes: (notes || timeStr) ? `שעה משוערת: ${timeStr} ${notes}` : ''
      });
    });

    return parsedItems;
  },

  // PDF Extraction using Mozilla PDF.js
  async extractTextFromPdf(arrayBuffer) {
    if (typeof pdfjsLib === 'undefined') {
      throw new Error('ספריית PDF.js אינה זמינה כרגע בדפדפן');
    }

    // Configure worker
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
      cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
      cMapPacked: true
    });

    const pdf = await loadingTask.promise;
    const extractedLines = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      // Group items by vertical Y position (tolerance of 4px)
      const lineMap = new Map();

      textContent.items.forEach(item => {
        const text = item.str.trim();
        if (!text) return;

        const y = Math.round(item.transform[5] / 4) * 4; // round to grid
        const x = item.transform[4];

        if (!lineMap.has(y)) {
          lineMap.set(y, []);
        }
        lineMap.get(y).push({ text, x });
      });

      // Sort lines by descending Y (top of page down to bottom)
      const sortedY = Array.from(lineMap.keys()).sort((a, b) => b - a);

      sortedY.forEach(y => {
        const items = lineMap.get(y);
        // Sort items by horizontal X position
        items.sort((a, b) => a.x - b.x);
        const lineText = items.map(it => it.text).join(' ').trim();
        if (lineText) {
          extractedLines.push(lineText);
        }
      });
    }

    return extractedLines.join('\n');
  },

  // Process File upload (Excel/CSV/Text/PDF)
  async handleFileUpload(file, targetDay = 'auto') {
    const fileName = file.name.toLowerCase();

    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      // PDF Handling via PDF.js
      if (fileName.endsWith('.pdf')) {
        reader.onload = async (e) => {
          try {
            const arrayBuffer = e.target.result;
            const text = await this.extractTextFromPdf(arrayBuffer);
            
            // Also update the textarea in the UI for user review!
            const pasteArea = document.getElementById('import-paste-text');
            if (pasteArea) {
              pasteArea.value = text;
            }

            const parsed = this.parseTextItinerary(text, targetDay);
            resolve(parsed);
          } catch (err) {
            console.error('PDF extraction error:', err);
            reject(new Error('פיענוח ה-PDF נכשל: ' + err.message));
          }
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
      } 
      // Excel handling via SheetJS
      else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        if (typeof XLSX !== 'undefined') {
          reader.onload = (e) => {
            try {
              const data = new Uint8Array(e.target.result);
              const workbook = XLSX.read(data, { type: 'array' });
              const firstSheetName = workbook.SheetNames[0];
              const csv = XLSX.utils.sheet_to_csv(workbook.Sheets[firstSheetName]);
              
              const pasteArea = document.getElementById('import-paste-text');
              if (pasteArea) pasteArea.value = csv;

              const parsed = this.parseTextItinerary(csv, targetDay);
              resolve(parsed);
            } catch (err) {
              reject(err);
            }
          };
          reader.readAsArrayBuffer(file);
        } else {
          reader.onload = (e) => resolve(this.parseTextItinerary(e.target.result, targetDay));
          reader.readAsText(file);
        }
      } 
      // CSV & Plain Text
      else {
        reader.onload = (e) => {
          const content = e.target.result;
          const pasteArea = document.getElementById('import-paste-text');
          if (pasteArea) pasteArea.value = content;

          const parsed = this.parseTextItinerary(content, targetDay);
          resolve(parsed);
        };
        reader.onerror = reject;
        reader.readAsText(file, 'UTF-8');
      }
    });
  }
};

if (typeof window !== 'undefined') {
  window.ItineraryImporter = ItineraryImporter;
}
