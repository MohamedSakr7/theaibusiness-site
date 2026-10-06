(() => {
  const reduced = matchMedia('(prefers-reduced-motion:reduce)');
  let motionOff = reduced.matches;
  const motionButton = document.querySelector('.motion-toggle');
  const setMotion = () => { document.documentElement.dataset.motion = motionOff ? 'off' : 'on'; if(motionButton){motionButton.textContent = `Motion: ${motionOff ? 'off' : 'on'}`;motionButton.setAttribute('aria-pressed', String(motionOff));} };
  setMotion();
  motionButton?.addEventListener('click', () => { motionOff = !motionOff; setMotion(); });
  reduced.addEventListener('change', e => { motionOff = e.matches; setMotion(); });
  const dropdowns=[...document.querySelectorAll('[data-dropdown]')];
  const controls=dropdowns.map(el=>({el,trigger:el.querySelector('.resources-trigger'),panel:el.querySelector('.resources-panel'),timer:null}));
  function setDropdown(c,open){clearTimeout(c.timer);c.panel.hidden=!open;c.trigger.setAttribute('aria-expanded',String(open));}
  function closeDropdowns(except){controls.forEach(c=>{if(c!==except)setDropdown(c,false);});}
  controls.forEach(c=>{
    const open=()=>{closeDropdowns(c);setDropdown(c,true);};
    c.trigger.addEventListener('click',e=>{if(matchMedia('(hover:hover)').matches && !c.el.closest('.mobile-nav'))open();else{const next=c.panel.hidden;closeDropdowns(c);setDropdown(c,next);}});
    c.el.addEventListener('pointerenter',()=>{if(matchMedia('(hover:hover)').matches&&!c.el.closest('.mobile-nav'))open();});
    c.panel.addEventListener('pointerenter',()=>clearTimeout(c.timer));
    c.el.addEventListener('pointermove',()=>clearTimeout(c.timer));
    c.el.addEventListener('pointerleave',()=>{if(!c.el.contains(document.activeElement))c.timer=setTimeout(()=>{if(!c.el.matches(':hover')&&!c.el.contains(document.activeElement))setDropdown(c,false);},450);});
    c.el.addEventListener('focusout',e=>{if(!c.el.contains(e.relatedTarget))setDropdown(c,false);});
    c.trigger.addEventListener('keydown',e=>{if(e.key==='ArrowDown'){e.preventDefault();open();c.panel.querySelector('a')?.focus();}else if(e.key==='Enter'||e.key===' '){e.preventDefault();const next=c.panel.hidden;closeDropdowns(c);setDropdown(c,next);}});
    c.el.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();setDropdown(c,false);c.trigger.focus();}});
    c.panel.addEventListener('click',e=>{if(e.target.closest('a'))setDropdown(c,false);});
  });
  document.addEventListener('pointerdown',e=>{if(!e.target.closest('[data-dropdown]'))closeDropdowns();});
  const menu = document.querySelector('.menu-toggle'), mobile = document.querySelector('#mobile-nav');
  function closeMenu(){mobile.hidden=true;menu.setAttribute('aria-expanded','false');closeDropdowns();}
  menu.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';mobile.hidden=!open;menu.setAttribute('aria-expanded',String(open));if(!open)closeDropdowns();});
  mobile.addEventListener('click',e=>{if(e.target.closest('a'))closeMenu();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeDropdowns();if(!mobile.hidden){closeMenu();menu.focus();}}});
  matchMedia('(min-width:651px)').addEventListener('change',e=>{if(e.matches)closeMenu();else closeDropdowns();});
  if(matchMedia('(pointer:fine)').matches){
    document.querySelector('.hero')?.addEventListener('pointermove',e=>{
      if(motionOff)return;
      const r=e.currentTarget.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;
      document.querySelectorAll('.hero-object').forEach((el,i)=>{el.style.setProperty('--px',`${x*(i?15:-12)}px`);el.style.setProperty('--py',`${y*13}px`);});
    });
  }
})();
