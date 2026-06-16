// netlify/functions/send-sms.js

exports.handler = async function(event, context) {
    // CORS হেডার
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    // OPTIONS (Preflight)
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    // শুধু POST
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method Not Allowed' })
        };
    }

    try {
        const { phone, name, serial, date } = JSON.parse(event.body);

        if (!phone) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Phone number is required' })
            };
        }

        console.log('📥 রিকোয়েস্ট:', { phone, name, serial, date });

        // =============================================
        // 📱 ফোন ফরম্যাট
        // =============================================
        let formattedPhone = phone.toString().replace(/\D/g, '');
        
        if (formattedPhone.startsWith('01') && formattedPhone.length === 11) {
            formattedPhone = '880' + formattedPhone.substring(1);
        } else if (formattedPhone.length === 10 && formattedPhone.startsWith('1')) {
            formattedPhone = '880' + formattedPhone;
        } else if (formattedPhone.startsWith('88') && formattedPhone.length === 12) {
            formattedPhone = '880' + formattedPhone.substring(2);
        }

        console.log('📱 Formatted:', formattedPhone);

        // =============================================
        // 🔤 নাম ক্লিন
        // =============================================
        function cleanName(name) {
            if (!name) return 'Patient';
            const englishOnly = name.replace(/[^\x00-\x7F]/g, '').trim();
            return englishOnly || 'Patient';
        }

        const cleanPatientName = cleanName(name);

        // =============================================
        // 📨 SMS কনফিগারেশন
        // =============================================
        const apiKey = "74a82f2a949057f0e67fa4b672f75275";
        const senderId = "8809617635159";

        const message = `Dear ${cleanPatientName}, your serial is successful. Serial No: ${serial || ""}, Date: ${date || ""}. Thank you! For the next serial, visit: https://drmasum.netlify.app/`;

        const url = `https://api.automas.com.bd/smsapiv3?apikey=${apiKey}&sender=${senderId}&msisdn=${formattedPhone}&smstext=${encodeURIComponent(message)}&smsformat=1`;

        console.log('📤 Sending to:', formattedPhone);

        // =============================================
        // 🚀 SMS পাঠানো
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
        let errorMsg = null;

        try {
            const jsonResponse = JSON.parse(responseData);
            if (jsonResponse.response && jsonResponse.response.length > 0) {
                const firstResponse = jsonResponse.response[0];
                statusCode = firstResponse.status;
                messageId = firstResponse.id;
                
                if (statusCode === 100 || statusCode === 109) {
                    isSuccess = true;
                } else {
                    if (statusCode === 101) errorMsg = 'ব্যালেন্স কম';
                    else if (statusCode === 102) errorMsg = 'ভুল API Key';
                    else if (statusCode === 103) errorMsg = 'ভুল সেন্ডার আইডি';
                    else if (statusCode === 104) errorMsg = 'ভুল নম্বর';
                    else errorMsg = `স্ট্যাটাস: ${statusCode}`;
                }
            }
        } catch (e) {
            if (responseData.includes('Success') || responseData.includes('success')) {
                isSuccess = true;
            } else {
                errorMsg = responseData || 'Unknown error';
            }
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: isSuccess,
                status: statusCode,
                message_id: messageId,
                error: errorMsg,
                api_response: responseData,
                sent_to: formattedPhone
            })
        };

    } catch (error) {
        console.error('❌ Error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                error: error.message
            })
        };
    }
};