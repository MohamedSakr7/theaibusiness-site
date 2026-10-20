/* Google Analytics 4: one shared installation for the public website. */
(() => {
  'use strict';
  // Keep local previews, copies and embedded tools out of production reports.
  if (!['theaibusiness.net', 'www.theaibusiness.net'].includes(location.hostname) ||
      window.self !== window.top || window.__siteAnalyticsLoaded) return;
  window.__siteAnalyticsLoaded = true;

  const measurementId = 'G-PYB68Q1GZ3';
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', measurementId, {
    allow_google_signals: false,
    allow_ad_personalization_signals: false
  });

  const tag = document.createElement('script');
  tag.async = true;
  tag.src = 'https://www.googletagmanager.com/gtag/js?id=' + measurementId;
  document.head.appendChild(tag);
})();
