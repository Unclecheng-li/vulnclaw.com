// VulnClaw Landing Page - Custom JavaScript

document.addEventListener('DOMContentLoaded', function() {
    initSmoothScrolling();
    initScrollAnimations();
    initTerminalScroll();
    initParticleBackground();
    initNavHighlight();
    initNumberCountUp();
    initHeroTitleShimmer();
});

// Smooth scrolling for navigation links
function initSmoothScrolling() {
    const navLinks = document.querySelectorAll('a[href^="#"]');

    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href === '#') return;

            e.preventDefault();
            const targetElement = document.querySelector(href);

            if (targetElement) {
                const headerOffset = 80;
                const offsetTop = targetElement.getBoundingClientRect().top + window.pageYOffset - headerOffset;

                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });
            }

            // Close mobile nav if open
            const navCollapse = document.getElementById('navbarNav');
            if (navCollapse && navCollapse.classList.contains('show')) {
                const bsCollapse = bootstrap.Collapse.getInstance(navCollapse);
                if (bsCollapse) bsCollapse.hide();
            }
        });
    });
}

// Scroll animations using Intersection Observer
function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
            }
        });
    }, observerOptions);

    const animateElements = document.querySelectorAll('.feature-card, .step-card, .key-num-item, .flow-step, .compliance-badge');
    animateElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'all 0.6s ease';
        observer.observe(el);
    });
}

// Auto-scroll terminal to bottom
function initTerminalScroll() {
    const terminalBody = document.getElementById('terminalBody');
    if (terminalBody) {
        terminalBody.scrollTop = terminalBody.scrollHeight;
    }
}

// Particle background for hero section
function initParticleBackground() {
    const canvas = document.getElementById('particleCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let particles = [];
    const particleCount = 50;

    function resize() {
        canvas.width = canvas.parentElement.offsetWidth;
        canvas.height = canvas.parentElement.offsetHeight;
    }

    resize();
    window.addEventListener('resize', resize);

    class Particle {
        constructor() {
            this.reset();
        }

        reset() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.size = Math.random() * 2 + 0.5;
            this.speedX = (Math.random() - 0.5) * 0.4;
            this.speedY = (Math.random() - 0.5) * 0.4;
            this.opacity = Math.random() * 0.4 + 0.1;
            this.color = Math.random() > 0.5 ? '#ef4444' : '#f97316';
        }

        update() {
            this.x += this.speedX;
            this.y += this.speedY;

            if (this.x < 0 || this.x > canvas.width) this.speedX *= -1;
            if (this.y < 0 || this.y > canvas.height) this.speedY *= -1;
        }

        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.globalAlpha = this.opacity;
            ctx.fill();
            ctx.globalAlpha = 1;
        }
    }

    for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle());
    }

    function drawLines() {
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < 120) {
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.strokeStyle = '#ef4444';
                    ctx.globalAlpha = 0.06 * (1 - distance / 120);
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                    ctx.globalAlpha = 1;
                }
            }
        }
    }

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        particles.forEach(p => {
            p.update();
            p.draw();
        });

        drawLines();
        requestAnimationFrame(animate);
    }

    animate();
}

// Nav highlight on scroll
function initNavHighlight() {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.navbar-nav .nav-link');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const id = entry.target.getAttribute('id');
                navLinks.forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === '#' + id) {
                        link.classList.add('active');
                    }
                });
            }
        });
    }, {
        threshold: 0.3,
        rootMargin: '-80px 0px -50% 0px'
    });

    sections.forEach(section => observer.observe(section));
}

// Number count-up animation
function initNumberCountUp() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !entry.target.dataset.counted) {
                entry.target.dataset.counted = 'true';
                const target = parseInt(entry.target.textContent);
                animateNumber(entry.target, 0, target, 1200);
            }
        });
    }, { threshold: 0.5 });

    document.querySelectorAll('.stat-number, .key-num').forEach(el => {
        observer.observe(el);
    });
}

function animateNumber(el, start, end, duration) {
    const startTime = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Ease out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.round(start + (end - start) * eased);
        el.textContent = current;

        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }

    requestAnimationFrame(update);
}

// Hero title shimmer effect
function initHeroTitleShimmer() {
    const accentText = document.querySelector('.hero-title .text-accent');
    if (accentText) {
        accentText.classList.add('text-shimmer');
    }
}

// Copy install command to clipboard
function copyInstall() {
    const command = 'pip install vulnclaw';

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(command).then(() => {
            showCopyFeedback('installBtnText', 'copied!');
            showCopyFeedback('ctaBtnText', 'copied!');
            setTimeout(() => {
                resetBtnText('installBtnText', 'pip install vulnclaw');
                resetBtnText('ctaBtnText', 'pip install vulnclaw');
            }, 2000);
        }).catch(() => {
            fallbackCopy(command);
        });
    } else {
        fallbackCopy(command);
    }
}

// Copy workflow commands
function copyWorkflow() {
    const workflow = `pip install vulnclaw
vulnclaw config set llm.base_url https://api.minimaxi.com/v1
vulnclaw config set llm.model MiniMax-M2.7
vulnclaw config set llm.api_key sk-your-key-here
vulnclaw doctor
vulnclaw`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(workflow).then(() => {
            const feedback = document.getElementById('copyFeedback');
            if (feedback) {
                feedback.textContent = 'copied!';
                setTimeout(() => { feedback.textContent = ''; }, 2000);
            }
        });
    } else {
        fallbackCopy(workflow);
    }
}

function showCopyFeedback(elementId, text) {
    const el = document.getElementById(elementId);
    if (el) el.textContent = text;
}

function resetBtnText(elementId, originalText) {
    const el = document.getElementById(elementId);
    if (el) el.textContent = originalText;
}

function fallbackCopy(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
        document.execCommand('copy');
        showCopyFeedback('installBtnText', 'copied!');
        showCopyFeedback('ctaBtnText', 'copied!');
        setTimeout(() => {
            resetBtnText('installBtnText', 'pip install vulnclaw');
            resetBtnText('ctaBtnText', 'pip install vulnclaw');
        }, 2000);
    } catch (err) {
        alert('复制命令: ' + text);
    }
    document.body.removeChild(textarea);
}
