/**
 * GDP-based pricing tiers using World Bank 2024 income groups.
 *
 * Tier   | GNI/capita  | Monthly USD
 * -------|-------------|------------
 * high   | > $13,845   | $29.99
 * middle | $1,136–$13,845 | $14.99
 * low    | < $1,136    | $4.99
 */

export type Tier = 'high' | 'middle' | 'low';

export interface TierPricing {
  tier: Tier;
  usd: number;           // monthly price in USD
  label: string;
  countries: string[];   // ISO 3166-1 alpha-2
}

/** Monthly fiat prices per tier (USD) */
export const TIER_USD: Record<Tier, number> = {
  high:   29.99,
  middle: 14.99,
  low:     4.99,
};

// ─── Country → tier mapping ───────────────────────────────────────────────────

/** High-income countries (World Bank 2024) */
const HIGH_INCOME: string[] = [
  'AU','AT','BE','BH','CA','HR','CY','CZ','DK','EE',
  'FI','FR','DE','GR','HU','IS','IE','IL','IT','JP',
  'KR','KW','LV','LT','LU','MT','NL','NZ','NO','OM',
  'PL','PT','QA','SA','SG','SK','SI','ES','SE','CH',
  'AE','GB','US','BN','CL','HK','MO','MS','NC','PF',
  'PR','TW','VI','GU','BM','KY','VG','TC','GI','JE',
  'GG','IM','FO','GL','PM','SJ','AW','CW','SX','BQ',
  'MF','GP','MQ','RE','YT','GF','SM','LI','MC','AD',
  'VA','TT','BS','BB','PA',
];

/** Middle-income countries (World Bank 2024 upper-middle + lower-middle) */
const MIDDLE_INCOME: string[] = [
  // Upper-middle
  'AG','AL','AM','AZ','BA','BW','BR','BY','BZ','CN',
  'CO','CU','DM','DO','DZ','EC','FJ','GA','GD','GQ',
  'GT','GY','ID','IR','IQ','JM','JO','KZ','LB','LC',
  'LY','MY','MV','MX','MK','MN','ME','MA','NA','PW',
  'PE','RS','ZA','ST','WS','SR','TH','TM','TN','TR',
  'TV','VE','VC','XK',
  // Lower-middle
  'BD','BO','BT','CV','CM','CF','CG','CI','DJ','EG',
  'SZ','GH','GN','GW','HN','IN','KE','KG','LA','MR',
  'FM','MD','MZ','MM','NI','NG','PK','PG','PH','SN',
  'SB','LK','TZ','TJ','TL','UA','UZ','VN','ZM','ZW',
  'PS','SO','SD','SY','YE','HT','KH','NP','LS','MG',
  'MW','ML','MU','MH','KI','TO','VU','WF',
];

/** Derive tier from ISO country code */
export function countryToTier(countryCode: string): Tier {
  const code = countryCode.toUpperCase();
  if (HIGH_INCOME.includes(code))   return 'high';
  if (MIDDLE_INCOME.includes(code)) return 'middle';
  return 'low';  // default: low income
}

export function tierLabel(tier: Tier): string {
  return { high: 'Standard', middle: 'Regional', low: 'Access' }[tier];
}

/** Detect country from request IP using ip-api.com (free, no key required) */
export async function detectCountryFromIp(ip: string): Promise<string | null> {
  if (!ip || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('172.') || ip.startsWith('10.')) {
    return null; // Private/loopback — can't geolocate
  }
  try {
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=countryCode,status`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return null;
    const data = await res.json() as { status: string; countryCode?: string };
    return data.status === 'success' ? (data.countryCode ?? null) : null;
  } catch {
    return null;
  }
}
