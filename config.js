/* Supabase connection settings for Daily Cleaning Log.
   Found in Supabase: Project Settings > API > Project URL / publishable key.

   The publishable key is designed to be public in browser apps. Access is
   controlled by Row Level Security in supabase/schema.sql. */
window.SUPABASE_URL = 'https://thtiglwxjbnoyrlkzxcc.supabase.co';
window.SUPABASE_ANON_KEY = 'sb_publishable_tRqTzy9CwEDjnX4wN3HKYQ_YuTi8fch';

/* Default display name for the original restaurant.
   New restaurants can be added in Supabase only - pass ?n=Name in their link. */
window.DEFAULT_RESTAURANT = 'shaking-tang';
window.RESTAURANT_NAMES = {
  'shaking-tang': 'Shaking Tang Management'
};
