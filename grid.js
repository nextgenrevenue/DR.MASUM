// grid.js - SCROLL FIXED VERSION
console.log("📦 grid.js লোড হচ্ছে...");

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
    this.appointments = [];
    this.pendingSelections = {};
    this.userPendingId = null;
    this.currentSelection = null;
    this.realtimeListeners = [];
    this.currentUserPendingSerial = null;
    
    // স্টেট ম্যানেজমেন্ট
    this.isProcessing = false;
    this.scrollPosition = 0;
    
    console.log(`✅ Grid System তৈরি হয়েছে (${this.config.mode} মোড)`);
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
      /* Grid System Styles - NO SCROLL JUMP */
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
        overscroll-behavior: none; /* ✅ স্ক্রোল ঝাঁকুনি প্রতিরোধ */
        -webkit-overflow-scrolling: auto;
        scroll-behavior: auto; /* ✅ স্ক্রোল অ্যানিমেশন বন্ধ */
        will-change: contents; /* ✅ পারফরম্যান্স অপ্টিমাইজেশন */
        contain: layout style paint; /* ✅ রেন্ডারিং অপ্টিমাইজেশন */
      }
      
      .serial-grid::-webkit-scrollbar {
        width: 6px;
      }
      
      .serial-grid::-webkit-scrollbar-track {
        background: #f1f1f1;
      }
      
      .serial-grid::-webkit-scrollbar-thumb {
        background: #c1c1c1;
        border-radius: 3px;
      }
      
      .serial-item {
        padding: 10px;
        border: 2px solid transparent;
        border-radius: 6px;
        text-align: center;
        font-weight: 500;
        font-size: 14px;
        transition: background-color 0.15s ease, border-color 0.15s ease; /* ✅ শুধু রং পরিবর্তন */
        user-select: none;
        cursor: pointer;
        min-height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        outline: none;
        -webkit-tap-highlight-color: transparent;
        touch-action: pan-y; /* ✅ ভার্টিকাল স্ক্রোলের জন্য */
        will-change: background-color, border-color; /* ✅ শুধু প্রয়োজনীয় প্রপার্টি */
      }
      
      /* সকল ফোকাস স্টেট রিমুভ */
      .serial-item:focus,
      .serial-item:active {
        outline: none !important;
        box-shadow: none !important;
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
      }
      
      @media (max-width: 480px) {
        .serial-grid {
          grid-template-columns: repeat(7, 1fr);
        }
        
        .serial-item {
          font-size: 12px;
          min-height: 34px;
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
    console.log("🚀 Grid System ইনিশিয়ালাইজেশন শুরু...");
    
    try {
      this.injectStyles();
      
      if (!this.config.db) {
        throw new Error('Firebase Firestore database is not available');
      }
      
      await this.loadSerialRanges();
      await this.loadAppointments();
      
      if (this.config.enableRealTime) {
        this.setupRealtimeListeners();
      }
      
      this.setupEventDelegation();
      
      console.log("✅ Grid System সফলভাবে ইনিশিয়ালাইজ হয়েছে");
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

  async loadAppointments() {
    if (!this.config.db) return;
    
    try {
      console.log("📅 অ্যাপয়েন্টমেন্ট লোড হচ্ছে...");
      
      const fourDaysAgo = new Date();
      fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);
      
      const snapshot = await this.config.db
        .collection(this.config.appointmentsCollection)
        .where('timestamp', '>=', fourDaysAgo)
        .get();
      
      this.appointments = [];
      snapshot.forEach(doc => {
        this.appointments.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      console.log(`✅ ${this.appointments.length} টি অ্যাপয়েন্টমেন্ট লোড হয়েছে (৪ দিনের মধ্যে)`);
      
    } catch (error) {
      console.error("❌ অ্যাপয়েন্টমেন্ট লোড করতে সমস্যা:", error);
    }
  }

  // ==================== রিয়েল-টাইম লিসেনার ====================
  setupRealtimeListeners() {
    if (!this.config.db) return;
    
    console.log("🔗 রিয়েল-টাইম লিসেনার সেটআপ হচ্ছে...");
    
    const fourDaysAgo = new Date();
    fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);
    
    // অ্যাপয়েন্টমেন্ট লিসেনার
    const appointmentsListener = this.config.db
      .collection(this.config.appointmentsCollection)
      .where('timestamp', '>=', fourDaysAgo)
      .onSnapshot(snapshot => {
        console.log("🔄 অ্যাপয়েন্টমেন্ট আপডেট পাওয়া গেছে");
        
        this.appointments = [];
        snapshot.forEach(doc => {
          this.appointments.push({
            id: doc.id,
            ...doc.data()
          });
        });
        
        this.safeUpdateGrid();
        
        if (this.config.onGridUpdate) {
          this.config.onGridUpdate('appointments', {
            count: this.appointments.length,
            data: this.appointments
          });
        }
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

  processPendingSelections(snapshot) {
    this.pendingSelections = {};
    const now = new Date();
    
    snapshot.forEach(doc => {
      const data = doc.data();
      
      if (data.expiresAt && data.expiresAt.toDate() > now) {
        const key = `${data.day}_${data.time}_${data.type}`;
        
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
    
    // পুরানো ইভেন্ট রিমুভ
    gridContainer.removeEventListener('click', this.handleGridClick);
    
    // নতুন ইভেন্ট যোগ - সঠিক বাইন্ডিং
    this.handleGridClick = this.handleGridClick.bind(this);
    gridContainer.addEventListener('click', this.handleGridClick);
    
    // ✅ টাচ ইভেন্টের জন্য অতিরিক্ত হ্যান্ডলার
    gridContainer.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true });
    gridContainer.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: true });
    
    console.log("🎯 ইভেন্ট ডেলিগেশন সেটআপ সম্পন্ন");
  }

  handleTouchStart(e) {
    // শুধুমাত্র টাচের শুরু ট্র্যাক রাখি
    this.touchStartY = e.touches[0].clientY;
  }

  handleTouchMove(e) {
    // টাচ মুভ ইভেন্টে কোনো একশন নেওয়া হচ্ছে না
    // শুধুমাত্র স্ক্রোল হতে দিচ্ছি
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
    
    // ✅ স্ক্রোল অবস্থান সংরক্ষণ
    const gridContainer = document.getElementById(this.config.gridContainerId);
    this.scrollPosition = gridContainer.scrollTop;
    
    // ✅ প্রসেসিং শুরু
    this.isProcessing = true;
    
    // ✅ ইমিডিয়েট UI আপডেট (রঙ পরিবর্তন)
    serialItem.classList.remove('available');
    serialItem.classList.add('selected');
    serialItem.style.pointerEvents = 'none';
    
    // ✅ সিরিয়াল সিলেক্ট করুন (অ্যাসিঙ্ক্রোনাস)
    this.selectSerial(serial).finally(() => {
      this.isProcessing = false;
    });
    
    // ✅ ইভেন্ট propagation বন্ধ করুন
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

  getSerialStatus(serial, day, time, type, pendingData) {
    const status = {
      isBooked: false,
      isOtherUserPending: false,
      isCurrentUserPending: false,
      isAdminPending: false,
      isCurrentAdminPending: false
    };
    
    // চেক করা বুকড কিনা
    const appointment = this.appointments.find(app => {
      const patientType = app.patientType || app.type;
      return app.day === day &&
             app.time === time &&
             patientType === type &&
             app.serial === serial;
    });
    
    if (appointment) {
      if (appointment.timestamp && appointment.timestamp.toDate) {
        const appointmentDate = appointment.timestamp.toDate();
        const fourDaysAgo = new Date();
        fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);
        
        if (appointmentDate >= fourDaysAgo) {
          status.isBooked = true;
        }
      } else {
        status.isBooked = true;
      }
    }
    
    // পেন্ডিং সিলেকশন চেক
    if (!status.isBooked) {
      if (this.currentUserPendingSerial === serial) {
        status.isCurrentUserPending = true;
      } 
      else if (pendingData.user && pendingData.user.some(p => p.serial === serial)) {
        status.isOtherUserPending = true;
      }
      
      if (pendingData.admin && pendingData.admin.some(p => p.serial === serial)) {
        status.isAdminPending = true;
        
        if (this.config.mode === 'admin') {
          const adminPending = pendingData.admin.find(p => p.serial === serial);
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

  updateGrid() {
    if (this.isProcessing) return;
    
    console.log("🎯 গ্রিড আপডেট হচ্ছে...");
    
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
    
    const range = this.getSerialRange(day, type, time);
    if (!range) {
      gridContainer.innerHTML = '<div class="grid-no-selection">এই সময়ের জন্য সিরিয়াল উপলব্ধ নেই</div>';
      return;
    }
    
    const [start, end] = range;
    const key = `${day}_${time}_${type}`;
    const pendingData = this.pendingSelections[key] || { user: [], admin: [] };
    
    // ✅ স্ক্রোল অবস্থান সংরক্ষণ
    const currentScroll = gridContainer.scrollTop;
    
    // ✅ রেন্ডারিং শুরু
    gridContainer.innerHTML = '';
    
    for (let serial = start; serial <= end; serial++) {
      const serialItem = document.createElement('div');
      serialItem.className = 'serial-item';
      serialItem.textContent = serial;
      serialItem.dataset.serial = serial;
      serialItem.setAttribute('tabindex', '-1');
      
      const status = this.getSerialStatus(serial, day, time, type, pendingData);
      
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
    
    // ✅ স্ক্রোল অবস্থান পুনরুদ্ধার
    requestAnimationFrame(() => {
      gridContainer.scrollTop = currentScroll;
    });
    
    console.log(`✅ গ্রিড আপডেট হয়েছে: ${end - start + 1} টি সিরিয়াল`);
    
    if (this.config.onGridUpdate) {
      this.config.onGridUpdate('grid', { day, time, type, start, end });
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
    
    const appointment = this.appointments.find(app => {
      const patientType = app.patientType || app.type;
      return app.day === day &&
             app.time === time &&
             patientType === type &&
             app.serial === serial;
    });
    
    if (appointment) {
      let isExpired = false;
      if (appointment.timestamp && appointment.timestamp.toDate) {
        const appointmentDate = appointment.timestamp.toDate();
        const fourDaysAgo = new Date();
        fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);
        
        if (appointmentDate < fourDaysAgo) {
          isExpired = true;
        }
      }
      
      if (!isExpired) {
        console.log(`❌ সিরিয়াল ${serial} ইতিমধ্যে বুক করা হয়েছে`);
        
        if (this.config.onSerialClick) {
          this.config.onSerialClick({
            serial,
            day,
            time,
            type,
            status: 'booked',
            message: 'এই সিরিয়ালটি ইতিমধ্যে বুক করা হয়েছে'
          });
        }
        
        this.isProcessing = false;
        this.updateGrid();
        return;
      }
    }
    
    // আগের পেন্ডিং সিলেকশন রিমুভ
    if (this.userPendingId) {
      await this.removePendingSelection(this.userPendingId);
    }
    
    // নতুন পেন্ডিং সিলেকশন অ্যাড
    this.userPendingId = await this.addPendingSelection(serial, day, time, type);
    
    if (this.userPendingId) {
      this.currentSelection = serial;
      this.currentUserPendingSerial = serial;
      
      // সিলেক্টেড ইনপুট আপডেট
      const selectedInput = document.getElementById(this.config.selectedSerialInputId);
      if (selectedInput) {
        selectedInput.value = serial;
      }
      
      console.log(`✅ সিরিয়াল ${serial} সিলেক্ট হয়েছে, পেন্ডিং ID: ${this.userPendingId}`);
      
      // গ্রিড আপডেট
      this.updateGrid();
      
      // কলব্যাক কল
      if (this.config.onSerialClick) {
        this.config.onSerialClick({
          serial,
          day,
          time,
          type,
          status: 'pending',
          pendingId: this.userPendingId,
          message: 'সিরিয়াল সফলভাবে নির্বাচিত হয়েছে'
        });
      }
    }
    
    this.isProcessing = false;
  }

  async addPendingSelection(serial, day, time, type) {
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
        bookedBy: this.config.mode,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        expiresAt: new Date(Date.now() + this.config.userPendingExpiry)
      };
      
      const docRef = await this.config.db
        .collection(this.config.pendingSelectionsCollection)
        .add(pendingData);
      
      console.log(`📝 পেন্ডিং সিলেকশন অ্যাড করা হয়েছে: ${docRef.id}`);
      
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
      gridContainer.removeEventListener('touchstart', this.handleTouchStart);
      gridContainer.removeEventListener('touchmove', this.handleTouchMove);
    }
    
    if (this.userPendingId) {
      this.removePendingSelection(this.userPendingId);
    }
    
    console.log("🧹 Grid System ক্লিনআপ সম্পন্ন");
  }
}

// গ্লোবাল এক্সপোর্ড
if (typeof window !== 'undefined') {
  window.RealTimeGridSystem = RealTimeGridSystem;
  console.log("✅ RealTimeGridSystem উইন্ডো অবজেক্টে রেজিস্টার হয়েছে");
}

console.log("📦 grid.js লোড সম্পন্ন");