// grid.js - DATE BASED VERSION WITH MULTI-SELECT FOR ADMIN
console.log("📅 তারিখ-ভিত্তিক Grid System লোড হচ্ছে...");

class RealTimeGridSystem {
  constructor(config) {
    console.log("🔧 Grid System Constructor কল হয়েছে");
    
    // ডিফল্ট কনফিগারেশন
    const defaultConfig = {
      firebase: null,
      db: null,
      gridContainerId: 'serialGrid',
      selectedSerialInputId: 'serialInput',
      dayElementId: 'day',
      timeElementId: 'time',
      typeElementId: 'patientType',
      pendingSelectionsCollection: 'pendingSelections',
      appointmentsCollection: 'appointments',
      settingsCollection: 'settings',
      serialRangesDocId: 'serialRanges',
      onSerialClick: null,
      onGridUpdate: null,
      onPendingUpdate: null,
      mode: 'user',
      adminSessionId: null,
      userPendingExpiry: 1 * 60 * 1000, // 1 minute
      adminPendingExpiry: 5 * 60 * 1000, // 5 minutes
      enableRealTime: true,
      multiSelect: false  // ডিফল্ট false (ইউজারের জন্য সিঙ্গেল সিলেক্ট)
    };
    
    this.config = { ...defaultConfig, ...config };
    
    // ডাটা স্টোরেজ
    this.serialRanges = {};
    this.appointments = {}; // তারিখ ভিত্তিক স্টোরেজ
    this.pendingSelections = {};
    this.userPendingId = null;
    this.currentSelection = null;
    this.realtimeListeners = [];
    this.currentUserPendingSerial = null;
    
    // ✅ মাল্টি সিলেক্টের জন্য প্রপার্টি (শুধু অ্যাডমিনের জন্য)
    this.multiSelect = this.config.multiSelect || false;
    this.selectedSerials = []; // [{serial: 5, pendingId: "xxx", date: "2024-01-22"}, ...]
    this.currentPatientIndex = 0; // বর্তমানে কোন রোগীর জন্য সিলেক্ট করছেন
    
    // স্টেট ম্যানেজমেন্ট
    this.isProcessing = false;
    this.scrollPosition = 0;
    
    console.log(`✅ তারিখ-ভিত্তিক Grid System তৈরি হয়েছে (${this.config.mode} মোড, multiSelect: ${this.multiSelect})`);
  }

  // ==================== তারিখ গণনা ফাংশন ====================
  getNextDateByDay(targetDay) {
    const daysMap = {
      "Sunday": 0,
      "Monday": 1,
      "Tuesday": 2,
      "Wednesday": 3,
      "Thursday": 4,
      "Friday": 5,
      "Saturday": 6
    };
    
    const targetDayIndex = daysMap[targetDay];
    const today = new Date();
    const todayIndex = today.getDay();
    
    let daysToAdd = targetDayIndex - todayIndex;
    
    if (daysToAdd < 0) {
      daysToAdd += 7;
    }
    
    const nextDate = new Date(today);
    nextDate.setDate(today.getDate() + daysToAdd);
    
    return {
      date: nextDate,
      dateString: this.formatDate(nextDate),
      displayDate: this.formatDisplayDate(nextDate),
      banglaDate: this.formatBanglaDate(nextDate),
      isToday: daysToAdd === 0
    };
  }

  formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  formatDisplayDate(date) {
    const options = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return date.toLocaleDateString('bn-BD', options);
  }

  formatBanglaDate(date) {
    const banglaMonths = [
      'জানুয়ারী', 'ফেব্রুয়ারী', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
      'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
    ];
    
    const banglaDays = [
      'রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 
      'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'
    ];
    
    const day = date.getDate();
    const month = banglaMonths[date.getMonth()];
    const year = date.getFullYear();
    const dayOfWeek = banglaDays[date.getDay()];
    
    return `${dayOfWeek}, ${day} ${month} ${year}`;
  }

  // ==================== CSS ইনজেকশন ====================
  injectStyles() {
    console.log("🎨 CSS স্টাইল ইনজেক্ট হচ্ছে...");
    
    if (document.getElementById('grid-system-styles')) {
      return;
    }
    
    const style = document.createElement('style');
    style.id = 'grid-system-styles';
    
    const css = `
      .serial-grid {
        display: grid;
        grid-template-columns: repeat(10, 1fr);
        gap: 8px;
        margin: 10px 0;
        padding: 10px;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        max-height: 300px;
        overflow-y: auto;
        background-color: white;
      }
      
      .date-header {
        grid-column: 1 / -1;
        text-align: center;
        font-weight: 700;
        color: #1d4ed8;
        padding: 10px;
        background: linear-gradient(135deg, #dbeafe, #eff6ff);
        border-radius: 8px;
        margin-bottom: 10px;
        border: 2px solid #3b82f6;
        font-size: 15px;
      }
      
      .serial-item {
        padding: 10px;
        border: 2px solid transparent;
        border-radius: 6px;
        text-align: center;
        font-weight: 500;
        font-size: 14px;
        transition: all 0.15s ease;
        user-select: none;
        cursor: pointer;
        min-height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .serial-item.available {
        background-color: #dcfce7;
        color: #16a34a;
        border: 2px solid #16a34a;
      }

      .serial-item.available:hover {
        background-color: #bbf7d0;
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(34, 197, 94, 0.2);
      }
      
      .serial-item.booked {
        background-color: #fecaca;
        color: #dc2626;
        border: 2px solid #dc2626;
        cursor: not-allowed;
        opacity: 0.8;
        pointer-events: none;
      }
      
      .serial-item.pending {
        background-color: #dbeafe;
        color: #3b82f6;
        border: 2px solid #3b82f6;
        cursor: not-allowed;
        opacity: 0.7;
        pointer-events: none;
      }
      
      .serial-item.selected {
        background-color: #fef3c7;
        color: #f59e0b;
        border: 2px solid #f59e0b;
        font-weight: 700;
      }
      
      @media (max-width: 768px) {
        .serial-grid {
          grid-template-columns: repeat(7, 1fr);
          gap: 6px;
          padding: 8px;
        }
        .serial-item {
          padding: 8px;
          font-size: 13px;
          min-height: 36px;
        }
        .date-header {
          font-size: 14px;
          padding: 8px;
        }
      }
      
      @media (max-width: 480px) {
        .serial-grid {
          grid-template-columns: repeat(7, 1fr);
        }
        .serial-item {
          font-size: 12px;
          min-height: 34px;
        }
        .date-header {
          font-size: 13px;
          padding: 6px;
        }
      }
      
      .grid-no-selection {
        grid-column: 1 / -1;
        text-align: center;
        padding: 20px;
        color: #6b7280;
        font-style: italic;
      }
      
      .grid-loading {
        grid-column: 1 / -1;
        text-align: center;
        padding: 30px;
        color: #3b82f6;
      }
    `;
    
    style.textContent = css;
    document.head.appendChild(style);
    console.log("✅ CSS সফলভাবে ইনজেক্ট হয়েছে");
  }

  // ==================== ইনিশিয়ালাইজেশন ====================
  async init() {
    console.log("🚀 তারিখ-ভিত্তিক Grid System ইনিশিয়ালাইজেশন শুরু...");
    
    try {
      this.injectStyles();
      
      if (!this.config.db) {
        throw new Error('Firebase Firestore database is not available');
      }
      
      await this.loadSerialRanges();
      
      if (this.config.enableRealTime) {
        this.setupRealtimeListeners();
      }
      
      this.setupEventDelegation();
      
      console.log("✅ তারিখ-ভিত্তিক Grid System সফলভাবে ইনিশিয়ালাইজ হয়েছে");
      return true;
      
    } catch (error) {
      console.error("❌ Grid System ইনিশিয়ালাইজেশন ব্যর্থ:", error);
      return false;
    }
  }

  // ==================== ডাটা লোডিং ====================
  async loadSerialRanges() {
    if (!this.config.db) return;
    
    try {
      console.log("📊 সিরিয়াল রেঞ্জ লোড হচ্ছে...");
      
      const doc = await this.config.db
        .collection(this.config.settingsCollection)
        .doc(this.config.serialRangesDocId)
        .get();
      
      if (doc.exists) {
        this.serialRanges = doc.data();
        console.log("✅ সিরিয়াল রেঞ্জ লোড হয়েছে");
      } else {
        this.serialRanges = {
          Thursday: { new: {}, old: {} },
          Friday: { new: {}, old: {} }
        };
      }
      
    } catch (error) {
      console.error("❌ সিরিয়াল রেঞ্জ লোড করতে সমস্যা:", error);
    }
  }

  async loadAppointmentsForDate(day, dateString) {
    if (!this.config.db) return;
    
    try {
      console.log(`📅 ${dateString} তারিখের অ্যাপয়েন্টমেন্ট লোড হচ্ছে...`);
      
      const snapshot = await this.config.db
        .collection(this.config.appointmentsCollection)
        .where('appointmentDate', '==', dateString)
        .where('day', '==', day)
        .get();
      
      const appointments = [];
      snapshot.forEach(doc => {
        appointments.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      const key = `${dateString}_${day}`;
      this.appointments[key] = appointments;
      
      console.log(`✅ ${appointments.length} টি অ্যাপয়েন্টমেন্ট লোড হয়েছে`);
      
    } catch (error) {
      console.error("❌ অ্যাপয়েন্টমেন্ট লোড করতে সমস্যা:", error);
    }
  }

// ==================== রিয়েল-টাইম লিসেনার (অপ্টিমাইজড) ====================
  setupRealtimeListeners() {
    if (!this.config.db) return;
    
    console.log("🔗 তারিখ-ভিত্তিক অপ্টিমাইজড রিয়েল-টাইম লিসেনার সেটআপ হচ্ছে...");
    
    // কোটা বাঁচাতে বিগত ৩ দিনের আগের সব ডেটা ফিল্টার আউট করে দিন
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const dateLimitString = this.formatDate(threeDaysAgo);
    
    // প্রথমে আগের কোনো লিসেনার সচল থাকলে তা বন্ধ করুন (মেমোরি লিক ও ডাবল রিড রোধে)
    if (this.realtimeListeners && this.realtimeListeners.length > 0) {
      this.realtimeListeners.forEach(unsub => { if(typeof unsub === 'function') unsub(); });
      this.realtimeListeners = [];
    }

    const appointmentsListener = this.config.db
      .collection(this.config.appointmentsCollection)
      .where('appointmentDate', '>=', dateLimitString) // 🔥 কিলার ফিল্টার: পুরোনো ডেটা রিড হবে না
      .onSnapshot(snapshot => {
        console.log("🔄 শুধুমাত্র একটি নির্দিষ্ট সীমার অ্যাপয়েন্টমেন্ট আপডেট পাওয়া গেছে");
        
        this.appointments = {};
        
        snapshot.forEach(doc => {
          const data = doc.data();
          const dateString = data.appointmentDate || this.getDateStringFromTimestamp(data.timestamp);
          const day = data.day;
          
          if (dateString && day) {
            const key = `${dateString}_${day}`;
            
            if (!this.appointments[key]) {
              this.appointments[key] = [];
            }
            
            this.appointments[key].push({
              id: doc.id,
              ...data
            });
          }
        });
        
        console.log(`📊 ফিল্টার্ড তারিখ ভিত্তিক গ্রুপিং সম্পন্ন: ${Object.keys(this.appointments).length} টি তারিখ`);
        this.safeUpdateGrid();
        
      }, error => {
        console.error("❌ অ্যাপয়েন্টমেন্ট লিসেনার ত্রুটি:", error);
      });
    
    this.realtimeListeners.push(appointmentsListener);
    
    // পেন্ডিং সিলেকশনের জন্য লিসেনার
    const pendingListener = this.config.db
      .collection(this.config.pendingSelectionsCollection)
      .where('expiresAt', '>', new Date())
      .onSnapshot(snapshot => {
        console.log("🔄 পেন্ডিং সিলেকশন আপডেট পাওয়া গেছে");
        
        this.processPendingSelections(snapshot);
        this.safeUpdateGrid();
        
        if (this.config.onPendingUpdate) {
          this.config.onPendingUpdate(this.pendingSelections);
        }
      }, error => {
        console.error("❌ পেন্ডিং সিলেকশন লিসেনার ত্রুটি:", error);
      });
    
    this.realtimeListeners.push(pendingListener);
  }

  getDateStringFromTimestamp(timestamp) {
    try {
      if (!timestamp) return null;
      
      const date = timestamp.toDate 
        ? timestamp.toDate() 
        : new Date(timestamp);
      
      return this.formatDate(date);
    } catch (error) {
      console.error("❌ তারিখ কনভার্ট করতে সমস্যা:", error);
      return null;
    }
  }

  processPendingSelections(snapshot) {
    this.pendingSelections = {};
    const now = new Date();
    
    snapshot.forEach(doc => {
      const data = doc.data();
      
      if (data.expiresAt && data.expiresAt.toDate() > now) {
        const dateString = data.appointmentDate || this.getDateStringFromTimestamp(data.timestamp);
        const key = `${dateString}_${data.day}_${data.time}_${data.type}`;
        
        if (!this.pendingSelections[key]) {
          this.pendingSelections[key] = {
            user: [],
            admin: []
          };
        }
        
        if (data.bookedBy === 'user') {
          this.pendingSelections[key].user.push({
            serial: data.serial,
            id: doc.id,
            expiresAt: data.expiresAt
          });
          
          if (doc.id === this.userPendingId) {
            this.currentUserPendingSerial = data.serial;
          }
        } else if (data.bookedBy === 'admin') {
          this.pendingSelections[key].admin.push({
            serial: data.serial,
            id: doc.id,
            adminId: data.adminId,
            expiresAt: data.expiresAt
          });
        }
      }
    });
  }

  // ==================== ইভেন্ট হ্যান্ডলিং ====================
  setupEventDelegation() {
    const gridContainer = document.getElementById(this.config.gridContainerId);
    if (!gridContainer) return;
    
    gridContainer.removeEventListener('click', this.handleGridClick);
    
    this.handleGridClick = this.handleGridClick.bind(this);
    gridContainer.addEventListener('click', this.handleGridClick);
    
    console.log("🎯 ইভেন্ট ডেলিগেশন সেটআপ সম্পন্ন");
  }

  handleGridClick(event) {
    if (this.isProcessing) return;
    
    const serialItem = event.target.closest('.serial-item');
    if (!serialItem) return;
    
    if (serialItem.classList.contains('booked') || 
        serialItem.classList.contains('pending')) {
      return;
    }
    
    const serial = parseInt(serialItem.dataset.serial);
    if (isNaN(serial)) return;
    
    console.log(`🎯 সিরিয়াল ${serial} ক্লিক করা হয়েছে`);
    
    this.isProcessing = true;
    
    serialItem.classList.remove('available');
    serialItem.classList.add('selected');
    serialItem.style.pointerEvents = 'none';
    
    this.selectSerial(serial).finally(() => {
      this.isProcessing = false;
    });
    
    event.stopPropagation();
    return false;
  }

  // ==================== ইউটিলিটি ফাংশন ====================
  getElementValue(elementId) {
    const element = document.getElementById(elementId);
    return element ? element.value : null;
  }

  getSerialRange(day, type, time) {
    if (this.serialRanges[day] && 
        this.serialRanges[day][type] && 
        this.serialRanges[day][type][time]) {
      return this.serialRanges[day][type][time];
    }
    return null;
  }

  getSerialStatus(serial, day, time, type, dateString, pendingData) {
    const status = {
      isBooked: false,
      isOtherUserPending: false,
      isCurrentUserPending: false,
      isAdminPending: false,
      isCurrentAdminPending: false
    };
    
    const key = `${dateString}_${day}`;
    const dayAppointments = this.appointments[key] || [];
    
    const appointment = dayAppointments.find(app => {
      const patientType = app.patientType || app.type;
      return app.time === time &&
             patientType === type &&
             app.serial === serial;
    });
    
    if (appointment) {
      status.isBooked = true;
    }
    
    if (!status.isBooked) {
      const pendingKey = `${dateString}_${day}_${time}_${type}`;
      const pendingForSlot = this.pendingSelections[pendingKey] || { user: [], admin: [] };
      
      if (this.currentUserPendingSerial === serial) {
        status.isCurrentUserPending = true;
      } 
      else if (pendingForSlot.user && pendingForSlot.user.some(p => p.serial === serial)) {
        status.isOtherUserPending = true;
      }
      
      if (pendingForSlot.admin && pendingForSlot.admin.some(p => p.serial === serial)) {
        status.isAdminPending = true;
        
        if (this.config.mode === 'admin') {
          const adminPending = pendingForSlot.admin.find(p => p.serial === serial);
          if (adminPending && adminPending.adminId === this.config.adminSessionId) {
            status.isCurrentAdminPending = true;
          }
        }
      }
    }
    
    return status;
  }

// ==================== গ্রিড রেন্ডারিং ====================
  safeUpdateGrid() {
    if (this.isProcessing) {
      setTimeout(() => this.safeUpdateGrid(), 100);
      return;
    }
    this.updateGrid();
  }

  async updateGrid() {
    if (this.isProcessing) return;
    
    console.log("🎯 তারিখ-ভিত্তিক গ্রিড আপডেট হচ্ছে...");
    
    const gridContainer = document.getElementById(this.config.gridContainerId);
    if (!gridContainer) {
      console.error(`❌ গ্রিড কনটেইনার পাওয়া যায়নি: ${this.config.gridContainerId}`);
      return;
    }
    
    const day = this.getElementValue(this.config.dayElementId);
    const time = this.getElementValue(this.config.timeElementId);
    const type = this.getElementValue(this.config.typeElementId);
    
    if (!day || !time || !type) {
      gridContainer.innerHTML = '<div class="grid-no-selection">দিন, সময় এবং ধরন নির্বাচন করুন</div>';
      return;
    }
    
    const nextDateInfo = this.getNextDateByDay(day);
    const dateString = nextDateInfo.dateString;
    const displayDate = nextDateInfo.banglaDate;
    
    console.log(`📅 নির্বাচিত: ${day}, পরবর্তী তারিখ: ${dateString} (${displayDate})`);
    
    await this.loadAppointmentsForDate(day, dateString);
    
    const range = this.getSerialRange(day, type, time);
    if (!range) {
      gridContainer.innerHTML = '<div class="grid-no-selection">এই সময়ের জন্য সিরিয়াল উপলব্ধ নেই</div>';
      return;
    }
    
    // ✅ সুরক্ষিত রেঞ্জ পার্সিং (ভেরিয়েবল বাইরে ডিক্লেয়ার করুন)
    let start, end;
    
    if (Array.isArray(range)) {
      [start, end] = range;
      console.log('Range (array):', start, end);
    } else if (typeof range === 'string') {
      if (range.includes('-')) {
        const parts = range.split('-');
        start = parseInt(parts[0]);
        end = parseInt(parts[1]);
      } else if (range.includes(',')) {
        const parts = range.split(',');
        start = parseInt(parts[0]);
        end = parseInt(parts[1]);
      } else {
        start = 1;
        end = parseInt(range);
      }
      console.log('Range (string):', start, end);
    } else {
      console.error('Invalid range format:', range);
      gridContainer.innerHTML = '<div class="grid-no-selection">সিরিয়াল রেঞ্জ ফরম্যাট সঠিক নয়</div>';
      return;
    }
    
    // ✅ start/end চেক করুন
    if (isNaN(start) || isNaN(end) || start > end) {
      console.error('Invalid range values:', start, end);
      gridContainer.innerHTML = '<div class="grid-no-selection">সিরিয়াল রেঞ্জ সঠিক নয়</div>';
      return;
    }
    
    console.log(`📊 সিরিয়াল রেঞ্জ: ${start} - ${end}, মোট: ${end - start + 1} টি`);
    
    const pendingKey = `${dateString}_${day}_${time}_${type}`;
    const pendingData = this.pendingSelections[pendingKey] || { user: [], admin: [] };
    
    const currentScroll = gridContainer.scrollTop;
    
    gridContainer.innerHTML = '';
    
    const dateHeader = document.createElement('div');
    dateHeader.className = 'date-header';
    dateHeader.textContent = `📅 অ্যাপয়েন্টমেন্ট তারিখ: ${displayDate}`;
    gridContainer.appendChild(dateHeader);
    
    for (let serial = start; serial <= end; serial++) {
      const serialItem = document.createElement('div');
      serialItem.className = 'serial-item';
      serialItem.textContent = serial;
      serialItem.dataset.serial = serial;
      serialItem.dataset.date = dateString;
      serialItem.setAttribute('tabindex', '-1');
      
      const status = this.getSerialStatus(serial, day, time, type, dateString, pendingData);
      
      if (status.isBooked) {
        serialItem.classList.add('booked');
      }
      else if (this.multiSelect && this.selectedSerials.some(s => s.serial === serial)) {
        serialItem.classList.add('selected');
      }
      else if (status.isCurrentUserPending || status.isCurrentAdminPending) {
        serialItem.classList.add('selected');
      }
      else if (status.isOtherUserPending || status.isAdminPending) {
        serialItem.classList.add('pending');
      }
      else {
        serialItem.classList.add('available');
      }
      
      gridContainer.appendChild(serialItem);
    }
    
    requestAnimationFrame(() => {
      gridContainer.scrollTop = currentScroll;
    });
    
    console.log(`✅ তারিখ-ভিত্তিক গ্রিড আপডেট হয়েছে: ${dateString}, ${end - start + 1} টি সিরিয়াল`);
    
    if (this.config.onGridUpdate) {
      this.config.onGridUpdate('grid', { 
        day, 
        time, 
        type, 
        start, 
        end, 
        date: dateString,
        displayDate: displayDate 
      });
    }
  }

  // ==================== সিরিয়াল সিলেকশন ====================
  async addPendingSelection(serial, day, time, type, dateString) {
    if (!this.config.db) {
      console.error("❌ ডাটাবেজ নেই");
      return null;
    }
    
    try {
      const expiryTime = this.config.mode === 'admin' 
        ? this.config.adminPendingExpiry 
        : this.config.userPendingExpiry;
      
      const pendingData = {
        serial: serial,
        day: day,
        time: time,
        type: type,
        appointmentDate: dateString,
        bookedBy: this.config.mode,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        expiresAt: new Date(Date.now() + expiryTime)
      };
      
      // ✅ অ্যাডমিন মোডে adminId যোগ করুন
      if (this.config.mode === 'admin' && this.config.adminSessionId) {
        pendingData.adminId = this.config.adminSessionId;
      }
      
      const docRef = await this.config.db
        .collection(this.config.pendingSelectionsCollection)
        .add(pendingData);
      
      console.log(`📝 পেন্ডিং সিলেকশন অ্যাড করা হয়েছে: ${docRef.id} (${this.config.mode} মোড)`);
      
      return docRef.id;
      
    } catch (error) {
      console.error("❌ পেন্ডিং সিলেকশন অ্যাড করতে সমস্যা:", error);
      return null;
    }
  }

  async removePendingSelection(pendingId) {
    if (!this.config.db || !pendingId) return;
    
    try {
      await this.config.db
        .collection(this.config.pendingSelectionsCollection)
        .doc(pendingId)
        .delete();
      
      console.log(`✅ পেন্ডিং সিলেকশন রিমুভ হয়েছে: ${pendingId}`);
      
    } catch (error) {
      console.error("❌ পেন্ডিং সিলেকশন রিমুভ করতে সমস্যা:", error);
    }
  }

  async selectSerial(serial) {
    console.log(`🎯 সিরিয়াল ${serial} সিলেক্ট করা হচ্ছে... (multiSelect: ${this.multiSelect})`);
    
    const day = this.getElementValue(this.config.dayElementId);
    const time = this.getElementValue(this.config.timeElementId);
    const type = this.getElementValue(this.config.typeElementId);
    
    if (!day || !time || !type) {
      console.error("❌ সিরিয়াল সিলেক্ট করা যাবে না: দিন/সময়/ধরন নির্বাচন করুন");
      this.isProcessing = false;
      return;
    }
    
    const nextDateInfo = this.getNextDateByDay(day);
    const dateString = nextDateInfo.dateString;
    
    const range = this.getSerialRange(day, type, time);
    if (!range) {
      console.error("❌ সিরিয়াল রেঞ্জ নেই");
      this.isProcessing = false;
      return;
    }
    
    const [start, end] = range;
    if (serial < start || serial > end) {
      console.error(`❌ সিরিয়াল ${serial} রেঞ্জের বাইরে (${start}-${end})`);
      this.isProcessing = false;
      return;
    }
    
    const key = `${dateString}_${day}`;
    const dayAppointments = this.appointments[key] || [];
    
    const appointment = dayAppointments.find(app => {
      const patientType = app.patientType || app.type;
      return app.time === time &&
             patientType === type &&
             app.serial === serial;
    });
    
    if (appointment) {
      console.log(`❌ সিরিয়াল ${serial} ইতিমধ্যে বুক করা হয়েছে`);
      if (this.config.onSerialClick) {
        this.config.onSerialClick({ serial, status: 'booked', date: dateString });
      }
      this.isProcessing = false;
      this.updateGrid();
      return;
    }
    
    // ========== 🔥 মাল্টি সিলেক্ট মোড (শুধু অ্যাডমিনের জন্য) ==========
    if (this.multiSelect === true) {
      const existingIndex = this.selectedSerials.findIndex(s => s.serial === serial);
      
      if (existingIndex !== -1) {
        // ইতিমধ্যে সিলেক্ট করা আছে → আনসিলেক্ট করুন
        const pendingIdToRemove = this.selectedSerials[existingIndex].pendingId;
        if (pendingIdToRemove) {
          await this.removePendingSelection(pendingIdToRemove);
        }
        this.selectedSerials.splice(existingIndex, 1);
        console.log(`🔓 সিরিয়াল ${serial} আনসিলেক্ট করা হয়েছে`);
        
        const serialElement = document.querySelector(`.serial-item[data-serial="${serial}"]`);
        if (serialElement) {
          serialElement.classList.remove('selected');
          serialElement.classList.add('available');
        }
        
        const selectedInput = document.getElementById(this.config.selectedSerialInputId);
        if (selectedInput) {
          selectedInput.value = JSON.stringify(this.selectedSerials.map(s => s.serial));
        }
        
        if (this.config.onSerialClick) {
          this.config.onSerialClick({
            serial,
            status: 'unselected',
            date: dateString,
            allSelected: this.selectedSerials.map(s => s.serial),
            patientIndex: this.currentPatientIndex
          });
        }
        
      } else {
        // নতুন সিরিয়াল সিলেক্ট করুন
        const pendingKey = `${dateString}_${day}_${time}_${type}`;
        const pendingData = this.pendingSelections[pendingKey] || { user: [], admin: [] };
        
        const isPending = pendingData.user.some(p => p.serial === serial) || 
                          pendingData.admin.some(p => p.serial === serial);
        
        if (isPending) {
          console.log(`⚠️ সিরিয়াল ${serial} অন্য কেউ সিলেক্ট করেছেন`);
          if (this.config.onSerialClick) {
            this.config.onSerialClick({ serial, status: 'pending', date: dateString });
          }
          this.isProcessing = false;
          this.updateGrid();
          return;
        }
        
        const pendingId = await this.addPendingSelection(serial, day, time, type, dateString);
        
        if (pendingId) {
          this.selectedSerials.push({ 
            serial, 
            pendingId: pendingId,
            date: dateString,
            patientIndex: this.currentPatientIndex
          });
          
          console.log(`✅ সিরিয়াল ${serial} সিলেক্ট হয়েছে (মোট: ${this.selectedSerials.length} টি)`);
          
          const selectedInput = document.getElementById(this.config.selectedSerialInputId);
          if (selectedInput) {
            selectedInput.value = JSON.stringify(this.selectedSerials.map(s => s.serial));
          }
          
          if (this.config.onSerialClick) {
            this.config.onSerialClick({
              serial,
              status: 'selected',
              date: dateString,
              allSelected: this.selectedSerials.map(s => s.serial),
              totalCount: this.selectedSerials.length,
              patientIndex: this.currentPatientIndex
            });
          }
        }
      }
      
      this.isProcessing = false;
      this.updateGrid();
      return;
    }
    
    // ========== সিঙ্গেল সিলেক্ট মোড (ইউজারের জন্য) ==========
    if (this.userPendingId) {
      await this.removePendingSelection(this.userPendingId);
    }
    
    const pendingId = await this.addPendingSelection(serial, day, time, type, dateString);
    
    if (pendingId) {
      this.userPendingId = pendingId;
      this.currentSelection = serial;
      this.currentUserPendingSerial = serial;
      
      const selectedInput = document.getElementById(this.config.selectedSerialInputId);
      if (selectedInput) {
        selectedInput.value = serial;
        selectedInput.dataset.date = dateString;
      }
      
      console.log(`✅ সিরিয়াল ${serial} সিলেক্ট হয়েছে`);
      
      if (this.config.onSerialClick) {
        this.config.onSerialClick({ serial, status: 'pending', pendingId, date: dateString });
      }
    }
    
    this.isProcessing = false;
    this.updateGrid();
  }

  // ==================== মাল্টি সিলেক্টের জন্য হেল্পার ফাংশন ====================
  getSelectedSerials() {
    return this.selectedSerials.map(s => s.serial);
  }
  
  getAllSelectedSerialsWithDetails() {
    return [...this.selectedSerials];
  }
  
  clearAllSelections() {
    // সব পেন্ডিং সিলেকশন রিমুভ
    this.selectedSerials.forEach(async (selected) => {
      if (selected.pendingId) {
        await this.removePendingSelection(selected.pendingId);
      }
    });
    this.selectedSerials = [];
    
    const selectedInput = document.getElementById(this.config.selectedSerialInputId);
    if (selectedInput) {
      selectedInput.value = '';
    }
    
    this.updateGrid();
    console.log(`🗑️ সব সিলেকশন ক্লিয়ার করা হয়েছে`);
  }
  
  setCurrentPatientIndex(index) {
    this.currentPatientIndex = index;
    console.log(`👤 বর্তমান রোগী সেট করা হয়েছে: ${index}`);
  }
  
  getSerialsForPatient(patientIndex) {
    return this.selectedSerials
      .filter(s => s.patientIndex === patientIndex)
      .map(s => s.serial);
  }

  // ==================== ক্লিনআপ ====================
  cleanup() {
    this.realtimeListeners.forEach(unsubscribe => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    });
    
    const gridContainer = document.getElementById(this.config.gridContainerId);
    if (gridContainer) {
      gridContainer.removeEventListener('click', this.handleGridClick);
    }
    
    // মাল্টি সিলেক্টের সব পেন্ডিং রিমুভ
    if (this.multiSelect && this.selectedSerials.length > 0) {
      this.selectedSerials.forEach(async (selected) => {
        if (selected.pendingId) {
          await this.removePendingSelection(selected.pendingId);
        }
      });
    }
    
    if (this.userPendingId) {
      this.removePendingSelection(this.userPendingId);
    }
    
    console.log("🧹 তারিখ-ভিত্তিক Grid System ক্লিনআপ সম্পন্ন");
  }
}

// গ্লোবাল এক্সপোর্ট
if (typeof window !== 'undefined') {
  window.RealTimeGridSystem = RealTimeGridSystem;
  console.log("✅ RealTimeGridSystem উইন্ডো অবজেক্টে রেজিস্টার হয়েছে");
}

console.log("📅 তারিখ-ভিত্তিক grid.js লোড সম্পন্ন");