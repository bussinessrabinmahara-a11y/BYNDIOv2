// ================================================================
// VERIFY COD OTP — Validates the 6-digit OTP for Cash on Delivery
// Checks against `cod_otps` table, marks as verified on success
// ================================================================
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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
    const { phone, otp } = JSON.parse(event.body);
    if (!phone || !otp) {
      return { statusCode: 400, headers, body: JSON.stringify({ valid: false, error: 'Phone and OTP are required' }) };
    }

    if (otp.length !== 6 || !/^\d{6}$/.test(otp)) {
      return { statusCode: 400, headers, body: JSON.stringify({ valid: false, error: 'OTP must be a 6-digit number' }) };
    }

    // Find the latest unverified, non-expired OTP for this phone
    const { data: otpRecord, error: fetchError } = await supabase
      .from('cod_otps')
      .select('*')
      .eq('phone', phone)
      .eq('otp_code', otp)
      .eq('verified', false)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError) {
      console.error('[verify-cod-otp] Fetch error:', fetchError);
      return { statusCode: 500, headers, body: JSON.stringify({ valid: false, error: 'Verification service error' }) };
    }

    if (!otpRecord) {
      // Check if OTP exists but is expired
      const { data: expiredOtp } = await supabase
        .from('cod_otps')
        .select('id')
        .eq('phone', phone)
        .eq('otp_code', otp)
        .lt('expires_at', new Date().toISOString())
        .limit(1)
        .maybeSingle();

      if (expiredOtp) {
        return { statusCode: 400, headers, body: JSON.stringify({ valid: false, error: 'OTP has expired. Please request a new one.' }) };
      }

      return { statusCode: 400, headers, body: JSON.stringify({ valid: false, error: 'Invalid OTP. Please check and try again.' }) };
    }

    // Mark OTP as verified (prevents reuse)
    await supabase
      .from('cod_otps')
      .update({ verified: true })
      .eq('id', otpRecord.id);

    // Clean up all OTPs for this phone (non-blocking)
    supabase
      .from('cod_otps')
      .delete()
      .eq('phone', phone)
      .eq('verified', true)
      .then(() => {}).catch(() => {});

    return { statusCode: 200, headers, body: JSON.stringify({ valid: true, message: 'OTP verified successfully' }) };
  } catch (err) {
    console.error('[verify-cod-otp] Error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ valid: false, error: 'Verification failed. Please try again.' }) };
  }
};
