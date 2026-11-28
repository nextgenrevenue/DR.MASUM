/**
 * pending-tokens.js
 * ড্যাশবোর্ড থেকে কল করা রোগী ও request-token.html থেকে পাঠানো রিকুয়েস্ট টোকেনের পেন্ডিং তালিকা
 */
(function () {
  'use strict';

  let pendingNewDocs = [];
  let pendingOldDocs = [];
  let pendingRequestDocs = [];
  let currentPendingItem = null;
  let isSavingPendingToken = false;

  // =======================================================
  // ১. সংখ্যা ও তারিখ ফরম্যাটিং হেল্পার
  // =======================================================
  const toBn = (num) => {
    if (num === null || num === undefined || num === '' || num === '—') return '—';
    const map = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return String(num).replace(/\d/g, (d) => map[d]);
  };

  const getAgeText = (data) => {
    const y = data.ageYears || 0;
    const m = data.ageMonths || 0;
    const d = data.ageDays || 0;
    const parts = [];
    if (y > 0) parts.push(`${toBn(y)} বছর`);
    if (m > 0) parts.push(`${toBn(m)} মাস`);
    if (d > 0) parts.push(`${toBn(d)} দিন`);
    if (parts.length > 0) return parts.join(', ');
    const rawAge = data.age || data.patientAge;
    if (rawAge) return typeof rawAge === 'number' ? `${toBn(rawAge)} বছর` : String(rawAge);
    return '—';
  };

  const getDateText = (data) => {
    if (data.appointmentDateDisplay) return data.appointmentDateDisplay;
    if (data.appointmentDate) {
      const dt = new Date(data.appointmentDate);
      if (!isNaN(dt)) {
        return dt
          .toLocaleDateString('bn-BD', {
            weekday: 'long',
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })
          .replace(/,\s*/, ',')
          .replace(/\d/g, (d) => toBn(d));
      }
    }
    if (data.timestamp && typeof data.timestamp.toDate === 'function') {
      return data.timestamp
        .toDate()
        .toLocaleDateString('bn-BD', {
          weekday: 'long',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
        .replace(/,\s*/, ',')
        .replace(/\d/g, (d) => toBn(d));
    }
    return new Date()
      .toLocaleDateString('bn-BD', {
        weekday: 'long',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
      .replace(/,\s*/, ',')
      .replace(/\d/g, (d) => toBn(d));
  };

  const notify = (msg, type = 'info') => {
    if (typeof showAlert === 'function') {
      showAlert(msg, type);
      return;
    }
    const toast = document.createElement('div');
    toast.textContent = msg;
    toast.style.cssText = `
      position: fixed; top: 80px; right: 20px; z-index: 99999;
      padding: 12px 20px; border-radius: 8px; color: #fff; font-weight: 600;
      font-family: 'Noto Sans Bengali', sans-serif; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      background: ${type === 'error' ? '#dc2626' : type === 'warning' ? '#f59e0b' : '#16a34a'};
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  };

  // =======================================================
  // ২. পেন্ডিং টেবিলের CSS এবং HTML ইনজেক্ট করা
  // =======================================================
function injectStylesAndLayout() {
    const container = document.getElementById('pending-tokens-container');
    if (!container) {
      console.warn('⚠️ tokenmanagement.html-এ #pending-tokens-container পাওয়া যায়নি।');
      return false;
    }

    if (!document.getElementById('pending-tokens-style')) {
      const style = document.createElement('style');
      style.id = 'pending-tokens-style';
      style.textContent = `
        .pending-section-card {
          background: #ffffff;
          border-radius: 10px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
          margin: 18px 0 22px 0;
          overflow: hidden;
        }
        .pending-section-header {
          padding: 12px 18px;
          background: #fffbeb;
          border-bottom: 1px solid #fde68a;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 10px;
        }
        .pending-section-header h3 {
          margin: 0;
          font-size: 16px;
          color: #92400e;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .pending-count-badge {
          background: #f59e0b;
          color: #ffffff;
          padding: 2px 10px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 700;
        }
        .pending-table-wrapper {
          overflow-x: auto;
          max-height: 340px;
        }
        #pendingTokensTable {
          width: 100%;
          border-collapse: collapse;
          min-width: 1200px;
        }
        #pendingTokensTable th {
          background: #fef3c7;
          color: #78350f;
          padding: 12px 14px;
          text-align: left;
          font-size: 13px;
          font-weight: 600;
          white-space: nowrap;
          position: sticky;
          top: 0;
          z-index: 5;
          border-bottom: 2px solid #fde68a;
        }
        #pendingTokensTable td {
          padding: 10px 14px;
          border-bottom: 1px solid #f3f4f6;
          font-size: 13px;
          vertical-align: middle;
          white-space: nowrap;
        }
        #pendingTokensTable tr:hover {
          background: #fffbeb;
        }
        .pending-status-pill {
          display: inline-block;
          padding: 3px 10px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          background: #fef3c7;
          color: #92400e;
          border: 1px solid #fde68a;
        }
        .pending-action-group {
          display: flex;
          gap: 6px;
          align-items: center;
        }
        .btn-pending-view {
          background: #2563eb;
          color: #fff;
          border: none;
          padding: 6px 10px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 12px;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
        .btn-pending-view:hover { background: #1d4ed8; }
        .btn-pending-delete {
          background: #dc2626;
          color: #fff;
          border: none;
          padding: 6px 10px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 12px;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
        .btn-pending-delete:hover { background: #b91c1c; }
      `;
      document.head.appendChild(style);
    }

    container.innerHTML = `
      <div class="pending-section-card">
        <div class="pending-section-header">
          <h3>
            <i class="fas fa-clock"></i> অপেক্ষমাণ টোকেন
            <span class="pending-count-badge" id="pendingTokenCount">০</span>
          </h3>
        </div>
        <div class="pending-table-wrapper">
          <table id="pendingTokensTable">
            <thead>
              <tr>
                <th>তারিখ</th>
                <th>টোকেন নাম্বার</th>
                <th>সিরিয়াল</th>
                <th>রোগীর নাম</th>
                <th>বয়স</th>
                <th>ফোন</th>
                <th>ধরন</th>
                <th>ফি</th>
                <th>পরিশোধ</th>
                <th>বাকি</th>
                <th>স্ট্যাটাস</th>
                <th>প্রস্তুতকারী</th>
                <th>রেফারেন্স</th>
                <th>অ্যাকশন</th>
              </tr>
            </thead>
            <tbody id="pendingTokensBody">
              <tr>
                <td colspan="14" style="text-align:center; padding: 20px; color: #6b7280;">পেন্ডিং ডেটা লোড হচ্ছে...</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;
    return true;
  }

  // =======================================================
  // ৩. রিয়েল-টাইম Firestore লিসেনার (Appointments + tokenRequests)
  // =======================================================
  function startPendingListener() {
    if (typeof db === 'undefined' || !db) {
      console.error('❌ Firestore (db) পাওয়া যায়নি। pending-tokens.js ফাইলটি Firebase ইনিশিয়ালাইজেশনের পরে যুক্ত করুন।');
      return;
    }

    db.collectionGroup('new')
      .where('called', '==', true)
      .onSnapshot(
        (snap) => {
          pendingNewDocs = [];
          snap.forEach((doc) => {
            const data = doc.data();
            if (data.tokenGiven !== true) {
              pendingNewDocs.push({ id: doc.id, path: doc.ref.path, sourceType: 'appointment', data });
            }
          });
          renderPendingTable();
        },
        (err) => console.error('❌ Pending new listener error:', err)
      );

    db.collectionGroup('old')
      .where('called', '==', true)
      .onSnapshot(
        (snap) => {
          pendingOldDocs = [];
          snap.forEach((doc) => {
            const data = doc.data();
            if (data.tokenGiven !== true) {
              pendingOldDocs.push({ id: doc.id, path: doc.ref.path, sourceType: 'appointment', data });
            }
          });
          renderPendingTable();
        },
        (err) => console.error('❌ Pending old listener error:', err)
      );

    db.collection('tokenRequests')
      .where('status', '==', 'pending_request')
      .onSnapshot(
        (snap) => {
          pendingRequestDocs = [];
          snap.forEach((doc) => {
            pendingRequestDocs.push({ id: doc.id, path: doc.ref.path, sourceType: 'request', data: doc.data() });
          });
          renderPendingTable();
        },
        (err) => console.error('❌ Pending request listener error:', err)
      );
  }

  // =======================================================
  // ৪. পেন্ডিং টেবিল রেন্ডার করা
  // =======================================================
  function renderPendingTable() {
    const tbody = document.getElementById('pendingTokensBody');
    const countBadge = document.getElementById('pendingTokenCount');
    if (!tbody) return;

    const allPending = [...pendingNewDocs, ...pendingOldDocs, ...pendingRequestDocs];
    if (countBadge) countBadge.textContent = toBn(allPending.length);

    if (allPending.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="14" style="text-align: center; padding: 22px; color: #6b7280;">
            বর্তমানে কোনো অপেক্ষমাণ টোকেন নেই
          </td>
        </tr>
      `;
      return;
    }

    allPending.sort((a, b) => {
      const tA = a.data.calledTimestamp?.toMillis
        ? a.data.calledTimestamp.toMillis()
        : a.data.createdAt?.toMillis
        ? a.data.createdAt.toMillis()
        : 0;
      const tB = b.data.calledTimestamp?.toMillis
        ? b.data.calledTimestamp.toMillis()
        : b.data.createdAt?.toMillis
        ? b.data.createdAt.toMillis()
        : 0;
      if (tA !== tB) return tA - tB;
      return (a.data.serial || 0) - (b.data.serial || 0);
    });

    tbody.innerHTML = '';

    allPending.forEach((item) => {
      const { sourceType, data } = item;
      const isRequest = sourceType === 'request';
      const pType = data.patientType || data.type || 'new';
      const typeLabel = pType === 'old' ? 'পুরাতন' : 'নতুন';

      const feeVal = isRequest && data.tokenFee !== undefined ? `${toBn(data.tokenFee)} টাকা` : '—';
      const paidVal = isRequest && data.tokenPaid !== undefined ? `${toBn(data.tokenPaid)} টাকা` : '—';
      const dueVal =
        isRequest && data.tokenFee !== undefined && data.tokenPaid !== undefined
          ? `${toBn((Number(data.tokenFee) || 0) - (Number(data.tokenPaid) || 0))} টাকা`
          : '—';
      const preparedByVal = isRequest && data.preparedBy ? data.preparedBy : '—';
      const refVal = isRequest && (data.givenBy || data.reference) ? data.givenBy || data.reference : '—';
      const patientName = data.name || data.patientName || '—';
      const patientPhone = data.phone || data.patientPhone;

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${getDateText(data)}</td>
        <td>—</td>
        <td><strong>${toBn(data.serial || '—')}</strong></td>
        <td>${patientName}</td>
        <td>${getAgeText(data)}</td>
        <td>${patientPhone ? toBn(patientPhone) : '—'}</td>
        <td>${typeLabel}</td>
        <td>${feeVal}</td>
        <td>${paidVal}</td>
        <td>${dueVal}</td>
        <td><span class="pending-status-pill">${isRequest ? 'রিকুয়েস্ট' : 'অপেক্ষমাণ'}</span></td>
        <td>${preparedByVal}</td>
        <td>${refVal}</td>
        <td>
          <div class="pending-action-group">
            <button type="button" class="btn-pending-view" title="টোকেন দিন / বিস্তারিত দেখুন">
              <i class="fas fa-eye"></i>
            </button>
            <button type="button" class="btn-pending-delete" title="পেন্ডিং থেকে সরান">
              <i class="fas fa-trash-alt"></i>
            </button>
          </div>
        </td>
      `;

      tr.querySelector('.btn-pending-view').addEventListener('click', () => {
        openPendingTokenModal(item);
      });

      tr.querySelector('.btn-pending-delete').addEventListener('click', () => {
        cancelPendingCall(item);
      });

      tbody.appendChild(tr);
    });
  }

  // =======================================================
  // ৫. ডিলিট আইকন: রিকুয়েস্ট ডিলিট অথবা ড্যাশবোর্ডে called: false করা
  // =======================================================
  async function cancelPendingCall(item) {
    const patientName = item.data.name || item.data.patientName || 'এই রোগী';
    const isRequest = item.sourceType === 'request';

    const confirmMsg = isRequest
      ? `আপনি কি "${patientName}"-এর রিকুয়েস্ট টোকেন ডিলিট করতে চান?`
      : `আপনি কি "${patientName}"-এর অপেক্ষমাণ টোকেন চান?`;

    if (!confirm(confirmMsg)) return;

    try {
      if (isRequest) {
        await db.doc(item.path).delete();
        notify(`✅ ${patientName}-এর রিকুয়েস্ট মুছে ফেলা হয়েছে`, 'success');
        return;
      }

      await db.doc(item.path).update({
        called: false,
        calledTimestamp: firebase.firestore.FieldValue.delete(),
      });

      try {
        await db.collection('liveQueue').doc(item.id).delete();
      } catch (qErr) {
        console.warn('⚠️ liveQueue delete skipped:', qErr);
      }

      notify(`✅ ${patientName}-এর কল বাতিল করা হয়েছে`, 'success');
    } catch (error) {
      console.error('❌ বাতিল করতে ত্রুটি:', error);
      notify('❌ বাতিল করতে সমস্যা হয়েছে: ' + error.message, 'error');
    }
  }

  // =======================================================
  // ৬. ভিউ আইকন: টোকেন প্রদান মোডাল ওপেন করা
  // =======================================================
  function openPendingTokenModal(item) {
    currentPendingItem = item;
    const data = item.data;
    const pType = data.patientType || data.type || 'new';
    const defaultFee = data.tokenFee !== undefined ? Number(data.tokenFee) : pType === 'old' ? 600 : 800;
    const defaultPaid = data.tokenPaid !== undefined ? Number(data.tokenPaid) : defaultFee;
    const initialDue = defaultFee - defaultPaid;
    const ageDisplay = getAgeText(data);
    const patientName = data.name || data.patientName || '';

    const oldModal = document.getElementById('pendingTokenModalOverlay');
    if (oldModal) oldModal.remove();

    const modalHtml = `
      <div id="pendingTokenModalOverlay" style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 99999; backdrop-filter: blur(3px);">
        <div style="background: #fff; border-radius: 14px; width: 92%; max-width: 440px; max-height: 90vh; overflow-y: auto; box-shadow: 0 10px 25px rgba(0,0,0,0.2);">
          <div style="background: #2563eb; color: #fff; padding: 14px 18px; display: flex; justify-content: space-between; align-items: center;">
            <h3 style="margin: 0; font-size: 16px;"><i class="fas fa-ticket-alt"></i> নতুন টোকেন প্রদান (সিরিয়াল: ${toBn(data.serial || '—')})</h3>
            <button type="button" id="closePendingModalTop" style="background: none; border: none; color: #fff; font-size: 22px; cursor: pointer;">×</button>
          </div>
          <div style="padding: 18px;">
            <div style="margin-bottom: 12px;">
              <label style="display:block; font-size: 13px; font-weight: 600; margin-bottom: 4px;">রোগীর নাম</label>
              <input type="text" id="pTokenName" value="${patientName.replace(/"/g, '"')}" style="width: 100%; padding: 9px; border: 1px solid #d1d5db; border-radius: 6px;">
            </div>
            <div style="margin-bottom: 12px;">
              <label style="display:block; font-size: 13px; font-weight: 600; margin-bottom: 4px;">বয়স</label>
              <input type="text" id="pTokenAge" value="${ageDisplay === '—' ? '' : ageDisplay}" style="width: 100%; padding: 9px; border: 1px solid #d1d5db; border-radius: 6px;">
            </div>
            <div style="margin-bottom: 12px;">
              <label style="display:block; font-size: 13px; font-weight: 600; margin-bottom: 4px;">রোগীর ধরন</label>
              <select id="pTokenType" style="width: 100%; padding: 9px; border: 1px solid #d1d5db; border-radius: 6px;">
                <option value="new" ${pType === 'new' ? 'selected' : ''}>নতুন রোগী</option>
                <option value="old" ${pType === 'old' ? 'selected' : ''}>পুরাতন রোগী</option>
              </select>
            </div>
            <div style="margin-bottom: 12px;">
              <label style="display:block; font-size: 13px; font-weight: 600; margin-bottom: 4px;">ফি (টাকা)</label>
              <input type="number" id="pTokenFee" value="${defaultFee}" style="width: 100%; padding: 9px; border: 1px solid #d1d5db; border-radius: 6px;">
            </div>
            <div style="margin-bottom: 12px;">
              <label style="display:block; font-size: 13px; font-weight: 600; margin-bottom: 4px;">পরিশোধিত টাকা</label>
              <input type="number" id="pTokenPaid" value="${defaultPaid}" style="width: 100%; padding: 9px; border: 1px solid #d1d5db; border-radius: 6px;">
              <div id="pTokenDueText" style="color: ${initialDue > 0 ? '#dc2626' : '#10b981'}; font-weight: 700; margin-top: 5px; font-size: 13px;">বাকি: ${toBn(initialDue)} টাকা</div>
            </div>
            <div style="margin-bottom: 8px;">
              <label style="display:block; font-size: 13px; font-weight: 600; margin-bottom: 4px;">রেফারেন্স</label>
              <input type="text" id="pTokenRef" value="${data.givenBy || data.reference || ''}" placeholder="রেফারেন্স নাম লিখুন" style="width: 100%; padding: 9px; border: 1px solid #d1d5db; border-radius: 6px;">
            </div>
          </div>
          <div style="padding: 14px 18px; background: #f9fafb; border-top: 1px solid #e5e7eb; display: flex; justify-content: flex-end; gap: 10px;">
            <button type="button" id="savePendingTokenBtn" style="background: #16a34a; color: #fff; border: none; padding: 9px 16px; border-radius: 6px; font-weight: 600; cursor: pointer;">
              সংরক্ষণ ও প্রিন্ট
            </button>
            <button type="button" id="closePendingModalBottom" style="background: #e5e7eb; color: #374151; border: none; padding: 9px 16px; border-radius: 6px; font-weight: 600; cursor: pointer;">
              বাতিল
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    const feeInput = document.getElementById('pTokenFee');
    const paidInput = document.getElementById('pTokenPaid');
    const typeSelect = document.getElementById('pTokenType');
    const dueText = document.getElementById('pTokenDueText');

    const updateDue = () => {
      const f = parseInt(feeInput.value, 10) || 0;
      const p = parseInt(paidInput.value, 10) || 0;
      const due = f - p;
      dueText.textContent = `বাকি: ${toBn(due)} টাকা`;
      dueText.style.color = due > 0 ? '#dc2626' : '#10b981';
    };

    typeSelect.addEventListener('change', () => {
      const val = typeSelect.value === 'old' ? 600 : 800;
      feeInput.value = val;
      paidInput.value = val;
      updateDue();
    });

    feeInput.addEventListener('input', updateDue);
    paidInput.addEventListener('input', updateDue);

    document.getElementById('closePendingModalTop').addEventListener('click', closePendingModal);
    document.getElementById('closePendingModalBottom').addEventListener('click', closePendingModal);
    document.getElementById('savePendingTokenBtn').addEventListener('click', savePendingToken);
  }

  function closePendingModal() {
    const overlay = document.getElementById('pendingTokenModalOverlay');
    if (overlay) overlay.remove();
    currentPendingItem = null;
  }

  // =======================================================
  // ৭. টোকেন সংরক্ষণ (paymentHistories-এ সেভ + রিকুয়েস্ট/অ্যাপয়েন্টমেন্ট আপডেট + প্রিন্ট)
  // =======================================================
  async function savePendingToken() {
    if (isSavingPendingToken || !currentPendingItem) return;

    const saveBtn = document.getElementById('savePendingTokenBtn');
    const originalBtnText = saveBtn.innerHTML;
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> সংরক্ষণ হচ্ছে...';
    isSavingPendingToken = true;

    try {
      const { id: itemId, path: itemPath, sourceType, data: sourceData } = currentPendingItem;
      const isRequest = sourceType === 'request';

      const name = document.getElementById('pTokenName').value.trim() || sourceData.name || sourceData.patientName || '';
      const age = document.getElementById('pTokenAge').value.trim();
      const targetPatientType = document.getElementById('pTokenType').value || 'new';
      const fee = parseInt(document.getElementById('pTokenFee').value, 10) || (targetPatientType === 'new' ? 800 : 600);
      const paid = parseInt(document.getElementById('pTokenPaid').value, 10) || 0;
      const givenBy = document.getElementById('pTokenRef').value.trim();
      const preparedByName = isRequest && sourceData.preparedBy
        ? sourceData.preparedBy
        : sessionStorage.getItem('adminName') || sessionStorage.getItem('adminEmail') || '—';

      const bdDateStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' });
      const yymmdd = bdDateStr.slice(2).replace(/-/g, '');
      const subCollectionName = `payment_${targetPatientType}`;
      const counterDocRef = db.collection('paymentHistories').doc(yymmdd);

      let tokenNumber = '';

      await db.runTransaction(async (transaction) => {
        const counterDoc = await transaction.get(counterDocRef);
        let lastCounter = 0;
        if (counterDoc.exists && counterDoc.data().dailyLastCounter) {
          lastCounter = counterDoc.data().dailyLastCounter;
        }

        const newTokenSerial = lastCounter + 1;
        const serialStr = String(newTokenSerial).padStart(2, '0');
        const tokenDocId = `${yymmdd}-${serialStr}`;
        tokenNumber = `T-${tokenDocId}`;

        const finalDocRef = counterDocRef.collection(subCollectionName).doc(tokenDocId);
        const dupSnap = await transaction.get(finalDocRef);
        if (dupSnap.exists) {
          throw new Error(`টোকেন ${tokenNumber} ইতিমধ্যে বিদ্যমান! আবার চেষ্টা করুন।`);
        }

        const initialHistory = [
          {
            id: Date.now().toString(),
            amount: paid,
            type: 'payment',
            method: 'নগদ',
            note: `টোকেন প্রদান - ${tokenNumber}`,
            timestamp: new Date().toISOString(),
            createdBy: preparedByName,
            preparedBy: preparedByName,
            source: isRequest ? 'request_token' : 'tokenmanagement_pending',
          },
        ];

        transaction.set(counterDocRef, { dailyLastCounter: newTokenSerial }, { merge: true });

        transaction.set(finalDocRef, {
          tokenNumber: tokenNumber,
          tokenCounter: newTokenSerial,
          tokenDatePrefix: yymmdd,
          tokenTimestamp: firebase.firestore.FieldValue.serverTimestamp(),
          patientName: name,
          patientAge: age,
          patientPhone: sourceData.phone || sourceData.patientPhone || '',
          patientType: targetPatientType,
          tokenFee: fee,
          tokenPaid: paid,
          tokenDue: fee - paid,
          amount: paid,
          method: 'নগদ',
          type: 'payment',
          note: `টোকেন প্রদান - ${tokenNumber}`,
          status: fee - paid === 0 ? 'paid' : 'due',
          paymentHistory: initialHistory,
          source: isRequest ? 'request_token' : 'tokenmanagement_pending',
          givenBy: givenBy,
          reference: givenBy,
          createdBy: preparedByName,
          preparedBy: preparedByName,
          appointmentId: isRequest ? null : itemId,
          requestId: isRequest ? itemId : null,
          serial: sourceData.serial || null,
          appointmentSerial: sourceData.serial || null,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
      });

      if (isRequest) {
        await db.doc(itemPath).delete();
      } else {
        await db.doc(itemPath).update({
          tokenGiven: true,
          tokenNumber: tokenNumber,
          tokenTimestamp: firebase.firestore.FieldValue.serverTimestamp(),
          appointmentId: itemId,
          tokenFee: fee,
          tokenPaid: paid,
          givenBy: givenBy,
          lastTokenUpdate: firebase.firestore.FieldValue.serverTimestamp(),
        });
      }

      closePendingModal();
      notify(`✅ টোকেন ${tokenNumber} তৈরি হয়েছে!`, 'success');

      if (typeof loadTokenData === 'function') {
        setTimeout(() => loadTokenData(), 250);
      }

      if (typeof printTokenReceipt === 'function') {
        printTokenReceipt(tokenNumber, name, age, targetPatientType, fee, paid);
      }
    } catch (error) {
      console.error('❌ টোকেন সংরক্ষণ ত্রুটি:', error);
      notify('❌ টোকেন সংরক্ষণ করতে সমস্যা হয়েছে: ' + error.message, 'error');
    } finally {
      isSavingPendingToken = false;
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalBtnText;
      }
    }
  }

  // =======================================================
  // ৮. অটো ইনিশিয়ালাইজেশন
  // =======================================================
  function initPendingTokensModule() {
    if (injectStylesAndLayout()) {
      startPendingListener();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPendingTokensModule);
  } else {
    initPendingTokensModule();
  }
})();