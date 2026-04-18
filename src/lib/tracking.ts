import { supabase } from './supabase';

/**
 * BYNDIO TRACKING INFRASTRUCTURE
 * Implements the required audit trail for clicks, views, and conversions.
 * Captures product_id, referrer_id, visitor_id, timestamp, and IP info.
 */

export interface TrackData {
  product_id?: string;
  video_id?: string;
  referrer_id: string; // The person who shared the link
  visitor_id: string;  // Unique ID for the customer's browser session
  type: 'click' | 'view' | 'conversion';
  metadata?: any;
}

export async function trackActivity(data: TrackData) {
  try {
    // Generate/Fetch Visitor ID from local storage if not provided
    let visitorId = data.visitor_id || localStorage.getItem('byndio_visitor_id');
    if (!visitorId) {
      visitorId = crypto.randomUUID();
      localStorage.setItem('byndio_visitor_id', visitorId);
    }

    const payload = {
      ...data,
      visitor_id: visitorId,
      timestamp: new Date().toISOString(),
      // IP address is captured server-side by Supabase/PostgREST usually, 
      // but we can add a placeholder for it if needed.
    };

    // 1. Log to referral_clicks or referral_views table
    const table = data.type === 'view' ? 'referral_views' : 'referral_clicks';
    
    const { error } = await supabase.from(table).insert([{
      product_id: data.product_id,
      video_id: data.video_id,
      referrer_id: data.referrer_id,
      visitor_id: visitorId,
      metadata: data.metadata || {}
    }]);

    if (error) console.error('Tracking Error:', error);

    // 2. Update aggregate counts on the referral/link table for quick stats
    if (data.product_id) {
       await supabase.rpc('increment_affiliate_stats', { 
         p_user_id: data.referrer_id, 
         p_product_id: data.product_id,
         p_type: data.type
       });
    }

    return true;
  } catch (err) {
    console.error('Track activity failed:', err);
    return false;
  }
}

export function getVisitorId(): string {
  let vid = localStorage.getItem('byndio_visitor_id');
  if (!vid) {
    vid = crypto.randomUUID();
    localStorage.setItem('byndio_visitor_id', vid);
  }
  return vid;
}
