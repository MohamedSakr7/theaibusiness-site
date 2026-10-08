(() => {
  const element = document.querySelector('#my-cal-inline-gtm-readout');
  if (!element) return;
  const status = document.querySelector('#booking-status');
  const help = document.querySelector('.booking-help');
  let ready = false;
  let started = false;
  let slowTimer;
  function showFallback() {
    if (ready) return;
    help?.classList.add('is-slow');
    if (status) status.textContent = 'Calendar taking too long? You can book directly in a new tab.';
    element.setAttribute('aria-busy', 'false');
  }
  function markReady() {
    ready = true;
    clearTimeout(slowTimer);
    help?.classList.remove('is-slow');
    if (status) status.hidden = true;
    element.setAttribute('aria-busy', 'false');
  }
  function loadBooking() {
    if (started) return;
    started = true;
    element.setAttribute('aria-busy', 'true');
    slowTimer = setTimeout(showFallback, 12000);
    (function (C, A, L) {
      const p = (a, ar) => a.q.push(ar);
      const d = C.document;
      C.Cal = C.Cal || function () {
        const cal = C.Cal, ar = arguments;
        if (!cal.loaded) {
          cal.ns = {}; cal.q = cal.q || [];
          const script = d.createElement('script');
          script.src = A;
          script.async = true;
          script.onerror = showFallback;
          d.head.appendChild(script);
          cal.loaded = true;
        }
        if (ar[0] === L) {
          const api = function () { p(api, arguments); };
          const namespace = ar[1]; api.q = api.q || [];
          if (typeof namespace === 'string') {
            cal.ns[namespace] = cal.ns[namespace] || api;
            p(cal.ns[namespace], ar); p(cal, ['initNamespace', namespace]);
          } else p(cal, ar);
          return;
        }
        p(cal, ar);
      };
    })(window, 'https://app.cal.com/embed/embed.js', 'init');
    window.Cal('init', 'gtm-readout', {origin:'https://app.cal.com'});
    window.Cal.config = window.Cal.config || {};
    window.Cal.config.forwardQueryParams = true;
    // Cal's linkReady event means the booking UI is usable, unlike iframe.load.
    window.Cal.ns['gtm-readout']('on', {action:'linkReady',callback:markReady});
    window.Cal.ns['gtm-readout']('on', {action:'linkFailed',callback:showFallback});
    window.Cal.ns['gtm-readout']('inline', {
      elementOrSelector:'#my-cal-inline-gtm-readout',
      config:{layout:'month_view',useSlotsViewOnSmallScreen:'true',theme:'dark'},
      calLink:'the-ai-business/gtm-readout'
    });
    window.Cal.ns['gtm-readout']('ui', {
      cssVarsPerTheme:{light:{'cal-brand':'#ff6000'},dark:{'cal-brand':'#ff6000'}},
      hideEventTypeDetails:false,layout:'month_view'
    });
  }
  // Start while visitors read the page, rather than after they reach the CTA.
  loadBooking();
})();
