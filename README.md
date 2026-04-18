# BYNDIO — India's Zero-Commission Marketplace

> **SHOP • SELL • EARN** — B2C + B2B + Influencer + Affiliate + Dropshipping

---

## 🚀 Deploy in 4 Steps (Netlify + Supabase)

### Step 1: Set Up Supabase
1. [supabase.com](https://supabase.com) → New Project
2. **SQL Editor** → paste and run `supabase/schema.sql`
3. **SQL Editor** → paste and run `supabase/patch_fixes.sql` *(security fixes + missing tables)*
4. **Project Settings → API** → copy `Project URL` and `anon public` key
5. **Authentication → Providers** → enable Email + Google OAuth
6. **Authentication → Settings → Site URL** → set to your domain
7. **Storage** → create private bucket named `kyc-documents`

### Step 2: Deploy to Netlify
1. Push to GitHub → Netlify → **Add New Site → Import from Git**
2. Build: `npm run build` · Publish: `dist`
3. **Environment Variables** → fill in all variables from `.env.local.example`

### Step 3: Make Yourself Admin
```sql
UPDATE public.users SET role = 'admin' WHERE email = 'your@email.com';
```

### Step 4: Configure Content
Admin → `/admin` → Site Settings → add contact phone (enables WhatsApp button), address, support email.

---

## ✅ Feature Summary

**Buyer** — Search, cart, Razorpay checkout (UPI/Card/COD), order tracking, returns, GST invoices, rewards, gamification

**Seller** — Dashboard, add/edit/delete products, CSV bulk upload, order notifications, AWB tracking, wallet, withdrawals, KYC, subscription plans, boost/sponsor

**Creator** — Affiliate links, promo codes (DB-backed), campaign marketplace, earnings, leaderboard

**Admin** — Orders, users, returns (auto-refund), withdrawals (approve/reject), coupons, KYC review, flash sales, site settings, payouts

---

## 🗄️ Database Patches (supabase/patch_fixes.sql)

| Fix | Detail |
|-----|--------|
| `withdrawal_requests` | Payout request table for sellers/buyers |
| `coupon_uses` | Per-user coupon single-use enforcement |
| `decrement_stock` RPC | Stock decrement on order |
| `wallet_upd` RLS fix | Prevent users from editing others' wallets |
| `rp_insert` RLS fix | Prevent users from awarding themselves points |
| `notif_insert` RLS fix | Prevent notification spam |
| Role escalation trigger | Block users from updating their own role |
| `orders_buyer_cancel` | RLS policy for buyer order cancellation |
| `return_requests` admin | Admin UPDATE access on returns |
| KYC storage bucket | Private bucket with per-user RLS |
| `subscription_expires_at` | Subscription expiry on users table |
| Refund tracking columns | `refund_id`, `refund_status` on return_requests |
| Dropshipping columns | `is_dropship`, `dropship_supplier_id` on products |
| `created_by` on coupons | Creator-owned promo codes |

---

## 🔧 Local Development

```bash
npm install
cp .env.local.example .env.local   # fill in Supabase keys
npm run dev
npx netlify dev                     # second terminal — for serverless functions
```

---

## 🚦 Needs External Setup Before Going Live

| Feature | Needs |
|---------|-------|
| Real payments | Razorpay merchant KYC + live keys |
| Transactional email | Resend account + verified sending domain |
| Shipping | Shiprocket credentials |
| Phone OTP | Supabase phone auth (Twilio) enabled |
| Error monitoring | Sentry DSN in env vars |
| Analytics | GA4 Measurement ID + Clarity Project ID |

---

*React 19 · TypeScript · Vite · Tailwind v4 · Supabase · Netlify*  
*BYNDIO Technologies Pvt Ltd · Mumbai, Maharashtra, India*
