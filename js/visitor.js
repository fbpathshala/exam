/* Facebook Pathshala — Visitor Tracking */
(function () {
  'use strict';

  try {
    // Supabase client ও configuration যাচাই
    if (
      !window.supabase ||
      !window.FACEBOOK_PATHSHALA_CONFIG
    ) {
      console.warn(
        'Visitor tracking: Supabase configuration not found.'
      );
      return;
    }

    const config = window.FACEBOOK_PATHSHALA_CONFIG;

    if (!config.SUPABASE_URL || !config.SUPABASE_KEY) {
      console.warn(
        'Visitor tracking: Supabase URL or key missing.'
      );
      return;
    }

    // একই ব্রাউজারকে বারবার নতুন ভিজিটর হিসেবে গণনা না করা
    const storageKey = 'fbpathshala_visitor_id';
    let visitorId = localStorage.getItem(storageKey);

    if (!visitorId) {
      visitorId =
        typeof crypto !== 'undefined' &&
        typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : 'v-' +
            Date.now() +
            '-' +
            Math.random().toString(36).slice(2);

      localStorage.setItem(storageKey, visitorId);
    }

    // Supabase client তৈরি
    const db = window.supabase.createClient(
      config.SUPABASE_URL,
      config.SUPABASE_KEY
    );

    // ভিজিটর রেকর্ড তৈরি অথবা শেষবার ভিজিটের সময় আপডেট
    db.from('site_visitors')
      .upsert(
        {
          visitor_key: visitorId,
          last_seen: new Date().toISOString()
        },
        {
          onConflict: 'visitor_key',
          ignoreDuplicates: false
        }
      )
      .then(function (result) {
        if (result.error) {
          console.error(
            'Visitor tracking failed:',
            result.error.message
          );
          return;
        }

        console.log('Visitor tracking completed.');
      })
      .catch(function (error) {
        console.error(
          'Visitor tracking error:',
          error
        );
      });

  } catch (error) {
    console.error(
      'Visitor tracking initialization failed:',
      error
    );
  }
})();
