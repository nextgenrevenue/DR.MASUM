exports.handler = async function(event, context) {
  // CORS প্রি-ফ্লাইট (Preflight) রিকোয়েস্ট হ্যান্ডেল করা
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  // শুধুমাত্র POST রিকোয়েস্ট অনুমতি দেওয়া
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    // ফ্রন্টএন্ড থেকে আসা ডাটা রিসিভ করা
    const { phone, name, serial, date } = JSON.parse(event.body);

    // ফোন নম্বর চেক
    if (!phone) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ error: 'Phone number is required' })
      };
    }

    // =============================================
    // 📱 ফোন নম্বর ফরম্যাট ঠিক করা (আন্তর্জাতিক ফরম্যাট)
    // =============================================
    let formattedPhone = phone.toString().trim();
    
    // সব ধরনের স্পেস, ড্যাশ, ব্র্যাকেট বাদ দেওয়া
    formattedPhone = formattedPhone.replace(/[\s\-\(\)\+]/g, '');
    
    // শুধুমাত্র সংখ্যা রাখা
    formattedPhone = formattedPhone.replace(/\D/g, '');
    
    // ফরম্যাট চেক ও কনভার্ট
    if (formattedPhone.startsWith('0')) {
      // 017XXXXXXXX → 88017XXXXXXXX
      formattedPhone = '88' + formattedPhone.substring(1);
    } else if (formattedPhone.startsWith('880')) {
      // ইতিমধ্যে সঠিক ফরম্যাটে আছে
      formattedPhone = formattedPhone;
    } else if (formattedPhone.startsWith('88') && !formattedPhone.startsWith('880')) {
      // 88 দিয়ে শুরু কিন্তু 880 না হলে
      formattedPhone = '88' + formattedPhone.substring(2);
    } else if (!formattedPhone.startsWith('88') && formattedPhone.length === 11) {
      // 11 ডিজিটের নম্বর (017XXXXXXXX)
      formattedPhone = '88' + formattedPhone;
    } else if (formattedPhone.length === 10) {
      // 10 ডিজিটের নম্বর (17XXXXXXXX)
      formattedPhone = '880' + formattedPhone;
    }
    
    // ✅ নিশ্চিত করা যে নম্বরটি 13 ডিজিটের (8801XXXXXXXXX)
    if (formattedPhone.length !== 13 || !formattedPhone.startsWith('880')) {
      console.warn('⚠️ ফোন নম্বর ফরম্যাট সঠিক নয়:', formattedPhone);
      // তবুও পাঠানোর চেষ্টা করা
    }
    
    console.log('📱 Original phone:', phone);
    console.log('📱 Formatted phone:', formattedPhone);

    // =============================================
    // 📨 এসএমএস কনফিগারেশন
    // =============================================
    const apiKey = "5eb80a33837009444c330abc5c7335e4";
    const senderId = "8809617635159";

    // মেসেজ তৈরি (বাংলা ও ইংরেজি মিক্স)
    const message = `Dear ${name || "Patient"}, your serial is successful. Serial No: ${serial || ""}, Date: ${date || ""}. Thank you! For the next serial, visit: https://drmasum.netlify.app/`;

    // URL এনকোড করা
    const encodedMessage = encodeURIComponent(message);
    
    // Automas API V3 URL
    const url = `https://api.automas.com.bd/smsapiv3?apikey=${apiKey}&sender=${senderId}&msisdn=${formattedPhone}&smstext=${encodedMessage}&smsformat=1`;

    console.log('📤 Sending SMS to:', formattedPhone);
    console.log('📝 Message:', message);

    // =============================================
    // 🚀 এসএমএস পাঠানো
    // =============================================
    const response = await fetch(url);
    const responseData = await response.text();
    
    console.log('📥 API Response:', responseData);

    // ✅ সফলতা চেক করা
    const isSuccess = responseData.includes('Success') || 
                      responseData.includes('success') || 
                      responseData.includes('OK') || 
                      responseData.includes('SENT') ||
                      responseData.includes('ACCEPTED') ||
                      response.ok;

    // যদি Response এ Error থাকে
    if (responseData.includes('Error') || responseData.includes('error') || responseData.includes('Failed')) {
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          success: false,
          message: 'SMS sending failed',
          api_response: responseData,
          sent_to: formattedPhone
        })
      };
    }

    // ✅ সফল রেসপন্স
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: isSuccess,
        message: isSuccess ? 'SMS sent successfully' : 'SMS sending had issues',
        api_response: responseData,
        sent_to: formattedPhone,
        original_phone: phone
      })
    };

  } catch (error) {
    // ❌ এরর হ্যান্ডেল
    console.error('❌ SMS Function Error:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: false,
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    };
  }
};