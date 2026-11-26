(function () {
  const MODAL_ID = 'apptBookingModal';

// স্কোপড CSS ইনজেক্ট করা যাতে index.html-এর স্টাইলের সাথে কোনো সংঘর্ষ না হয়
  function injectModalStyles() {
    if (document.getElementById('apptModalStyles')) return;
    const style = document.createElement('style');
    style.id = 'apptModalStyles';
    style.textContent = `
      #${MODAL_ID} {
        display: none;
        position: fixed;
        inset: 0;
        background: rgba(15, 23, 42, 0.65);
        backdrop-filter: blur(4px);
        z-index: 1050;
        justify-content: center;
        align-items: center;
        padding: 12px;
        overflow-y: auto;
        font-family: 'Noto Sans Bengali', 'Hind Siliguri', sans-serif;
      }
      #${MODAL_ID}.active {
        display: flex;
      }
      #${MODAL_ID} .appt-modal-card {
        background: #ffffff;
        width: 100%;
        max-width: 620px;
        max-height: 90vh;
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
        border-radius: 18px;
        box-shadow: 0 20px 45px rgba(0, 0, 0, 0.28);
        position: relative;
        animation: apptModalIn 0.22s ease-out;
      }
      @keyframes apptModalIn {
        from { opacity: 0; transform: translateY(16px) scale(0.97); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }
      #${MODAL_ID} .appt-modal-header {
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
      #${MODAL_ID} .appt-modal-header h2 {
        font-size: 19px;
        font-weight: 700;
        margin: 0;
      }
      #${MODAL_ID} .appt-close-btn {
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
      #${MODAL_ID} .appt-form-body {
        padding: 20px;
      }
      #${MODAL_ID} .form-group {
        margin-bottom: 16px;
        text-align: left;
      }
      #${MODAL_ID} label {
        display: block;
        margin-bottom: 6px;
        font-weight: 600;
        color: #1f2937;
        font-size: 14px;
      }
      #${MODAL_ID} .age-multiple-container {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 10px;
      }
      #${MODAL_ID} input,
      #${MODAL_ID} select {
        width: 100%;
        padding: 10px 14px;
        border: 1.5px solid #cbd5e1;
        border-radius: 10px;
        font-size: 15px;
        font-family: inherit;
        background: #ffffff;
        color: #0f172a;
      }
      #${MODAL_ID} input:focus,
      #${MODAL_ID} select:focus {
        outline: none;
        border-color: #0d9488;
        box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.12);
      }
      #${MODAL_ID} .error-msg {
        color: #dc2626;
        font-size: 12px;
        margin-top: 4px;
        display: none;
      }
      #${MODAL_ID} .info-text {
        color: #64748b;
        font-size: 12px;
        margin-top: 4px;
        display: block;
      }
      #${MODAL_ID} .serial-section {
        margin-top: 20px;
        border-top: 1px solid #e2e8f0;
        padding-top: 16px;
      }
      #${MODAL_ID} .serial-header {
        display: flex;
        flex-direction: column;
        gap: 10px;
        margin-bottom: 12px;
      }
      #${MODAL_ID} .serial-header h3 {
        font-size: 16px;
        font-weight: 700;
        color: #0f172a;
      }
      #${MODAL_ID} .legend {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
      }
      #${MODAL_ID} .legend-item {
        display: flex;
        align-items: center;
        font-size: 12px;
        color: #334155;
      }
      #${MODAL_ID} .legend-dot {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        margin-right: 5px;
        display: inline-block;
      }
      #${MODAL_ID} .available-dot { background-color: #16a34a; }
      #${MODAL_ID} .booked-dot { background-color: #dc2626; }
      #${MODAL_ID} .selected-dot { background-color: #f59e0b; }
      #${MODAL_ID} .pending-dot { background-color: #3b82f6; }

      /* ডেস্কটপ: ১০ কলাম */
      #${MODAL_ID} #apptSerialGrid,
      #${MODAL_ID} .serial-grid {
        display: grid !important;
        grid-template-columns: repeat(10, minmax(0, 1fr)) !important;
        gap: 6px !important;
        max-height: 250px;
        overflow-y: auto;
        padding: 4px;
      }

      /* মোবাইল: ৭ কলাম */
      @media (max-width: 640px) {
        #${MODAL_ID} #apptSerialGrid,
        #${MODAL_ID} .serial-grid {
          grid-template-columns: repeat(7, minmax(0, 1fr)) !important;
          gap: 4px !important;
        }
      }

      #${MODAL_ID} #apptSerialGrid .serial-item,
      #${MODAL_ID} .serial-grid .serial-item {
        width: 100% !important;
        min-width: 0 !important;
        padding: 7px 2px !important;
        font-size: 12px !important;
        font-weight: 700 !important;
        text-align: center !important;
        border-radius: 6px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
      }

      #${MODAL_ID} .loading-message {
        background: #eff6ff;
        color: #1d4ed8;
        padding: 12px;
        border-radius: 10px;
        text-align: center;
        font-size: 13px;
        display: none;
        margin-bottom: 10px;
      }
      #${MODAL_ID} .no-slots-message {
        background: #fef3c7;
        color: #b45309;
        padding: 12px;
        border-radius: 10px;
        text-align: center;
        font-size: 13px;
        display: none;
        margin-top: 10px;
      }
      #${MODAL_ID} .submit-btn {
        width: 100%;
        padding: 13px;
        background: linear-gradient(135deg, #0f766e, #059669);
        color: #ffffff;
        border: none;
        border-radius: 12px;
        font-size: 17px;
        font-weight: 700;
        cursor: pointer;
        margin-top: 18px;
        font-family: inherit;
      }
      #${MODAL_ID} .submit-btn:disabled,
      #${MODAL_ID} .submit-btn.loading {
        opacity: 0.65;
        cursor: not-allowed;
      }
      #${MODAL_ID} .helpline {
        text-align: center;
        margin-top: 14px;
        font-size: 13px;
        font-weight: 600;
        color: #475569;
      }
      /* Sub Popup Overlay inside Modal */
      #${MODAL_ID} .appt-sub-popup {
        display: none;
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.55);
        z-index: 1060;
        justify-content: center;
        align-items: center;
        padding: 14px;
      }
      #${MODAL_ID} .appt-sub-popup.active {
        display: flex;
      }
      #${MODAL_ID} .appt-sub-box {
        background: #ffffff;
        padding: 22px;
        border-radius: 16px;
        text-align: center;
        max-width: 460px;
        width: 100%;
        max-height: 85vh;
        overflow-y: auto;
        box-shadow: 0 15px 35px rgba(0, 0, 0, 0.3);
      }
      #${MODAL_ID} .popup-icon { font-size: 40px; margin-bottom: 8px; }
      #${MODAL_ID} .popup-title { font-size: 19px; font-weight: 700; color: #0f172a; margin-bottom: 8px; }
      #${MODAL_ID} .popup-message { font-size: 15px; color: #475569; margin-bottom: 14px; text-align: left; line-height: 1.5; }
      #${MODAL_ID} .popup-buttons { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
      #${MODAL_ID} .popup-btn {
        background: #0d9488;
        color: #ffffff;
        border: none;
        padding: 10px 20px;
        border-radius: 10px;
        font-size: 15px;
        font-weight: 600;
        cursor: pointer;
        font-family: inherit;
      }
      #${MODAL_ID} .popup-btn.cancel { background: #64748b; }
      #${MODAL_ID} .popup-btn.success { background: #16a34a; }
      #${MODAL_ID} .popup-btn.warning { background: #d97706; }
      #${MODAL_ID} .confirmation-slip {
        background: #ffffff;
        border: 2px solid #0d9488;
        border-radius: 12px;
        padding: 14px;
        margin: 12px auto;
        max-width: 300px;
        text-align: center;
      }
      #${MODAL_ID} .slip-header { border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 8px; }
      #${MODAL_ID} .slip-header h3 { color: #0f766e; font-size: 14px; font-weight: 700; }
      #${MODAL_ID} .slip-header p { color: #64748b; font-size: 12px; }
      #${MODAL_ID} .detail-item {
        display: flex;
        justify-content: space-between;
        padding: 4px 0;
        border-bottom: 1px solid #f1f5f9;
        font-size: 12px;
      }
      #${MODAL_ID} .detail-label { font-weight: 600; color: #334155; }
      #${MODAL_ID} .detail-value { color: #0f172a; font-weight: 500; text-align: right; }
      #${MODAL_ID} .serial-number {
        background: linear-gradient(135deg, #0f766e, #0d9488);
        color: #ffffff;
        padding: 10px;
        border-radius: 10px;
        margin: 10px 0;
        font-size: 20px;
        font-weight: 700;
      }
      #${MODAL_ID} .slip-footer { font-size: 10px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 6px; }
      #${MODAL_ID} .download-buttons { display: flex; gap: 8px; justify-content: center; margin-top: 12px; flex-wrap: wrap; }
      #${MODAL_ID} .download-btn {
        background: #16a34a;
        color: #ffffff;
        border: none;
        padding: 8px 12px;
        border-radius: 8px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        font-family: inherit;
      }
      #${MODAL_ID} .download-btn.pdf { background: #dc2626; }
    `;
    document.head.appendChild(style);
  }

  // Modal HTML তৈরি করা
  function createModalDOM() {
    if (document.getElementById(MODAL_ID)) return;

    const wrapper = document.createElement('div');
    wrapper.id = MODAL_ID;
    wrapper.innerHTML = `
      <div class="appt-modal-card" onclick="event.stopPropagation()">
        <div class="appt-modal-header">
          <h2>অ্যাপয়েন্টমেন্ট ফর্ম</h2>
          <button type="button" class="appt-close-btn" id="apptModalCloseBtn" aria-label="বন্ধ করুন">✕</button>
        </div>

        <form id="apptModalForm" class="appt-form-body" novalidate>
          <div class="form-group">
            <label for="apptName">রোগীর নাম</label>
            <input type="text" id="apptName" name="name" placeholder="আপনার পুরো নাম লিখুন" required
              pattern="[a-zA-Z\\u0980-\\u09FF\\.\\s]{3,50}"
              onblur="this.value = this.value.toLowerCase().split(/[. ]+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') == '' ? '' : this.value.toLowerCase().split(/[. ]+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')">
            <small id="apptNameError" class="error-msg">সঠিক নাম লিখুন (বিশেষ চিহ্ন বা সংখ্যা দেওয়া যাবে না)</small>
          </div>

          <div class="form-group">
            <label>রোগীর বয়স</label>
            <div class="age-multiple-container">
              <input type="number" id="apptAgeYears" name="ageYears" placeholder="বছর" min="0" max="120">
              <input type="number" id="apptAgeMonths" name="ageMonths" placeholder="মাস" min="0">
              <input type="number" id="apptAgeDays" name="ageDays" placeholder="দিন" min="0">
            </div>
            <small id="apptAgeError" class="error-msg">অনুগ্রহ করে সঠিক বয়স লিখুন</small>
            <small class="info-text">কমপক্ষে একটি ফিল্ড পূরণ করুন (বছর/মাস/দিন)</small>
          </div>

          <div class="form-group">
            <label for="apptPhone">ফোন নম্বর</label>
            <input type="tel" id="apptPhone" name="phone" placeholder="01XXXXXXXXX" required pattern="01[0-9]{9}">
            <small id="apptPhoneError" class="error-msg">অনুগ্রহ করে সঠিক ফোন নম্বর লিখুন (01XXXXXXXXX)</small>
            <small class="info-text">প্রয়োজনে আমরা আপনার সাথে এই নম্বরে যোগাযোগ করব</small>
          </div>

          <div class="form-group">
            <label for="apptPatientType">রোগীর ধরন</label>
            <select id="apptPatientType" name="patientType" required>
              <option value="">-- ধরন নির্বাচন করুন --</option>
              <option value="new">নতুন রোগী</option>
              <option value="old">পুরাতন রোগী</option>
            </select>
            <small class="info-text">০-৯০ দিন পর্যন্ত পুরাতন রোগী হিসেবে গণ্য হবে</small>
          </div>

          <div class="form-group">
            <label for="apptDay">দিন</label>
            <select id="apptDay" name="day" required>
              <option value="">-- দিন নির্বাচন করুন --</option>
              <option value="Thursday">বৃহস্পতিবার</option>
              <option value="Friday">শুক্রবার</option>
            </select>
          </div>

          <div class="form-group">
            <label for="apptTime">সময়</label>
            <select id="apptTime" name="time" required disabled>
              <option value="">-- সময় নির্বাচন করুন --</option>
            </select>
            <small class="info-text">চেম্বারে উপস্থিত থাকার সম্ভাব্য সময়</small>
          </div>

          <div class="serial-section">
            <div class="serial-header">
              <h3>সিরিয়াল নাম্বার নির্বাচন করুন</h3>
              <div class="legend">
                <div class="legend-item"><span class="legend-dot available-dot"></span><span>খালি</span></div>
                <div class="legend-item"><span class="legend-dot pending-dot"></span><span>সিলেক্টেড (অন্য ইউজার)</span></div>
                <div class="legend-item"><span class="legend-dot selected-dot"></span><span>আপনার নির্বাচিত</span></div>
                <div class="legend-item"><span class="legend-dot booked-dot"></span><span>বুকড</span></div>
              </div>
            </div>

            <div class="loading-message" id="apptLoadingMessage">🔄 সিরিয়াল লোড হচ্ছে...</div>
            <div id="apptSerialGrid"></div>
            <div class="no-slots-message" id="apptNoSlotsMessage">⚠️ এই সময়ের জন্য কোনো সিরিয়াল উপলব্ধ নেই।</div>

            <input type="hidden" name="serial" id="apptSerialInput" required>
            <small id="apptSerialError" class="error-msg">অনুগ্রহ করে একটি সিরিয়াল নাম্বার নির্বাচন করুন</small>
          </div>

          <button type="submit" class="submit-btn" id="apptSubmitBtn">সাবমিট করুন</button>
          <div class="helpline">হেল্প লাইন ০১৭৭৭৮৮৮৪৮৯</div>
        </form>
      </div>

      <!-- Sub Popup inside Modal -->
      <div class="appt-sub-popup" id="apptSubPopup" onclick="event.stopPropagation()">
        <div class="appt-sub-box">
          <div class="popup-icon" id="apptSubIcon">⚠️</div>
          <div class="popup-title" id="apptSubTitle">শিরোনাম</div>
          <div class="popup-message" id="apptSubMessage"></div>

          <div class="confirmation-slip" id="apptConfirmationSlip" style="display: none;">
            <div class="slip-header">
              <h3>🏥 ডাঃ মোঃ ওয়াহিদুজ্জামান মাসুম</h3>
              <p>সিরিয়াল কনফার্মেশন স্লিপ</p>
            </div>
            <div class="detail-item"><span class="detail-label">নাম:</span><span class="detail-value" id="apptSlipName">-</span></div>
            <div class="detail-item"><span class="detail-label">বয়স:</span><span class="detail-value" id="apptSlipAge">-</span></div>
            <div class="detail-item"><span class="detail-label">ফোন:</span><span class="detail-value" id="apptSlipPhone">-</span></div>
            <div class="detail-item"><span class="detail-label">ধরন:</span><span class="detail-value" id="apptSlipType">-</span></div>
            <div class="detail-item"><span class="detail-label">দিন:</span><span class="detail-value" id="apptSlipDay">-</span></div>
            <div class="detail-item"><span class="detail-label">সময়:</span><span class="detail-value" id="apptSlipTime">-</span></div>
            <div class="serial-number" id="apptSlipSerial">#০</div>
            <div class="slip-footer">তারিখ ও সময়: <span id="apptSlipDateTime">-</span></div>
          </div>

          <div class="popup-buttons" id="apptSubButtons"></div>

          <div class="download-buttons" id="apptDownloadButtons" style="display: none;">
            <button type="button" class="download-btn" id="apptDownloadPngBtn">📸 PNG ডাউনলোড</button>
            <button type="button" class="download-btn pdf" id="apptDownloadPdfBtn">📄 PDF ডাউনলোড</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(wrapper);
  }

  // প্রয়োজনীয় এক্সটার্নাল স্ক্রিপ্ট (grid.js, html2canvas, jspdf) ডাইনামিক লোড করা
  function ensureDependenciesLoaded() {
    const deps = [];
    if (typeof window.RealTimeGridSystem === 'undefined') {
      deps.push(new Promise((resolve) => {
        const s = document.createElement('script');
        s.src = '/grid.js';
        s.onload = resolve;
        s.onerror = resolve;
        document.head.appendChild(s);
      }));
    }
    if (typeof window.html2canvas === 'undefined') {
      deps.push(new Promise((resolve) => {
        const s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
        s.onload = resolve;
        s.onerror = resolve;
        document.head.appendChild(s);
      }));
    }
    if (!window.jspdf || !window.jspdf.jsPDF) {
      deps.push(new Promise((resolve) => {
        const s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        s.onload = resolve;
        s.onerror = resolve;
        document.head.appendChild(s);
      }));
    }
    return Promise.all(deps);
  }

  let initialized = false;
  let dbInstance = null;
  let gridSystem = null;
  let serialRanges = {};
  let firebaseDisabledSlots = {};
  let appointments = [];
  let currentAppointmentData = null;

  function getDb() {
    if (window.db) return window.db;
    if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length) {
      return firebase.firestore();
    }
    return null;
  }

  function getNextDateByDay(targetDay) {
    const daysMap = {
      Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3,
      Thursday: 4, Friday: 5, Saturday: 6
    };
    const targetDayIndex = daysMap[targetDay];
    const today = new Date();
    const todayIndex = today.getDay();
    let daysToAdd = targetDayIndex - todayIndex;
    if (daysToAdd < 0) daysToAdd += 7;

    const nextDate = new Date(today);
    nextDate.setDate(today.getDate() + daysToAdd);

    const year = nextDate.getFullYear();
    const month = String(nextDate.getMonth() + 1).padStart(2, '0');
    const day = String(nextDate.getDate()).padStart(2, '0');

    const banglaMonths = [
      'জানুয়ারী', 'ফেব্রুয়ারী', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
      'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
    ];
    const banglaDays = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'];

    return {
      date: nextDate,
      dateString: `${year}-${month}-${day}`,
      banglaDate: `${banglaDays[nextDate.getDay()]}, ${nextDate.getDate()} ${banglaMonths[nextDate.getMonth()]} ${year}`,
      isToday: daysToAdd === 0
    };
  }

  function extractTimeNumber(timeStr) {
    if (!timeStr) return 0;
    const time = timeStr.toUpperCase().trim();
    let [timePart, modifier] = time.split(' ');
    if (!modifier) {
      modifier = time.includes('PM') ? 'PM' : time.includes('AM') ? 'AM' : '';
      if (modifier) timePart = time.replace(modifier, '').trim();
    }
    const [hours, minutes] = timePart.split(':').map(Number);
    let hour24 = hours;
    if (modifier === 'PM' && hours !== 12) hour24 = hours + 12;
    else if (modifier === 'AM' && hours === 12) hour24 = 0;
    return hour24 * 100 + (minutes || 0);
  }

  function showSubPopup(type, title, message, options = {}) {
    const subPopup = document.getElementById('apptSubPopup');
    const slipEl = document.getElementById('apptConfirmationSlip');
    const dlBtnsEl = document.getElementById('apptDownloadButtons');
    const btnsEl = document.getElementById('apptSubButtons');

    slipEl.style.display = 'none';
    dlBtnsEl.style.display = 'none';
    btnsEl.innerHTML = '';

    const icons = { warning: '⚠️', error: '❌', success: '✅', info: 'ℹ️', confirm: '❓' };
    document.getElementById('apptSubIcon').textContent = icons[type] || '⚠️';
    document.getElementById('apptSubTitle').textContent = title;
    document.getElementById('apptSubMessage').innerHTML = message;

    if (options.showSlip && currentAppointmentData) {
      document.getElementById('apptSlipName').textContent = currentAppointmentData.name;
      document.getElementById('apptSlipAge').textContent = currentAppointmentData.ageDisplay || '-';
      document.getElementById('apptSlipPhone').textContent = currentAppointmentData.phone;
      document.getElementById('apptSlipType').textContent = currentAppointmentData.patientType === 'new' ? 'নতুন রোগী' : 'পুরাতন রোগী';
      document.getElementById('apptSlipDay').textContent = currentAppointmentData.appointmentDateDisplay;
      document.getElementById('apptSlipTime').textContent = currentAppointmentData.time;
      document.getElementById('apptSlipSerial').textContent = '#' + currentAppointmentData.serial;
      document.getElementById('apptSlipDateTime').textContent = new Date().toLocaleString('bn-BD');
      slipEl.style.display = 'block';
      dlBtnsEl.style.display = 'flex';
    }

    if (options.showConfirm) {
      btnsEl.innerHTML = `
        <button type="button" class="popup-btn success" id="apptConfirmYes">হ্যাঁ</button>
        <button type="button" class="popup-btn cancel" id="apptConfirmNo">না</button>
      `;
      subPopup.classList.add('active');
      return new Promise((resolve) => {
        document.getElementById('apptConfirmYes').onclick = () => {
          subPopup.classList.remove('active');
          resolve(true);
        };
        document.getElementById('apptConfirmNo').onclick = () => {
          subPopup.classList.remove('active');
          resolve(false);
        };
      });
    }

    const okBtn = document.createElement('button');
    okBtn.type = 'button';
    okBtn.className = `popup-btn ${type === 'success' ? 'success' : 'cancel'}`;
    okBtn.textContent = 'ঠিক আছে';
    okBtn.onclick = () => {
      subPopup.classList.remove('active');
      if (type === 'success') {
        resetModalForm();
        closeAppointmentModal();
      }
    };
    btnsEl.appendChild(okBtn);
    subPopup.classList.add('active');
    return Promise.resolve(true);
  }

  function resetModalForm() {
    const form = document.getElementById('apptModalForm');
    if (form) form.reset();
    document.getElementById('apptSerialGrid').innerHTML = '';
    document.getElementById('apptSerialInput').value = '';
    document.getElementById('apptTime').disabled = true;
    document.getElementById('apptTime').innerHTML = '<option value="">-- সময় নির্বাচন করুন --</option>';
    if (gridSystem) {
      gridSystem.currentSelection = null;
      gridSystem.userPendingId = null;
      if (typeof gridSystem.clearSelection === 'function') gridSystem.clearSelection();
    }
    currentAppointmentData = null;
  }

  async function initModalLogic() {
    if (initialized) return;
    initialized = true;

    await ensureDependenciesLoaded();
    dbInstance = getDb();

    const daySelect = document.getElementById('apptDay');
    const typeSelect = document.getElementById('apptPatientType');
    const timeSelect = document.getElementById('apptTime');
    const serialGrid = document.getElementById('apptSerialGrid');
    const serialInput = document.getElementById('apptSerialInput');
    const nameInput = document.getElementById('apptName');
    const phoneInput = document.getElementById('apptPhone');
    const ageYearsInput = document.getElementById('apptAgeYears');
    const ageMonthsInput = document.getElementById('apptAgeMonths');
    const ageDaysInput = document.getElementById('apptAgeDays');
    const submitBtn = document.getElementById('apptSubmitBtn');
    const loadingMsg = document.getElementById('apptLoadingMessage');
    const noSlotsMsg = document.getElementById('apptNoSlotsMessage');

    function normalizeAge() {
      const years = parseInt(ageYearsInput.value) || 0;
      const months = parseInt(ageMonthsInput.value) || 0;
      const days = parseInt(ageDaysInput.value) || 0;

      let dbYears = years;
      let dbMonths = months;
      let dbDays = days;

      if (dbMonths >= 12) {
        dbYears += Math.floor(dbMonths / 12);
        dbMonths = dbMonths % 12;
      }
      if (dbDays >= 30) {
        dbMonths += Math.floor(dbDays / 30);
        dbDays = dbDays % 30;
        if (dbMonths >= 12) {
          dbYears += Math.floor(dbMonths / 12);
          dbMonths = dbMonths % 12;
        }
      }

      const ageErr = document.getElementById('apptAgeError');
      if (years < 0 || months < 0 || days < 0 || (years === 0 && months === 0 && days === 0) || dbYears > 120) {
        ageErr.style.display = 'block';
        return { isValid: false };
      }
      ageErr.style.display = 'none';

      const parts = [];
      if (dbYears > 0) parts.push(`${dbYears} বছর`);
      if (dbMonths > 0) parts.push(`${dbMonths} মাস`);
      if (dbDays > 0) parts.push(`${dbDays} দিন`);

      const inputParts = [];
      if (years > 0) inputParts.push(`${years} বছর`);
      if (months > 0) inputParts.push(`${months} মাস`);
      if (days > 0) inputParts.push(`${days} দিন`);

      return {
        isValid: true,
        dbYears,
        dbMonths,
        dbDays,
        ageDisplay: parts.join(' ') || '০ দিন',
        ageInputText: inputParts.join(' ') || '০ দিন'
      };
    }

    function updateTimeOptions() {
      const day = daySelect.value;
      const type = typeSelect.value;
      const prevTime = timeSelect.value;
      timeSelect.innerHTML = '<option value="">-- সময় নির্বাচন করুন --</option>';

      if (day && type && serialRanges[day] && serialRanges[day][type]) {
        const times = Object.keys(serialRanges[day][type]).sort((a, b) => extractTimeNumber(a) - extractTimeNumber(b));
        const targetDate = getNextDateByDay(day);
        const now = new Date();

        times.forEach((time) => {
          const opt = document.createElement('option');
          opt.value = time;
          opt.textContent = time;

          const slotKey = `${day}_${time}_${type}`;
          if (firebaseDisabledSlots[slotKey] === true) {
            opt.disabled = true;
            opt.textContent += ' (বন্ধ)';
            timeSelect.appendChild(opt);
            return;
          }

          if (targetDate.isToday) {
            const upper = time.toUpperCase().trim();
            const mod = upper.includes('PM') ? 'PM' : upper.includes('AM') ? 'AM' : '';
            const clean = upper.replace(mod, '').trim();
            let [h, m] = clean.split(':').map(Number);
            if (mod === 'PM' && h < 12) h += 12;
            if (mod === 'AM' && h === 12) h = 0;
            const slotDt = new Date();
            slotDt.setHours(h, m || 0, 0, 0);
            if (now > slotDt) {
              opt.disabled = true;
              opt.textContent += ' (এক্সপায়ার্ড)';
              timeSelect.appendChild(opt);
              return;
            }
          }

          const rangeVal = serialRanges[day][type][time];
          let startS = 1, endS = 0;
          if (Array.isArray(rangeVal)) {
            startS = rangeVal[0];
            endS = rangeVal[1];
          } else if (typeof rangeVal === 'string') {
            if (rangeVal.includes('-')) {
              const p = rangeVal.split('-');
              startS = parseInt(p[0]) || 1;
              endS = parseInt(p[p.length - 1]) || 0;
            } else {
              endS = parseInt(rangeVal) || 0;
            }
          }

          const totalSeats = endS >= startS && startS > 0 ? endS - startS + 1 : 999;
          const bookedCount = appointments.filter((app) => {
            const appDate = app.appointmentDate || app.date;
            return app.day === day && (app.patientType || app.type) === type && (app.timeSlot || app.time) === time && appDate === targetDate.dateString;
          }).length;

          if (totalSeats < 999 && bookedCount >= totalSeats) {
            opt.disabled = true;
            opt.textContent += ' (খালি নেই)';
          } else if (totalSeats < 999 && bookedCount > 0) {
            opt.textContent += ` (${totalSeats - bookedCount}টি খালি)`;
          }

          timeSelect.appendChild(opt);
        });

        if (prevTime) timeSelect.value = prevTime;
      }
    }

    function checkDayAvailability() {
      const day = daySelect.value;
      timeSelect.disabled = true;
      timeSelect.innerHTML = '<option value="">-- সময় নির্বাচন করুন --</option>';
      serialGrid.innerHTML = '';
      serialInput.value = '';
      if (!day) return;

      const hasNew = serialRanges[day] && serialRanges[day].new && Object.keys(serialRanges[day].new).length > 0;
      const hasOld = serialRanges[day] && serialRanges[day].old && Object.keys(serialRanges[day].old).length > 0;
      if (hasNew || hasOld) {
        timeSelect.disabled = false;
        updateTimeOptions();
      }
    }

    if (dbInstance) {
      dbInstance.collection('settings').doc('disabledSlots').onSnapshot((doc) => {
        firebaseDisabledSlots = doc.exists ? doc.data() : {};
        if (daySelect.value) updateTimeOptions();
      });

      dbInstance.collection('settings').doc('serialRanges').onSnapshot((doc) => {
        if (doc.exists) {
          serialRanges = doc.data();
          checkDayAvailability();
        }
      });

      if (typeof window.RealTimeGridSystem === 'function') {
        gridSystem = new window.RealTimeGridSystem({
          db: dbInstance,
          gridContainerId: 'apptSerialGrid',
          selectedSerialInputId: 'apptSerialInput',
          dayElementId: 'apptDay',
          timeElementId: 'apptTime',
          typeElementId: 'apptPatientType',
          mode: 'user',
          userPendingExpiry: 60 * 1000,
          onSerialClick(data) {
            if (data.status === 'booked') {
              showSubPopup('error', 'সিরিয়াল বুকড', `এই সিরিয়ালটি ${data.date} তারিখের জন্য ইতিমধ্যে বুক করা হয়েছে`);
            } else if (data.status === 'pending') {
              serialInput.value = data.serial;
              document.getElementById('apptSerialError').style.display = 'none';
            }
          },
          onGridUpdate(type) {
            if (gridSystem && gridSystem.appointments) {
              const list = [];
              Object.values(gridSystem.appointments).forEach((g) => {
                if (Array.isArray(g)) list.push(...g);
              });
              appointments = list;
              if (daySelect.value && typeSelect.value) updateTimeOptions();
            }
            if (type === 'grid') {
              loadingMsg.style.display = 'none';
              const available = serialGrid.querySelectorAll('.serial-item.available').length;
              noSlotsMsg.style.display = available === 0 ? 'block' : 'none';
            }
          }
        });
        await gridSystem.init();
      }
    }

    daySelect.addEventListener('change', checkDayAvailability);
    typeSelect.addEventListener('change', checkDayAvailability);
    timeSelect.addEventListener('change', () => {
      if (gridSystem && timeSelect.value) {
        loadingMsg.style.display = 'block';
        setTimeout(() => gridSystem.updateGrid(), 100);
      }
    });

    document.getElementById('apptDownloadPngBtn').addEventListener('click', async () => {
      if (!currentAppointmentData || typeof window.html2canvas === 'undefined') return;
      const canvas = await window.html2canvas(document.getElementById('apptConfirmationSlip'), { scale: 3, backgroundColor: '#ffffff' });
      const a = document.createElement('a');
      a.download = `appointment-serial-${currentAppointmentData.serial}.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
      setTimeout(() => {
        document.getElementById('apptSubPopup').classList.remove('active');
        resetModalForm();
        closeAppointmentModal();
      }, 900);
    });

    document.getElementById('apptDownloadPdfBtn').addEventListener('click', async () => {
      if (!currentAppointmentData || typeof window.html2canvas === 'undefined' || !window.jspdf) return;
      const canvas = await window.html2canvas(document.getElementById('apptConfirmationSlip'), { scale: 3, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new window.jspdf.jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a6' });
      const w = pdf.internal.pageSize.getWidth();
      const h = (canvas.height * w) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, w, h);
      pdf.save(`appointment-serial-${currentAppointmentData.serial}.pdf`);
      setTimeout(() => {
        document.getElementById('apptSubPopup').classList.remove('active');
        resetModalForm();
        closeAppointmentModal();
      }, 900);
    });

    document.getElementById('apptModalForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!dbInstance) return;

      let valid = true;
      if (!nameInput.value.trim()) {
        document.getElementById('apptNameError').style.display = 'block';
        valid = false;
      } else {
        document.getElementById('apptNameError').style.display = 'none';
      }

      const ageData = normalizeAge();
      if (!ageData.isValid) valid = false;

      if (!/^01[0-9]{9}$/.test(phoneInput.value.trim())) {
        document.getElementById('apptPhoneError').style.display = 'block';
        valid = false;
      } else {
        document.getElementById('apptPhoneError').style.display = 'none';
      }

      if (!serialInput.value) {
        document.getElementById('apptSerialError').style.display = 'block';
        valid = false;
      } else {
        document.getElementById('apptSerialError').style.display = 'none';
      }

      if (!valid) {
        showSubPopup('error', 'ফর্ম ত্রুটি', 'অনুগ্রহ করে ফর্মের সকল তথ্য সঠিকভাবে পূরণ করুন।');
        return;
      }

      const patientName = nameInput.value.trim();
      const selectedPhone = phoneInput.value.trim();
      const selectedDay = daySelect.value;
      const selectedSerial = parseInt(serialInput.value, 10);
      const selectedTime = timeSelect.value;
      const selectedType = typeSelect.value;
      const nextDateInfo = getNextDateByDay(selectedDay);
      const typeText = selectedType === 'new' ? 'নতুন রোগী' : 'পুরাতন রোগী';

      const confirmed = await showSubPopup(
        'confirm',
        'কনফার্মেশন',
        `আপনি কি নিশ্চিত যে সিরিয়াল বুক করতে চান?<br><br>
         • নাম: ${patientName}<br>
         • দিন: ${nextDateInfo.banglaDate}<br>
         • সময়: ${selectedTime}<br>
         • সিরিয়াল: ${selectedSerial} নং<br>
         • ধরন: ${typeText}<br>
         • ফোন: ${selectedPhone}`,
        { showConfirm: true }
      );
      if (!confirmed) return;

      try {
        submitBtn.classList.add('loading');
        submitBtn.disabled = true;
        submitBtn.textContent = 'সাবমিট হচ্ছে...';

        const yymmdd = nextDateInfo.dateString.replace(/-/g, '').slice(2);
        const docId = `${yymmdd}-${String(selectedSerial).padStart(2, '0')}`;
        const subCol = selectedType === 'new' ? 'new' : 'old';

        const docRef = dbInstance.collection('appointments').doc(yymmdd).collection(subCol).doc(docId);
        const dup = await docRef.get();
        if (dup.exists) {
          showSubPopup('error', 'দুঃখিত!', 'এই সিরিয়ালটি এইমাত্র বুক হয়ে গেছে। অন্য সিরিয়াল বেছে নিন।');
          if (gridSystem) gridSystem.updateGrid();
          return;
        }

        const mainDateRef = dbInstance.collection('appointments').doc(yymmdd);
        const mainDateDoc = await mainDateRef.get();
        if (!mainDateDoc.exists) {
          await mainDateRef.set({
            date: nextDateInfo.dateString,
            dateDisplay: nextDateInfo.banglaDate,
            day: selectedDay,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          });
        }

        if (gridSystem && gridSystem.userPendingId) {
          await gridSystem.removePendingSelection(gridSystem.userPendingId);
        }

        const appointmentData = {
          appointmentId: docId,
          name: patientName,
          phone: selectedPhone,
          ageYears: ageData.dbYears,
          ageMonths: ageData.dbMonths,
          ageDays: ageData.dbDays,
          ageString: ageData.ageDisplay,
          ageDisplay: ageData.ageDisplay,
          originalInput: ageData.ageInputText,
          patientType: selectedType,
          day: selectedDay,
          date: nextDateInfo.dateString,
          appointmentDate: nextDateInfo.dateString,
          appointmentDateDisplay: nextDateInfo.banglaDate,
          timeSlot: selectedTime,
          time: selectedTime,
          serial: selectedSerial,
          timestamp: firebase.firestore.FieldValue.serverTimestamp(),
          status: 'confirmed',
          age: ageData.ageDisplay
        };

        await docRef.set(appointmentData);
        currentAppointmentData = appointmentData;

        // SMS Integration
        try {
          const smsMessage = `Dear ${patientName},your Serial No: ${selectedSerial}, Date: ${nextDateInfo.dateString}, Estimated Time: ${selectedTime}. Thank you! For the next serial, visit: https://drmasum.netlify.app/`;
          const apiKey = '74a82f2a949057f0e67fa4b672f75275';
          const sender = '8809617635159';
          const automasUrl = `https://api.automas.com.bd/smsapiv3?apikey=${apiKey}&sender=${sender}&msisdn=${selectedPhone}&smstext=${encodeURIComponent(smsMessage)}`;
          fetch(automasUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
          }).catch(() => {});
        } catch (_) {}

        await showSubPopup(
          'success',
          'অ্যাপয়েন্টমেন্ট সফল হয়েছে!',
          `আপনি চাইলে নিচের থেকে কনফার্মেশন স্লিপ ডাউনলোড করতে পারেন!<br><br>
           <strong>তারিখ:</strong> ${nextDateInfo.banglaDate}<br>
           <strong>সিরিয়াল:</strong> ${selectedSerial} নং`,
          { showSlip: true }
        );
      } catch (err) {
        console.error('Error saving appointment:', err);
        showSubPopup('error', 'ত্রুটি', 'দুঃখিত, ডাটা সেভ করার সময় একটি ত্রুটি হয়েছে।');
      } finally {
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
        submitBtn.textContent = 'সাবমিট করুন';
      }
    });
  }

  window.openAppointmentModal = async function () {
    injectModalStyles();
    createModalDOM();
    const modal = document.getElementById(MODAL_ID);
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    document.getElementById('apptModalCloseBtn').onclick = window.closeAppointmentModal;
    modal.onclick = window.closeAppointmentModal;

    await initModalLogic();
  };

  window.closeAppointmentModal = function () {
    const modal = document.getElementById(MODAL_ID);
    if (!modal) return;
    if (gridSystem && gridSystem.userPendingId) {
      gridSystem.removePendingSelection(gridSystem.userPendingId).catch(() => {});
    }
    modal.classList.remove('active');
    document.body.style.overflow = '';
  };
})();