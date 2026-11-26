(function () {
  const SEARCH_MODAL_ID = 'serialSearchModal';

  function injectSearchStyles() {
    if (document.getElementById('searchModalStyles')) return;
    const style = document.createElement('style');
    style.id = 'searchModalStyles';
    style.textContent = `
      #${SEARCH_MODAL_ID} {
        display: none;
        position: fixed;
        inset: 0;
        background: rgba(15, 23, 42, 0.65);
        backdrop-filter: blur(4px);
        z-index: 1050;
        justify-content: center;
        align-items: center;
        padding: 12px;
        font-family: 'Hind Siliguri', 'Noto Sans Bengali', sans-serif;
      }
      #${SEARCH_MODAL_ID}.active { display: flex; }
      #${SEARCH_MODAL_ID} .search-card {
        background: #ffffff;
        width: 100%;
        max-width: 560px;
        max-height: 90vh;
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
        border-radius: 18px;
        box-shadow: 0 20px 45px rgba(0, 0, 0, 0.28);
        animation: searchModalIn 0.22s ease-out;
      }
      @keyframes searchModalIn {
        from { opacity: 0; transform: translateY(16px) scale(0.97); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }
      #${SEARCH_MODAL_ID} .search-header {
        background: linear-gradient(135deg, #0f766e, #0d9488);
        color: #ffffff;
        padding: 16px 20px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        position: sticky;
        top: 0;
        z-index: 10;
      }
      #${SEARCH_MODAL_ID} .search-header h3 { font-size: 19px; font-weight: 700; margin: 0; }
      #${SEARCH_MODAL_ID} .search-close {
        background: rgba(255, 255, 255, 0.18);
        color: #ffffff;
        border: none;
        width: 34px;
        height: 34px;
        border-radius: 50%;
        font-size: 18px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      #${SEARCH_MODAL_ID} .search-body { padding: 20px; text-align: left; }
      #${SEARCH_MODAL_ID} .search-input {
        width: 100%;
        padding: 12px 15px;
        border: 1.5px solid #cbd5e1;
        border-radius: 10px;
        font-size: 16px;
        font-family: inherit;
        outline: none;
        transition: 0.2s;
      }
      #${SEARCH_MODAL_ID} .search-input:focus {
        border-color: #0d9488;
        box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.12);
      }
      #${SEARCH_MODAL_ID} .search-btn {
        width: 100%;
        padding: 12px;
        background: linear-gradient(135deg, #0f766e, #059669);
        color: #ffffff;
        border: none;
        border-radius: 10px;
        font-size: 16px;
        font-weight: 700;
        cursor: pointer;
        margin-top: 12px;
        font-family: inherit;
      }
      #${SEARCH_MODAL_ID} .search-btn:disabled { opacity: 0.65; cursor: not-allowed; }
      #${SEARCH_MODAL_ID} .appointment-card {
        background: #ffffff;
        border: 1.5px solid #e2e8f0;
        border-radius: 14px;
        padding: 16px;
        margin-top: 14px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
      }
      #${SEARCH_MODAL_ID} .appointment-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-bottom: 10px;
        margin-bottom: 10px;
        border-bottom: 1px solid #f1f5f9;
      }
      #${SEARCH_MODAL_ID} .appointment-serial {
        background: linear-gradient(135deg, #0f766e, #0d9488);
        color: #ffffff;
        padding: 5px 14px;
        border-radius: 20px;
        font-size: 16px;
        font-weight: 700;
      }
      #${SEARCH_MODAL_ID} .detail-row {
        display: flex;
        justify-content: space-between;
        padding: 5px 0;
        border-bottom: 1px solid #f8fafc;
        font-size: 14px;
      }
      #${SEARCH_MODAL_ID} .detail-label { font-weight: 600; color: #475569; }
      #${SEARCH_MODAL_ID} .detail-value { font-weight: 600; color: #0f172a; text-align: right; }
      #${SEARCH_MODAL_ID} .direct-dl-group {
        display: flex;
        gap: 8px;
        margin-top: 12px;
      }
      #${SEARCH_MODAL_ID} .direct-dl-btn {
        flex: 1;
        padding: 10px 12px;
        border: none;
        border-radius: 9px;
        color: #ffffff;
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
        font-family: inherit;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
      }
      #${SEARCH_MODAL_ID} .direct-dl-btn.png { background: #16a34a; }
      #${SEARCH_MODAL_ID} .direct-dl-btn.png:hover { background: #15803d; }
      #${SEARCH_MODAL_ID} .direct-dl-btn.pdf { background: #dc2626; }
      #${SEARCH_MODAL_ID} .direct-dl-btn.pdf:hover { background: #b91c1c; }
    `;
    document.head.appendChild(style);
  }

  function ensureDownloadLibs() {
    const tasks = [];
    if (typeof window.html2canvas === 'undefined') {
      tasks.push(new Promise((resolve) => {
        const s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
        s.onload = resolve;
        s.onerror = resolve;
        document.head.appendChild(s);
      }));
    }
    if (!window.jspdf || !window.jspdf.jsPDF) {
      tasks.push(new Promise((resolve) => {
        const s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        s.onload = resolve;
        s.onerror = resolve;
        document.head.appendChild(s);
      }));
    }
    return Promise.all(tasks);
  }

  function createSearchDOM() {
    if (document.getElementById(SEARCH_MODAL_ID)) return;
    const div = document.createElement('div');
    div.id = SEARCH_MODAL_ID;
    div.innerHTML = `
      <div class="search-card" onclick="event.stopPropagation()">
        <div class="search-header">
          <h3>সিরিয়াল খুঁজুন</h3>
          <button type="button" class="search-close" id="closeSearchModalBtn" aria-label="বন্ধ করুন">✕</button>
        </div>
        <div class="search-body">
          <label for="searchModalPhone" class="block text-sm font-semibold text-slate-700 mb-1.5">ফোন নম্বর</label>
          <input type="tel" id="searchModalPhone" class="search-input" placeholder="01XXXXXXXXX" maxlength="11" />
          <small id="searchModalPhoneError" class="text-red-600 text-xs mt-1 hidden">অনুগ্রহ করে সঠিক ফোন নম্বর লিখুন (01XXXXXXXXX)</small>
          <small class="text-slate-500 text-xs mt-1 block">আপনার রেজিস্টার্ড ফোন নম্বরটি লিখুন</small>

          <button type="button" id="runSerialSearchBtn" class="search-btn">🔍 সিরিয়াল খুঁজুন</button>
          <div id="searchModalResults"></div>
        </div>
      </div>
    `;
    document.body.appendChild(div);

    document.getElementById('closeSearchModalBtn').onclick = window.closeSearchModal;
    div.onclick = window.closeSearchModal;
    document.getElementById('runSerialSearchBtn').onclick = performSearch;

    const phoneInput = document.getElementById('searchModalPhone');
    phoneInput.addEventListener('input', () => {
      const val = phoneInput.value.trim();
      const err = document.getElementById('searchModalPhoneError');
      if (val.length > 0 && !/^01[0-9]{9}$/.test(val)) {
        err.classList.remove('hidden');
      } else {
        err.classList.add('hidden');
      }
    });

    phoneInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        performSearch();
      }
    });
  }

  // ==================== হেল্পার ফাংশন (search.html অনুযায়ী) ====================
  function getNextDateByDay(targetDay) {
    const daysMap = { Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6 };
    const targetDayIndex = daysMap[targetDay];
    const today = new Date();
    let daysToAdd = targetDayIndex - today.getDay();
    if (daysToAdd < 0) daysToAdd += 7;

    const nextDate = new Date(today);
    nextDate.setDate(today.getDate() + daysToAdd);

    const banglaMonths = ['জানুয়ারী', 'ফেব্রুয়ারী', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
    const banglaDays = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'];
    const banglaDate = `${banglaDays[nextDate.getDay()]}, ${nextDate.getDate()} ${banglaMonths[nextDate.getMonth()]} ${nextDate.getFullYear()}`;

    return { date: nextDate, banglaDate };
  }

  function checkIfAppointmentExpired(appointmentDay, appointmentTimestamp) {
    const now = new Date();
    const today = now.getDay();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const dayMap = { Thursday: 4, Friday: 5 };
    const appDayIndex = dayMap[appointmentDay];
    if (appDayIndex === undefined) return false;

    if (appointmentTimestamp) {
      try {
        const bookingDate = appointmentTimestamp.toDate ? appointmentTimestamp.toDate() : new Date(appointmentTimestamp);
        const daysMap = { Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6 };
        let daysToAdd = daysMap[appointmentDay] - bookingDate.getDay();
        if (daysToAdd < 0) daysToAdd += 7;

        const actualDate = new Date(bookingDate);
        actualDate.setDate(bookingDate.getDate() + daysToAdd);

        const todayOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const appDateOnly = new Date(actualDate.getFullYear(), actualDate.getMonth(), actualDate.getDate());

        if (appDateOnly < todayOnly) return true;
        if (appDateOnly.getTime() === todayOnly.getTime()) {
          return !(currentHour < 23 || (currentHour === 23 && currentMinute < 59));
        }
        return false;
      } catch (_) {}
    }

    if (today === appDayIndex) {
      return !(currentHour < 23 || (currentHour === 23 && currentMinute < 59));
    }
    return today > appDayIndex;
  }

  function getDateForAppointment(appointmentDay, appointmentTimestamp) {
    const isExpired = checkIfAppointmentExpired(appointmentDay, appointmentTimestamp);
    if (isExpired && appointmentTimestamp) {
      try {
        const bookingDate = appointmentTimestamp.toDate ? appointmentTimestamp.toDate() : new Date(appointmentTimestamp);
        const daysMap = { Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6 };
        let daysToAdd = daysMap[appointmentDay] - bookingDate.getDay();
        if (daysToAdd < 0) daysToAdd += 7;

        const appDate = new Date(bookingDate);
        appDate.setDate(bookingDate.getDate() + daysToAdd);

        const banglaMonths = ['জানুয়ারী', 'ফেব্রুয়ারী', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
        const banglaDays = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'];
        return {
          banglaDate: `${banglaDays[appDate.getDay()]}, ${appDate.getDate()} ${banglaMonths[appDate.getMonth()]} ${appDate.getFullYear()}`
        };
      } catch (_) {}
    }
    return getNextDateByDay(appointmentDay);
  }

  function getAgeDisplay(app) {
    if (app.ageDisplay) return app.ageDisplay;
    if (app.ageString) return app.ageString;
    if (app.ageYears || app.ageMonths || app.ageDays) {
      const parts = [];
      if (app.ageYears > 0) parts.push(`${app.ageYears} বছর`);
      if (app.ageMonths > 0) parts.push(`${app.ageMonths} মাস`);
      if (app.ageDays > 0) parts.push(`${app.ageDays} দিন`);
      return parts.join(' ') || '০ দিন';
    }
    return app.age || 'বয়স তথ্য নেই';
  }

  function formatTimestamp(ts) {
    if (!ts) return 'N/A';
    try {
      const d = ts.toDate ? ts.toDate() : new Date(ts);
      return d.toLocaleDateString('bn-BD', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch (_) {
      return 'N/A';
    }
  }

  // ==================== অফ-স্ক্রিন স্লিপ তৈরি ও সরাসরি ডাউনলোড ====================
  async function generateSlipCanvas(app) {
    await ensureDownloadLibs();
    const dateInfo = getDateForAppointment(app.day, app.timestamp);
    const now = new Date();
    const dateTimeStr = now.toLocaleDateString('bn-BD', {
      year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'
    }) + ' ' + now.toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' });

    const slipEl = document.createElement('div');
    slipEl.style.cssText = `
      position: fixed; left: -9999px; top: 0; width: 300px; background: #ffffff;
      border: 2px solid #0d9488; border-radius: 10px; padding: 15px;
      font-family: 'Hind Siliguri', 'Noto Sans Bengali', sans-serif; color: #1f2937; text-align: center;
    `;
    slipEl.innerHTML = `
      <div style="border-bottom:1px solid #e5e7eb; padding-bottom:8px; margin-bottom:10px;">
        <h3 style="color:#0f766e; font-size:14px; font-weight:700; margin:0 0 3px;">🏥 ডাঃ মোঃ ওয়াহিদুজ্জামান মাসুম</h3>
        <p style="color:#6b7280; font-size:12px; margin:0;">সিরিয়াল কনফার্মেশন স্লিপ</p>
      </div>
      <div style="font-size:12px; margin-bottom:10px;">
        <div style="display:flex; justify-content:space-between; padding:3px 0; border-bottom:1px solid #f0f0f0;">
          <span style="font-weight:600;">নাম:</span><span>${app.name}</span>
        </div>
        <div style="display:flex; justify-content:space-between; padding:3px 0; border-bottom:1px solid #f0f0f0;">
          <span style="font-weight:600;">বয়স:</span><span>${getAgeDisplay(app)}</span>
        </div>
        <div style="display:flex; justify-content:space-between; padding:3px 0; border-bottom:1px solid #f0f0f0;">
          <span style="font-weight:600;">ফোন:</span><span>${app.phone}</span>
        </div>
        <div style="display:flex; justify-content:space-between; padding:3px 0; border-bottom:1px solid #f0f0f0;">
          <span style="font-weight:600;">ধরন:</span><span>${app.patientType === 'new' ? 'নতুন রোগী' : 'পুরাতন রোগী'}</span>
        </div>
        <div style="display:flex; justify-content:space-between; padding:3px 0; border-bottom:1px solid #f0f0f0;">
          <span style="font-weight:600;">দিন:</span><span>${dateInfo.banglaDate}</span>
        </div>
        <div style="display:flex; justify-content:space-between; padding:3px 0; border-bottom:1px solid #f0f0f0;">
          <span style="font-weight:600;">সময়:</span><span>${app.time}</span>
        </div>
      </div>
      <div style="background:linear-gradient(135deg,#0f766e,#0d9488); color:#fff; padding:10px; border-radius:8px; font-size:20px; font-weight:700; margin:10px 0;">
        #${app.serial}
      </div>
      <div style="border-top:1px solid #e5e7eb; padding-top:8px; color:#6b7280; font-size:10px; line-height:1.3;">
        তারিখ ও সময়: ${dateTimeStr} | এই স্লিপটি সংরক্ষণ করুন এবং অ্যাপয়েন্টমেন্টের দিন সাথে নিয়ে আসুন
      </div>
    `;

    document.body.appendChild(slipEl);
    const canvas = await window.html2canvas(slipEl, { scale: 3, backgroundColor: '#ffffff', useCORS: true });
    document.body.removeChild(slipEl);
    return canvas;
  }

  async function directDownloadPNG(app, btnEl) {
    const oldText = btnEl.innerHTML;
    try {
      btnEl.disabled = true;
      btnEl.textContent = '⏳ তৈরি হচ্ছে...';
      const canvas = await generateSlipCanvas(app);
      const link = document.createElement('a');
      link.download = `appointment-serial-${app.serial}.png`;
      link.href = canvas.toDataURL('image/png');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error('PNG download error:', e);
      alert('PNG ডাউনলোড করতে সমস্যা হয়েছে।');
    } finally {
      btnEl.disabled = false;
      btnEl.innerHTML = oldText;
    }
  }

  async function directDownloadPDF(app, btnEl) {
    const oldText = btnEl.innerHTML;
    try {
      btnEl.disabled = true;
      btnEl.textContent = '⏳ তৈরি হচ্ছে...';
      const canvas = await generateSlipCanvas(app);
      const imgData = canvas.toDataURL('image/png');
      const pdf = new window.jspdf.jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a6' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`appointment-serial-${app.serial}.pdf`);
    } catch (e) {
      console.error('PDF download error:', e);
      alert('PDF ডাউনলোড করতে সমস্যা হয়েছে।');
    } finally {
      btnEl.disabled = false;
      btnEl.innerHTML = oldText;
    }
  }

  // ==================== সার্চ ফাংশন ====================
  let foundAppointmentsCache = [];

  async function performSearch() {
    const phoneInput = document.getElementById('searchModalPhone');
    const phoneErr = document.getElementById('searchModalPhoneError');
    const searchBtn = document.getElementById('runSerialSearchBtn');
    const resultsBox = document.getElementById('searchModalResults');

    const phone = phoneInput.value.trim();
    if (!/^01[0-9]{9}$/.test(phone)) {
      phoneErr.classList.remove('hidden');
      phoneInput.focus();
      return;
    }
    phoneErr.classList.add('hidden');

    const dbRef = window.db || (typeof firebase !== 'undefined' && firebase.apps.length ? firebase.firestore() : null);
    if (!dbRef) {
      resultsBox.innerHTML = '<p class="text-red-600 text-xs mt-3 text-center">ডেটাবেস সংযোগ সমস্যা। পৃষ্ঠাটি রিফ্রেশ করুন।</p>';
      return;
    }

    try {
      searchBtn.disabled = true;
      searchBtn.textContent = '🔍 খুঁজছি...';

      const [newSnap, oldSnap] = await Promise.all([
        dbRef.collectionGroup('new').where('phone', '==', phone).get(),
        dbRef.collectionGroup('old').where('phone', '==', phone).get()
      ]);

      const map = new Map();
      newSnap.forEach((doc) => {
        const d = doc.data();
        if (d.status === 'confirmed') map.set(doc.id, { id: doc.id, ...d });
      });
      oldSnap.forEach((doc) => {
        const d = doc.data();
        if (d.status === 'confirmed') map.set(doc.id, { id: doc.id, ...d });
      });

      const list = Array.from(map.values());
      if (list.length === 0) {
        resultsBox.innerHTML = `
          <div class="text-center py-6 text-slate-500">
            <div class="text-3xl mb-2">🔍</div>
            <p class="font-bold text-slate-700 text-sm">কোনো সক্রিয় অ্যাপয়েন্টমেন্ট পাওয়া যায়নি</p>
            <p class="text-xs mt-1">এই ফোন নম্বর দিয়ে কোনো কনফার্মড অ্যাপয়েন্টমেন্ট নেই</p>
          </div>
        `;
        return;
      }

      list.sort((a, b) => {
        const aExp = checkIfAppointmentExpired(a.day, a.timestamp);
        const bExp = checkIfAppointmentExpired(b.day, b.timestamp);
        if (!aExp && bExp) return -1;
        if (aExp && !bExp) return 1;
        if (a.day !== b.day) return a.day === 'Thursday' ? -1 : 1;
        return a.serial - b.serial;
      });

      foundAppointmentsCache = list;

      resultsBox.innerHTML = list.map((app, idx) => {
        const isExpired = checkIfAppointmentExpired(app.day, app.timestamp);
        const typeText = app.patientType === 'new' ? 'নতুন রোগী' : 'পুরাতন রোগী';
        const dateInfo = getDateForAppointment(app.day, app.timestamp);
        const statusBadge = isExpired
          ? `<span style="background:#dc2626;color:#fff;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:700;">এক্সপায়ার্ড</span>`
          : `<span style="background:#16a34a;color:#fff;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:700;">কনফার্মড</span>`;

        const actionArea = isExpired
          ? `<div style="color:#dc2626;font-style:italic;margin-top:10px;padding:8px 10px;background:#fef2f2;border-radius:8px;font-size:12px;">
              ⛔ এক্সপায়ার্ড - স্লিপ ডাউনলোড করা যাবে না
             </div>`
          : `<div class="direct-dl-group">
              <button type="button" class="direct-dl-btn png" data-idx="${idx}">📸 PNG ডাউনলোড</button>
              <button type="button" class="direct-dl-btn pdf" data-idx="${idx}">📄 PDF ডাউনলোড</button>
             </div>`;

        return `
          <div class="appointment-card">
            <div class="appointment-header">
              <div class="appointment-serial">সিরিয়াল #${app.serial}</div>
              ${statusBadge}
            </div>
            <div>
              <div class="detail-row"><span class="detail-label">নাম:</span><span class="detail-value">${app.name}</span></div>
              <div class="detail-row"><span class="detail-label">বয়স:</span><span class="detail-value">${getAgeDisplay(app)}</span></div>
              <div class="detail-row"><span class="detail-label">দিন:</span><span class="detail-value">${dateInfo.banglaDate}</span></div>
              <div class="detail-row"><span class="detail-label">সময়:</span><span class="detail-value">${app.time}</span></div>
              <div class="detail-row"><span class="detail-label">ধরন:</span><span class="detail-value">${typeText}</span></div>
              <div class="detail-row"><span class="detail-label">বুকিং তারিখ:</span><span class="detail-value">${formatTimestamp(app.timestamp)}</span></div>
            </div>
            ${actionArea}
          </div>
        `;
      }).join('');

      resultsBox.querySelectorAll('.direct-dl-btn.png').forEach((btn) => {
        btn.addEventListener('click', () => {
          const app = foundAppointmentsCache[Number(btn.dataset.idx)];
          if (app) directDownloadPNG(app, btn);
        });
      });

      resultsBox.querySelectorAll('.direct-dl-btn.pdf').forEach((btn) => {
        btn.addEventListener('click', () => {
          const app = foundAppointmentsCache[Number(btn.dataset.idx)];
          if (app) directDownloadPDF(app, btn);
        });
      });
    } catch (err) {
      console.error('Search error:', err);
      resultsBox.innerHTML = '<p class="text-red-600 text-xs mt-3 text-center">ডেটা লোড করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।</p>';
    } finally {
      searchBtn.disabled = false;
      searchBtn.textContent = '🔍 সিরিয়াল খুঁজুন';
    }
  }

  window.openSearchModal = function () {
    injectSearchStyles();
    createSearchDOM();

    // প্রতিবার ওপেন করলে আগের সার্চ ডেটা পরিষ্কার থাকবে
    document.getElementById('searchModalPhone').value = '';
    document.getElementById('searchModalPhoneError').classList.add('hidden');
    document.getElementById('searchModalResults').innerHTML = '';

    document.getElementById(SEARCH_MODAL_ID).classList.add('active');
    document.body.style.overflow = 'hidden';
    setTimeout(() => document.getElementById('searchModalPhone').focus(), 100);
  };

  window.closeSearchModal = function () {
    const el = document.getElementById(SEARCH_MODAL_ID);
    if (!el) return;
    el.classList.remove('active');
    document.body.style.overflow = '';
  };
})();