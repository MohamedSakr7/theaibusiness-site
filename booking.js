(() => {
  const element = document.querySelector('#my-cal-inline-gtm-readout');
  if (!element) return;
  let started = false;
  function loadBooking() {
    if (started) return;
    started = true;
    (function (C, A, L) {
      const p = (a, ar) => a.q.push(ar);
      const d = C.document;
      C.Cal = C.Cal || function () {
        const cal = C.Cal, ar = arguments;
        if (!cal.loaded) {
          cal.ns = {}; cal.q = cal.q || [];
          d.head.appendChild(d.createElement('script')).src = A;
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
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        observer.disconnect(); loadBooking();
      }
    }, {rootMargin:'600px'});
    observer.observe(element);
  } else loadBooking();
})();
