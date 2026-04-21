// ================================================================
// SEND OTP — For COD order verification
// Generates a 6-digit OTP, stores it in Supabase `cod_otps` table,
// and sends it via SMS (or logs it in dev for testing).
// ================================================================
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': event.headers['origin'] || '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: 'Method Not Allowed' };
  }
  try {
    const { phone } = JSON.parse(event.body);
    if (!phone || phone.length < 10) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Valid phone number required' }) };
    }

    // Rate limit check removed as requested


    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min expiry

    // Store OTP in database
    const { error: insertError } = await supabase
      .from('cod_otps')
      .insert({
        phone,
        otp_code: otp,
        expires_at: expiresAt,
        verified: false
      });

    if (insertError) {
      console.error('[send-otp] Insert error:', insertError);
      throw new Error('Failed to generate OTP');
    }

    // Clean up expired OTPs (non-blocking)
    supabase
      .from('cod_otps')
      .delete()
      .lt('expires_at', new Date().toISOString())
      .then(() => {}).catch(() => {});

    // Send SMS via provider (MSG91 / Twilio / 2Factor)
    // For now, use Supabase phone OTP if configured, otherwise log for dev
    const smsApiKey = process.env.SMS_API_KEY;
    const smsProvider = process.env.SMS_PROVIDER || 'log'; // 'twilio', 'msg91', '2factor', 'log'

    if (smsProvider === 'twilio' && process.env.TWILIO_ACCOUNT_SID) {
      // Twilio SMS
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const fromNumber = process.env.TWILIO_PHONE_NUMBER;
      const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
      
      await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: `+91${phone.replace(/\D/g, '').slice(-10)}`,
          From: fromNumber,
          Body: `Your BYNDIO COD verification code is: ${otp}. Valid for 10 minutes. Do not share this code.`
        })
      });
    } else if (smsProvider === '2factor' && smsApiKey) {
      // 2Factor.in SMS API (popular in India)
      const cleanPhone = phone.replace(/\D/g, '').slice(-10);
      await fetch(`https://2factor.in/API/V1/${smsApiKey}/SMS/${cleanPhone}/${otp}/BYNDIO+OTP`);
    } else if (smsProvider === 'msg91' && smsApiKey) {
      // MSG91 SMS
      await fetch('https://control.msg91.com/api/v5/flow/', {
        method: 'POST',
        headers: {
          'authkey': smsApiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          flow_id: process.env.MSG91_FLOW_ID,
          mobiles: `91${phone.replace(/\D/g, '').slice(-10)}`,
          otp: otp
        })
      });
    } else {
      // Dev mode: Log OTP to console (visible in Netlify function logs)
      console.log(`[send-otp] DEV MODE — OTP for ${phone}: ${otp}`);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        message: 'OTP sent successfully',
        // Only include OTP in dev for testing — NEVER in production
        ...(process.env.CONTEXT !== 'production' ? { dev_otp: otp } : {})
      })
    };
  } catch (err) {
    console.error('[send-otp] Error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to send OTP. Please try again.' }) };
  }
};
