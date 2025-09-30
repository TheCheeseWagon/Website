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


// === Instagram Grid Loader (images from /images root) ===
(function(){
  function ready(fn){
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    } else { fn(); }
  }
  function isVideo(path){
    return /\.(mp4|webm|ogg|ogv|mov|m4v)$/i.test(path || '');
  }
  function escAttr(s){ return String(s || '').replace(/"/g, '&quot;'); }
  function toImagesRoot(p){
    if (!p) return '';
    // If absolute or data: keep as-is
    if (/^(https?:|data:)/i.test(p)) return p;
    // strip leading ./
    p = p.replace(/^\.?\//, '');
    // drop any images/instagram/ folder from old structure
    p = p.replace(/^images\/instagram\//i, '');
    // take only the basename
    var parts = p.split('/');
    var base = parts[parts.length-1];
    return 'images/' + base;
  }
  function render(items, mount){
    if (!items || !items.length) {
      mount.innerHTML = '<p style="text-align:center;opacity:.8;">No featured photos yet.</p>';
      return;
    }
    var html = ['<div class="ig-grid">'];
    for (var i=0; i<Math.min(items.length, 9); i++){
      var it = items[i];
      var href = (it && typeof it === 'object' && it.href) ? it.href : null;
      var raw = (it && typeof it === 'object') ? (it.src || it.path || '') : (''+it);
      var src = toImagesRoot(raw);
      var poster = (it && typeof it === 'object' && it.poster) ? toImagesRoot(it.poster) : null;
      if (!src) continue;
      var content;
      if (isVideo(src)) {
        content = '<video src="'+escAttr(src)+'" ' + (poster ? 'poster="'+escAttr(poster)+'" ' : '') + 'playsinline muted loop autoplay></video>';
      } else {
        content = '<img src="'+escAttr(src)+'" alt="Featured image" loading="lazy">';
      }
      html.push(href
        ? '<a class="ig-tile" href="'+escAttr(href)+'" target="_blank" rel="noopener">'+content+'</a>'
        : '<div class="ig-tile">'+content+'</div>');
    }
    html.push('</div>');
    mount.innerHTML = html.join('');
  }
  function init(){
    var mount = document.getElementById('ig-feed');
    if (!mount) return;
    fetch('instagram.json', { cache: 'no-store' })
      .then(function(r){ return r.ok ? r.json() : Promise.reject(r.status); })
      .then(function(data){
        var items = (data && (data.items || data.slots)) || [];
        render(items, mount);
      })
      .catch(function(err){
        console.warn('instagram.json load failed:', err);
        mount.innerHTML = '<p style="text-align:center;opacity:.8;">Unable to load featured photos.</p>';
      });
  }
  ready(init);
})();

