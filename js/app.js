// Main Application Controller - WanderSmart
// Coordinates State, Real-time Trip Mode, Weather, Rain Reorganization, Modals & Navigation.

const App = {
  state: {
    currentDay: 1,
    transitMode: 'transit', // 'transit' | 'walk' | 'drive'
    appMode: 'live', // 'live' (בשטח) | 'planner' (תכנון)
    visitedIds: new Set(),
    postponedIds: new Set(),
    skippedIds: new Set(),
    revealedNearbyIds: new Set(), // on-demand nearby discoveries per attraction
    durationOverrides: {}, // id -> 'full' | 'medium' | 'quick'
    customHours: {}, // id -> custom hours string
    rainModeDay: null, // day number if rain mode is triggered
    activeTab: 'timeline', // 'timeline' | 'map' | 'shows' | 'passes'
    selectedAttractionForAI: null,
    isSpeaking: false,
    selectedPassView: 'city_card_72h', // for optimizer
    userCoords: null, // { lat, lng }
    nextResumeAttraction: null,
    pendingImportItems: [],
    dayStartTimes: { 1: "09:00", 2: "09:00", 3: "09:00", 4: "09:00", 5: "09:00" }
  },

  init() {
    this.loadState();
    this.bindEvents();
    
    // Auto-check date on load
    this.checkCurrentTripDate();

    // Initialize Map with Vienna Hotel
    setTimeout(() => {
      MapManager.init('map-container', VIENNA_DATA.tripInfo.hotel);
      this.render();
      // Attempt auto-resume from GPS
      this.autoResumeCurrentLocationAndDate(false);
    }, 200);

    // Update Live Clock & Event countdowns periodically
    setInterval(() => {
      this.updateClockAndTimers();
    }, 60000);
  },

  // State Persistence with LocalStorage
  saveState() {
    try {
      const serializable = {
        currentDay: this.state.currentDay,
        transitMode: this.state.transitMode,
        appMode: this.state.appMode,
        visitedIds: Array.from(this.state.visitedIds),
        postponedIds: Array.from(this.state.postponedIds),
        skippedIds: Array.from(this.state.skippedIds),
        durationOverrides: this.state.durationOverrides,
        customHours: this.state.customHours,
        rainModeDay: this.state.rainModeDay,
        dayStartTimes: this.state.dayStartTimes,
        attractions: VIENNA_DATA.attractions,
        bookedEvents: VIENNA_DATA.bookedEvents
      };
      localStorage.setItem('wander_smart_vienna_state', JSON.stringify(serializable));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
  },

  loadState() {
    try {
      const saved = localStorage.getItem('wander_smart_vienna_state');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.currentDay) this.state.currentDay = Number(parsed.currentDay) || 1;
        if (parsed.transitMode) this.state.transitMode = parsed.transitMode;
        if (parsed.appMode) this.state.appMode = parsed.appMode;
        if (parsed.visitedIds) this.state.visitedIds = new Set(parsed.visitedIds);
        if (parsed.postponedIds) this.state.postponedIds = new Set(parsed.postponedIds);
        if (parsed.skippedIds) this.state.skippedIds = new Set(parsed.skippedIds);
        if (parsed.durationOverrides) this.state.durationOverrides = parsed.durationOverrides;
        if (parsed.customHours) this.state.customHours = parsed.customHours;
        if (parsed.rainModeDay !== undefined) this.state.rainModeDay = parsed.rainModeDay !== null ? Number(parsed.rainModeDay) : null;
        if (parsed.dayStartTimes) this.state.dayStartTimes = parsed.dayStartTimes;
        if (Array.isArray(parsed.attractions)) {
          VIENNA_DATA.attractions = parsed.attractions.map(a => ({
            ...a,
            day: Number(a.day) || 1
          }));
        }
        if (Array.isArray(parsed.bookedEvents)) VIENNA_DATA.bookedEvents = parsed.bookedEvents;
      }
    } catch (e) {
      console.warn('LocalStorage load failed:', e);
    }
  },

  // Clear All Attractions & Events (נקה הכל)
  clearAllData() {
    if (!confirm('האם את בטוחה שברצונך למחוק את כל האטרקציות והאירועים מהאפליקציה ולהתחיל מחדש?')) {
      return;
    }
    VIENNA_DATA.attractions = [];
    VIENNA_DATA.bookedEvents = [];
    this.state.visitedIds.clear();
    this.state.postponedIds.clear();
    this.state.skippedIds.clear();
    this.state.revealedNearbyIds.clear();
    this.state.durationOverrides = {};
    this.state.customHours = {};
    this.state.rainModeDay = null;
    this.state.dayStartTimes = { 1: "09:00", 2: "09:00", 3: "09:00", 4: "09:00", 5: "09:00" };
    this.saveState();
    this.render();
    this.showToast('כל האטרקציות והאירועים נמחקו בהצלחה! האפליקציה נקייה 🧼', 'info');
  },

  // Remove Attraction Manually (הסר יעד)
  removeAttraction(attractionId) {
    const idx = VIENNA_DATA.attractions.findIndex(a => a.id === attractionId);
    if (idx !== -1) {
      const removed = VIENNA_DATA.attractions.splice(idx, 1)[0];
      this.state.visitedIds.delete(attractionId);
      this.state.postponedIds.delete(attractionId);
      this.state.skippedIds.delete(attractionId);
      this.state.revealedNearbyIds.delete(attractionId);
      this.saveState();
      this.render();
      this.showToast(`היעד "${removed.nameHe}" הוסר בהצלחה 🗑️`);
    }
  },

  // Remove Booked Event Manually (הסר מופע)
  removeBookedEvent(eventId) {
    const idx = VIENNA_DATA.bookedEvents.findIndex(e => e.id === eventId);
    if (idx !== -1) {
      const removed = VIENNA_DATA.bookedEvents.splice(idx, 1)[0];
      this.saveState();
      this.render();
      this.showToast(`האירוע "${removed.nameHe}" הוסר בהצלחה 🗑️`);
    }
  },

  // Toggle On-Demand Nearby Discoveries ("את הדברים שבאיזור, תן לי בלחיצת כפתור")
  toggleDiscoverNearby(attractionId) {
    if (this.state.revealedNearbyIds.has(attractionId)) {
      this.state.revealedNearbyIds.delete(attractionId);
    } else {
      this.state.revealedNearbyIds.add(attractionId);
    }
    this.renderTimeline();
  },

  // Retrieve or compute nearby food & restrooms on-demand
  getNearbyDataForAttraction(att) {
    if (att.nearby && att.nearby.food && att.nearby.food.length > 0) {
      return att.nearby;
    }
    // Search directory by name or proximity
    const directory = VIENNA_DATA.viennaDirectory ? VIENNA_DATA.viennaDirectory.spots : [];
    const matched = directory.find(s => 
      att.nameHe.includes(s.nameHe) || s.nameHe.includes(att.nameHe) ||
      (Math.abs(s.lat - att.lat) < 0.015 && Math.abs(s.lng - att.lng) < 0.015)
    );

    if (matched) {
      return {
        food: matched.nearbyFood,
        restrooms: matched.nearbyRestroom
      };
    }

    // Default smart authentic Vienna suggestions
    return {
      food: [
        {
          nameHe: 'בית קפה וינאי מסורתי בסביבה',
          name: 'Traditional Viennese Café',
          distanceMin: 3,
          signatureDish: 'מלנג\' וינאי ושטרודל תפוחים חם עם קצפת 👑'
        },
        {
          nameHe: 'מסעדה אוסטרית מקומית',
          name: 'Gasthaus',
          distanceMin: 4,
          signatureDish: 'שניצל וינאי פריך עם סלט תפוחי אדמה חמצמץ 👑'
        }
      ],
      restrooms: {
        name: 'שירותים ציבוריים בתחנת המטרו הקרובה',
        distanceMin: 2,
        cost: '0.50 €',
        cleanliness: '4.7/5',
        accessible: true
      }
    };
  },

  // Get active attractions for the current day
  getCurrentDayAttractions() {
    const day = Number(this.state.currentDay);
    let list = VIENNA_DATA.attractions.filter(att => {
      // Exclude postponed ones from regular daily view (they go to the rollover drawer)
      if (this.state.postponedIds.has(att.id)) return false;
      return Number(att.day) === day;
    });

    // If Rain Mode is active for this day, sort indoor attractions first!
    if (Number(this.state.rainModeDay) === day) {
      list = [...list].sort((a, b) => {
        if (a.isIndoor && !b.isIndoor) return -1;
        if (!a.isIndoor && b.isIndoor) return 1;
        return a.order - b.order;
      });
    } else {
      list.sort((a, b) => a.order - b.order);
    }

    // Attach runtime properties
    return list.map(att => {
      const durType = this.state.durationOverrides[att.id] || att.selectedDuration || 'medium';
      const durationInfo = att.durations[durType] || att.durations.medium;
      return {
        ...att,
        isVisited: this.state.visitedIds.has(att.id),
        isPostponed: this.state.postponedIds.has(att.id),
        isSkipped: this.state.skippedIds.has(att.id),
        currentDurationType: durType,
        currentDurationMinutes: durationInfo.minutes,
        currentDurationLabel: durationInfo.label,
        effectiveHours: this.state.customHours[att.id] || att.officialHours
      };
    });
  },

  // Get all postponed attractions ("מעוניין עדיין / לדחות")
  getPostponedAttractions() {
    return VIENNA_DATA.attractions.filter(att => this.state.postponedIds.has(att.id));
  },

  // Calculate day schedule with transit times (based on manual day start time)
  calculateDayTimeline(attractions) {
    const dayStartTime = (this.state.dayStartTimes && this.state.dayStartTimes[this.state.currentDay]) || '09:00';
    const parts = dayStartTime.split(':').map(Number);
    let currentHour = isNaN(parts[0]) ? 9 : parts[0];
    let currentMinute = isNaN(parts[1]) ? 0 : parts[1];
    const hotel = VIENNA_DATA.tripInfo.hotel;
    const timelineItems = [];

    attractions.forEach((att, idx) => {
      // Travel from previous point (or from hotel for first stop)
      let prevPoint = idx === 0 ? hotel : attractions[idx - 1];
      const dist = MapManager.calculateDistanceKm(prevPoint.lat, prevPoint.lng, att.lat, att.lng);
      const travel = MapManager.getTravelEstimate(dist, this.state.transitMode);

      // Add travel duration
      currentMinute += travel.minutes;
      while (currentMinute >= 60) {
        currentHour += 1;
        currentMinute -= 60;
      }

      const arrivalTimeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;

      // Add attraction visit duration
      currentMinute += att.currentDurationMinutes;
      while (currentMinute >= 60) {
        currentHour += 1;
        currentMinute -= 60;
      }
      const departureTimeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;

      timelineItems.push({
        attraction: att,
        travelFromPrev: travel,
        arrivalTime: arrivalTimeStr,
        departureTime: departureTimeStr
      });
    });

    return {
      items: timelineItems,
      estimatedEndTime: `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`
    };
  },

  // Actions
  toggleVisited(attractionId) {
    if (this.state.visitedIds.has(attractionId)) {
      this.state.visitedIds.delete(attractionId);
      this.showToast('סומן כלא ביקרת עדיין');
    } else {
      this.state.visitedIds.add(attractionId);
      this.state.skippedIds.delete(attractionId);
      this.state.postponedIds.delete(attractionId);
      this.showToast('מעולה! סומן בהצלחה: הייתי כאן 🎉', 'success');
    }
    this.saveState();
    this.render();
  },

  postponeAttraction(attractionId) {
    this.state.postponedIds.add(attractionId);
    this.state.visitedIds.delete(attractionId);
    this.state.skippedIds.delete(attractionId);
    this.saveState();
    this.render();
    const att = VIENNA_DATA.attractions.find(a => a.id === attractionId);
    const name = att ? att.nameHe : 'היעד';
    this.showToast(`"${name}" נשמר במגירת היעדים שנדחו ⏳. לחצי על כפתור "יעדים שנדחו" כדי לשבץ מחדש`, 'info');
  },

  rescheduleToDay(attractionId, targetDay) {
    const dayNum = Number(targetDay) || 1;
    // Remove from postponed
    this.state.postponedIds.delete(attractionId);
    // Find attraction in main data and update its day
    const att = VIENNA_DATA.attractions.find(a => a.id === attractionId);
    if (att) {
      att.day = dayNum;
    }
    this.saveState();
    this.closeModal('postponed-drawer');
    this.setDay(dayNum);
    this.showToast(`היעד "${att ? att.nameHe : ''}" שובץ בהצלחה ליום ${dayNum}! עברת לתצוגת יום ${dayNum} 📅`, 'success');
    setTimeout(() => {
      this.scrollToAndPulseCard(attractionId);
    }, 250);
  },

  moveAttractionToDay(attractionId, targetDay) {
    const dayNum = Number(targetDay) || 1;
    const att = VIENNA_DATA.attractions.find(a => a.id === attractionId);
    if (!att) return;

    if (Number(att.day) === dayNum && !this.state.postponedIds.has(att.id)) {
      this.showToast(`היעד "${att.nameHe}" כבר משובץ ביום ${dayNum}!`, 'info');
      return;
    }

    att.day = dayNum;
    this.state.postponedIds.delete(attractionId);
    this.state.skippedIds.delete(attractionId);
    this.saveState();
    this.setDay(dayNum);
    this.showToast(`היעד "${att.nameHe}" הועבר בהצלחה ליום ${dayNum}! עברת לתצוגת יום ${dayNum} 📅`, 'success');

    setTimeout(() => {
      this.scrollToAndPulseCard(attractionId);
    }, 250);
  },

  quickAddDirectorySpot(spotId, dayNum) {
    const day = Number(dayNum || this.state.currentDay || 1);
    this.confirmAddCandidate(spotId, day);
  },

  scrollToAndPulseCard(cardId) {
    const el = document.getElementById(`card-${cardId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('highlight-pulse');
      setTimeout(() => el.classList.remove('highlight-pulse'), 3000);
    }
  },

  changeDurationDepth(attractionId, depthType) {
    this.state.durationOverrides[attractionId] = depthType;
    this.saveState();
    this.render();
  },

  toggleRainReorganizer() {
    const day = this.state.currentDay;
    if (this.state.rainModeDay === day) {
      this.state.rainModeDay = null;
      this.showToast('חזרת לסדר היום הרגיל ☀️');
    } else {
      this.state.rainModeDay = day;
      this.showToast('היום אורגן מחדש: מוזיאונים ופעילויות פנים הוקדמו לשעות הגשם! ☔', 'warning');
    }
    this.saveState();
    this.render();
  },

  setTransitMode(mode) {
    this.state.transitMode = mode;
    this.saveState();
    this.render();
    this.showToast(`זמני ההגעה עודכנו לנסיעה ${mode === 'walk' ? 'ברגל 🚶' : mode === 'drive' ? 'ברכב 🚗' : 'בתחבורה ציבורית 🚇'}`);
  },

  setAppMode(mode) {
    this.state.appMode = mode;
    this.saveState();
    this.render();
  },

  setDay(dayNum) {
    this.state.currentDay = Number(dayNum) || 1;
    this.saveState();
    this.render();
  },

  // Audio Guide & TTS
  playAiAudio(text) {
    if (!('speechSynthesis' in window)) {
      this.showToast('דפדפן זה אינו תומך בהקראה קולית', 'warning');
      return;
    }

    if (this.state.isSpeaking) {
      window.speechSynthesis.cancel();
      this.state.isSpeaking = false;
      this.updateAudioButtonState();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'he-IL';
    utterance.rate = 0.95;

    utterance.onend = () => {
      this.state.isSpeaking = false;
      this.updateAudioButtonState();
    };

    utterance.onerror = () => {
      this.state.isSpeaking = false;
      this.updateAudioButtonState();
    };

    this.state.isSpeaking = true;
    this.updateAudioButtonState();
    window.speechSynthesis.speak(utterance);
  },

  updateAudioButtonState() {
    const btn = document.getElementById('ai-audio-toggle-btn');
    if (btn) {
      btn.innerHTML = this.state.isSpeaking ? '⏹️ עצור הקראה' : '🎧 השמע סיפור בקול';
      btn.classList.toggle('is-playing', this.state.isSpeaking);
    }
  },

  // UI Modals
  openAiGuideModal(attractionId) {
    const att = VIENNA_DATA.attractions.find(a => a.id === attractionId);
    if (!att) return;
    this.state.selectedAttractionForAI = att;

    const modal = document.getElementById('ai-guide-modal');
    const content = document.getElementById('ai-modal-content');

    content.innerHTML = `
      <div class="ai-guide-header">
        <div class="ai-avatar-badge">🤖 מדריך AI חכם</div>
        <h3>${att.nameHe}</h3>
        <p class="en-sub">${att.name}</p>
      </div>
      <div class="ai-audio-bar">
        <button id="ai-audio-toggle-btn" class="btn btn-audio" onclick="App.playAiAudio(\`${att.aiGuide.story.replace(/"/g, '&quot;')}\`)">
          🎧 השמע סיפור בקול
        </button>
      </div>
      <div class="ai-section story-section">
        <div class="section-title">📖 הסיפור המרתק של המקום:</div>
        <p class="story-text">${att.aiGuide.story}</p>
      </div>
      <div class="ai-section secret-section">
        <div class="section-title">🕵️‍♂️ סודות שרוב התיירים מפספסים:</div>
        <div class="secret-box">${att.aiGuide.secretFact}</div>
      </div>
      <div class="ai-section photo-section">
        <div class="section-title">📸 הספוט הכי יפה לתמונה:</div>
        <p class="photo-text">${att.aiGuide.photoTip}</p>
      </div>
    `;

    modal.classList.add('active');
  },

  openPostponedDrawer() {
    const drawer = document.getElementById('postponed-drawer');
    const listContainer = document.getElementById('postponed-list-container');
    const postponed = this.getPostponedAttractions();

    if (postponed.length === 0) {
      listContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">✨</div>
          <p>אין כרגע אטרקציות שנדחו! כל מה שתכננת הושלם או במסלול.</p>
        </div>
      `;
    } else {
      listContainer.innerHTML = postponed.map(att => `
        <div class="postponed-card">
          <div class="postponed-info">
            <h4>${att.nameHe}</h4>
            <span class="category-pill">${att.category}</span>
          </div>
          <div class="reschedule-actions">
            <span class="reschedule-label">שבץ ביום:</span>
            <div class="day-chips">
              ${[1, 2, 3, 4, 5].map(d => `
                <button class="day-chip-btn ${Number(att.day) === d ? 'current' : ''}" onclick="App.rescheduleToDay('${att.id}', ${d})">
                  יום ${d}
                </button>
              `).join('')}
            </div>
          </div>
        </div>
      `).join('');
    }

    drawer.classList.add('active');
  },

  openPassOptimizerModal() {
    const modal = document.getElementById('pass-optimizer-modal');
    const content = document.getElementById('pass-optimizer-content');
    const advice = PricingEngine.getBestPaymentAdvice(VIENNA_DATA.attractions);

    content.innerHTML = `
      <div class="optimizer-header">
        <div class="optimizer-badge">💳 יועץ חיסכון בכרטיסים</div>
        <h3>איך הכי זול לשלם עבור כל האטרקציות בטיול?</h3>
        <p class="optimizer-intro">${advice.recommendationText}</p>
      </div>

      <div class="options-comparison-grid">
        ${advice.options.map(opt => `
          <div class="pass-option-card ${opt.id === advice.bestOption.id ? 'is-recommended' : ''}">
            ${opt.id === advice.bestOption.id ? '<div class="crown-badge">👑 ההמלצה המנצחת</div>' : ''}
            <div class="option-title">${opt.title}</div>
            <div class="option-cost">
              <span class="currency">€</span><span class="amount">${Math.round(opt.cost)}</span>
              ${opt.transitIncluded ? '<span class="transit-tag">+ כולל תחבורה חופשית</span>' : ''}
            </div>
            <p class="option-expl">${opt.explanation}</p>
            ${opt.savings > 0 ? `<div class="savings-tag">חיסכון של כ-${Math.round(opt.savings)} €!</div>` : ''}
          </div>
        `).join('')}
      </div>

      <div class="per-attraction-table-section">
        <h4>מחירים פרטניים לכל אטרקציה:</h4>
        <div class="table-responsive">
          <table class="pricing-table">
            <thead>
              <tr>
                <th>אטרקציה</th>
                <th>כרטיס רגיל בקופה</th>
                <th>עם Vienna Pass</th>
                <th>עם Vienna City Card</th>
              </tr>
            </thead>
            <tbody>
              ${VIENNA_DATA.attractions.map(att => {
                const p = PricingEngine.getAttractionPricing(att);
                return `
                  <tr>
                    <td><strong>${att.nameHe}</strong></td>
                    <td>${p.regular === 0 ? '<span class="free-tag">חינם</span>' : p.regular + ' €'}</td>
                    <td>${p.viennaPassCovered ? '<span class="free-badge">חינם (0 €)</span>' : p.regular + ' €'}</td>
                    <td>${p.regular === 0 ? 'חינם' : p.viennaCityCardCost + ' € <small class="disc">(-' + p.discountAmount + '€)</small>'}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    modal.classList.add('active');
  },

  openEditHoursModal(attractionId) {
    const att = VIENNA_DATA.attractions.find(a => a.id === attractionId);
    if (!att) return;

    const currentHours = this.state.customHours[att.id] || att.officialHours;
    const promptVal = prompt(`עריכת שעות פתיחה עבור "${att.nameHe}":\n(לדוגמה אם גיליתם שעות שונות באתר או בשטח)`, currentHours);
    if (promptVal !== null && promptVal.trim() !== '') {
      this.state.customHours[att.id] = promptVal.trim();
      this.saveState();
      this.render();
      this.showToast('שעות הפתיחה עודכנו ונשמרו בהצלחה! ⏰', 'success');
    }
  },

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
    if (this.state.isSpeaking) {
      window.speechSynthesis.cancel();
      this.state.isSpeaking = false;
    }
  },

  showToast(message, type = 'info') {
    const toast = document.getElementById('app-toast');
    if (!toast) return;
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    setTimeout(() => {
      toast.className = 'toast';
    }, 3800);
  },

  // Main Render Routine
  render() {
    this.renderHeaderWeather();
    this.renderDayTabs();
    this.renderTimeline();
    this.renderBookedEvents();
    this.renderStats();
    
    // Update Map with current day's stops
    const activeAttractions = this.getCurrentDayAttractions();
    MapManager.renderDayRoute(activeAttractions, this.state.transitMode, VIENNA_DATA.tripInfo.hotel);
  },

  renderHeaderWeather() {
    const day = this.state.currentDay;
    const weather = VIENNA_DATA.weatherForecast[day] || { temp: 16, text: "נעים", rainChance: 10, isRainy: false };
    const weatherContainer = document.getElementById('weather-indicator-bar');
    if (!weatherContainer) return;

    const isRainAlert = weather.rainChance >= 50;
    const isRainModeActive = this.state.rainModeDay === day;

    weatherContainer.innerHTML = `
      <div class="weather-left">
        <span class="weather-icon">${weather.isRainy ? '🌧️' : '⛅'}</span>
        <span class="weather-temp">${weather.temp}°C</span>
        <span class="weather-desc">${weather.text}</span>
        <span class="weather-rain-chance">💧 ${weather.rainChance}% גשם</span>
      </div>
      <div class="weather-actions">
        ${isRainAlert ? `
          <button class="btn btn-rain-reorganize ${isRainModeActive ? 'active' : ''}" onclick="App.toggleRainReorganizer()">
            ${isRainModeActive ? '✓ יום סודר מחדש לגשם (בטל)' : '☔ חשש לגשם! סדר מחדש את היום'}
          </button>
        ` : `
          <span class="weather-good-tag">☀️ מזג אוויר מצוין להליכה</span>
        `}
      </div>
    `;
  },

  renderDayTabs() {
    const container = document.getElementById('day-tabs-container');
    if (!container) return;

    const days = [1, 2, 3, 4, 5];
    const dayMeta = {
      1: { date: '18/10', dayName: "א'" },
      2: { date: '19/10', dayName: "ב'" },
      3: { date: '20/10', dayName: "ג'" },
      4: { date: '21/10', dayName: "ד'" },
      5: { date: '22/10', dayName: "ה'" }
    };

    const currentDay = Number(this.state.currentDay);

    container.innerHTML = days.map(d => {
      const isSelected = currentDay === d;
      const count = VIENNA_DATA.attractions.filter(a => Number(a.day) === d && !this.state.postponedIds.has(a.id)).length;
      const hasRain = VIENNA_DATA.weatherForecast[d]?.rainChance >= 50;
      const meta = dayMeta[d] || { date: '', dayName: '' };
      return `
        <button class="day-tab-btn ${isSelected ? 'active' : ''}" onclick="App.setDay(${d})">
          <span class="tab-title">יום ${d} • ${meta.date} (${meta.dayName})</span>
          <span class="tab-meta">${count} יעדים ${hasRain ? '🌧️' : ''}</span>
        </button>
      `;
    }).join('');
  },

  renderStats() {
    const attractions = this.getCurrentDayAttractions();
    const visitedCount = attractions.filter(a => a.isVisited).length;
    const totalCount = attractions.length;
    const pct = totalCount > 0 ? Math.round((visitedCount / totalCount) * 100) : 0;

    const progressEl = document.getElementById('day-progress-bar');
    const textEl = document.getElementById('day-progress-text');
    if (progressEl) progressEl.style.width = `${pct}%`;
    if (textEl) textEl.textContent = `${visitedCount} מתוך ${totalCount} יעדים הושלמו (${pct}%)`;

    // Update manual start time controls for current day
    const dayStartInput = document.getElementById('day-start-time-input');
    const dayStartLabel = document.getElementById('start-time-day-label');
    const currentTimeVal = (this.state.dayStartTimes && this.state.dayStartTimes[this.state.currentDay]) || '09:00';
    if (dayStartInput) dayStartInput.value = currentTimeVal;
    if (dayStartLabel) dayStartLabel.textContent = this.state.currentDay;

    // Highlight active preset button
    document.querySelectorAll('.preset-time-btn').forEach(btn => {
      const bTime = btn.getAttribute('data-time') || btn.textContent.trim();
      btn.classList.toggle('active', bTime === currentTimeVal);
    });

    // Postponed badge count
    const postponedCount = this.state.postponedIds.size;
    const badgeEl = document.getElementById('postponed-badge-btn');
    if (badgeEl) {
      badgeEl.innerHTML = `⏳ יעדים שנדחו (${postponedCount})`;
      badgeEl.style.display = postponedCount > 0 ? 'inline-flex' : 'none';
    }
  },

  renderTimeline() {
    const listContainer = document.getElementById('timeline-list-container');
    if (!listContainer) return;

    const currentDay = this.state.currentDay;
    const attractions = this.getCurrentDayAttractions();

    // Top action bar for the day
    let topActionHtml = `
      <div class="day-action-toolbar">
        <button class="btn btn-add-attraction" onclick="App.openAddAttractionModal(${currentDay})">
          ➕ הוסף יעד ליום ${currentDay}
        </button>
        <button class="btn btn-open-import" onclick="App.openImportModal()">
          📂 יבוא מקובץ (PDF/אקסל)
        </button>
      </div>
    `;

    if (attractions.length === 0) {
      listContainer.innerHTML = topActionHtml + `
        <div class="empty-state">
          <div class="empty-icon">🎒</div>
          <h3>אין עדיין יעדים מתוכננים ליום ${currentDay}</h3>
          <p>המסלול נקי. תוכלי להוסיף אתרי חובה בלחיצה אחת, להוסיף ידנית, או לטעון קובץ PDF / אקסל:</p>
          
          <div class="empty-quick-add-section">
            <div class="empty-quick-label">⚡ הוספה מהירה בלחיצת כפתור של אתרי חובה ליום ${currentDay}:</div>
            <div class="quick-suggest-grid">
              <button type="button" class="quick-spot-btn" onclick="App.quickAddDirectorySpot('stephansdom', ${currentDay})">⛪ סנט סטפן</button>
              <button type="button" class="quick-spot-btn" onclick="App.quickAddDirectorySpot('schonbrunn', ${currentDay})">🏰 שונברון</button>
              <button type="button" class="quick-spot-btn" onclick="App.quickAddDirectorySpot('hofburg', ${currentDay})">👑 הופבורג</button>
              <button type="button" class="quick-spot-btn" onclick="App.quickAddDirectorySpot('belvedere', ${currentDay})">🖼️ בלוודר</button>
              <button type="button" class="quick-spot-btn" onclick="App.quickAddDirectorySpot('prater', ${currentDay})">🎡 פראטר</button>
              <button type="button" class="quick-spot-btn" onclick="App.quickAddDirectorySpot('hundertwasser', ${currentDay})">🎨 הונדרטוואסר</button>
              <button type="button" class="quick-spot-btn" onclick="App.quickAddDirectorySpot('naschmarkt', ${currentDay})">🍇 נאשמרקט</button>
              <button type="button" class="quick-spot-btn" onclick="App.quickAddDirectorySpot('albertina', ${currentDay})">🏛️ אלברטינה</button>
            </div>
          </div>

          <div class="empty-actions-row">
            <button class="btn btn-primary" onclick="App.openAddAttractionModal(${currentDay})">
              ➕ הוסף יעד בהתאמה אישית
            </button>
            <button class="btn btn-gold" onclick="App.openImportModal()">
              📂 טען קובץ תוכנית (PDF/אקסל)
            </button>
          </div>
        </div>
      `;
      return;
    }

    const timelineData = this.calculateDayTimeline(attractions);
    const hotel = VIENNA_DATA.tripInfo.hotel;
    const startTimeStr = (this.state.dayStartTimes && this.state.dayStartTimes[currentDay]) || '09:00';

    let html = topActionHtml + `
      <!-- Hotel Start Anchor -->
      <div class="timeline-anchor hotel-anchor">
        <div class="anchor-icon">🏨</div>
        <div class="anchor-details">
          <div class="anchor-label">נקודת יציאה (שעה ${startTimeStr}):</div>
          <strong>${hotel.name}</strong>
          <span class="transit-tip">${hotel.nearestTransit}</span>
          <a href="https://www.google.com/maps/dir/?api=1&destination=${hotel.lat},${hotel.lng}" target="_blank" class="anchor-gmaps-btn">
            🧭 נווט למלון ב-Google Maps ↗
          </a>
        </div>
      </div>
    `;

    timelineData.items.forEach((item, index) => {
      const att = item.attraction;
      const orderNum = index + 1;
      const travel = item.travelFromPrev;
      const isNearbyRevealed = this.state.revealedNearbyIds.has(att.id);
      const nearbyData = this.getNearbyDataForAttraction(att);

      const gMapsFromHotel = `https://www.google.com/maps/dir/?api=1&origin=${hotel.lat},${hotel.lng}&destination=${att.lat},${att.lng}`;
      const gMapsToHotel = `https://www.google.com/maps/dir/?api=1&origin=${att.lat},${att.lng}&destination=${hotel.lat},${hotel.lng}`;
      const gMapsNext = (index < timelineData.items.length - 1)
        ? `https://www.google.com/maps/dir/?api=1&origin=${att.lat},${att.lng}&destination=${timelineData.items[index + 1].attraction.lat},${timelineData.items[index + 1].attraction.lng}`
        : null;

      html += `
        <!-- Travel Connector -->
        <div class="transit-connector">
          <div class="connector-line"></div>
          <div class="connector-bubble">
            <span class="transit-mode-icon">${travel.icon}</span>
            <span class="transit-duration">${travel.timeText}</span>
            <span class="transit-dist">(${travel.distanceFormatted})</span>
          </div>
        </div>

        <!-- Attraction Card -->
        <div class="attraction-card ${att.isVisited ? 'is-visited' : ''}" id="card-${att.id}">
          <div class="card-header">
            <div class="order-badge">#${orderNum}</div>
            <div class="card-title-group">
              <h3 class="card-title">${att.nameHe}</h3>
              ${att.name && att.name !== att.nameHe ? `<span class="card-subtitle">${att.name}</span>` : ''}
            </div>
            <div class="timing-badge">
              <span>🕒 הגעה: ${item.arrivalTime}</span>
            </div>
            <button class="btn-card-delete" onclick="App.removeAttraction('${att.id}')" title="הסר יעד זה מהמסלול">
              🗑️
            </button>
          </div>

          <!-- Official Opening Hours & Verification -->
          <div class="hours-bar">
            <div class="hours-status">
              <span class="status-indicator-dot"></span>
              <span class="hours-text"><strong>שעות פתיחה:</strong> ${att.effectiveHours}</span>
            </div>
            <div class="hours-actions">
              ${att.officialWebsite ? `
                <a href="${att.officialWebsite}" target="_blank" class="official-link-btn" title="פתח אתר רשמי">
                  🌐 אתר רשמי
                </a>
              ` : ''}
              <button class="edit-hours-btn" onclick="App.openEditHoursModal('${att.id}')" title="עדכון שעות ידנית">
                ✏️
              </button>
            </div>
          </div>
          ${att.officialHoursNote ? `<div class="hours-alert-note">⚠️ ${att.officialHoursNote}</div>` : ''}

          <!-- Duration Depth Selector -->
          <div class="duration-selector-bar">
            <span class="duration-label">עומק סיור וזמן ביקור:</span>
            <div class="duration-pills">
              <button class="pill-btn ${att.currentDurationType === 'full' ? 'active' : ''}" 
                onclick="App.changeDurationDepth('${att.id}', 'full')">
                🏛️ סיור מלא (${att.durations.full.minutes} דק')
              </button>
              <button class="pill-btn ${att.currentDurationType === 'medium' ? 'active' : ''}" 
                onclick="App.changeDurationDepth('${att.id}', 'medium')">
                🌳 מרכזי/גנים (${att.durations.medium.minutes} דק')
              </button>
              <button class="pill-btn ${att.currentDurationType === 'quick' ? 'active' : ''}" 
                onclick="App.changeDurationDepth('${att.id}', 'quick')">
                📸 צילום מהיר (${att.durations.quick.minutes} דק')
              </button>
            </div>
          </div>

          <!-- Ticket Prices, Indoor Status & Average Duration -->
          <div class="card-pricing-badge">
            <span class="price-item">קופה: <strong>${att.pricing.regular === 0 ? 'חינם' : att.pricing.regular + ' €'}</strong></span>
            <span class="price-item pass-covered">Vienna Pass: <strong>${att.pricing.viennaPass === 0 ? 'חינם (0 €)' : att.pricing.regular + ' €'}</strong></span>
            <span class="price-item city-card">City Card: <strong>${att.pricing.regular === 0 ? 'חינם' : (att.pricing.regular - (att.pricing.viennaCityCardDiscount || 0)) + ' €'}</strong></span>
            <span class="price-item indoor-tag">${att.isIndoor ? '🏛️ מקורה (גשם ☔)' : '🌳 פתוח'}</span>
          </div>

          <!-- Special Events & Concerts at Venue (if available) -->
          ${att.specialEvents && att.specialEvents.length > 0 ? `
            <div class="card-special-events-box">
              <div class="special-events-header">
                <span>🎭 אירועים מיוחדים והופעות באתר:</span>
              </div>
              <div class="special-events-list">
                ${att.specialEvents.map(ev => `
                  <div class="special-event-card">
                    <div class="special-event-top">
                      <strong class="special-event-name">${ev.title}</strong>
                      ${ev.price ? `<span class="special-event-price">${ev.price}</span>` : ''}
                    </div>
                    <p class="special-event-desc">${ev.desc}</p>
                    ${ev.times ? `<div class="special-event-times">🕒 ${ev.times}</div>` : ''}
                    <div class="special-event-actions">
                      ${ev.ticketUrl ? `
                        <a href="${ev.ticketUrl}" target="_blank" class="btn-event-ticket">
                          🎟️ הזמנת כרטיסים ↗
                        </a>
                      ` : ''}
                      <button type="button" class="btn-save-event-booked" onclick="App.copyEventToBooked('${att.nameHe.replace(/'/g, "\\'")}', '${ev.title.replace(/'/g, "\\'")}', '${ev.times ? ev.times.replace(/'/g, "\\'") : '20:00'}', '${att.address ? att.address.replace(/'/g, "\\'") : ''}')">
                        ⭐ שמור כמופע שלי בלוח
                      </button>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}

          <!-- Live Action Buttons (In-Trip Mode) -->
          <div class="card-live-actions">
            <button class="action-btn visited-btn ${att.isVisited ? 'done' : ''}" onclick="App.toggleVisited('${att.id}')">
              ${att.isVisited ? '✓ ביקרתי כאן!' : '✅ הייתי כאן'}
            </button>
            <button class="action-btn postpone-btn" onclick="App.postponeAttraction('${att.id}')" title="העבר למגירת יעדים שנדחו">
              ⏳ דחה להמשך (עדיין מעניין)
            </button>
            <button class="action-btn ai-guide-btn" onclick="App.openAiGuideModal('${att.id}')">
              🤖 מדריך AI וסיפורים
            </button>
          </div>

          <!-- Day Transfer Chips (העבר ליום אחר בלחיצה) -->
          <div class="card-day-transfer-bar">
            <span class="day-transfer-label">📅 העבר יעד זה ליום אחר:</span>
            <div class="day-transfer-chips">
              ${[1, 2, 3, 4, 5].map(d => `
                <button type="button" class="day-transfer-chip ${Number(att.day) === d ? 'is-current' : ''}" 
                  onclick="App.moveAttractionToDay('${att.id}', ${d})" 
                  title="${Number(att.day) === d ? 'משובץ כרגע ביום ' + d : 'העבר ליום ' + d}">
                  יום ${d} ${Number(att.day) === d ? '• כאן' : ''}
                </button>
              `).join('')}
            </div>
          </div>

          <!-- HERO GOOGLE MAPS NAVIGATION (פותח Google Maps ישירות) -->
          <div class="card-direct-gmaps-row">
            <a href="https://www.google.com/maps/dir/?api=1&destination=${att.lat},${att.lng}" target="_blank" class="btn-direct-gmaps" title="פתח ניווט ישיר ליעד ב-Google Maps">
              <div class="gmaps-btn-left">
                <span class="gmaps-pin-icon">🧭</span>
                <div class="gmaps-text-group">
                  <span class="gmaps-main-title">נווט ליעד ב-Google Maps</span>
                  <span class="gmaps-sub-hint">פתיחת מסלול ניווט חי בטלפון / במחשב</span>
                </div>
              </div>
              <span class="gmaps-arrow-icon">↗</span>
            </a>
          </div>

          <!-- Navigation & Hotel Anchors -->
          <div class="card-navigation-grid">
            <a href="${gMapsFromHotel}" target="_blank" class="nav-btn hotel-nav">
              🚗 הגעה מהמלון
            </a>
            <a href="${gMapsToHotel}" target="_blank" class="nav-btn hotel-nav">
              🏨 חזרה למלון
            </a>
            ${gMapsNext ? `
              <a href="${gMapsNext}" target="_blank" class="nav-btn next-stop-nav">
                ➡️ ליעד הבא
              </a>
            ` : ''}
            <button class="nav-btn map-focus-btn" onclick="MapManager.focusOnLocation(${att.lat}, ${att.lng}, 16, '${att.id}')">
              📍 הצג במפה
            </button>
          </div>

          <!-- ON-DEMAND NEARBY BUTTON ("את הדברים שבאיזור, תן לי בלחיצת כפתור") -->
          <div class="nearby-toggle-container">
            <button class="btn-nearby-toggle ${isNearbyRevealed ? 'active' : ''}" onclick="App.toggleDiscoverNearby('${att.id}')">
              ${isNearbyRevealed ? '🔼 הסתר מקומות בסביבה' : '🔍 גלה מה יש בסביבה (בתי קפה, מנת הדגל ושירותים) 📍'}
            </button>
          </div>

          <!-- Nearby Content (Revealed ONLY on Click) -->
          ${isNearbyRevealed ? `
            <div class="nearby-section animate-slide-down">
              <div class="nearby-header">
                <span>🍽️ מקומות שווים ברדיוס הליכה סביב ${att.nameHe}:</span>
              </div>
              <div class="nearby-items">
                ${nearbyData.food.map(f => `
                  <div class="nearby-food-card">
                    <div class="food-top-row">
                      <div class="food-name"><strong>${f.nameHe}</strong> <small>(${f.name || ''})</small></div>
                      <a href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(f.nameHe + ' ' + (f.name || '') + ' Vienna')}" target="_blank" class="nearby-nav-btn">
                        🧭 נווט ב-Google Maps ↗
                      </a>
                    </div>
                    <div class="signature-dish">👑 <strong>מנת הדגל:</strong> ${f.signatureDish}</div>
                    <span class="distance-tag">מרחק: כ-${f.distanceMin} דק' הליכה</span>
                  </div>
                `).join('')}

                ${nearbyData.restrooms ? `
                  <div class="nearby-restroom-card">
                    <div class="restroom-top-row">
                      <div class="restroom-name">🚻 <strong>שירותים ציבוריים:</strong> ${nearbyData.restrooms.name}</div>
                      <a href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(nearbyData.restrooms.name + ' Vienna')}" target="_blank" class="nearby-nav-btn restroom-nav">
                        🚻 נווט לשירותים ↗
                      </a>
                    </div>
                    <div class="restroom-meta">
                      <span>מרחק: ${nearbyData.restrooms.distanceMin} דק'</span> • 
                      <span>עלות: ${nearbyData.restrooms.cost}</span> • 
                      <span>ניקיון: ${nearbyData.restrooms.cleanliness}</span>
                    </div>
                  </div>
                ` : ''}
              </div>
            </div>
          ` : ''}
        </div>
      `;
    });

    // Hotel Return Anchor at end of day
    html += `
      <div class="timeline-anchor hotel-anchor return-anchor">
        <div class="anchor-icon">🏨</div>
        <div class="anchor-details">
          <div class="anchor-label">סיום יום משוער (${timelineData.estimatedEndTime}):</div>
          <strong>חזרה למלון ${hotel.name}</strong>
          <a href="https://www.google.com/maps/dir/?api=1&destination=${hotel.lat},${hotel.lng}" target="_blank" class="anchor-gmaps-btn">
            🧭 נווט חזרה למלון ב-Google Maps ↗
          </a>
        </div>
      </div>
    `;

    listContainer.innerHTML = html;
  },

  renderBookedEvents() {
    const container = document.getElementById('booked-events-container');
    if (!container) return;

    const eventsList = VIENNA_DATA.bookedEvents || [];
    container.innerHTML = `
      <div class="events-top-bar">
        <button class="btn btn-add-event-sm" onclick="App.openAddEventModal()">➕ הוסף מופע/אירוע</button>
      </div>
    ` + eventsList.map(ev => {
      return `
        <div class="booked-event-card">
          <div class="event-card-top-row">
            <span class="event-vip-ribbon">🎟️ הופעה / אירוע שמור</span>
            <button class="btn-event-delete" onclick="App.removeBookedEvent('${ev.id}')" title="הסר אירוע זה">🗑️ הסר</button>
          </div>
          <div class="event-content">
            <div class="event-time-column">
              <div class="event-doors">דלתות: ${ev.doorsOpenTime || '19:00'}</div>
              <div class="event-start">${ev.startTime || '20:00'}</div>
              <div class="event-date">יום ${ev.day} (${ev.date || ''})</div>
            </div>
            <div class="event-info-column">
              <h3 class="event-title">${ev.nameHe}</h3>
              <p class="event-venue">📍 ${ev.venue || ''} (${ev.address || ''})</p>
              
              <div class="ticket-seat-grid">
                <div class="seat-cell"><strong>אולם:</strong> ${ev.ticketDetails ? ev.ticketDetails.hall : 'ראשי'}</div>
                <div class="seat-cell"><strong>יציע:</strong> ${ev.ticketDetails ? ev.ticketDetails.tier : 'מרכזי'}</div>
                <div class="seat-cell"><strong>שורה ומושב:</strong> ${ev.ticketDetails ? (ev.ticketDetails.row + ', ' + ev.ticketDetails.seats) : 'לא צוין'}</div>
                <div class="seat-cell"><strong>קוד אישור:</strong> <code>${ev.ticketDetails ? ev.ticketDetails.bookingCode : '---'}</code></div>
              </div>

              ${ev.dressCode ? `<div class="event-dress-code">👔 <strong>קוד לבוש:</strong> ${ev.dressCode}</div>` : ''}
              ${ev.entryInstructions ? `<div class="event-instructions">ℹ️ <strong>הוראות כניסה:</strong> ${ev.entryInstructions}</div>` : ''}

              <div class="event-actions">
                ${ev.ticketDetails && ev.ticketDetails.ticketUrl ? `
                  <a href="${ev.ticketDetails.ticketUrl}" target="_blank" class="btn btn-ticket-open">
                    📄 פתח כרטיס דיגיטלי / ברקוד
                  </a>
                ` : ''}
                ${ev.address ? `
                  <a href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(ev.address)}" target="_blank" class="btn btn-nav-event">
                    🗺️ נווט לאולם ההופעה
                  </a>
                ` : ''}
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  saveCustomAttraction() {
    const nameHe = document.getElementById('add-attr-name')?.value.trim();
    if (!nameHe) {
      this.showToast('אנא הזיני שם לאטרקציה', 'warning');
      return;
    }

    const day = parseInt(document.getElementById('add-attr-day')?.value || String(this.state.currentDay || 1), 10);
    const hours = document.getElementById('add-attr-hours')?.value.trim() || 'שעות פעילות רגילות';
    const notes = document.getElementById('add-attr-notes')?.value.trim() || '';
    const durationMin = parseInt(document.getElementById('add-attr-duration')?.value || '60', 10);
    const price = parseFloat(document.getElementById('add-attr-price')?.value || '0');
    const category = document.getElementById('add-attr-category')?.value || 'landmark';
    const isIndoor = document.getElementById('add-attr-indoor')?.checked || false;

    // Check directory for matches
    const directorySpot = VIENNA_DATA.viennaDirectory ? VIENNA_DATA.viennaDirectory.spots.find(s => 
      s.nameHe.includes(nameHe) || nameHe.includes(s.nameHe) || (s.name && s.name.toLowerCase().includes(nameHe.toLowerCase()))
    ) : null;

    const newAtt = {
      id: 'custom_' + Date.now(),
      nameHe: nameHe,
      name: directorySpot ? directorySpot.name : nameHe,
      day: day,
      order: VIENNA_DATA.attractions.filter(a => Number(a.day) === day).length + 1,
      category: category,
      isIndoor: directorySpot ? directorySpot.isIndoor : isIndoor,
      lat: directorySpot ? directorySpot.lat : (48.2082 + (Math.random() - 0.5) * 0.03),
      lng: directorySpot ? directorySpot.lng : (16.3738 + (Math.random() - 0.5) * 0.03),
      address: directorySpot ? directorySpot.address : `${nameHe}, Vienna`,
      officialHours: directorySpot ? directorySpot.officialHours : hours,
      officialHoursVerified: !!directorySpot,
      officialWebsite: directorySpot ? directorySpot.officialWebsite : '',
      durations: {
        full: { label: 'סיור מלא', minutes: Math.round(durationMin * 1.5) },
        medium: { label: 'ביקור ממוצע', minutes: durationMin },
        quick: { label: 'עצירת צילום', minutes: Math.max(15, Math.round(durationMin * 0.4)) }
      },
      selectedDuration: 'medium',
      pricing: {
        regular: directorySpot ? directorySpot.regularPrice : price,
        viennaPass: 0,
        viennaCityCardDiscount: 2.5,
        viennaFlexiPassEligible: true
      },
      specialEvents: directorySpot?.specialEvents || [],
      aiGuide: {
        story: directorySpot ? directorySpot.aiStory : `יעד ייחודי שהוספת למסלול: ${nameHe}.`,
        secretFact: 'מומלץ ליהנות מהאווירה המקומית ברוגע.',
        photoTip: 'החזית המרכזית מצטלמת נהדר באור יום.'
      },
      nearby: directorySpot ? {
        food: directorySpot.nearbyFood,
        restrooms: directorySpot.nearbyRestroom
      } : {
        food: [{ nameHe: 'בית קפה וינאי סמוך', name: 'Café', signatureDish: 'קפה וינאי עשיר ומאפה חם 👑', distanceMin: 3 }],
        restrooms: { name: 'שירותים ציבוריים קרובים', distanceMin: 2, cost: '0.50 €', cleanliness: '4.7/5' }
      },
      notes: notes
    };

    VIENNA_DATA.attractions.push(newAtt);
    this.saveState();
    this.closeModal('add-attraction-modal');
    this.setDay(day);
    this.showToast(`היעד "${nameHe}" נוסף בהצלחה ליום ${day}! 🎉`, 'success');

    // Reset form
    document.getElementById('add-attr-name').value = '';
    document.getElementById('add-attr-notes').value = '';

    setTimeout(() => this.scrollToAndPulseCard(newAtt.id), 250);
  },

  // Manual Day Start Time Handler ("קביעה ידנית של שעת ההתחלה של היום")
  setDayStartTime(timeStr) {
    if (!timeStr) return;
    if (!this.state.dayStartTimes) {
      this.state.dayStartTimes = { 1: "09:00", 2: "09:00", 3: "09:00", 4: "09:00", 5: "09:00" };
    }
    this.state.dayStartTimes[this.state.currentDay] = timeStr;
    this.saveState();
    this.render();
    this.showToast(`שעת היציאה ליום ${this.state.currentDay} עודכנה ל-${timeStr}! כל לוח הזמנים חושב מחדש ⏰`, 'success');
  },

  handleDayStartTimeChange(event) {
    const val = event?.target?.value;
    if (val) {
      this.setDayStartTime(val);
    }
  },

  // Modal: Smart Search & Add Attraction (עם חיפוש חכם, הצגת אפשרויות לאישור)
  openAddAttractionModal(dayNum = null) {
    const modal = document.getElementById('add-attraction-modal');
    const daySelect = document.getElementById('add-attr-day');
    const targetDay = Number(dayNum !== null && dayNum !== undefined ? dayNum : (this.state.currentDay || 1));
    if (daySelect) daySelect.value = targetDay;

    const searchInput = document.getElementById('add-attr-search-input');
    if (searchInput) searchInput.value = '';

    // Render initial curated candidate options for confirmation
    this.renderCandidateCards(VIENNA_DATA.viennaDirectory.spots, targetDay);

    if (modal) modal.classList.add('active');
  },

  handleSearchDayChange(event) {
    const targetDay = parseInt(event?.target?.value || String(this.state.currentDay), 10);
    const searchInput = document.getElementById('add-attr-search-input');
    const query = (searchInput?.value || '').trim();
    if (query) {
      this.handleAttractionSearch({ target: { value: query } });
    } else {
      this.renderCandidateCards(VIENNA_DATA.viennaDirectory.spots, targetDay);
    }
  },

  handleAttractionSearch(event) {
    const q = (event?.target?.value || '').trim().toLowerCase();
    const daySelect = document.getElementById('add-attr-day');
    const targetDay = parseInt(daySelect?.value || String(this.state.currentDay), 10);

    if (!q) {
      this.renderCandidateCards(VIENNA_DATA.viennaDirectory.spots, targetDay);
      return;
    }

    const filtered = VIENNA_DATA.viennaDirectory.spots.filter(s => {
      const matchId = (s.id || '').toLowerCase().includes(q);
      const matchHe = (s.nameHe || '').toLowerCase().includes(q);
      const matchEn = (s.name || '').toLowerCase().includes(q);
      const matchCat = (s.category || '').toLowerCase().includes(q);
      const matchAddr = (s.address || '').toLowerCase().includes(q);
      const matchStory = (s.aiStory || '').toLowerCase().includes(q);
      const matchEvents = (s.specialEvents || []).some(ev => 
        (ev.title || '').toLowerCase().includes(q) || (ev.desc || '').toLowerCase().includes(q)
      );
      return matchId || matchHe || matchEn || matchCat || matchAddr || matchStory || matchEvents;
    });

    this.renderCandidateCards(filtered, targetDay, q);
  },

  filterSearchByKeyword(keyword, spotId = '') {
    const searchInput = document.getElementById('add-attr-search-input');
    if (searchInput) {
      searchInput.value = keyword;
    }
    const daySelect = document.getElementById('add-attr-day');
    const targetDay = parseInt(daySelect?.value || String(this.state.currentDay), 10);

    const q = (keyword || '').trim().toLowerCase();
    const idKey = (spotId || keyword || '').trim().toLowerCase();

    const filtered = VIENNA_DATA.viennaDirectory.spots.filter(s => {
      const matchId = s.id === idKey || s.id.includes(idKey);
      const matchHe = s.nameHe.toLowerCase().includes(q);
      const matchEn = (s.name || '').toLowerCase().includes(q);
      const matchCat = (s.category || '').toLowerCase().includes(q);
      const matchAddr = (s.address || '').toLowerCase().includes(q);
      const matchEvents = (s.specialEvents || []).some(ev => 
        (ev.title || '').toLowerCase().includes(q) || (ev.desc || '').toLowerCase().includes(q)
      );
      return matchId || matchHe || matchEn || matchCat || matchAddr || matchEvents;
    });

    this.renderCandidateCards(filtered, targetDay, keyword);
  },

  clearAttractionSearch() {
    const searchInput = document.getElementById('add-attr-search-input');
    if (searchInput) searchInput.value = '';
    const daySelect = document.getElementById('add-attr-day');
    const targetDay = parseInt(daySelect?.value || String(this.state.currentDay), 10);
    this.renderCandidateCards(VIENNA_DATA.viennaDirectory.spots, targetDay);
  },

  renderCandidateCards(spots, targetDay, query = '') {
    const container = document.getElementById('attr-search-results-container');
    if (!container) return;

    const tDay = Number(targetDay || this.state.currentDay || 1);

    if (!spots || spots.length === 0) {
      container.innerHTML = `
        <div class="search-empty-state">
          <div class="empty-icon">🔎</div>
          <h4>לא נמצאה התאמה ישירה ל-"${query}"</h4>
          <p>באפשרותך לנסות מילת חיפוש אחרת (למשל: עוגב, מוצרט, ארמון, כנסייה), או להזין את פרטי המקום בטופס הידני למטה.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="candidates-count-tag">
        נמצאו ${spots.length} אפשרויות מאומתות • יום נבחר לשיבוץ: <strong>יום ${tDay}</strong>:
      </div>
      <div class="candidates-list">
        ${spots.map(s => {
          // Check if already active in targetDay
          const activeInTargetDay = VIENNA_DATA.attractions.find(a => 
            Number(a.day) === tDay && 
            !this.state.postponedIds.has(a.id) && 
            (a.id.startsWith(s.id) || a.nameHe === s.nameHe)
          );
          // Check if active in ANOTHER day
          const activeInOtherDay = VIENNA_DATA.attractions.find(a => 
            Number(a.day) !== tDay && 
            !this.state.postponedIds.has(a.id) && 
            (a.id.startsWith(s.id) || a.nameHe === s.nameHe)
          );
          // Check if postponed
          const isPostponed = VIENNA_DATA.attractions.find(a => 
            this.state.postponedIds.has(a.id) && 
            (a.id.startsWith(s.id) || a.nameHe === s.nameHe)
          );

          const hasEvents = s.specialEvents && s.specialEvents.length > 0;

          return `
            <div class="candidate-card ${activeInTargetDay ? 'is-already-added' : ''}">
              <div class="candidate-header">
                <div class="candidate-title-col">
                  <h4 class="candidate-title">${s.nameHe}</h4>
                  <span class="candidate-sub-en">${s.name}</span>
                </div>
                <div class="candidate-meta-badges">
                  <span class="meta-pill ${s.isIndoor ? 'pill-indoor' : 'pill-outdoor'}">
                    ${s.isIndoor ? '🏛️ מקורה (מותאם לגשם)' : '🌳 פתוח (תחת כיפת השמיים)'}
                  </span>
                  <span class="meta-pill pill-duration">
                    ⏱️ זמן ממוצע: ${s.averageDurationMinutes || 60} דק'
                  </span>
                </div>
              </div>

              <!-- Opening Hours & Pricing Grid -->
              <div class="candidate-info-grid">
                <div class="info-cell">
                  <span class="info-cell-label">🕒 שעות פתיחה מאומתות:</span>
                  <strong class="info-cell-val">${s.officialHours}</strong>
                </div>
                <div class="info-cell">
                  <span class="info-cell-label">💶 מחירי כרטיסים:</span>
                  <strong class="info-cell-val">
                    ${s.regularPrice === 0 ? 'כניסה חופשית (0 €)' : s.regularPrice + ' € בקופה'}
                    ${s.pricingDetails?.viennaPass ? ` • <span class="tag-vienna-pass">${s.pricingDetails.viennaPass}</span>` : ''}
                  </strong>
                </div>
              </div>

              <!-- Special Events & Concerts Callout -->
              ${hasEvents ? `
                <div class="candidate-events-banner">
                  <div class="events-banner-badge">🎭 אירועים מיוחדים והופעות באתר:</div>
                  <div class="events-banner-items">
                    ${s.specialEvents.map(ev => `
                      <div class="event-mini-row">
                        <span class="event-mini-title"><strong>${ev.title}</strong> ${ev.times ? `(${ev.times})` : ''}</span>
                        ${ev.price ? `<span class="event-mini-price">${ev.price}</span>` : ''}
                        <p class="event-mini-desc">${ev.desc}</p>
                      </div>
                    `).join('')}
                  </div>
                </div>
              ` : ''}

              <!-- Confirmation Action Row -->
              <div class="candidate-footer-actions">
                ${activeInTargetDay ? `
                  <span class="already-added-badge">✓ כבר משובץ ביום ${tDay}</span>
                  <button type="button" class="btn-confirm-add" onclick="App.confirmAddCandidate('${s.id}', ${tDay})">
                    ➕ הוסף שוב ליום ${tDay}
                  </button>
                ` : isPostponed ? `
                  <span class="already-added-badge postponed-status-badge">⏳ שמור ביעדים שנדחו</span>
                  <button type="button" class="btn-confirm-add" onclick="App.confirmAddCandidate('${s.id}', ${tDay})">
                    ✓ שחזר ושבץ ליום ${tDay}
                  </button>
                ` : activeInOtherDay ? `
                  <span class="already-added-badge other-day-badge">📌 משובץ כרגע ביום ${activeInOtherDay.day}</span>
                  <button type="button" class="btn-confirm-add" onclick="App.moveAttractionToDay('${activeInOtherDay.id}', ${tDay}); App.closeModal('add-attraction-modal');">
                    🔄 העבר ליום ${tDay}
                  </button>
                  <button type="button" class="btn-confirm-add btn-secondary-add" onclick="App.confirmAddCandidate('${s.id}', ${tDay})">
                    ➕ הוסף גם ליום ${tDay}
                  </button>
                ` : `
                  <button type="button" class="btn-confirm-add" onclick="App.confirmAddCandidate('${s.id}', ${tDay})">
                    ✓ אשר והוסף למסלול יום ${tDay}
                  </button>
                `}
                ${s.officialWebsite ? `
                  <a href="${s.officialWebsite}" target="_blank" class="candidate-web-link">
                    🌐 אתר רשמי ↗
                  </a>
                ` : ''}
                <a href="https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}" target="_blank" class="candidate-map-link">
                  🧭 צפה ב-Google Maps
                </a>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  },

  confirmAddCandidate(spotId, targetDay) {
    const spot = VIENNA_DATA.viennaDirectory.spots.find(s => s.id === spotId);
    if (!spot) return;

    const daySelect = document.getElementById('add-attr-day');
    const day = Number(targetDay !== undefined && targetDay !== null ? targetDay : (daySelect?.value || this.state.currentDay || 1));
    const durationMin = spot.averageDurationMinutes || 60;

    // Check if there is an existing matching attraction in postponedIds, and remove it so it's not hidden
    const existingPostponed = VIENNA_DATA.attractions.find(a => this.state.postponedIds.has(a.id) && (a.id.startsWith(spot.id) || a.nameHe === spot.nameHe));
    if (existingPostponed) {
      this.state.postponedIds.delete(existingPostponed.id);
      existingPostponed.day = day;
      this.saveState();
      this.closeModal('add-attraction-modal');
      this.setDay(day);
      this.showToast(`"${spot.nameHe}" הוחזר ממגירת היעדים שנדחו ושובץ ליום ${day}! 🗺️`, 'success');
      setTimeout(() => this.scrollToAndPulseCard(existingPostponed.id), 250);
      return;
    }

    const newAtt = {
      id: spot.id + '_' + Date.now(),
      nameHe: spot.nameHe,
      name: spot.name,
      day: day,
      order: VIENNA_DATA.attractions.filter(a => Number(a.day) === day).length + 1,
      category: spot.category,
      isIndoor: spot.isIndoor,
      lat: spot.lat,
      lng: spot.lng,
      address: spot.address,
      officialHours: spot.officialHours,
      officialHoursVerified: true,
      officialWebsite: spot.officialWebsite,
      durations: {
        full: { label: 'סיור מלא', minutes: Math.round(durationMin * 1.5) },
        medium: { label: 'ביקור ממוצע', minutes: durationMin },
        quick: { label: 'עצירת צילום', minutes: Math.max(20, Math.round(durationMin * 0.4)) }
      },
      selectedDuration: 'medium',
      pricing: {
        regular: spot.regularPrice,
        viennaPass: 0,
        viennaCityCardDiscount: 2.5,
        viennaFlexiPassEligible: true
      },
      specialEvents: spot.specialEvents || [],
      aiGuide: {
        story: spot.aiStory,
        secretFact: 'סוד ייחודי למבקרים בוינה: להגיע בשעות הבוקר או לקראת שקיעה.',
        photoTip: 'החזית הראשית וסביבת הגנים מציעות זוויות צילום מדהימות.'
      },
      nearby: {
        food: spot.nearbyFood,
        restrooms: spot.nearbyRestroom
      },
      notes: ''
    };

    VIENNA_DATA.attractions.push(newAtt);
    this.saveState();
    this.closeModal('add-attraction-modal');
    this.setDay(day);
    this.showToast(`"${spot.nameHe}" נוסף בהצלחה ליום ${day} עם שעות מאומתות ואירועים! 🗺️`, 'success');
    setTimeout(() => this.scrollToAndPulseCard(newAtt.id), 250);
  },

  // Copy an event from attraction to user's booked events
  copyEventToBooked(venueName, eventTitle, timesStr, address) {
    const currentDay = this.state.currentDay;
    const newEvent = {
      id: 'event_' + Date.now(),
      nameHe: eventTitle,
      venue: venueName,
      address: address || `${venueName}, Vienna`,
      day: currentDay,
      doorsOpenTime: '19:15',
      startTime: timesStr.includes(':') ? timesStr.split(' ')[0] : '20:00',
      dressCode: 'אלגנטי / Smart Casual',
      entryInstructions: 'מומלץ להגיע 30 דקות לפני תחילת המופע.',
      ticketDetails: {
        hall: 'אולם ראשי',
        tier: 'מרכזי',
        row: 'שמורה מראש',
        seats: 'כרטיס שמור',
        bookingCode: 'CONF-' + Math.floor(100000 + Math.random() * 900000),
        ticketUrl: ''
      }
    };

    VIENNA_DATA.bookedEvents.push(newEvent);
    this.saveState();
    this.render();
    this.showToast(`האירוע "${eventTitle}" נוסף בהצלחה להופעות השמורות שלך! 🎭`, 'success');
  },

  // Modal: Add Event / Concert Manually
  openAddEventModal() {
    const modal = document.getElementById('add-event-modal');
    if (modal) modal.classList.add('active');
  },

  saveCustomEvent() {
    const nameHe = document.getElementById('add-event-name')?.value.trim();
    if (!nameHe) {
      this.showToast('אנא הזיני שם להופעה / אירוע', 'warning');
      return;
    }

    const day = parseInt(document.getElementById('add-event-day')?.value || '1', 10);
    const venue = document.getElementById('add-event-venue')?.value.trim() || 'אולם מופעים בוינה';
    const startTime = document.getElementById('add-event-start')?.value || '20:00';
    const doorsTime = document.getElementById('add-event-doors')?.value || '19:15';
    const hall = document.getElementById('add-event-hall')?.value.trim() || 'אולם ראשי';
    const seat = document.getElementById('add-event-seat')?.value.trim() || 'כרטיס שמור';
    const code = document.getElementById('add-event-code')?.value.trim() || 'CONF-' + Math.floor(100000 + Math.random() * 900000);
    const dressCode = document.getElementById('add-event-dress')?.value.trim() || 'אלגנטי / נוח';

    const newEvent = {
      id: 'event_' + Date.now(),
      nameHe: nameHe,
      venue: venue,
      address: venue + ', Vienna',
      day: day,
      doorsOpenTime: doorsTime,
      startTime: startTime,
      dressCode: dressCode,
      entryInstructions: 'מומלץ להגיע 30 דקות לפני תחילת המופע.',
      ticketDetails: {
        hall: hall,
        tier: 'יציע מרכזי',
        row: 'שורה לפי כרטיס',
        seats: seat,
        bookingCode: code,
        ticketUrl: '',
        hasDigitalTicket: true
      }
    };

    VIENNA_DATA.bookedEvents.push(newEvent);
    this.saveState();
    this.render();
    this.closeModal('add-event-modal');
    this.showToast(`האירוע "${nameHe}" נוסף בהצלחה! 🎟️`, 'success');

    // Reset form
    document.getElementById('add-event-name').value = '';
    document.getElementById('add-event-venue').value = '';
  },

  // Auto-Detect Trip Date
  checkCurrentTripDate() {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    // Map trip dates (2026-10-18 to 2026-10-22)
    const datesMap = {
      '2026-10-18': 1,
      '2026-10-19': 2,
      '2026-10-20': 3,
      '2026-10-21': 4,
      '2026-10-22': 5
    };

    if (datesMap[todayStr]) {
      this.state.currentDay = datesMap[todayStr];
      console.log(`תאריך טיול זוהה בהצלחה: יום ${this.state.currentDay} (${todayStr})`);
    }
  },

  // Auto-Resume from GPS Location & Live Position
  autoResumeCurrentLocationAndDate(notifyUser = true) {
    if (!navigator.geolocation) {
      if (notifyUser) this.showToast('המכשיר אינו תומך ב-GPS', 'warning');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const userLat = pos.coords.latitude;
        const userLng = pos.coords.longitude;
        this.processLocationResume(userLat, userLng, notifyUser);
      },
      (err) => {
        // Fallback for simulation / indoor test in Vienna center
        console.warn('GPS location access unavailable or denied:', err.message);
        if (notifyUser) {
          this.promptSimulatedLocation();
        }
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  },

  promptSimulatedLocation() {
    const choice = confirm('גישת ה-GPS אינה זמינה כרגע בדפדפן.\nהאם תרצי לדמות מיקום שטח בוינה (למשל: ליד קתדרלת סטפנוס הקדוש)?');
    if (choice) {
      // Simulate user standing in Vienna Center
      this.processLocationResume(48.2085, 16.3725, true);
    }
  },

  processLocationResume(userLat, userLng, notifyUser = true) {
    this.state.userCoords = { lat: userLat, lng: userLng };
    const dayAttractions = this.getCurrentDayAttractions();
    
    if (dayAttractions.length === 0) return;

    // Find nearest attraction that hasn't been visited yet
    let minDistance = Infinity;
    let closestAttraction = null;

    dayAttractions.forEach(att => {
      const dist = MapManager.calculateDistanceKm(userLat, userLng, att.lat, att.lng);
      if (!att.isVisited && dist < minDistance) {
        minDistance = dist;
        closestAttraction = att;
      }
    });

    // If all visited, take the last one or hotel
    if (!closestAttraction && dayAttractions.length > 0) {
      closestAttraction = dayAttractions[dayAttractions.length - 1];
    }

    this.state.nextResumeAttraction = closestAttraction;

    // Update map with user pulse marker
    MapManager.renderUserLocation(userLat, userLng, closestAttraction);

    if (closestAttraction) {
      const distMeters = minDistance < 1 ? Math.round(minDistance * 1000) + ' מטרים' : minDistance.toFixed(1) + ' ק"מ';
      if (notifyUser) {
        this.showToast(`📍 זוהה מיקומך! היעד הבא שלך: ${closestAttraction.nameHe} (${distMeters})`, 'success');
      }

      // Smooth scroll to the next attraction card
      setTimeout(() => {
        const cardEl = document.getElementById(`card-${closestAttraction.id}`);
        if (cardEl) {
          cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          cardEl.style.boxShadow = '0 0 25px rgba(16, 185, 129, 0.6)';
          setTimeout(() => {
            cardEl.style.boxShadow = '';
          }, 3000);
        }
      }, 500);
    }
  },

  // Print Daily Itinerary (Window Print)
  printDayItinerary() {
    window.print();
  },

  // Share Itinerary (WhatsApp, Copy, Native Share)
  shareItinerary(channel = 'whatsapp') {
    const day = this.state.currentDay;
    const attractions = this.getCurrentDayAttractions();
    const timeline = this.calculateDayTimeline(attractions);

    let shareText = `🧭 תוכנית טיול וינה - יום ${day} (${VIENNA_DATA.tripInfo.startDate})\n`;
    shareText += `מלון: ${VIENNA_DATA.tripInfo.hotel.name}\n\n`;

    timeline.items.forEach((item, idx) => {
      shareText += `${idx + 1}. ${item.attraction.nameHe} (${item.arrivalTime})\n`;
      shareText += `   שעות: ${item.attraction.effectiveHours}\n`;
      if (item.attraction.nearby.food.length > 0) {
        shareText += `   🍴 מנת דגל קרובה: ${item.attraction.nearby.food[0].nameHe} - ${item.attraction.nearby.food[0].signatureDish}\n`;
      }
      shareText += `\n`;
    });

    shareText += `נוצר באפליקציית WanderSmart`;

    if (channel === 'whatsapp') {
      const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
      window.open(url, '_blank');
      this.showToast('פותח את וואטסאפ לשיתוף... 📱');
    } else if (channel === 'copy') {
      navigator.clipboard.writeText(shareText).then(() => {
        this.showToast('תוכנית היום הועתקה ללוח בהצלחה! 📋', 'success');
      });
    } else if (navigator.share) {
      navigator.share({
        title: `תוכנית טיול וינה - יום ${day}`,
        text: shareText
      }).catch(() => {});
    }
  },

  // Import Modal & Handlers
  openImportModal() {
    const modal = document.getElementById('import-modal');
    if (modal) modal.classList.add('active');
  },

  async handleFileSelected(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const targetDaySelect = document.getElementById('import-target-day');
      const targetVal = targetDaySelect ? targetDaySelect.value : 'auto';
      const targetDay = targetVal === 'auto' ? 'auto' : parseInt(targetVal, 10);

      this.showToast('מפענח את הקובץ...', 'info');
      const parsed = await ItineraryImporter.handleFileUpload(file, targetDay);

      this.state.pendingImportItems = parsed;
      this.renderImportPreview(parsed);
    } catch (err) {
      console.error(err);
      this.showToast('שגיאה בטעינת הקובץ: ' + err.message, 'warning');
    }
  },

  handlePasteImport() {
    const text = document.getElementById('import-paste-text').value;
    if (!text.trim()) {
      this.showToast('אנא הדביקי טקסט או בחרי קובץ לפיענוח', 'warning');
      return;
    }
    const targetDaySelect = document.getElementById('import-target-day');
    const targetVal = targetDaySelect ? targetDaySelect.value : 'auto';
    const targetDay = targetVal === 'auto' ? 'auto' : parseInt(targetVal, 10);

    const parsed = ItineraryImporter.parseTextItinerary(text, targetDay);
    this.state.pendingImportItems = parsed;
    this.renderImportPreview(parsed);
    this.showToast(`זוהו ${parsed.length} יעדים בטקסט! בדקי בתצוגה המקדימה למטה 📋`, 'success');
  },

  renderImportPreview(items) {
    const previewContainer = document.getElementById('import-preview-list');
    const confirmBtn = document.getElementById('import-confirm-btn');
    if (!previewContainer) return;

    if (items.length === 0) {
      previewContainer.innerHTML = '<p class="empty-preview">לא זוהו אטרקציות בקובץ. נסי פורמט אחר או הדבקת טקסט.</p>';
      if (confirmBtn) confirmBtn.style.display = 'none';
      return;
    }

    previewContainer.innerHTML = `
      <div class="preview-count">זוהו בהצלחה <strong>${items.length}</strong> יעדים:</div>
      <div class="preview-scroll">
        ${items.map(it => `
          <div class="preview-item-row">
            <span class="preview-day-badge">יום ${it.day}</span>
            <span class="preview-name">${it.nameHe}</span>
            <span class="preview-dur">${it.selectedDuration === 'full' ? 'סיור מלא' : 'ביקור ממוצע'}</span>
          </div>
        `).join('')}
      </div>
    `;

    if (confirmBtn) confirmBtn.style.display = 'inline-block';
  },

  confirmImport() {
    if (!this.state.pendingImportItems || this.state.pendingImportItems.length === 0) return;

    const firstDay = this.state.pendingImportItems[0] ? Number(this.state.pendingImportItems[0].day) || 1 : 1;

    this.state.pendingImportItems.forEach(item => {
      VIENNA_DATA.attractions.push({
        ...item,
        day: Number(item.day) || 1
      });
    });

    const count = this.state.pendingImportItems.length;
    this.state.pendingImportItems = [];
    this.saveState();
    this.closeModal('import-modal');
    this.setDay(firstDay);
    this.showToast(`מעולה! ${count} יעדים נוספו בהצלחה למסלול 🎉 עברת לתצוגת יום ${firstDay}`, 'success');
  },

  updateClockAndTimers() {
    // Keep live countdown indicators active if needed
  },

  bindEvents() {
    // Mode toggles
    document.querySelectorAll('[data-transit-mode]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const mode = e.currentTarget.getAttribute('data-transit-mode');
        document.querySelectorAll('[data-transit-mode]').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        this.setTransitMode(mode);
      });
    });

    document.querySelectorAll('[data-app-mode]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const mode = e.currentTarget.getAttribute('data-app-mode');
        document.querySelectorAll('[data-app-mode]').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        this.setAppMode(mode);
      });
    });

    const targetDayEl = document.getElementById('import-target-day');
    if (targetDayEl) {
      targetDayEl.addEventListener('change', () => {
        const text = document.getElementById('import-paste-text')?.value;
        if (text && text.trim()) {
          this.handlePasteImport();
        }
      });
    }
  }
};

window.App = App;

// Bootstrap on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
