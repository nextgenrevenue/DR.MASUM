// grid.js - DATE BASED VERSION WITH MULTI-SELECT FOR ADMIN (COMPLETE FIX)
console.log("📅 তারিখ-ভিত্তিক Grid System লোড হচ্ছে...");

class RealTimeGridSystem {
  constructor(config) {
    console.log("🔧 Grid System Constructor কল হয়েছে");
    
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
      userPendingExpiry: 1 * 60 * 1000,
      adminPendingExpiry: 5 * 60 * 1000,
      enableRealTime: true,
      multiSelect: false
    };
    
    this.config = { ...defaultConfig, ...config };
    
    this.serialRanges = {};
    this.appointments = {};
    this.pendingSelections = {};
    this.userPendingId = null;
    this.currentSelection = null;
    this.realtimeListeners = [];
    this.currentUserPendingSerial = null;
    
    // মাল্টি সিলেক্টের জন্য প্রপার্টি
    this.multiSelect = this.config.multiSelect || false;
    this.selectedSerials = [];
    this.currentPatientIndex = 0;
    
    // কনফিগারেশন পরিবর্তন ট্র্যাকিং
    this._lastDay = null;
    this._lastTime = null;
    this._lastType = null;
    
    // ✅ গ্রিড রি-রেন্ডার ঠেকানোর জন্য ফ্ল্যাগ
    this._skipNextGridRender = false;
    
    this.isProcessing = false;
    this.scrollPosition = 0;
    
    console.log(`✅ Grid System তৈরি হয়েছে (${this.config.mode} মোড, multiSelect: ${this.multiSelect})`);
  }

  getNextDateByDay(targetDay) {
    const daysMap = {
      "Sunday": 0, "Monday": 1, "Tuesday": 2, "Wednesday": 3,
      "Thursday": 4, "Friday": 5, "Saturday": 6
    };
    
    const targetDayIndex = daysMap[targetDay];
    const today = new Date();
    const todayIndex = today.getDay();
    let daysToAdd = targetDayIndex - todayIndex;
    if (daysToAdd < 0) daysToAdd += 7;
    
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
    return date.toLocaleDateString('bn-BD', { 
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
    });
  }

  formatBanglaDate(date) {
    const banglaMonths = ['জানুয়ারী', 'ফেব্রুয়ারী', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
      'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
    const banglaDays = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'];
    return `${banglaDays[date.getDay()]}, ${date.getDate()} ${banglaMonths[date.getMonth()]} ${date.getFullYear()}`;
  }

  injectStyles() {
    if (document.getElementById('grid-system-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'grid-system-styles';
    style.textContent = `
      .serial-grid { display: grid; grid-template-columns: repeat(10, 1fr); gap: 8px; margin: 10px 0; padding: 10px; border: 1px solid #e5e7eb; border-radius: 8px; max-height: 300px; overflow-y: auto; background-color: white; }
      .date-header { grid-column: 1 / -1; text-align: center; font-weight: 700; color: #1d4ed8; padding: 10px; background: linear-gradient(135deg, #dbeafe, #eff6ff); border-radius: 8px; margin-bottom: 10px; border: 2px solid #3b82f6; font-size: 15px; }
      .serial-item { padding: 10px; border: 2px solid transparent; border-radius: 6px; text-align: center; font-weight: 500; font-size: 14px; transition: all 0.08s linear; user-select: none; cursor: pointer; min-height: 40px; display: flex; align-items: center; justify-content: center; will-change: background-color, border-color; backface-visibility: hidden; }
      .serial-item.available { background-color: #dcfce7; color: #16a34a; border: 2px solid #16a34a; }
      .serial-item.available:hover { background-color: #bbf7d0; transform: translateY(-2px); box-shadow: 0 4px 8px rgba(34, 197, 94, 0.2); }
      .serial-item.booked { background-color: #fecaca; color: #dc2626; border: 2px solid #dc2626; cursor: not-allowed; opacity: 0.8; pointer-events: none; }
      .serial-item.pending { background-color: #dbeafe; color: #3b82f6; border: 2px solid #3b82f6; cursor: not-allowed; opacity: 0.7; pointer-events: none; }
      .serial-item.selected { background-color: #fef3c7; color: #f59e0b; border: 2px solid #f59e0b; font-weight: 700; }
      @media (max-width: 768px) { .serial-grid { grid-template-columns: repeat(7, 1fr); gap: 6px; } .serial-item { padding: 8px; font-size: 13px; } }
      @media (max-width: 480px) { .serial-grid { grid-template-columns: repeat(7, 1fr); } .serial-item { font-size: 12px; } }
      .grid-no-selection { grid-column: 1 / -1; text-align: center; padding: 20px; color: #6b7280; font-style: italic; }
    `;
    document.head.appendChild(style);
  }

  async init() {
    console.log("🚀 Grid System ইনিশিয়ালাইজেশন শুরু...");
    try {
      this.injectStyles();
      if (!this.config.db) throw new Error('Firebase Firestore not available');
      await this.loadSerialRanges();
      if (this.config.enableRealTime) this.setupRealtimeListeners();
      this.setupEventDelegation();
      console.log("✅ Grid System সফলভাবে ইনিশিয়ালাইজ হয়েছে");
      return true;
    } catch (error) {
      console.error("❌ Grid System ইনিশিয়ালাইজেশন ব্যর্থ:", error);
      return false;
    }
  }

  async loadSerialRanges() {
    if (!this.config.db) return;
    try {
      const doc = await this.config.db
        .collection(this.config.settingsCollection)
        .doc(this.config.serialRangesDocId)
        .get();
      if (doc.exists) {
        this.serialRanges = doc.data();
      } else {
        this.serialRanges = { Thursday: { new: {}, old: {} }, Friday: { new: {}, old: {} } };
      }
    } catch (error) {
      console.error("❌ সিরিয়াল রেঞ্জ লোড করতে সমস্যা:", error);
    }
  }

  // 🛠️ ফিক্সড রিয়েল-টাইম লিসেনার (কালেকশন গ্রুপ সাপোর্টেড)
  setupRealtimeListeners() {
    if (!this.config.db) return;
    
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const dateLimitString = this.formatDate(threeDaysAgo);
    
    if (this.realtimeListeners.length) {
      this.realtimeListeners.forEach(unsub => { if(typeof unsub === 'function') unsub(); });
      this.realtimeListeners = [];
    }

    // রিসেট অ্যাপয়েন্টমেন্ট কন্টেইনার
    this.appointments = {};

    // ১. 'new' সাব-কালেকশন ট্র্যাক করার লিসেনার
    const newAppointmentsListener = this.config.db
      .collectionGroup('new')
      .where('appointmentDate', '>=', dateLimitString)
      .onSnapshot(snapshot => {
        this.processGroupSnapshot(snapshot, 'new');
      }, error => console.error("❌ নিউ অ্যাপয়েন্টমেন্ট লিসেনার ত্রুটি:", error));
    
    // ২. 'old' সাব-কালেকশন ট্র্যাক করার লিসেনার
    const oldAppointmentsListener = this.config.db
      .collectionGroup('old')
      .where('appointmentDate', '>=', dateLimitString)
      .onSnapshot(snapshot => {
        this.processGroupSnapshot(snapshot, 'old');
      }, error => console.error("❌ ওল্ড অ্যাপয়েন্টমেন্ট লিসেনার ত্রুটি:", error));
    
    this.realtimeListeners.push(newAppointmentsListener);
    this.realtimeListeners.push(oldAppointmentsListener);
    
    // পেন্ডিং ট্র্যাকিং লিসেনার
    const pendingListener = this.config.db
      .collection(this.config.pendingSelectionsCollection)
      .where('expiresAt', '>', new Date())
      .onSnapshot(snapshot => {
        this.processPendingSelections(snapshot);
        this.safeUpdateGrid();
        if (this.config.onPendingUpdate) this.config.onPendingUpdate(this.pendingSelections);
      }, error => console.error("❌ পেন্ডিং সিলেকশন লিসেনার ত্রুটি:", error));
    
    this.realtimeListeners.push(pendingListener);
  }

  // 🛠️ সাব-কালেকশন ডাটা মার্জ ও প্রসেস করার নতুন মেথড
  processGroupSnapshot(snapshot, collectionType) {
    snapshot.docChanges().forEach(change => {
      const doc = change.doc;
      const data = doc.data();
      const dateString = data.appointmentDate;
      const day = data.day;
      
      if (dateString && day) {
        const key = `${dateString}_${day}`;
        if (!this.appointments[key]) this.appointments[key] = [];

        if (change.type === 'added' || change.type === 'modified') {
          // ডুপ্লিকেট এড়াতে আগের এন্ট্রি রিমুভ করে নতুন ডাটা পুশ করা হচ্ছে
          this.appointments[key] = this.appointments[key].filter(app => app.id !== doc.id);
          this.appointments[key].push({ id: doc.id, collectionType, ...data });
        } else if (change.type === 'removed') {
          this.appointments[key] = this.appointments[key].filter(app => app.id !== doc.id);
        }
      }
    });
    this.safeUpdateGrid();
  }

  processPendingSelections(snapshot) {
    this.pendingSelections = {};
    const now = new Date();
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.expiresAt && data.expiresAt.toDate() > now) {
        const key = `${data.appointmentDate}_${data.day}_${data.time}_${data.type}`;
        if (!this.pendingSelections[key]) this.pendingSelections[key] = { user: [], admin: [] };
        if (data.bookedBy === 'user') {
          this.pendingSelections[key].user.push({ serial: data.serial, id: doc.id, expiresAt: data.expiresAt });
          if (doc.id === this.userPendingId) this.currentUserPendingSerial = data.serial;
        } else if (data.bookedBy === 'admin') {
          this.pendingSelections[key].admin.push({ serial: data.serial, id: doc.id, adminId: data.adminId, expiresAt: data.expiresAt });
        }
      }
    });
  }

  setupEventDelegation() {
    const gridContainer = document.getElementById(this.config.gridContainerId);
    if (!gridContainer) return;
    gridContainer.removeEventListener('click', this.handleGridClick);
    this.handleGridClick = this.handleGridClick.bind(this);
    gridContainer.addEventListener('click', this.handleGridClick);
  }

  handleGridClick(event) {
    if (this.isProcessing) return;
    const serialItem = event.target.closest('.serial-item');
    if (!serialItem) return;
    if (serialItem.classList.contains('booked') || serialItem.classList.contains('pending')) return;
    
    const serial = parseInt(serialItem.dataset.serial);
    if (isNaN(serial)) return;
    
    this.isProcessing = true;
    
    this.selectSerial(serial).finally(() => {
      this.isProcessing = false;
    });
  }

  getElementValue(elementId) {
    const element = document.getElementById(elementId);
    return element ? element.value : null;
  }

  // 🛠️ ফিক্সড সিলেক্ট সিরিয়াল লজিক (টাইপ ইন্ডিপেন্ডেন্ট চেকিং)
  async selectSerial(serial) {
    console.log(`🎯 সিরিয়াল ${serial} সিলেক্ট করা হচ্ছে...`);
    
    this._skipNextGridRender = true;
    
    const newSerialElement = document.querySelector(`.serial-item[data-serial="${serial}"]`);
    if (!newSerialElement) {
        this._skipNextGridRender = false;
        return false;
    }
    
    const day = this.getElementValue(this.config.dayElementId);
    const time = this.getElementValue(this.config.timeElementId);
    const type = this.getElementValue(this.config.typeElementId);
    
    if (!day || !time || !type) {
        this._skipNextGridRender = false;
        return false;
    }
    
    const nextDateInfo = this.getNextDateByDay(day);
    const dateString = nextDateInfo.dateString;
    
    const key = `${dateString}_${day}`;
    const dayAppointments = this.appointments[key] || [];
    
    // 🛠️ ফিক্সড: নতুন বা পুরাতন যেকোনো প্রকারের রোগীতে সিরিয়াল বুক থাকলে তা লক থাকবে
    const appointment = dayAppointments.find(app => app.time === time && app.serial === serial);
    
    if (appointment) {
        if (this.config.onSerialClick) {
            this.config.onSerialClick({ serial, status: 'booked', date: dateString });
        }
        this._skipNextGridRender = false;
        return false;
    }
    
    const pendingKey = `${dateString}_${day}_${time}_${type}`;
    const pendingData = this.pendingSelections[pendingKey] || { user: [], admin: [] };
    const isPendingByOther = pendingData.user.some(p => p.serial === serial) || 
                              pendingData.admin.some(p => p.serial === serial && p.adminId !== this.config.adminSessionId);
    
    if (isPendingByOther) {
        if (this.config.onSerialClick) {
            this.config.onSerialClick({ serial, status: 'pending', date: dateString });
        }
        this._skipNextGridRender = false;
        return false;
    }
    
    // ========== মাল্টি সিলেক্ট মোড ==========
    if (this.multiSelect === true) {
        
        const alreadySelectedForCurrentPatient = this.selectedSerials.some(
            s => s.serial === serial && s.patientIndex === this.currentPatientIndex
        );
        
        if (alreadySelectedForCurrentPatient) {
            console.log(`⏭️ সিরিয়াল ${serial} ইতিমধ্যে সিলেক্টেড`);
            this._skipNextGridRender = false;
            return true;
        }
        
        const existingForOtherPatient = this.selectedSerials.find(s => s.serial === serial && s.patientIndex !== this.currentPatientIndex);
        
        if (existingForOtherPatient) {
            console.log(`🔄 সিরিয়াল ${serial} অন্য রোগী থেকে রি-অ্যাসাইন হচ্ছে`);
            const otherElement = document.querySelector(`.serial-item[data-serial="${serial}"]`);
            if (otherElement) {
                otherElement.classList.remove('selected');
                otherElement.classList.add('available');
            }
            if (existingForOtherPatient.pendingId) {
                await this.removePendingSelection(existingForOtherPatient.pendingId);
            }
            const otherIndex = this.selectedSerials.findIndex(s => s.serial === serial);
            if (otherIndex !== -1) {
                this.selectedSerials.splice(otherIndex, 1);
            }
        }
        
        const patientCount = document.querySelectorAll('.patient-card').length;
        const currentPatientSelections = this.getSerialsForPatient(this.currentPatientIndex);
        let oldSerialElement = null;
        let oldSerial = null;
        
        if (currentPatientSelections.length >= 1) {
            oldSerial = currentPatientSelections[0];
            oldSerialElement = document.querySelector(`.serial-item[data-serial="${oldSerial}"]`);
            
            if (oldSerialElement && oldSerialElement !== newSerialElement) {
                oldSerialElement.classList.remove('selected');
                oldSerialElement.classList.add('available');
            }
            
            const oldSelection = this.selectedSerials.find(s => s.serial === oldSerial && s.patientIndex === this.currentPatientIndex);
            if (oldSelection && oldSelection.pendingId) {
                await this.removePendingSelection(oldSelection.pendingId);
            }
            const oldIndex = this.selectedSerials.findIndex(s => s.serial === oldSerial && s.patientIndex === this.currentPatientIndex);
            if (oldIndex !== -1) {
                this.selectedSerials.splice(oldIndex, 1);
            }
        }
        
        const totalSelected = this.getAllSelectedSerials().length;
        if (totalSelected >= patientCount && !currentPatientSelections.length) {
            if (this.selectedSerials.length > 0) {
                const oldest = this.selectedSerials[0];
                const oldestElement = document.querySelector(`.serial-item[data-serial="${oldest.serial}"]`);
                
                if (oldestElement) {
                    oldestElement.classList.remove('selected');
                    oldestElement.classList.add('available');
                }
                
                if (oldest.pendingId) {
                    await this.removePendingSelection(oldest.pendingId);
                }
                this.selectedSerials.shift();
            }
        }
        
        const pendingId = await this.addPendingSelection(serial, day, time, type, dateString);
        if (pendingId) {
            this.selectedSerials.push({ 
                serial, pendingId, date: dateString, 
                patientIndex: this.currentPatientIndex 
            });
            
            newSerialElement.classList.remove('available', 'pending');
            newSerialElement.classList.add('selected');
            
            const selectedInput = document.getElementById(this.config.selectedSerialInputId);
            if (selectedInput) {
                selectedInput.value = JSON.stringify(this.selectedSerials.map(s => s.serial));
            }
            
            if (this.config.onSerialClick) {
                this.config.onSerialClick({
                    serial, status: 'selected',
                    allSelected: this.selectedSerials.map(s => s.serial),
                    patientIndex: this.currentPatientIndex
                });
            }
        }
        
        if (typeof updateAllSerialDisplays === 'function') {
            updateAllSerialDisplays();
        }
        
        this._skipNextGridRender = false;
        return true;
    }
    
    // ========== সিঙ্গেল সিলেক্ট মোড ==========
    if (this.userPendingId) {
        const oldElement = document.querySelector(`.serial-item[data-serial="${this.currentSelection}"]`);
        if (oldElement) {
            oldElement.classList.remove('selected');
            oldElement.classList.add('available');
        }
        await this.removePendingSelection(this.userPendingId);
    }
    
    const pendingId = await this.addPendingSelection(serial, day, time, type, dateString);
    if (pendingId) {
        this.userPendingId = pendingId;
        this.currentSelection = serial;
        this.currentUserPendingSerial = serial;
        
        newSerialElement.classList.remove('available', 'pending');
        newSerialElement.classList.add('selected');
        
        const selectedInput = document.getElementById(this.config.selectedSerialInputId);
        if (selectedInput) {
            selectedInput.value = serial;
        }
        
        if (this.config.onSerialClick) {
            this.config.onSerialClick({ serial, status: 'pending', pendingId, date: dateString });
        }
    }
    
    this._skipNextGridRender = false;
    return true;
  }

  async updateGrid() {
    if (this._skipNextGridRender) {
      console.log("⏭️ গ্রিড রি-রেন্ডার স্কিপ করা হয়েছে");
      this._skipNextGridRender = false;
      return;
    }
    
    if (this.isProcessing) return;
    
    if (this.multiSelect === true) {
      const currentDay = this.getElementValue(this.config.dayElementId);
      const currentTime = this.getElementValue(this.config.timeElementId);
      const currentType = this.getElementValue(this.config.typeElementId);
      
      if (this._lastDay !== null && 
          (this._lastDay !== currentDay || this._lastTime !== currentTime || this._lastType !== currentType)) {
        console.log("🔄 কনফিগারেশন পরিবর্তন detected, সিলেকশন ক্লিয়ার করা হচ্ছে...");
        if (this.selectedSerials && this.selectedSerials.length > 0) {
          await this.clearAllSelections();
        }
      }
      
      this._lastDay = currentDay;
      this._lastTime = currentTime;
      this._lastType = currentType;
    }
    
    const gridContainer = document.getElementById(this.config.gridContainerId);
    if (!gridContainer) return;
    
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
    
    const range = this.getSerialRange(day, type, time);
    if (!range) {
      gridContainer.innerHTML = '<div class="grid-no-selection">এই সময়ের জন্য সিরিয়াল উপলব্ধ নেই</div>';
      return;
    }
    
    let start, end;
    if (Array.isArray(range)) { [start, end] = range; }
    else if (typeof range === 'string') {
      if (range.includes('-')) {
        const parts = range.split('-');
        start = parseInt(parts[0]);
        end = parseInt(parts[1]);
      } else {
        start = 1;
        end = parseInt(range);
      }
    }
    
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
    
    requestAnimationFrame(() => { gridContainer.scrollTop = currentScroll; });
    
    if (this.config.onGridUpdate) {
      this.config.onGridUpdate('grid', { day, time, type, start, end, date: dateString, displayDate });
    }
  }

  getSerialRange(day, type, time) {
    if (this.serialRanges[day] && this.serialRanges[day][type] && this.serialRanges[day][type][time]) {
      return this.serialRanges[day][type][time];
    }
    return null;
  }

  // 🛠 Cortected: টাইপ ইন্ডিপেন্ডেন্ট স্ট্যাটাস চেকার
  getSerialStatus(serial, day, time, type, dateString, pendingData) {
    const status = {
      isBooked: false, isOtherUserPending: false, isCurrentUserPending: false,
      isAdminPending: false, isCurrentAdminPending: false
    };
    
    const key = `${dateString}_${day}`;
    const dayAppointments = this.appointments[key] || [];
    
    // 🛠 ফিক্সড: পুরো দিনের টাইম স্লটে যেকোনো টাইপ (new/old) লক থাকলে এই সিরিয়াল লক দেখাবে
    const appointment = dayAppointments.find(app => app.time === time && app.serial === serial);
    if (appointment) status.isBooked = true;
    
    if (!status.isBooked) {
      if (this.currentUserPendingSerial === serial) status.isCurrentUserPending = true;
      else if (pendingData.user && pendingData.user.some(p => p.serial === serial)) status.isOtherUserPending = true;
      
      if (pendingData.admin && pendingData.admin.some(p => p.serial === serial)) {
        status.isAdminPending = true;
        const adminPending = pendingData.admin.find(p => p.serial === serial);
        if (adminPending && adminPending.adminId === this.config.adminSessionId) {
          status.isCurrentAdminPending = true;
        }
      }
    }
    return status;
  }

  async addPendingSelection(serial, day, time, type, dateString) {
    if (!this.config.db) return null;
    try {
      const expiryTime = this.config.mode === 'admin' ? this.config.adminPendingExpiry : this.config.userPendingExpiry;
      const pendingData = {
        serial, day, time, type, appointmentDate: dateString,
        bookedBy: this.config.mode,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        expiresAt: new Date(Date.now() + expiryTime)
      };
      if (this.config.mode === 'admin' && this.config.adminSessionId) {
        pendingData.adminId = this.config.adminSessionId;
      }
      const docRef = await this.config.db.collection(this.config.pendingSelectionsCollection).add(pendingData);
      return docRef.id;
    } catch (error) {
      console.error("❌ পেন্ডিং সিলেকশন অ্যাড করতে সমস্যা:", error);
      return null;
    }
  }

  async removePendingSelection(pendingId) {
    if (!this.config.db || !pendingId) return;
    try {
      await this.config.db.collection(this.config.pendingSelectionsCollection).doc(pendingId).delete();
    } catch (error) {
      console.error("❌ পেন্ডিং সিলেকশন রিমুভ করতে সমস্যা:", error);
    }
  }

  safeUpdateGrid() {
    if (this.isProcessing) {
      setTimeout(() => this.safeUpdateGrid(), 100);
      return;
    }
    this.updateGrid();
  }

  // ========== মাল্টি সিলেক্ট হেল্পার মেথড ==========
  
  getSelectedSerials() {
    return this.selectedSerials.map(s => s.serial);
  }
  
  getAllSelectedSerials() {
    return this.selectedSerials.map(s => s.serial);
  }
  
  getAllSelectedSerialsWithDetails() {
    return [...this.selectedSerials];
  }
  
  getSerialsForPatient(patientIndex) {
    return this.selectedSerials.filter(s => s.patientIndex === patientIndex).map(s => s.serial);
  }
  
  setCurrentPatientIndex(index) {
    this.currentPatientIndex = index;
    console.log(`👤 বর্তমান রোগী সেট: ${index}`);
  }
  
  async clearAllSelections() {
    console.log("🗑️ সব সিলেকশন ক্লিয়ার করা হচ্ছে...");
    this._skipNextGridRender = true;
    
    for (const selected of this.selectedSerials) {
      if (selected.pendingId) {
        await this.removePendingSelection(selected.pendingId);
      }
      const element = document.querySelector(`.serial-item[data-serial="${selected.serial}"]`);
      if (element) {
        element.classList.remove('selected');
        element.classList.add('available');
      }
    }
    this.selectedSerials = [];
    
    const selectedInput = document.getElementById(this.config.selectedSerialInputId);
    if (selectedInput) selectedInput.value = '';
    
    this._skipNextGridRender = false;
    
    if (typeof updateAllSerialDisplays === 'function') {
      updateAllSerialDisplays();
    }
  }
  
  async removeSerial(serial, patientIndex) {
    const index = this.selectedSerials.findIndex(s => s.serial === serial && s.patientIndex === patientIndex);
    if (index !== -1) {
      this._skipNextGridRender = true;
      
      const element = document.querySelector(`.serial-item[data-serial="${serial}"]`);
      if (element) {
        element.classList.remove('selected');
        element.classList.add('available');
      }
      
      if (this.selectedSerials[index].pendingId) {
        await this.removePendingSelection(this.selectedSerials[index].pendingId);
      }
      this.selectedSerials.splice(index, 1);
      
      this._skipNextGridRender = false;
      return true;
    }
    return false;
  }

  cleanup() {
    this.realtimeListeners.forEach(unsubscribe => {
      if (typeof unsubscribe === 'function') unsubscribe();
    });
    const gridContainer = document.getElementById(this.config.gridContainerId);
    if (gridContainer) {
      gridContainer.removeEventListener('click', this.handleGridClick);
    }
    if (this.multiSelect && this.selectedSerials.length > 0) {
      this.selectedSerials.forEach(async (selected) => {
        if (selected.pendingId) await this.removePendingSelection(selected.pendingId);
      });
    }
    if (this.userPendingId) this.removePendingSelection(this.userPendingId);
    console.log("🧹 Grid System ক্লিনআপ সম্পন্ন");
  }
}

if (typeof window !== 'undefined') {
  window.RealTimeGridSystem = RealTimeGridSystem;
  console.log("✅ RealTimeGridSystem উইন্ডো অবজেক্টে রেজিস্টার হয়েছে");
}

console.log("📅 grid.js লোড সম্পন্ন");