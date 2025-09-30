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




// === Instagram Grid Loader (proxy images in CMS preview) ===
(function(){
  function ready(fn){
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    } else { fn(); }
  }
  function ensureSlash(s){ return /\/$/.test(s) ? s : (s + '/'); }
  function escAttr(s){ return String(s || '').replace(/"/g, '&quot;'); }
  function isVideo(path){ return /\.(mp4|webm|ogg|ogv|mov|m4v)$/i.test(path || ''); }
  function toFilename(p){
    if (!p) return '';
    if (/^(https?:|data:)/i.test(p)) return p; // leave absolute/data as-is
    p = p.replace(/^\.?\//, '').replace(/^images\/instagram\//i, '');
    var parts = p.split('/');
    return parts[parts.length-1];
  }
  function abs(base, rel){
    try { return new URL(rel, base).toString(); } catch(e){ return rel; }
  }
  function getMetaBase(){
    var m = document.querySelector('meta[name=\"x-site-base\"]');
    return m && m.content;
  }
  function getLiveBase(){
    if (typeof window.__PREVIEW_SITE_BASE__ === 'string' && /^https?:\/\//i.test(window.__PREVIEW_SITE_BASE__)) {
      return ensureSlash(window.__PREVIEW_SITE_BASE__);
    }
    var meta = getMetaBase();
    if (meta && /^https?:\/\//i.test(meta)) return ensureSlash(meta);
    try {
      if (location.hostname.endsWith('github.io')) {
        return ensureSlash(new URL('.', location.href).toString());
      }
    } catch(e){}
    return 'https://thecheesewagon.github.io/Website/';
  }

  function init(){
    var mount = document.getElementById('ig-feed');
    if (!mount) return;

    var liveBase = getLiveBase();
    var jsonPrimary   = abs(liveBase, 'instagram.json');
    var jsonViaProxy  = '/proxy/instagram.json';
    var jsonFallback  = 'https://thecheesewagon.github.io/Website/instagram.json';

    function tryFetch(url){
      return fetch(url, { cache: 'no-store' }).then(function(r){
        if (!r.ok) throw new Error('HTTP '+r.status);
        return r.json();
      });
    }

    // Detect whether proxy works; if yes, we are in CMS preview mode.
    function detectPreview(){
      return fetch(jsonViaProxy, { cache: 'no-store' })
        .then(function(r){ if (!r.ok) throw new Error('no-proxy'); return r.clone().json(); })
        .then(function(){ return true; })
        .catch(function(){ return false; });
    }

    detectPreview().then(function(isPreview){
      var imgBaseCandidates = [];
      var jsonCandidates = [];

      if (isPreview){
        // JSON through proxy, images through proxy to satisfy CSP img-src 'self'
        jsonCandidates.push(jsonViaProxy, jsonPrimary, jsonFallback);
        imgBaseCandidates.push('/proxy/images/', abs(liveBase, 'images/'), 'https://thecheesewagon.github.io/Website/images/');
      } else {
        // Normal public site
        jsonCandidates.push(jsonPrimary, jsonFallback);
        imgBaseCandidates.push(abs(liveBase, 'images/'), 'https://thecheesewagon.github.io/Website/images/');
      }

      function firstResolvedJSON(urls, i){
        i = i || 0;
        if (i >= urls.length) return Promise.reject(new Error('no json'));
        return tryFetch(urls[i]).catch(function(){ return firstResolvedJSON(urls, i+1); });
      }

      firstResolvedJSON(jsonCandidates).then(function(data){
        var items = (data && (data.items || data.slots)) || [];
        if (!items.length){
          mount.innerHTML = '<p style=\"text-align:center;opacity:.8;\">No featured photos yet.</p>';
          return;
        }
        // choose an image base that loads
        function checkImgBase(bases, i){
          i = i || 0;
          if (i >= bases.length) return Promise.resolve(bases[0]); // fallback to first
          var testFile = toFilename(items[0] && (items[0].src || items[0].path || items[0]));
          var testUrl = (/^(https?:|data:)/i.test(testFile)) ? testFile : bases[i] + testFile;
          return new Promise(function(res){
            var img = new Image();
            img.onload = function(){ res(bases[i]); };
            img.onerror = function(){ res(null); };
            img.src = testUrl;
          }).then(function(ok){ return ok ? ok : checkImgBase(bases, i+1); });
        }

        checkImgBase(imgBaseCandidates).then(function(imgBase){
          var html = ['<div class=\"ig-grid\">'];
          for (var i=0; i<Math.min(items.length, 9); i++){
            var it = items[i];
            var href = (it && typeof it === 'object' && it.href) ? it.href : null;
            var raw  = (it && typeof it === 'object') ? (it.src || it.path || '') : (''+it);
            var file = toFilename(raw);
            var src  = (/^(https?:|data:)/i.test(file)) ? file : (imgBase + file);
            var poster = (it && typeof it === 'object' && it.poster) ? (imgBase + toFilename(it.poster)) : null;

            var content;
            if (isVideo(src)){
              content = '<video src=\"'+escAttr(src)+'\" ' + (poster ? 'poster=\"'+escAttr(poster)+'\" ' : '') + 'playsinline muted loop autoplay></video>';
            } else {
              content = '<img src=\"'+escAttr(src)+'\" alt=\"Featured image\" loading=\"lazy\">';
            }
            html.push(href
              ? '<a class=\"ig-tile\" href=\"'+escAttr(href)+'\" target=\"_blank\" rel=\"noopener\">'+content+'</a>'
              : '<div class=\"ig-tile\">'+content+'</div>');
          }
          html.push('</div>');
          mount.innerHTML = html.join('');
        });
      }).catch(function(err){
        console.warn('instagram.json load failed:', err);
        mount.innerHTML = '<p style=\"text-align:center;opacity:.8;\">Unable to load featured photos.</p>';
      });
    });
  }
  ready(init);
})();

