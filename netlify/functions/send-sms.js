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
    // 📱 ফোন নম্বর ফরম্যাট - উন্নত ভার্সন
    // =============================================
    let formattedPhone = phone.toString().trim();
    
    // সব ধরনের স্পেস, ড্যাশ, ব্র্যাকেট, প্লাস সাইন বাদ
    formattedPhone = formattedPhone.replace(/[\s\-\(\)\+]/g, '');
    
    // শুধুমাত্র সংখ্যা রাখা
    formattedPhone = formattedPhone.replace(/\D/g, '');
    
    // ফরম্যাট চেক
    if (formattedPhone.length === 11 && formattedPhone.startsWith('01')) {
      // 017XXXXXXXX → 88017XXXXXXXX (সঠিক)
      formattedPhone = '880' + formattedPhone.substring(1);
      console.log('✅ 11 ডিজিট থেকে কনভার্ট:', formattedPhone);
    } 
    else if (formattedPhone.length === 13 && formattedPhone.startsWith('880')) {
      // ইতিমধ্যে সঠিক ফরম্যাটে আছে
      console.log('✅ ইতিমধ্যে সঠিক ফরম্যাট:', formattedPhone);
    }
    else if (formattedPhone.length === 10 && formattedPhone.startsWith('1')) {
      // 17XXXXXXXX → 88017XXXXXXXX
      formattedPhone = '880' + formattedPhone;
      console.log('✅ 10 ডিজিট থেকে কনভার্ট:', formattedPhone);
    }
    else if (formattedPhone.length === 12 && formattedPhone.startsWith('88')) {
      // 88017XXXXXXXX এর বদলে 881783315140 (ভুল)
      // 88 এর পর 01 থাকতে হবে
      if (!formattedPhone.startsWith('8801')) {
        // 881783315140 → 8801783315140
        formattedPhone = '880' + formattedPhone.substring(2);
        console.log('✅ 12 ডিজিট ফিক্স:', formattedPhone);
      }
    }
    
    // ✅ শেষ চেক: নম্বরটি 8801 দিয়ে শুরু হচ্ছে কিনা
    if (!formattedPhone.startsWith('8801')) {
      console.warn('⚠️ নম্বর ফরম্যাট সঠিক নয়:', formattedPhone);
      // তবুও পাঠানোর চেষ্টা
    }
    
    console.log('📱 Original:', phone);
    console.log('📱 Final:', formattedPhone);

    // =============================================
    // 📨 এসএমএস কনফিগারেশন
    // =============================================
    const apiKey = "5eb80a33837009444c330abc5c7335e4";
    const senderId = "8809617635159";

    // মেসেজ তৈরি (সংক্ষিপ্ত ও ক্লিয়ার)
    const message = `Dear ${name || "Patient"}, Serial: ${serial || ""}, Date: ${date || ""}. Thank you!`;

    // URL তৈরি
    const url = `https://api.automas.com.bd/smsapiv3?apikey=${apiKey}&sender=${senderId}&msisdn=${formattedPhone}&smstext=${encodeURIComponent(message)}&smsformat=1`;

    console.log('📤 Sending to:', formattedPhone);
    console.log('📝 Message:', message);
    console.log('🔗 URL:', url);

    // =============================================
    // 🚀 এসএমএস পাঠানো
    // =============================================
    const response = await fetch(url);
    const responseData = await response.text();
    
    console.log('📥 API Response:', responseData);

    // ✅ রেসপন্স ডিটেইল চেক
    const isSuccess = responseData.includes('Success') || 
                      responseData.includes('success') || 
                      responseData.includes('OK') || 
                      responseData.includes('SENT') ||
                      responseData.includes('ACCEPTED');

    // ❌ এরর মেসেজ চেক
    const isError = responseData.includes('Error') || 
                    responseData.includes('error') || 
                    responseData.includes('Failed') ||
                    responseData.includes('Insufficient');

    if (isError) {
      console.error('❌ API Error:', responseData);
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          success: false,
          error: 'SMS API Error',
          api_response: responseData,
          sent_to: formattedPhone,
          original: phone
        })
      };
    }

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: isSuccess,
        message: isSuccess ? 'SMS sent' : 'SMS failed',
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