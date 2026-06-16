exports.handler = async function(event, context) {
  // CORS প্রি-ফ্লাইট
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

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    const { phone, name, serial, date } = JSON.parse(event.body);

    if (!phone) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Phone number is required' })
      };
    }

    // =============================================
    // 📱 ফোন নম্বর ফরম্যাট
    // =============================================
    let formattedPhone = phone.toString().trim();
    formattedPhone = formattedPhone.replace(/[\s\-\(\)\+]/g, '');
    formattedPhone = formattedPhone.replace(/\D/g, '');
    
    if (formattedPhone.startsWith('01') && formattedPhone.length === 11) {
      formattedPhone = '880' + formattedPhone.substring(1);
    } else if (formattedPhone.length === 10 && formattedPhone.startsWith('1')) {
      formattedPhone = '880' + formattedPhone;
    } else if (formattedPhone.startsWith('88') && formattedPhone.length === 12) {
      formattedPhone = '880' + formattedPhone.substring(2);
    }
    
    console.log('📱 Original:', phone);
    console.log('📱 Formatted:', formattedPhone);

    // =============================================
    // 📨 এসএমএস কনফিগারেশন
    // =============================================
    const apiKey = "5eb80a33837009444c330abc5c7335e4";
    const senderId = "8809617635159";

    const message = `Dear ${name || "Patient"}, Serial: ${serial || ""}, Date: ${date || ""}. Thank you!`;
    const url = `https://api.automas.com.bd/smsapiv3?apikey=${apiKey}&sender=${senderId}&msisdn=${formattedPhone}&smstext=${encodeURIComponent(message)}&smsformat=1`;

    console.log('📤 URL:', url);

    // =============================================
    // 🚀 এসএমএস পাঠানো
    // =============================================
    const response = await fetch(url);
    const responseData = await response.text();
    
    console.log('📥 Raw API Response:', responseData);

    // =============================================
    // ✅ সঠিক রেসপন্স পার্সিং
    // =============================================
    let isSuccess = false;
    let statusCode = null;
    let messageId = null;
    let errorMsg = null;

    try {
      // JSON রেসপন্স পার্স করার চেষ্টা
      const jsonResponse = JSON.parse(responseData);
      
      console.log('📊 Parsed JSON:', jsonResponse);
      
      if (jsonResponse.response && Array.isArray(jsonResponse.response)) {
        const firstResponse = jsonResponse.response[0];
        statusCode = firstResponse.status;
        messageId = firstResponse.id;
        
        // ✅ সঠিক স্ট্যাটাস চেক
        if (statusCode === 100 || statusCode === 109) {
          isSuccess = true;
          console.log('✅ SMS সফল! Status:', statusCode);
        } else {
          errorMsg = `API Status: ${statusCode}`;
          console.log('❌ API Status:', statusCode);
          
          // Status কোড অনুযায়ী এরর মেসেজ
          if (statusCode === 101) errorMsg = 'ব্যালেন্স কম';
          else if (statusCode === 102) errorMsg = 'ভুল API Key';
          else if (statusCode === 103) errorMsg = 'ভুল সেন্ডার আইডি';
          else if (statusCode === 104) errorMsg = 'ভুল নম্বর';
        }
      } else {
        errorMsg = 'Invalid API response format';
      }
    } catch (e) {
      // JSON না হলে টেক্সট চেক
      console.log('📝 Text Response:', responseData);
      if (responseData.includes('Success') || responseData.includes('success')) {
        isSuccess = true;
      } else {
        errorMsg = responseData || 'Unknown error';
      }
    }

    // =============================================
    // 📊 ফাইনাল রেসপন্স
    // =============================================
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: isSuccess,
        status: statusCode,
        message_id: messageId,
        error: errorMsg,
        api_response: responseData,
        sent_to: formattedPhone,
        original: phone
      })
    };

  } catch (error) {
    console.error('❌ Error:', error);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};
