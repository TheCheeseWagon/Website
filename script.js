// ========== MOBILE DEVICE DETECTION ==========
        function isMobileDevice() {
            return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                   (navigator.maxTouchPoints && navigator.maxTouchPoints > 2) ||
                   window.innerWidth <= 768;
        }
    
        // ========== MENU 3D TILT ANIMATION APPLIED TO ALL THREE CARDS ==========
        document.querySelectorAll('.menu-card').forEach(menuCard => {
            let isHovering = false;
            let deviceTiltX = 0;
            let deviceTiltY = 0;
            let isMobile = isMobileDevice();
    
            // Device motion setup for mobile only
            if (isMobile && window.DeviceOrientationEvent) {
                // Try to enable device motion without permission prompt
                try {
                    window.addEventListener('deviceorientation', handleDeviceOrientation, true);
                } catch (error) {
                    // Silently handle any errors
                    console.log('Device orientation not available');
                }
            }
    
            function handleDeviceOrientation(event) {
                if (!isMobile) return;
                
                const beta = event.beta;   // Front-to-back tilt (-180 to 180)
                const gamma = event.gamma; // Left-to-right tilt (-90 to 90)
                
                if (beta !== null && gamma !== null) {
                    // Convert to usable tilt values (reduce intensity for smooth effect)
                    deviceTiltX = Math.max(-12, Math.min(12, beta * 0.25));
                    deviceTiltY = Math.max(-12, Math.min(12, gamma * 0.25));
                    
                    // Apply device motion when not hovering (mobile only)
                    if (!isHovering) {
                        updateCardTransform();
                    }
                }
            }
    
            function updateCardTransform(mouseX = 0, mouseY = 0) {
                const time = Date.now() * 0.001;
                const floatOffset = Math.sin(time) * 0.5;
                
                // On mobile, combine device motion with any mouse/touch input
                // On desktop, use only mouse input
                const totalTiltX = isMobile ? mouseX + deviceTiltX : mouseX;
                const totalTiltY = isMobile ? mouseY + deviceTiltY : mouseY;
                
                if (isHovering) {
                    menuCard.style.transform = `perspective(1000px) rotateX(${totalTiltX}deg) rotateY(${totalTiltY}deg) translateY(${-10 + floatOffset}px) scale(1.02)`;
                } else if (isMobile) {
                    // On mobile, show device motion even when not hovering
                    menuCard.style.transform = `perspective(1000px) rotateX(${deviceTiltX}deg) rotateY(${deviceTiltY}deg) translateY(${floatOffset}px) scale(1)`;
                } else {
                    // Desktop default state
                    menuCard.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px) scale(1)';
                }
            }
    
            // Enhanced mouse/touch interaction
            menuCard.addEventListener('mousemove', (e) => {
                if (!isHovering) return;
                const rect = menuCard.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                const rotateX = (y - centerY) / 6;
                const rotateY = (centerX - x) / 6;
                
                updateCardTransform(rotateX, rotateY);
            });
    
            menuCard.addEventListener('mouseenter', () => {
                isHovering = true;
                // Keep desktop animation speed unchanged
                menuCard.style.transition = 'transform 1.5s cubic-bezier(0.23, 1, 0.32, 1)';
            });
    
            menuCard.addEventListener('mouseleave', () => {
                isHovering = false;
                // Keep desktop animation speed unchanged  
                menuCard.style.transition = 'transform 2s cubic-bezier(0.23, 1, 0.32, 1)';
                updateCardTransform();
            });
    
            // Initial setup for mobile device motion
            if (isMobile) {
                // Start the device motion effect immediately on mobile
                updateCardTransform();
            }
        });
    
        // Smooth scrolling for navigation links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
            // Toggle mobile nav open/close
const navToggle = document.querySelector('.nav-toggle');
const navMenu   = document.querySelector('nav ul');

navToggle.addEventListener('click', () => {
  navToggle.classList.toggle('active');
  navMenu  .classList.toggle('active');
});
        // Add animation on scroll
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };
    
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-on-scroll');
                }
            });
        }, observerOptions);
    
        // Observe all sections
        document.querySelectorAll('section').forEach(section => {
            observer.observe(section);
        });
    
        // Active navigation highlighting
        window.addEventListener('scroll', () => {
            const sections = document.querySelectorAll('section');
            const navLinks = document.querySelectorAll('nav a');
    
            let current = '';
            sections.forEach(section => {
                const sectionTop = section.offsetTop - 100;
                const sectionHeight = section.clientHeight;
                if (pageYOffset >= sectionTop && pageYOffset < sectionTop + sectionHeight) {
                    current = section.getAttribute('id');
                }
            });
    
            navLinks.forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('href') === '#' + current) {
                    link.classList.add('active');
                }
            });
        });
    
        // ========== DYNAMIC MENU RENDERING ==========

function renderMenuCards(menuData) {
    // Group items by section
    const sections = {};
    menuData.forEach(item => {
      if (!sections[item.section]) sections[item.section] = [];
      sections[item.section].push(item);
    });
  
    // Build HTML for each section as a menu card
    const menuCardGrid = document.getElementById('menu-card-grid');
    menuCardGrid.innerHTML = Object.entries(sections).map(([section, items]) => {
      // Choose icon based on section name (customize to your taste)
      let iconClass = "fa-cheese";
      if (section.toLowerCase().includes('breakfast')) iconClass = "fa-egg";
      if (section.toLowerCase().includes('side')) iconClass = "fa-bread-slice";
  
      return `
        <div class="menu-card">
          <div class="menu-content">
            <div class="menu-header">
              <i class="fas ${iconClass}"></i>
              <h3>${section}</h3>
            </div>
            <div class="menu-divider"></div>
            ${items.map(item => `
              <div class="menu-item">
                <div class="menu-item-details">
                  <div class="menu-item-title">${item.title}</div>
                  <div class="menu-item-description">${item.description}</div>
                </div>
                <div class="menu-item-price">${item.price}</div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }).join('');
  }
  
  // Fetch from your Worker (change URL if deployed!)
  fetch('https://worker-d1-public.thecheesewagon.workers.dev/')
    .then(res => res.json())
    .then(renderMenuCards)
    .catch(() => {
      document.getElementById('menu-card-grid').innerHTML = '<p style="color:red;">Unable to load menu. Please try again later.</p>';
    });
  
  // ========== END DYNAMIC MENU RENDERING ==========
  fetch('https://worker-d1-public.thecheesewagon.workers.dev/')
  .then(res => res.json())
  .then(menu => {
    renderMenuCards(menu);

    // --- Re-apply tilt/animation to dynamically added cards ---
    document.querySelectorAll('.menu-card').forEach(menuCard => {
      // Your existing card effect code; for illustration, here's the usual tilt setup:
      // ========== (Example tilt code START—a copy of only the part for .menu-card) ==========
      let isHovering = false;
      let deviceTiltX = 0;
      let deviceTiltY = 0;
      let isMobile = isMobileDevice();
      if (isMobile && window.DeviceOrientationEvent) {
        try {
          window.addEventListener('deviceorientation', handleDeviceOrientation, true);
        } catch (error) {}

        function handleDeviceOrientation(event) {
          if (!isMobile) return;
          const beta = event.beta;
          const gamma = event.gamma;
          if (beta !== null && gamma !== null) {
            deviceTiltX = Math.max(-12, Math.min(12, beta * 0.25));
            deviceTiltY = Math.max(-12, Math.min(12, gamma * 0.25));
            if (!isHovering) updateCardTransform();
          }
        }
      }

      function updateCardTransform(mouseX = 0, mouseY = 0) {
        const time = Date.now() * 0.001;
        const floatOffset = Math.sin(time) * 0.5;
        const totalTiltX = isMobile ? mouseX + deviceTiltX : mouseX;
        const totalTiltY = isMobile ? mouseY + deviceTiltY : mouseY;
        if (isHovering) {
          menuCard.style.transform =
            `perspective(1000px) rotateX(${totalTiltX}deg) rotateY(${totalTiltY}deg) translateY(${-10 + floatOffset}px) scale(1.02)`;
        } else if (isMobile) {
          menuCard.style.transform =
            `perspective(1000px) rotateX(${deviceTiltX}deg) rotateY(${deviceTiltY}deg) translateY(${floatOffset}px) scale(1)`;
        } else {
          menuCard.style.transform =
            'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px) scale(1)';
        }
      }

      menuCard.addEventListener('mousemove', (e) => {
        if (!isHovering) return;
        const rect = menuCard.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = (y - centerY) / 6;
        const rotateY = (centerX - x) / 6;
        updateCardTransform(rotateX, rotateY);
      });
      menuCard.addEventListener('mouseenter', () => {
        isHovering = true;
        menuCard.style.transition = 'transform 1.5s cubic-bezier(0.23, 1, 0.32, 1)';
      });
      menuCard.addEventListener('mouseleave', () => {
        isHovering = false;
        menuCard.style.transition = 'transform 2s cubic-bezier(0.23, 1, 0.32, 1)';
        updateCardTransform();
      });

      // For mobile, update on load
      if (isMobile) updateCardTransform();
      // ========== (Example tilt code END) ==========
    });
  })
  .catch(() => {
    document.getElementById('menu-card-grid').innerHTML =
      '<p style="color:red;">Unable to load menu. Please try again later.</p>';
  });




}
  function tryJSON(urls,i){
    i=i||0;
    if(i>=urls.length) return Promise.reject(new Error('no-json'));
    return fetch(urls[i], { cache:'no-store' }).then(function(r){
      if(!r.ok) throw new Error('HTTP '+r.status);
      return r.json();
    }).catch(function(){ return tryJSON(urls,i+1); });
  }
  function probeImgBase(bases, file, i){
    i=i||0;
    if(i>=bases.length) return Promise.resolve(null);
    var url = (/^(https?:|data:)/i.test(file)) ? file : (bases[i] + file);
    return new Promise(function(res){
      var img = new Image();
      img.onload = function(){ res(bases[i]); };
      img.onerror = function(){ res(null); };
      img.src = url;
    }).then(function(ok){ return ok ? ok : probeImgBase(bases, file, i+1); });
  }
  function init(){
    var mount = pickMount();

    // JSON candidates (proxy-first; support Website/ subfolder layouts)
    var jsonCandidates = [
      '/proxy/instagram.json',
      '/proxy/Website/instagram.json',
      'https://thecheesewagon.github.io/Website/instagram.json'
    ];

    // Candidate image bases — all same-origin first to satisfy strict img-src CSP in preview
    var imgBases = [
      '/proxy/images/',
      '/proxy/Website/images/',
      'https://thecheesewagon.github.io/Website/images/'
    ];

    tryJSON(jsonCandidates).then(function(data){
      var items = (data && (data.items || data.slots)) || [];
      if (!items.length){ mount.innerHTML = '<p style="text-align:center;opacity:.8;">No featured photos yet.</p>'; return; }

      var firstFile = toFilename(items[0] && (items[0].src || items[0].path || items[0]));
      probeImgBase(imgBases, firstFile).then(function(base){
        // If no base worked, show a small hint
        if(!base){
          mount.innerHTML = '<p style="text-align:center;opacity:.8;">Images not reachable via proxy.</p>';
          return;
        }
        var html = ['<div class="ig-grid">'];
        for (var i=0;i<Math.min(items.length,9);i++){
          var it = items[i];
          var href = (it && typeof it === 'object' && it.href) ? it.href : null;
          var raw  = (it && typeof it === 'object') ? (it.src || it.path || '') : (''+it);
          var file = toFilename(raw);
          var src  = (/^(https?:|data:)/i.test(file)) ? file : (base + file);
          var poster = (it && typeof it === 'object' && it.poster) ? (base + toFilename(it.poster)) : null;
          var content = isVideo(src)
            ? '<video src="'+escAttr(src)+'" ' + (poster ? 'poster="'+escAttr(poster)+'" ' : '') + 'playsinline muted loop autoplay></video>'
            : '<img src="'+escAttr(src)+'" alt="Featured image" loading="lazy">';
          html.push(href
            ? '<a class="ig-tile" href="'+escAttr(href)+'" target="_blank" rel="noopener">'+content+'</a>'
            : '<div class="ig-tile">'+content+'</div>');
        }
        html.push('</div>');
        mount.innerHTML = html.join('');
      });
    }).catch(function(err){
      console.warn('instagram.json load failed:', err);
      mount.innerHTML = '<p style="text-align:center;opacity:.8;">Unable to load featured photos.</p>';
    });
  }
  // Defer a tick to let CSS editor mount nodes, then run. Also re-run when styles pane rebuilds DOM.
  function kick(){ try{ init(); }catch(e){ console.warn('IG init error', e); } }
  setTimeout(kick, 0);
  document.addEventListener('cheesewagon:preview:rerender', kick);
})();


// === Instagram Grid Loader (proxy with repo/ref params) ===
(function(){
  function ready(fn){
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    } else { fn(); }
  }
  function escAttr(s){ return String(s || '').replace(/"/g, '&quot;'); }
  function isVideo(path){ return /\.(mp4|webm|ogg|ogv|mov|m4v)$/i.test(path || ''); }
  function toFilename(p){
    if (!p) return '';
    if (/^(https?:|data:)/i.test(p)) return p;
    p = p.replace(/^\.?\//, '').replace(/^images\/instagram\//i, '');
    var parts = p.split('/');
    return parts[parts.length-1];
  }
  function meta(name){ var m=document.querySelector('meta[name="'+name+'"]'); return m&&m.content; }
  function getRepo(){ return (window.__SITE_REPO__ || meta('x-repo') || 'thecheesewagon/Website'); }
  function getRef(){ return (window.__SITE_REF__  || meta('x-ref')  || 'main'); }
  function tryJSON(list,i){
    i=i||0; if(i>=list.length) return Promise.reject(new Error('no-json'));
    return fetch(list[i], { cache:'no-store' }).then(function(r){
      if(!r.ok) throw new Error('HTTP '+r.status);
      return r.json();
    }).catch(function(){ return tryJSON(list, i+1); });
  }
  function probeBase(bases, file, i){
    i=i||0; if(i>=bases.length) return Promise.resolve(null);
    var url = (/^(https?:|data:)/i.test(file)) ? file : (bases[i] + file);
    return new Promise(function(res){
      var img = new Image();
      img.onload = function(){ res(bases[i]); };
      img.onerror = function(){ res(null); };
      img.src = url;
    }).then(function(ok){ return ok ? ok : probeBase(bases, file, i+1); });
  }
  function init(){
    var mount = document.getElementById('ig-feed') ||
                document.querySelector('.instagram-embed') ||
                (function(){ var d=document.createElement('div'); d.id='ig-feed'; (document.getElementById('social')||document.body).appendChild(d); return d; })();

    var repo = encodeURIComponent(getRepo());
    var ref  = encodeURIComponent(getRef());

    // JSON order: proxy (root), proxy (Website/), public GH
    var jsonCandidates = [
      '/proxy/instagram.json?repo='+repo+'&ref='+ref,
      '/proxy/Website/instagram.json?repo='+repo+'&ref='+ref,
      'https://thecheesewagon.github.io/Website/instagram.json'
    ];

    // Image base order: proxy (root), proxy (Website/), public GH
    var imgBases = [
      '/proxy/images/?repo='+repo+'&ref='+ref,
      '/proxy/Website/images/?repo='+repo+'&ref='+ref,
      'https://thecheesewagon.github.io/Website/images/'
    ];

    tryJSON(jsonCandidates).then(function(data){
      var items = (data && (data.items || data.slots)) || [];
      if (!items.length){ mount.innerHTML = '<p style="text-align:center;opacity:.8;">No featured photos yet.</p>'; return; }
      var firstFile = toFilename(items[0] && (items[0].src || items[0].path || items[0]));
      probeBase(imgBases, firstFile).then(function(base){
        if(!base){ mount.innerHTML = '<p style="text-align:center;opacity:.8;">Images not reachable via proxy.</p>'; return; }
        var html = ['<div class="ig-grid">'];
        for (var i=0;i<Math.min(items.length,9);i++){
          var it = items[i];
          var href = (it && typeof it === 'object' && it.href) ? it.href : null;
          var raw  = (it && typeof it === 'object') ? (it.src || it.path || '') : (''+it);
          var file = toFilename(raw);
          var src  = (/^(https?:|data:)/i.test(file)) ? file : (base + file);
          var poster = (it && typeof it === 'object' && it.poster) ? (base + toFilename(it.poster)) : null;
          var content = isVideo(src)
            ? '<video src="'+escAttr(src)+'" ' + (poster ? 'poster="'+escAttr(poster)+'" ' : '') + 'playsinline muted loop autoplay></video>'
            : '<img src="'+escAttr(src)+'" alt="Featured image" loading="lazy">';
          html.push(href
            ? '<a class="ig-tile" href="'+escAttr(href)+'" target="_blank" rel="noopener">'+content+'</a>'
            : '<div class="ig-tile">'+content+'</div>');
        }
        html.push('</div>');
        mount.innerHTML = html.join('');
      });
    }).catch(function(err){
      console.warn('instagram.json load failed:', err);
      mount.innerHTML = '<p style="text-align:center;opacity:.8;">Unable to load featured photos.</p>';
    });
  }
  // Run once DOM is ready and allow re-run in preview refreshes
  function kick(){ try{ init(); }catch(e){ console.warn('IG init error', e); } }
  document.addEventListener('DOMContentLoaded', kick, { once:true });
  document.addEventListener('cheesewagon:preview:rerender', kick);
})();

