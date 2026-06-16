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
    // 🔤 নাম ক্লিন করা (শুধু ইংরেজি)
    // =============================================
    function cleanName(name) {
      if (!name) return 'Patient';
      
      // শুধু ইংরেজি অক্ষর, সংখ্যা ও স্পেস রাখুন
      const englishOnly = name.replace(/[^\x00-\x7F]/g, '').trim();
      
      // যদি কোনো ইংরেজি অক্ষর না থাকে, তাহলে 'Patient' ব্যবহার করুন
      return englishOnly || 'Patient';
    }

    const cleanPatientName = cleanName(name);
    console.log('📝 Original Name:', name);
    console.log('📝 Clean Name:', cleanPatientName);

    // =============================================
    // 📨 এসএমএস কনফিগারেশন
    // =============================================
    const apiKey = "5eb80a33837009444c330abc5c7335e4";
    const senderId = "8809617635159";

    // ✅ মেসেজ (শুধু ইংরেজি - নাম ক্লিন করা)
    const message = `Dear ${cleanPatientName}, your serial is successful. Serial No: ${serial || ""}, Date: ${date || ""}. Thank you! For the next serial, visit: https://drmasum.netlify.app/`;

    // smsformat=1 = Text (ইংরেজি)
    const url = `https://api.automas.com.bd/smsapiv3?apikey=${apiKey}&sender=${senderId}&msisdn=${formattedPhone}&smstext=${encodeURIComponent(message)}&smsformat=1`;

    console.log('📤 Sending to:', formattedPhone);
    console.log('📝 Message:', message);
    console.log('📏 Length:', message.length);

    // =============================================
    // 🚀 এসএমএস পাঠানো
    // =============================================
    const response = await fetch(url);
    const responseData = await response.text();
    
    console.log('📥 API Response:', responseData);

    // =============================================
    // ✅ রেসপন্স পার্সিং
    // =============================================
    let isSuccess = false;
    let statusCode = null;
    let messageId = null;

    try {
      const jsonResponse = JSON.parse(responseData);
      if (jsonResponse.response && jsonResponse.response.length > 0) {
        const firstResponse = jsonResponse.response[0];
        statusCode = firstResponse.status;
        messageId = firstResponse.id;
        
        if (statusCode === 100 || statusCode === 109) {
          isSuccess = true;
        }
      }
    } catch (e) {
      if (responseData.includes('Success') || responseData.includes('success')) {
        isSuccess = true;
      }
    }

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
        api_response: responseData,
        sent_to: formattedPhone,
        original_name: name,
        clean_name: cleanPatientName,
        message_length: message.length
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