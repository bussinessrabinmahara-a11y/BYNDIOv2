const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': event.headers['origin'] || '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  try {
    const { phone, otp } = JSON.parse(event.body);
    if (!phone || !otp) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Phone and OTP required' }) };

    const supabase = createClient(
      process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Verify OTP
    const { data: records, error } = await supabase
      .from('otp_verifications')
      .select('id, created_at')
      .eq('phone', phone)
      .eq('otp', otp)
      .eq('used', false)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error || !records || records.length === 0) {
      return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'Invalid or expired OTP' }) };
    }

    const record = records[0];
    const createdTime = new Date(record.created_at).getTime();
    if (Date.now() - createdTime > 10 * 60 * 1000) {
      return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'OTP expired' }) };
    }

    // Mark as used
    await supabase.from('otp_verifications').update({ used: true }).eq('id', record.id);

    return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to verify OTP' }) };
  }
};
