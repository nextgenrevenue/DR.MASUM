const { schedule } = require('@netlify/functions');
const admin = require('firebase-admin');

const serviceAccount = {
  type: "service_account",
  project_id: "doctor-appointment-syste-23828",
  private_key_id: "e26b4265d81f89fee5f52f780008c6e6a6e6229c",
  private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDBAuduDVlJ8Out\ngidjtsENleSYB/4O9lR7lVzjbXX9Oa7b33xc6rB7Q1epVUfgXXjjOcupsHPBj0uS\nk8ryffbKkxrcybtN2gYqD/BgTC94lfqSVukWTpA0rda0KrgMiDp0v7oHEUWzZ/dY\nudqSEs78kS7N4ZgRjILdfDNKMUYWUzQStjBBJx4z8IyeJaIB/dehHGimzKAXYpeO\naMwhA+gjGXVh6fX2e+kNi6x7nC6V+vAAxqHGZ8SAH1IdnK4Lvgxs74zYIrJ2hxZ+\nX/3qR+TciSxS9HgdIq7vhwOCLtCqm+/ANw3IGiuk3uLHz4cCaE0b/6Oealob0s/C\nduwrkmZjAgMBAAECggEAS6MKM4f6pi3KBfA75GkhZWQItYVoS8+/ksCZKqziMI5y\n1kpRz43PBDcDOuInLSckMROcms6BxmgTywis3vN7C66zN7O8eYlHoiMl5W7lqYFI\ntSFm7W1zOJmpSmh1QL///HGIAq4DnQdQmI4Yt+a0A6kXaOoPsEzamdZKuTfvCd75\nrhE87ekkIrxeg8JmUV044jkTnXwi7hTJBNpmh4qC0FeMGMceXbYQRUzuDhaFe/xp\nHQC9maJSxe3eVRVwTjvLiPQqK9ZJmqF/+l8Jw1U7dsAS2Ie3lVP5ih/TWnxAX+Zu\nSKnAsTGlKn5pcPB0LZgaHcTpOmW0Hk6JaBtGCyKbuQKBgQDth6lDouMFXu70ZnlI\n+HEYMgVmdH5UnN/RoqZeIazsqQuD/j3zzzCQ+yb0n3Jtz20eUET/Lgyb5ZbgDqzB\n8NoEmOPevlFnQPev/yMEimg42HoO5ssUzXvgWXedKrXUbeI6mEhGJwlVA7dGhi7r\n4OrsvVVvgNyIn/slxDpPBUtWOQKBgQDQBQsM5InxAvkZdvSE+mIeIRtJUlmdPOb4\nH23EyIfvnxdsSPiGf6pMV0yjIvlg0dvNQnZlNEjLMTDo9zNzZbavHJmNN4CW5q7t\nfQAPIC3VA49uMjfAIa3dlPR/J1OjFoaFUHEbM0vQkpiKxjDzG1jEbwB+2fzGiz3D\nS45Iv1fBewKBgGyZth4if0GZYg+EOrfOP4ccd7OcV5ZAE2U5xG8NXo7ly0oSGCk8\n9auT6P+3Vw415GITuTgiyckNc6oFi58wi73GWYkh4v4eiiCBunT9AyHaeBQQGZHt\nUVIGFdZaDMCPbPv1XDYW6wFfrZAlEZbvQvnypvlQJYSiAKYHzdELTqKhAoGAKdzp\n9WVE0Wj8woArA1v0RQX6nM3i1P79qG+Cwrhsiu+kYhlpUn/8wLJM7QPL1g1Fw9Ad\nTY6xG5tBsZCWHSIaGrGRwVarHTM9fvPKAEFEl/rIca/Pgm4EtHQWpERA07Bj0A55\nRLUVC9uEsWDjVvlo6tc/7UdnVHmPK29YKhG/0mMCgYB+Sb/LcWkFM1mIBDLmmz+H\n9xdgR2R76hJumWAXhTIPzT054+zZQZW74iajPmOC7JzjGXmM6CmNZyU0xoAoFaZX\nAfCZAj1oPJ51qaFderkPoS8WkpQQ4kb62jE5FdnjZeS4ydv4n2JGuMe9Ql9tJ8Gs\nuzF4qB6Ny4sywYsmLupQDQ==\n-----END PRIVATE KEY-----\n",
  client_email: "firebase-adminsdk-fbsvc@doctor-appointment-syste-23828.iam.gserviceaccount.com"
};

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

function isNowInSlot(currentDay, currentMinutes, startDay, startTimeStr, endDay, endTimeStr) {
  const [startH, startM] = startTimeStr.split(':').map(Number);
  const [endH, endM] = endTimeStr.split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  if (startDay === endDay) {
    return currentDay === startDay && currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  }
  if (startDay < endDay) {
    if (currentDay > startDay && currentDay < endDay) return true;
    if (currentDay === startDay && currentMinutes >= startMinutes) return true;
    if (currentDay === endDay && currentMinutes <= endMinutes) return true;
  } else {
    if (currentDay > startDay || currentDay < endDay) return true;
    if (currentDay === startDay && currentMinutes >= startMinutes) return true;
    if (currentDay === endDay && currentMinutes <= endMinutes) return true;
  }
  return false;
}

const myScheduleHandler = async function(event, context) {
  try {
    const docRef = db.collection('settings').doc('appointmentNotice');
    const doc = await docRef.get();
    
    if (!doc.exists) return { statusCode: 404 };
    
    const data = doc.data();
    if (data.statusType !== 'scheduled') return { statusCode: 200 };
    
    // Bangladesh Timezone Convert
    const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Dhaka" }));
    const currentDay = now.getDay();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    let shouldBeActive = false;
    if (data.slot1) {
      const s1 = data.slot1;
      shouldBeActive = isNowInSlot(
        currentDay, 
        currentMinutes,
        Number(s1.startDay), 
        s1.startTime, 
        Number(s1.endDay), 
        s1.endTime
      );
    }
    
    if (data.active !== shouldBeActive) {
      await docRef.update({
        active: shouldBeActive,
        lastAutoUpdate: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log(`✅ Status changed to: ${shouldBeActive}`);
    }
    
    return { statusCode: 200, body: JSON.stringify({ active: shouldBeActive }) };
  } catch (error) {
    console.error('❌ Error:', error);
    return { statusCode: 500, body: error.toString() };
  }
};

// Netlify Scheduled Cron (প্রতি ১ মিনিটে চলবে)
exports.handler = schedule('* * * * *', myScheduleHandler);