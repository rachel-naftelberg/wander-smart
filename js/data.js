// Vienna Travel Database - WanderSmart
// Rich Curated Directory with verified opening hours, pricing, indoor status, average duration, and Special Events (Concerts, Organ recitals, Exhibitions).

const VIENNA_DATA = {
  tripInfo: {
    title: "הטיול שלי לוינה",
    subtitle: "תכנון מותאם אישית ומלווה בשטח",
    startDate: "2026-10-18",
    endDate: "2026-10-22",
    totalDays: 5,
    hotel: {
      name: "PLAZA INN Amedia Wien",
      nameEn: "PLAZA INN Amedia Wien",
      address: "Landstraßer Hauptstraße 155, 1030 Wien, Austria",
      lat: 48.1922176,
      lng: 16.3996007,
      nearestTransit: "U-Bahn U3 (Kardinal-Nagl-Platz), Tram 18 & 71",
      notes: "מלון הבסיס ברובע 3 (Landstraße), כ-10 דקות ישירות למרכז העיר ב-U3."
    }
  },

  // City Passes available in Vienna
  cityPasses: {
    viennaPass: {
      id: "viennaPass",
      name: "Vienna Pass",
      nameHe: "כרטיס וינה פאס (כניסה חופשית ל-70+ אטרקציות)",
      type: "all_inclusive",
      description: "כולל כניסה חופשית לכל האטרקציות המובילות + אוטובוס תיירים + דילוג על תורים.",
      prices: { 1: 89, 2: 124, 3: 154, 6: 199 },
      includesTransit: false
    },
    viennaCityCard: {
      id: "viennaCityCard",
      name: "Vienna City Card",
      nameHe: "וינה סיטי קארד (תחבורה חופשית + הנחות)",
      type: "discount_transit",
      description: "כולל נסיעה חופשית בכל התחבורה הציבורית + 15%-20% הנחה באטרקציות.",
      prices: { 1: 17, 2: 25, 3: 29 },
      includesTransit: true,
      defaultDiscount: 0.18
    },
    viennaFlexiPass: {
      id: "viennaFlexiPass",
      name: "Vienna Flexi Pass",
      nameHe: "וינה פלקסי פאס (בחירת 3-5 אטרקציות)",
      type: "flexi",
      description: "בחירת 3, 4 או 5 אטרקציות מובילות במחיר קבוע מראש.",
      prices: { 3: 54, 4: 67, 5: 79 },
      includesTransit: false
    },
    regularTickets: {
      id: "regularTickets",
      name: "Separate Tickets",
      nameHe: "כרטיסים נפרדים בקופות / אונליין",
      type: "single",
      prices: {},
      includesTransit: false
    }
  },

  // Weather forecast per day
  weatherForecast: {
    "1": { temp: 16, cond: "partly_cloudy", rainChance: 15, text: "מעונן חלקית, נעים", wind: "12 קמ\"ש", isRainy: false },
    "2": { temp: 14, cond: "rain", rainChance: 80, text: "גשם לפרקים בשעות הצהריים", wind: "22 קמ\"ש", isRainy: true },
    "3": { temp: 17, cond: "sunny", rainChance: 5, text: "שמשי ובהיר", wind: "10 קמ\"ש", isRainy: false },
    "4": { temp: 15, cond: "cloudy", rainChance: 30, text: "מעונן, ללא גשם משמעותי", wind: "14 קמ\"ש", isRainy: false },
    "5": { temp: 13, cond: "rain_light", rainChance: 65, text: "טפטוף קל וקריר", wind: "18 קמ\"ש", isRainy: true }
  },

  // User's active attractions list
  attractions: [],

  // User's active booked events list
  bookedEvents: [],

  // Rich Vienna Curated Directory for Live Search, Disambiguation & Confirmation
  viennaDirectory: {
    spots: [
      {
        id: "stephansdom",
        nameHe: "קתדרלת סטפנוס הקדוש (שטפנסדום)",
        name: "St. Stephen's Cathedral",
        lat: 48.2084,
        lng: 16.3735,
        address: "Stephansplatz 3, 1010 Wien",
        officialHours: "שני–שבת 06:00–22:00, ראשון 07:00–22:00 (סיורים מ-09:00)",
        officialWebsite: "https://www.stephanskirche.at/",
        category: "landmark",
        isIndoor: true,
        averageDurationMinutes: 75,
        regularPrice: 20.0,
        pricingDetails: { viennaPass: "חינם (0 €)", cityCardDiscount: "20% הנחה (16 €)" },
        specialEvents: [
          {
            title: "קונצרט עוגב הענק ההיסטורי (Riesenorgel)",
            desc: "אחד מעוגבי הכנסייה הגדולים באירופה בעל 12,616 צינורות. חוויה מוזיקלית שממלאת את כל החלל הגותי.",
            times: "חמישי–שבת בשעה 20:30",
            price: "15–35 €",
            ticketUrl: "https://www.kunstkultur.com/stephansdom",
            venue: "St. Stephen's Cathedral",
            dressCode: "Smart Casual / מכובד"
          },
          {
            title: "קונצרט רקוויאם של מוצרט (Mozart Requiem)",
            desc: "ביצוע מרטיט של יצירת המופת של מוצרט באותה קתדרלה שבה נקבר בשנת 1791.",
            times: "ימי שישי ומוצ\"ש בשעה 20:15",
            price: "25–55 €",
            ticketUrl: "https://www.concert-vienna.com/stephansdom",
            venue: "St. Stephen's Cathedral"
          }
        ],
        nearbyFood: [
          { nameHe: "קפה סנטרל", name: "Café Central", signatureDish: "מלנג' וינאי קלאסי ושטרודל תפוחים חם עם רוטב וניל 👑", distanceMin: 6 },
          { nameHe: "פיגלמילר", name: "Figlmüller", signatureDish: "שניצל וינאי דקיק וענק שגולש מכל צדדי הצלחת 👑", distanceMin: 3 }
        ],
        nearbyRestroom: { name: "שירותים ציבוריים תת-קרקעיים Stephansplatz", distanceMin: 1, cost: "0.50 €", cleanliness: "4.8/5" },
        aiStory: "הלב הפועם של וינה עם גג רעפים מרהיב של 230,000 רעפים צבעוניים. מגדל הפעמונים מתנשא לגובה 136 מטר."
      },

      {
        id: "karlskirche",
        nameHe: "כנסיית קרל הקדוש (קרלסקירכה)",
        name: "St. Charles Church (Karlskirche)",
        lat: 48.1983,
        lng: 16.3718,
        address: "Karlsplatz 10, 1040 Wien",
        officialHours: "שני–שבת 09:00–18:00, ראשון 12:00–19:00",
        officialWebsite: "https://www.karlskirche.at/",
        category: "landmark",
        isIndoor: true,
        averageDurationMinutes: 60,
        regularPrice: 9.5,
        pricingDetails: { viennaPass: "חינם (0 €)", cityCardDiscount: "2 € הנחה (7.5 €)" },
        specialEvents: [
          {
            title: "קונצרט 'ארבע העונות' של ויוואלדי (Vivaldi 4 Seasons)",
            desc: "תזמורת של 17 נגנים המנגנת על כלי מיתר תקופתיים אותנטיים מתחת לתקרת הפרסקאות הבארוקית המדהימה.",
            times: "מדי ערב בשעה 20:15",
            price: "34–49 €",
            ticketUrl: "https://www.concert-vienna.com/karlskirche",
            venue: "Karlskirche, Karlsplatz 10",
            dressCode: "Smart Casual"
          }
        ],
        nearbyFood: [
          { nameHe: "סלם ברוי (Salm Bräu)", name: "Salm Bräu", signatureDish: "צלעות ספריבס מקורמלות בבירה ביתית מבושלת במקום 👑", distanceMin: 7 }
        ],
        nearbyRestroom: { name: "שירותים ציבוריים בתחנת Karlsplatz", distanceMin: 2, cost: "0.50 €", cleanliness: "4.6/5" },
        aiStory: "יצירת המופת הבארוקית של יוהאן ברנהרד פישר פון ארלך, שנבנתה בעקבות מגפת הדבר ב-1713."
      },

      {
        id: "peterskirche",
        nameHe: "כנסיית פטרוס הקדוש (פטרסקירכה)",
        name: "St. Peter's Catholic Church",
        lat: 48.2094,
        lng: 16.3701,
        address: "Petersplatz 1, 1010 Wien",
        officialHours: "שני–שישי 07:00–20:00, שבת–ראשון 09:00–21:00",
        officialWebsite: "https://www.peterskirche.at/",
        category: "landmark",
        isIndoor: true,
        averageDurationMinutes: 45,
        regularPrice: 0.0, // Free entry
        pricingDetails: { viennaPass: "כניסה חופשית (0 €)", cityCardDiscount: "כניסה חינם לקהל" },
        specialEvents: [
          {
            title: "רסיטל עוגב יומי חינם (Daily Free Organ Recital)",
            desc: "חצי שעה של יצירות באך, ברהמס ומוצרט בעוגב הבארוק המפואר. פתוח חופשי לקהל הרחב.",
            times: "שני–שישי בשעה 15:00 בדיוק",
            price: "חינם (תרומה מומלצת 2-5 €)",
            ticketUrl: "https://www.peterskirche.at/musik/",
            venue: "Peterskirche, Petersplatz 1"
          },
          {
            title: "קונצרט רביעיית מיתרים קלאסית באולם הקריפטה (Classic Ensemble Vienna)",
            desc: "מוזיקה קאמרית אינטימית בחלל התת-קרקעי האקוסטי של הכנסייה.",
            times: "מדי ערב בשעה 20:30",
            price: "32–42 €",
            ticketUrl: "https://www.classicensemblevienna.com/",
            venue: "Crypt of St. Peter's Church"
          }
        ],
        nearbyFood: [
          { nameHe: "שווארצס קמלוט (Zum Schwarzen Kameel)", name: "Zum Schwarzen Kameel", signatureDish: "סנדוויצ'וני בריוש וינאיים עם סלט ביצים וכמהין 👑", distanceMin: 2 }
        ],
        nearbyRestroom: { name: "שירותים ציבוריים בכיכר Graben", distanceMin: 1, cost: "0.50 €", cleanliness: "4.9/5" },
        aiStory: "פנינת בארוק נסתרת בהשראת בזיליקת פטרוס ברומא, עם עיטורי זהב ושיש עוצרי נשימה."
      },

      {
        id: "schonbrunn",
        nameHe: "ארמון שונברון והגנים הקיסריים",
        name: "Schönbrunn Palace & Gardens",
        lat: 48.1848,
        lng: 16.3122,
        address: "Schönbrunner Schloßstraße 47, 1130 Wien",
        officialHours: "כל יום 08:30–17:30 (גנים מ-06:30 עד השקיעה)",
        officialWebsite: "https://www.schoenbrunn.at/",
        category: "palace",
        isIndoor: true,
        averageDurationMinutes: 120,
        regularPrice: 29.0,
        pricingDetails: { viennaPass: "חינם עם וינה פאס (0 €)", cityCardDiscount: "15% הנחה (24.5 €)" },
        specialEvents: [
          {
            title: "קונצרט ארמון שונברון באורנז'רי (Schönbrunn Palace Concert)",
            desc: "קונצרט חגיגי עם יצירות מוצרט ויוהאן שטראוס, זמרי אופרה ורקדני בלט בדיוק באולם שבו מוצרט התחרה בסליירי.",
            times: "מדי ערב בשעה 20:30 (דלתות ב-20:00)",
            price: "49–105 €",
            ticketUrl: "https://www.imagevienna.com/",
            venue: "Schönbrunn Orangery",
            dressCode: "Smart Casual / אלגנטי"
          }
        ],
        nearbyFood: [
          { nameHe: "קפה גלורייט", name: "Café Gloriette", signatureDish: "שטרודל תפוחים חם מול נוף פנורמי של כל וינה 👑", distanceMin: 8 },
          { nameHe: "פלאכוטה היצינג", name: "Plachutta Hietzing", signatureDish: "טפלשפיץ (Tafelspitz) - בקר קיסרי מבושל בסיר נחושת 👑", distanceMin: 6 }
        ],
        nearbyRestroom: { name: "שירותי שונברון בשער הראשי ובגלורייט", distanceMin: 2, cost: "0.50 € (חינם עם כרטיס)", cleanliness: "4.7/5" },
        aiStory: "ארמון הקיץ המפואר של הבסבורג עם 1,441 חדרים. כאן מוצרט בן ה-6 ניגן לראשונה לקיסרית מריה תרזה."
      },

      {
        id: "hofburg",
        nameHe: "ארמון הופבורג, בית הספר לרכיבה ואוצר המלוכה",
        name: "Hofburg Imperial Palace & Treasury",
        lat: 48.2067,
        lng: 16.3658,
        address: "Schweizerhof, Hofburg, 1010 Wien",
        officialHours: "רביעי–שני 09:00–17:30 (סגור בימי שלישי!)",
        officialWebsite: "https://www.kaiserliche-schatzkammer.at/",
        category: "palace",
        isIndoor: true,
        averageDurationMinutes: 90,
        regularPrice: 16.0,
        pricingDetails: { viennaPass: "חינם עם וינה פאס (0 €)", cityCardDiscount: "2 € הנחה (14 €)" },
        specialEvents: [
          {
            title: "אימון בוקר / מופע סוסי ליפיצן (Spanish Riding School)",
            desc: "רכיבה אמנותית קלאסית של סוסי ליפיצן בליווי מוזיקה קלאסית באולם החורף הבארוקי הלבן של ארמון הופבורג.",
            times: "שלישי–שבת 10:00–12:00",
            price: "16–65 €",
            ticketUrl: "https://www.srs.at/",
            venue: "Winter Riding School, Hofburg"
          },
          {
            title: "קונצרט מקהלת נערי וינה (Vienna Boys Choir) בקפלת הארמון",
            desc: "מיסת יום ראשון מסורתית בה שרה מקהלת הנערים המפורסמת בתבל באקוסטיקה ייחודית.",
            times: "ימי ראשון בשעה 09:15 בדיוק",
            price: "14–48 €",
            ticketUrl: "https://www.hofmusikkapelle.gv.at/",
            venue: "Hofburg Chapel (Hofburgkapelle)"
          }
        ],
        nearbyFood: [
          { nameHe: "קונדיטוריית דמל", name: "Café Demel", signatureDish: "קייזרשמרן קיסרי (קרעי פנקייק אווריריים מקורמלים עם רוטב שזיפים) 👑", distanceMin: 4 }
        ],
        nearbyRestroom: { name: "שירותי מתחם הופבורג / מוזיאון סיסי", distanceMin: 2, cost: "0.50 €", cleanliness: "4.9/5" },
        aiStory: "מושב השלטון של הבסבורג במשך 600 שנה. כאן שמור הכתר המקורי של האימפריה הרומית הקדושה משנת 962."
      },

      {
        id: "belvedere",
        nameHe: "ארמון בלוודר וציור 'הנשיקה' של קלימט",
        name: "Belvedere Palace (Upper & Lower)",
        lat: 48.1915,
        lng: 16.3809,
        address: "Prinz-Eugen-Straße 27, 1030 Wien",
        officialHours: "כל יום 09:00–18:00 (ימי שישי עד 21:00)",
        officialWebsite: "https://www.belvedere.at/",
        category: "museum",
        isIndoor: true,
        averageDurationMinutes: 90,
        regularPrice: 19.5,
        pricingDetails: { viennaPass: "חינם עם וינה פאס (0 €)", cityCardDiscount: "3.5 € הנחה (16 €)" },
        specialEvents: [
          {
            title: "תערוכת יצירות הזהב של גוסטב קלימט ואיגון שילה",
            desc: "האוסף הגדול בעולם של גוסטב קלימט כולל יצירת המופת 'הנשיקה' (The Kiss) ו'יהודית' באולם השיש המלכותי.",
            times: "כל יום בשעות פעילות המוזיאון (שישי עד 21:00)",
            price: "כלול בכרטיס הכניסה",
            ticketUrl: "https://www.belvedere.at/tickets",
            venue: "Upper Belvedere"
          }
        ],
        nearbyFood: [
          { nameHe: "זלם ברוי (Salm Bräu)", name: "Salm Bräu", signatureDish: "ספריבס עסיסיות ברוטב ברביקיו ודבש לצד בירה לאגר מבושלת במקום 👑", distanceMin: 4 }
        ],
        nearbyRestroom: { name: "שירותי לובי בלוודר עליון", distanceMin: 1, cost: "חינם למבקרים", cleanliness: "5.0/5" },
        aiStory: "ארמון בארוק מרהיב המציג את אוסף גוסטב קלימט הגדול בעולם וציור 'הנשיקה' המוזהב."
      },

      {
        id: "staatsoper",
        nameHe: "בית האופרה הממלכתי של וינה (Wiener Staatsoper)",
        name: "Vienna State Opera",
        lat: 48.2030,
        lng: 16.3691,
        address: "Opernring 2, 1010 Wien",
        officialHours: "סיורים מודרכים: 10:00–16:00. קופת כרטיסים: 10:00–18:00",
        officialWebsite: "https://www.wiener-staatsoper.at/",
        category: "landmark",
        isIndoor: true,
        averageDurationMinutes: 60,
        regularPrice: 13.0,
        pricingDetails: { viennaPass: "סיור מודרך חינם (0 €)", cityCardDiscount: "20% הנחה על סיורים" },
        specialEvents: [
          {
            title: "מופעי אופרה ובלט באולם המלכותי (עם כרטיסי עמידה)",
            desc: "אחד מבתי האופרה הנחשבים בעולם. טיפ זהב: כרטיסי עמידה (Stehplatz) נמכרים ב-10–15 € בלבד כ-80 דקות לפני ההופעה!",
            times: "מדי ערב בשעה 19:00 או 19:30",
            price: "10–240 €",
            ticketUrl: "https://www.wiener-staatsoper.at/spielplan-tickets/",
            venue: "Wiener Staatsoper, Opernring 2",
            dressCode: "אלגנטי / מכובד"
          }
        ],
        nearbyFood: [
          { nameHe: "קפה זאכר (Café Sacher)", name: "Café Sacher", signatureDish: "עוגת הזאכרטורט המקורית (Original Sacher-Torte) עם קצפת טרייה 👑", distanceMin: 2 },
          { nameHe: "ביצינגר (Bitzinger)", name: "Bitzinger Würstelstand", signatureDish: "נקניקיית קייזקריינר (Käsekrainer) עם גבינה מותכת ושמפניה 👑", distanceMin: 1 }
        ],
        nearbyRestroom: { name: "שירותי לובי בית האופרה / תחנת Karlsplatz", distanceMin: 1, cost: "0.50 €", cleanliness: "4.8/5" },
        aiStory: "נפתח ב-1869 עם האופרה 'דון ג'ובאני' של מוצרט בנוכחות הקיסר פרנץ יוזף וסיסי."
      },

      {
        id: "musikverein",
        nameHe: "אולם המוזיקפראיין (אולם הזהב)",
        name: "Musikverein Wien (Golden Hall)",
        lat: 48.2008,
        lng: 16.3725,
        address: "Musikvereinsplatz 1, 1010 Wien",
        officialHours: "סיורים מודרכים בימי חול 13:00 (יש להזמין מראש)",
        officialWebsite: "https://www.musikverein.at/",
        category: "landmark",
        isIndoor: true,
        averageDurationMinutes: 60,
        regularPrice: 12.0,
        pricingDetails: { viennaPass: "סיור בהנחה", cityCardDiscount: "הנחה על סיורים מודרכים" },
        specialEvents: [
          {
            title: "קונצרט מוצרט באולם המוזהב (Vienna Mozart Concerts)",
            desc: "תזמורת מוצרט הוינאית בתלבושות ופאות היסטוריות מהמאה ה-18 באולם בעל האקוסטיקה המובילה בעולם.",
            times: "ימי שני, רביעי, שישי ושבת ב-20:15",
            price: "39–89 €",
            ticketUrl: "https://www.mozart.wien/",
            venue: "Goldener Saal, Musikverein",
            dressCode: "Smart Casual / אלגנטי"
          }
        ],
        nearbyFood: [
          { nameHe: "קפה אימפריאל (Café Imperial)", name: "Café Imperial", signatureDish: "טורט אימפריאל ממרציפן, שוקולד מריר וקרם שקדים 👑", distanceMin: 3 }
        ],
        nearbyRestroom: { name: "שירותי המוזיקפראיין", distanceMin: 1, cost: "חינם למבקרים", cleanliness: "5.0/5" },
        aiStory: "הבית של הפילהרמונית של וינה והמקום שממנו משודר קונצרט השנה החדשה ל-50 מיליון צופים ברחבי העולם."
      },

      {
        id: "albertina",
        nameHe: "מוזיאון אלברטינה",
        name: "Albertina Museum",
        lat: 48.2047,
        lng: 16.3683,
        address: "Albertinaplatz 1, 1010 Wien",
        officialHours: "כל יום 10:00–18:00 (רביעי ושישי עד 21:00)",
        officialWebsite: "https://www.albertina.at/",
        category: "museum",
        isIndoor: true,
        averageDurationMinutes: 90,
        regularPrice: 18.9,
        pricingDetails: { viennaPass: "חינם עם וינה פאס (0 €)", cityCardDiscount: "3 € הנחה (15.9 €)" },
        specialEvents: [
          {
            title: "תערוכת אמנות מודרנית (מאוסף בטלינר - ממונט ועד פיקאסו)",
            desc: "מסע מרתק דרך האימפרסיוניזם, האקספרסיוניזם והאוונגרד הרוסי לצד חדרי השרד הקיסריים.",
            times: "פתוח מדי יום (רביעי ושישי עד 21:00)",
            price: "כלול בכרטיס הכניסה",
            ticketUrl: "https://www.albertina.at/en/tickets/",
            venue: "Albertina Museum"
          }
        ],
        nearbyFood: [
          { nameHe: "ביצינגר דוכן נקניקיות", name: "Bitzinger Würstelstand", signatureDish: "קייזקריינר (Käsekrainer) במילוי גבינה שוויצרית נמסה עם חרדל מתוק ושמפניה 👑", distanceMin: 1 },
          { nameHe: "קפה זאכר", name: "Café Sacher", signatureDish: "עוגת הזאכרטורט המקורית (Original Sacher-Torte) עם ריבת משמש וציפוי שוקולד מריר 👑", distanceMin: 2 }
        ],
        nearbyRestroom: { name: "שירותי אלברטינה / תחנת Karlsplatz", distanceMin: 1, cost: "0.50 €", cleanliness: "4.9/5" },
        aiStory: "מוזיאון ארמון מרהיב עם תצפית בלתי נשכחת ממרפסת אלברטינה ישירות לבית האופרה."
      },

      {
        id: "khm",
        nameHe: "המוזיאון לתולדות האמנות (KHM)",
        name: "Kunsthistorisches Museum Vienna",
        lat: 48.2038,
        lng: 16.3618,
        address: "Maria-Theresien-Platz, 1010 Wien",
        officialHours: "שלישי–ראשון 10:00–18:00 (ימי חמישי עד 21:00, סגור בשני)",
        officialWebsite: "https://www.khm.at/",
        category: "museum",
        isIndoor: true,
        averageDurationMinutes: 105,
        regularPrice: 21.0,
        pricingDetails: { viennaPass: "חינם עם וינה פאס (0 €)", cityCardDiscount: "3 € הנחה (18 €)" },
        specialEvents: [
          {
            title: "ערב חמישי קולינרי ואמנותי בקפה הכיפה המלכותי",
            desc: "ערב מיוחד הכולל סיור באוספי רפאל, טיציאן וברויגל, ולאחריו ישיבה בקפה המפואר ביותר בוינה מתחת לכיפת הארמון.",
            times: "ימי חמישי 18:30–21:00",
            price: "כניסה 21 € (או חינם ב-Pass) + תפריט בית הקפה",
            ticketUrl: "https://www.khm.at/en/visit/cafe-restaurant/",
            venue: "KHM Café-Restaurant (Kuppelhalle)"
          }
        ],
        nearbyFood: [
          { nameHe: "קפה מוזיאון (Café Museum)", name: "Café Museum", signatureDish: "קפה מלנג' וינאי ועוגת שוקולד לנדמן 👑", distanceMin: 5 }
        ],
        nearbyRestroom: { name: "שירותי המוזיאון (קומה ראשונה)", distanceMin: 1, cost: "חינם למבקרים", cleanliness: "5.0/5" },
        aiStory: "אחד ממוזיאוני האמנות הגדולים בתבל, שנבנה במיוחד על ידי הקיסר כדי לאכלס את אוספי בית הבסבורג."
      },

      {
        id: "prater",
        nameHe: "פארק פראטר וגלגל הענק ההיסטורי",
        name: "Prater & Giant Ferris Wheel (Riesenrad)",
        lat: 48.2155,
        lng: 16.4002,
        address: "Riesenradplatz 1, 1020 Wien",
        officialHours: "הפארק: 24/7. גלגל הענק: 10:00–21:45",
        officialWebsite: "https://www.wienerriesenrad.com/",
        category: "landmark",
        isIndoor: false,
        averageDurationMinutes: 75,
        regularPrice: 14.5,
        pricingDetails: { viennaPass: "נסיעה חינם בגלגל הענק (0 €)", cityCardDiscount: "1.5 € הנחה (13 €)" },
        specialEvents: [
          {
            title: "תצפית שקיעה פנורמית מקרונות העץ ההיסטוריים",
            desc: "נסיעה מרגיעה בקרונות העץ הפועלים מ-1897 ומספקים נוף של 360 מעלות על כל גגות וינה והדנובה.",
            times: "כל יום עד 21:45",
            price: "14.5 € (חינם עם וינה פאס)",
            ticketUrl: "https://www.wienerriesenrad.com/en/tickets-shop",
            venue: "Wiener Riesenrad"
          }
        ],
        nearbyFood: [
          { nameHe: "שוויצרהאוס (Schweizerhaus)", name: "Schweizerhaus", signatureDish: "שוק חזיר/בקר צלויה בפריכות מטורפת (Stelze) עם בירת באדווייזר טרייה 👑", distanceMin: 4 }
        ],
        nearbyRestroom: { name: "שירותים בכיכר Riesenradplatz", distanceMin: 1, cost: "0.50 €", cleanliness: "4.5/5" },
        aiStory: "גלגל הענק ההיסטורי פועל מ-1897 ומספק תצפית קסומה על כל וינה."
      },

      {
        id: "hundertwasser",
        nameHe: "בית הונדרטוואסר וכפר האמנויות",
        name: "Hundertwasser House & Village",
        lat: 48.2073,
        lng: 16.3943,
        address: "Kegelgasse 36-38, 1030 Wien",
        officialHours: "חיצוני: 24/7. כפר האמנויות: 10:00–18:00",
        officialWebsite: "https://www.hundertwasserhaus.info/",
        category: "landmark",
        isIndoor: false,
        averageDurationMinutes: 45,
        regularPrice: 0.0,
        pricingDetails: { viennaPass: "כניסה חופשית לחזית ולכפר", cityCardDiscount: "הנחה בחנויות המזכרות" },
        specialEvents: [
          {
            title: "תערוכת מוזיאון קונסטהאוס וינה (Kunst Haus Wien)",
            desc: "המוזיאון הסמוך של הונדרטוואסר ללא קווים ישרים עם תערוכות אקולוגיה ועיצוב ירוק.",
            times: "כל יום 10:00–18:00",
            price: "12 € (חינם עם וינה פאס)",
            ticketUrl: "https://www.kunsthauswien.com/",
            venue: "Kunst Haus Wien, Untere Weißgerberstraße 13"
          }
        ],
        nearbyFood: [
          { nameHe: "קפה כפר הונדרטוואסר", name: "Village Café", signatureDish: "עוגת שוקולד עם פירות יער על רקע הבר עם מפל המים המפותל 👑", distanceMin: 1 }
        ],
        nearbyRestroom: { name: "שירותי 'Toilet of Modern Art' בכפר", distanceMin: 1, cost: "0.70 €", cleanliness: "4.8/5" },
        aiStory: "יצירת מופת אדריכלית ללא קווים ישרים עם יותר מ-200 עצים הגדלים מתוך החלונות והגגות."
      },

      {
        id: "naschmarkt",
        nameHe: "שוק נאשמרקט (שוק האוכל והתבלינים)",
        name: "Naschmarkt",
        lat: 48.1983,
        lng: 16.3639,
        address: "Wienzeile, 1060 Wien",
        officialHours: "שני–שישי 06:00–21:00, שבת 06:00–18:00 (סגור ביום ראשון!)",
        officialWebsite: "https://www.wien.gv.at/freizeit/einkaufen/maerkte/lebensmittel/naschmarkt/",
        category: "market",
        isIndoor: false,
        averageDurationMinutes: 60,
        regularPrice: 0.0,
        pricingDetails: { viennaPass: "סיור חופשי בשוק", cityCardDiscount: "הנחות במסעדות השוק הנבחרות" },
        specialEvents: [
          {
            title: "שוק הפשפשים המסורתי של יום שבת (Flohmarkt)",
            desc: "שוק עתיקות ענק וססגוני המתקיים אך ורק בימי שבת בקצה שוק נאשמרקט.",
            times: "ימי שבת בלבד 06:30–14:00",
            price: "כניסה חופשית",
            venue: "Naschmarkt (Flohmarkt area)"
          }
        ],
        nearbyFood: [
          { nameHe: "נני בנאשמרקט (NENI)", name: "NENI am Naschmarkt", signatureDish: "שקשוקה ירוקה חמה, כרובית צלויה בטחינה ועראיס פריך 👑", distanceMin: 1 }
        ],
        nearbyRestroom: { name: "שירותים ציבוריים במרכז שוק נאשמרקט", distanceMin: 1, cost: "0.50 €", cleanliness: "4.2/5" },
        aiStory: "שוק האוכל והתבלינים הוותיק והססגוני של וינה עם מעל 120 דוכנים ומסעדות מכל העולם."
      }
    ]
  }
};

if (typeof window !== 'undefined') {
  window.VIENNA_DATA = VIENNA_DATA;
}
