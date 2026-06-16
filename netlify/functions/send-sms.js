// netlify/functions/send-sms.js

exports.handler = async (event, context) => {
  // ১. নিরাপত্তা চেক: শুধুমাত্র POST রিকোয়েস্ট গ্রহণ করা হবে
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method Not Allowed. Use POST request." }),
    };
  }

  try {
    // ২. ফ্রন্টএন্ড (appointment.html / dashboard.html) থেকে পাঠানো ডাটা রিসিভ করা
    const { phone, name, serial, date } = JSON.parse(event.body);

    // ৩. ফোন নম্বর ভ্যালিডেশন
    if (!phone) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Phone number is required" }),
      };
    }

    // ৪. 🔒 Netlify Environment Variables থেকে গোপন API Credentials রিড করা (GitHub এ নিরাপদ)
    const apiKey = process.env.AUTOMAS_API_KEY;
    const senderId = process.env.AUTOMAS_SENDER_ID;
    
    // ড্যাশবোর্ড বা ব্যাকএন্ডে কনফিগারেশন মিসিং থাকলে এরর হ্যান্ডলিং
    if (!apiKey || !senderId) {
      return { 
        statusCode: 500, 
        body: JSON.stringify({ error: "API Credentials are not configured in Netlify Settings." }) 
      };
    }

    // ৫. প্রফেশনাল বাংলা মেসেজ টেমপ্লেট তৈরি
    // উদাহরণ: প্রিয় আবির হোসেন, আপনার সিরিয়ালটি সফলভাবে বুক হয়েছে। সিরিয়াল নং: ২৫, তারিখ: ১৬-০৬-২০২৬। ধন্যবাদ!
    const smsText = `Dear ${name || "Patient"}, your serial is successful. Serial No: ${serial || ""}, Date: ${date || ""}. Thank you! For the next serial, visit: https://drmasum.netlify.app/`;

    // ৬. Automas API V3 গেটওয়ে ইউআরএল তৈরি
    const automasUrl = `https://api.automas.com.bd/smsapiv3?apikey=${apiKey}&sender=${senderId}&msisdn=${phone}&smstext=${encodeURIComponent(smsText)}&smsformat=1`;

    // ৭. নেটলিফাই ব্যাকএন্ড থেকে সরাসরি Automas API হিট করা (ব্রাউজারে কোনো CORS এরর আসবে না)
    const response = await fetch(automasUrl);
    
    if (!response.ok) {
      throw new Error("Automas Gateway responded with an error");
    }

    const responseData = await response.json();
    console.log("📲 Automas API Response Log:", responseData);

    // ৮. ফ্রন্টএন্ডে সফল রেসপন্স পাঠানো
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*", // যেকোনো পেজ থেকে সিকিউর কানেকশনের জন্য
      },
      body: JSON.stringify({ 
        success: true, 
        message: "SMS sent successfully via Netlify!",
        api_response: responseData 
      }),
    };

  } catch (error) {
    console.error("❌ SMS Function Internal Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};