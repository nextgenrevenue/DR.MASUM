const axios = require('axios');

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
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    // ফ্রন্টএন্ড থেকে আসা ডাটা রিসিভ করা
    const { phone, name, serial, date } = JSON.parse(event.body);

    if (!phone) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Phone number is required' })
      };
    }

    // ১. আপনার এপিআই ক্রেডেনশিয়াল সরাসরি সেট করা হলো
    const apiKey = "5eb80a33837009444c330abc5c7335e4";
    const senderId = "8809617635159";

    // ২. আপনার কাস্টম মেসেজ ফরম্যাট (লিংক সহ)
    const message = `Dear ${name || "Patient"}, your serial is successful. Serial No: ${serial || ""}, Date: ${date || ""}. Thank you! For the next serial, visit: https://drmasum.netlify.app/`;

    // ৩. Automas API V3 এর URL তৈরি করা (মেসেজটি এখানে encodeURIComponent দিয়ে সেফ করা হয়েছে)
    const url = `https://api.automas.com.bd/smsapiv3?apikey=${apiKey}&sender=${senderId}&msisdn=${phone}&smstext=${encodeURIComponent(message)}&smsformat=1`;

    // ৪. Axios দিয়ে Automas সার্ভারে রিকোয়েস্ট পাঠানো
    const response = await axios.get(url);

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ success: true, api_response: response.data })
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};