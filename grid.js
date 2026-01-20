// grid.js - DATE BASED VERSION
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
      enableRealTime: true
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
    
    // স্টেট ম্যানেজমেন্ট
    this.isProcessing = false;
    this.scrollPosition = 0;
    
    console.log(`✅ তারিখ-ভিত্তিক Grid System তৈরি হয়েছে (${this.config.mode} মোড)`);
  }

  // ==================== তারিখ গণনা ফাংশন ====================
getNextDateByDay(targetDay) {
  // targetDay: "Thursday" বা "Friday"
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
  
  // আজকের দিনের ইনডেক্স
  const todayIndex = today.getDay();
  
  // কতদিন পর টার্গেট দিন আসবে
  let daysToAdd = targetDayIndex - todayIndex;
  
  // যদি আজই সেই দিন হয় (daysToAdd === 0), তাহলে আজকের তারিখ দেখাও
  // যদি আগামী সপ্তাহে হয় (daysToAdd < 0), তাহলে ৭ দিন যোগ করো
  // যদি এই সপ্তাহেই হয় (daysToAdd > 0), তাহলে শুধু দিন যোগ করো
  
  if (daysToAdd < 0) {
    daysToAdd += 7;
  }
  
  // daysToAdd === 0 হলে, আজকের তারিখই দেখাবে
  
  const nextDate = new Date(today);
  nextDate.setDate(today.getDate() + daysToAdd);
  
  return {
    date: nextDate,
    dateString: this.formatDate(nextDate),
    displayDate: this.formatDisplayDate(nextDate),
    banglaDate: this.formatBanglaDate(nextDate),
    isToday: daysToAdd === 0 // নতুন ফিল্ড
  };
}


  formatDate(date) {
    // YYYY-MM-DD ফরম্যাট (Firebase sorting এর জন্য)
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
      /* Grid System Styles - তারিখ ভিত্তিক */
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
      
      /* সবুজ - খালি */
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
      
      /* লাল - বুকড */
      .serial-item.booked {
        background-color: #fecaca;
        color: #dc2626;
        border: 2px solid #dc2626;
        cursor: not-allowed;
        opacity: 0.8;
        pointer-events: none;
      }
      
      /* নীল - সিলেক্টেড (অন্য ইউজার) */
      .serial-item.pending {
        background-color: #dbeafe;
        color: #3b82f6;
        border: 2px solid #3b82f6;
        cursor: not-allowed;
        opacity: 0.7;
        pointer-events: none;
      }
      
      /* হলুদ - আপনার নির্বাচিত */
      .serial-item.selected {
        background-color: #fef3c7;
        color: #f59e0b;
        border: 2px solid #f59e0b;
        font-weight: 700;
      }
      
      /* Responsive Design */
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
      
      // শুধুমাত্র ঐ তারিখের অ্যাপয়েন্টমেন্ট লোড
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
      
      // তারিখ ভিত্তিক স্টোরেজ
      const key = `${dateString}_${day}`;
      this.appointments[key] = appointments;
      
      console.log(`✅ ${appointments.length} টি অ্যাপয়েন্টমেন্ট লোড হয়েছে`);
      
    } catch (error) {
      console.error("❌ অ্যাপয়েন্টমেন্ট লোড করতে সমস্যা:", error);
    }
  }

  // ==================== রিয়েল-টাইম লিসেনার ====================
  setupRealtimeListeners() {
    if (!this.config.db) return;
    
    console.log("🔗 তারিখ-ভিত্তিক রিয়েল-টাইম লিসেনার সেটআপ হচ্ছে...");
    
    // সব অ্যাপয়েন্টমেন্টের জন্য লিসেনার (তারিখ ভিত্তিক ফিল্টারিং হবে পরে)
    const appointmentsListener = this.config.db
      .collection(this.config.appointmentsCollection)
      .onSnapshot(snapshot => {
        console.log("🔄 সকল অ্যাপয়েন্টমেন্ট আপডেট পাওয়া গেছে");
        
        // তারিখ ভিত্তিক গ্রুপিং রিসেট
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
        
        console.log(`📊 তারিখ ভিত্তিক গ্রুপিং সম্পন্ন: ${Object.keys(this.appointments).length} টি তারিখ`);
        
        // বর্তমান তারিখের গ্রিড আপডেট
        this.safeUpdateGrid();
        
      }, error => {
        console.error("❌ অ্যাপয়েন্টমেন্ট লিসেনার ত্রুটি:", error);
      });
    
    this.realtimeListeners.push(appointmentsListener);
    
    // পেন্ডিং সিলেকশন লিসেনার
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
        // তারিখ যোগ করুন key তে
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
    
    // বুকড বা পেন্ডিং সিরিয়ালে ক্লিক করবেন না
    if (serialItem.classList.contains('booked') || 
        serialItem.classList.contains('pending')) {
      return;
    }
    
    const serial = parseInt(serialItem.dataset.serial);
    if (isNaN(serial)) return;
    
    console.log(`🎯 সিরিয়াল ${serial} ক্লিক করা হয়েছে`);
    
    this.isProcessing = true;
    
    // ইমিডিয়েট UI আপডেট
    serialItem.classList.remove('available');
    serialItem.classList.add('selected');
    serialItem.style.pointerEvents = 'none';
    
    // সিরিয়াল সিলেক্ট করুন
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
    
    // তারিখ ভিত্তিক অ্যাপয়েন্টমেন্ট চেক
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
    
    // পেন্ডিং সিলেকশন চেক (তারিখ সহ)
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
    
    // পরবর্তী তারিখ বের করুন
    const nextDateInfo = this.getNextDateByDay(day);
    const dateString = nextDateInfo.dateString;
    const displayDate = nextDateInfo.banglaDate;
    
    console.log(`📅 নির্বাচিত: ${day}, পরবর্তী তারিখ: ${dateString} (${displayDate})`);
    
    // ঐ তারিখের অ্যাপয়েন্টমেন্ট লোড করুন
    await this.loadAppointmentsForDate(day, dateString);
    
    const range = this.getSerialRange(day, type, time);
    if (!range) {
      gridContainer.innerHTML = '<div class="grid-no-selection">এই সময়ের জন্য সিরিয়াল উপলব্ধ নেই</div>';
      return;
    }
    
    const [start, end] = range;
    const pendingKey = `${dateString}_${day}_${time}_${type}`;
    const pendingData = this.pendingSelections[pendingKey] || { user: [], admin: [] };
    
    // স্ক্রোল অবস্থান সংরক্ষণ
    const currentScroll = gridContainer.scrollTop;
    
    // রেন্ডারিং শুরু
    gridContainer.innerHTML = '';
    
    // তারিখ হেডার যোগ করুন
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
    
    // স্ক্রোল অবস্থান পুনরুদ্ধার
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
  async selectSerial(serial) {
    console.log(`🎯 সিরিয়াল ${serial} সিলেক্ট করা হচ্ছে...`);
    
    const day = this.getElementValue(this.config.dayElementId);
    const time = this.getElementValue(this.config.timeElementId);
    const type = this.getElementValue(this.config.typeElementId);
    
    if (!day || !time || !type) {
      console.error("❌ সিরিয়াল সিলেক্ট করা যাবে না: দিন/সময়/ধরন নির্বাচন করুন");
      this.isProcessing = false;
      return;
    }
    
    // পরবর্তী তারিখ বের করুন
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
    
    // তারিখ ভিত্তিক অ্যাপয়েন্টমেন্ট চেক
    const key = `${dateString}_${day}`;
    const dayAppointments = this.appointments[key] || [];
    
    const appointment = dayAppointments.find(app => {
      const patientType = app.patientType || app.type;
      return app.time === time &&
             patientType === type &&
             app.serial === serial;
    });
    
    if (appointment) {
      console.log(`❌ সিরিয়াল ${serial} ইতিমধ্যে বুক করা হয়েছে (তারিখ: ${dateString})`);
      
      if (this.config.onSerialClick) {
        this.config.onSerialClick({
          serial,
          day,
          time,
          type,
          date: dateString,
          status: 'booked',
          message: `এই সিরিয়ালটি ${dateString} তারিখের জন্য ইতিমধ্যে বুক করা হয়েছে`
        });
      }
      
      this.isProcessing = false;
      this.updateGrid();
      return;
    }
    
    // আগের পেন্ডিং সিলেকশন রিমুভ
    if (this.userPendingId) {
      await this.removePendingSelection(this.userPendingId);
    }
    
    // নতুন পেন্ডিং সিলেকশন অ্যাড (তারিখ সহ)
    this.userPendingId = await this.addPendingSelection(serial, day, time, type, dateString);
    
    if (this.userPendingId) {
      this.currentSelection = serial;
      this.currentUserPendingSerial = serial;
      
      // সিলেক্টেড ইনপুট আপডেট
      const selectedInput = document.getElementById(this.config.selectedSerialInputId);
      if (selectedInput) {
        selectedInput.value = serial;
        selectedInput.dataset.date = dateString; // তারিখ সংরক্ষণ
      }
      
      console.log(`✅ সিরিয়াল ${serial} সিলেক্ট হয়েছে (তারিখ: ${dateString}), পেন্ডিং ID: ${this.userPendingId}`);
      
      // গ্রিড আপডেট
      this.updateGrid();
      
      // কলব্যাক কল
      if (this.config.onSerialClick) {
        this.config.onSerialClick({
          serial,
          day,
          time,
          type,
          date: dateString,
          status: 'pending',
          pendingId: this.userPendingId,
          message: `সিরিয়াল সফলভাবে নির্বাচিত হয়েছে (তারিখ: ${dateString})`
        });
      }
    }
    
    this.isProcessing = false;
  }

  async addPendingSelection(serial, day, time, type, dateString) {
    if (!this.config.db) {
      console.error("❌ ডাটাবেজ নেই");
      return null;
    }
    
    try {
      const pendingData = {
        serial: serial,
        day: day,
        time: time,
        type: type,
        appointmentDate: dateString, // তারিখ সংরক্ষণ
        bookedBy: this.config.mode,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        expiresAt: new Date(Date.now() + this.config.userPendingExpiry)
      };
      
      const docRef = await this.config.db
        .collection(this.config.pendingSelectionsCollection)
        .add(pendingData);
      
      console.log(`📝 তারিখ-ভিত্তিক পেন্ডিং সিলেকশন অ্যাড করা হয়েছে: ${docRef.id} (তারিখ: ${dateString})`);
      
      this.currentUserPendingSerial = serial;
      
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
      
      this.userPendingId = null;
      this.currentUserPendingSerial = null;
      console.log(`✅ পেন্ডিং সিলেকশন রিমুভ হয়েছে: ${pendingId}`);
      
    } catch (error) {
      console.error("❌ পেন্ডিং সিলেকশন রিমুভ করতে সমস্যা:", error);
    }
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
    
    if (this.userPendingId) {
      this.removePendingSelection(this.userPendingId);
    }
    
    console.log("🧹 তারিখ-ভিত্তিক Grid System ক্লিনআপ সম্পন্ন");
  }
}

// গ্লোবাল এক্সপোর্ড
if (typeof window !== 'undefined') {
  window.RealTimeGridSystem = RealTimeGridSystem;
  console.log("✅ RealTimeGridSystem উইন্ডো অবজেক্টে রেজিস্টার হয়েছে");
}

console.log("📅 তারিখ-ভিত্তিক grid.js লোড সম্পন্ন");