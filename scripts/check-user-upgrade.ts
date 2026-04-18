/**
 * Check if user was upgraded to PRO after webhook fix
 * Queries Supabase directly to verify the fix
 */

import { supabase } from '../src/lib/supabaseClient.js';

async function checkUserUpgrade() {
  const userId = '133c94ea-5943-481c-b7d0-a7a5e429d01f';
  
  console.log('\n══════════════════════════════════════════════');
  console.log('   CHECKING USER UPGRADE STATUS');
  console.log('══════════════════════════════════════════════\n');
  
  console.log(`User ID: ${userId}\n`);

  const { data, error } = await supabase
    .from('users')
    .select('id, email, plan, stripe_customer_id, stripe_subscription_id, rate_limit, created_at')
    .eq('id', userId)
    .single();

  if (error) {
    console.log(`❌ Error: ${error.message}`);
    return;
  }

  if (!data) {
    console.log(`❌ User not found`);
    return;
  }

  console.log('📋 User Data:');
  console.log(`   Email: ${data.email}`);
  console.log(`   Plan: ${data.plan} ${data.plan === 'pro' ? '✅' : '❌ (should be pro)'}`);
  console.log(`   Stripe Customer ID: ${data.stripe_customer_id || 'N/A'}`);
  console.log(`   Stripe Subscription ID: ${data.stripe_subscription_id || 'N/A'}`);
  console.log(`   Rate Limit: ${data.rate_limit}`);
  console.log(`   Created At: ${data.created_at}`);

  console.log('\n══════════════════════════════════════════════');
  
  if (data.plan === 'pro' && data.stripe_subscription_id) {
    console.log('✅ USER SUCCESSFULLY UPGRADED TO PRO!');
    console.log('   Webhook fix is working correctly.');
  } else if (data.plan === 'pro') {
    console.log('⚠️  User is PRO but stripe_subscription_id is missing');
    console.log('   May have been upgraded manually or via old webhook.');
  } else {
    console.log('❌ USER IS STILL ON FREE PLAN');
    console.log('   Webhook failed to update user.');
    console.log('   Possible causes:');
    console.log('   - Old webhook (before fix) processed the event');
    console.log('   - Supabase RLS policy blocking update');
    console.log('   - User ID mismatch');
    console.log('\n   To fix: User should do a NEW checkout to trigger');
    console.log('   a new webhook event with the fixed code.');
  }
  
  console.log('══════════════════════════════════════════════\n');
}

checkUserUpgrade().catch(console.error);
