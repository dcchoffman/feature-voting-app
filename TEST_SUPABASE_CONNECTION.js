// ============================================
// TEST SUPABASE CONNECTION
// ============================================
// Copy and paste this into your browser console (F12 → Console)
// while on the login page
// ============================================

// First, import supabase from the module
// Since it's not globally available, we need to access it differently
// Try this approach:

(async () => {
  try {
    console.log('Testing Supabase connection...');
    
    // Method 1: Try to access via window if it's exposed
    let supabaseClient = window.supabase;
    
    // Method 2: If not available, we'll need to check the Network tab instead
    if (!supabaseClient) {
      console.log('supabase not available in window. Checking Network tab...');
      console.log('Please try logging in and check the Network tab for requests to:');
      console.log('https://okdzllfpsvltjqryslnn.supabase.co/rest/v1/users');
      return;
    }
    
    // Test query
    const { data, error } = await supabaseClient
      .from('users')
      .select('count')
      .limit(0);
    
    if (error) {
      console.error('Connection test error:', error);
    } else {
      console.log('Connection test success:', data);
    }
  } catch (err) {
    console.error('Connection test exception:', err);
  }
})();

// Alternative: Check Network tab manually
console.log('\n=== ALTERNATIVE: Check Network Tab ===');
console.log('1. Open DevTools (F12)');
console.log('2. Go to Network tab');
console.log('3. Try logging in');
console.log('4. Look for a request to: https://okdzllfpsvltjqryslnn.supabase.co/rest/v1/users');
console.log('5. Check if it shows:');
console.log('   - Status: 200 (success) or error code');
console.log('   - Time: how long it took');
console.log('   - If it\'s pending forever, that\'s the problem');

