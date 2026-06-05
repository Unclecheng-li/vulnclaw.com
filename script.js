// VulnClaw Landing Page - Ultra Modern JavaScript v2.0
// WebGL 3D Particle Tunnel + Cyberpunk Effects + Advanced Interactions

document.addEventListener('DOMContentLoaded', function() {
    initCustomCursor();
    initScrollProgress();
    initWebGL();
    initSmoothScrolling();
    initScrollAnimations();
    initHeaderScroll();
    initNavHighlight();
    initNumberCountUp();
    initMagneticButtons();
    initTimelineAnimation();
    initGlitchEffect();
    initParallaxEffect();
    initTerminalScroll();
    initMouseTrail();
    initFloatingParticles();
    initFeatureCardTilt();
    initStats();
});

const STATS_API_BASE = 'https://stats.vulnclaw.com';

// ============================================
// 1. Custom Cursor
// ============================================
function initCustomCursor() {
    const dot = document.querySelector('.cursor-dot');
    const outline = document.querySelector('.cursor-outline');
    if (!dot || !outline) return;

    // Check if touch device
    if (window.matchMedia('(pointer: coarse)').matches) {
        dot.style.display = 'none';
        outline.style.display = 'none';
        document.body.style.cursor = 'auto';
        return;
    }

    let mouseX = 0, mouseY = 0;
    let dotX = 0, dotY = 0;
    let outlineX = 0, outlineY = 0;

    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    // Hover effects on interactive elements
    const interactiveElements = document.querySelectorAll('a, button, .feature-card, .step-card, .provider-chip, .flow-step');
    interactiveElements.forEach(el => {
        el.addEventListener('mouseenter', () => {
            dot.style.width = '12px';
            dot.style.height = '12px';
            outline.style.width = '50px';
            outline.style.height = '50px';
            outline.style.borderColor = 'rgba(255, 42, 42, 0.8)';
        });
        el.addEventListener('mouseleave', () => {
            dot.style.width = '8px';
            dot.style.height = '8px';
            outline.style.width = '40px';
            outline.style.height = '40px';
            outline.style.borderColor = 'rgba(255, 42, 42, 0.5)';
        });
    });

    function animateCursor() {
        // Smooth follow with different lerp speeds
        dotX += (mouseX - dotX) * 0.5;
        dotY += (mouseY - dotY) * 0.5;
        outlineX += (mouseX - outlineX) * 0.15;
        outlineY += (mouseY - outlineY) * 0.15;

        dot.style.left = dotX + 'px';
        dot.style.top = dotY + 'px';
        outline.style.left = outlineX + 'px';
        outline.style.top = outlineY + 'px';

        requestAnimationFrame(animateCursor);
    }

    animateCursor();
}

// ============================================
// 2. Scroll Progress Bar
// ============================================
function initScrollProgress() {
    const progressBar = document.querySelector('.scroll-progress');
    if (!progressBar) return;

    window.addEventListener('scroll', () => {
        const scrollTop = window.pageYOffset;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = (scrollTop / docHeight) * 100;
        progressBar.style.width = progress + '%';
    });
}

// ============================================
// 3. WebGL 3D Particle Tunnel Background
// ============================================
function initWebGL() {
    const canvas = document.getElementById('webglCanvas');
    if (!canvas) return;

    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) {
        canvas.style.display = 'none';
        return;
    }

    let width, height;
    let mouseX = 0, mouseY = 0;
    let time = 0;

    function resize() {
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);
    }

    resize();
    window.addEventListener('resize', resize);

    document.addEventListener('mousemove', (e) => {
        mouseX = (e.clientX / width) * 2 - 1;
        mouseY = -(e.clientY / height) * 2 + 1;
    });

    const vertexShaderSource = `
        attribute vec2 a_position;
        void main() {
            gl_Position = vec4(a_position, 0.0, 1.0);
        }
    `;

    const fragmentShaderSource = `
        precision highp float;
        uniform vec2 u_resolution;
        uniform float u_time;
        uniform vec2 u_mouse;
        #define PI 3.14159265359
        #define TAU 6.28318530718
        float hash(vec2 p) {
            return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }
        float noise(vec2 p) {
            vec2 i = floor(p);
            vec2 f = fract(p);
            f = f * f * (3.0 - 2.0 * f);
            float a = hash(i);
            float b = hash(i + vec2(1.0, 0.0));
            float c = hash(i + vec2(0.0, 1.0));
            float d = hash(i + vec2(1.0, 1.0));
            return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
        }
        float tunnel(vec3 p) {
            float r = length(p.xy);
            float angle = atan(p.y, p.x);
            float z = p.z;
            float wall = sin(angle * 8.0 + z * 2.0 + u_time * 0.5) * 0.1;
            wall += noise(vec2(angle * 3.0, z * 2.0)) * 0.15;
            float grid = smoothstep(0.02, 0.0, abs(fract(angle * 12.0 / TAU) - 0.5)) * 0.3;
            grid += smoothstep(0.02, 0.0, abs(fract(z * 4.0) - 0.5)) * 0.2;
            return wall + grid;
        }
        vec3 getColor(float t, float intensity) {
            vec3 red = vec3(1.0, 0.16, 0.16);
            vec3 orange = vec3(1.0, 0.42, 0.21);
            vec3 dark = vec3(0.02, 0.02, 0.04);
            vec3 col = mix(dark, red, intensity);
            col = mix(col, orange, intensity * intensity);
            return col;
        }
        void main() {
            vec2 uv = (gl_FragCoord.xy - u_resolution * 0.5) / u_resolution.y;
            vec2 mouse = u_mouse * 0.3;
            vec3 ro = vec3(0.0, 0.0, -2.0 + u_time * 0.3);
            vec3 rd = normalize(vec3(uv + mouse, 1.0));
            float t = 0.0;
            vec3 col = vec3(0.0);
            float glow = 0.0;
            for (int i = 0; i < 64; i++) {
                vec3 p = ro + rd * t;
                float d = tunnel(p);
                float dist = abs(length(p.xy) - (1.0 + d * 0.3));
                glow += 0.002 / (dist + 0.01);
                if (dist < 0.01) {
                    col = getColor(t, glow * 0.1);
                    break;
                }
                t += dist * 0.5;
                if (t > 10.0) break;
            }
            for (float i = 0.0; i < 30.0; i++) {
                float fi = i / 30.0;
                float z = fract(fi + u_time * 0.05);
                float angle = fi * TAU * 7.0 + u_time * 0.2;
                float r = 1.0 + sin(fi * 10.0) * 0.1;
                vec2 particlePos = vec2(cos(angle), sin(angle)) * r;
                particlePos += mouse * z;
                float dist = length(uv - particlePos * (1.0 / z));
                float size = 0.003 / z;
                float brightness = smoothstep(size, 0.0, dist) * z;
                vec3 particleColor = mix(vec3(1.0, 0.16, 0.16), vec3(1.0, 0.42, 0.21), fi);
                col += particleColor * brightness * 0.5;
            }
            float vignette = 1.0 - length(uv) * 0.5;
            col *= vignette;
            float scanline = sin(gl_FragCoord.y * 0.7) * 0.03;
            col += scanline;
            gl_FragColor = vec4(col, 1.0);
        }
    `;

    function createShader(gl, type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('Shader compile error:', gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        return shader;
    }

    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

    if (!vertexShader || !fragmentShader) return;

    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Program link error:', gl.getProgramInfoLog(program));
        return;
    }

    gl.useProgram(program);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -1, -1, 1, -1, -1, 1,
        -1, 1, 1, -1, 1, 1
    ]), gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    const resolutionLocation = gl.getUniformLocation(program, 'u_resolution');
    const timeLocation = gl.getUniformLocation(program, 'u_time');
    const mouseLocation = gl.getUniformLocation(program, 'u_mouse');

    let animationId;
    let startTime = Date.now();

    function render() {
        time = (Date.now() - startTime) * 0.001;
        gl.uniform2f(resolutionLocation, width, height);
        gl.uniform1f(timeLocation, time);
        gl.uniform2f(mouseLocation, mouseX, mouseY);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        animationId = requestAnimationFrame(render);
    }

    render();

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            cancelAnimationFrame(animationId);
        } else {
            startTime = Date.now() - time * 1000;
            render();
        }
    });
}

// ============================================
// 4. Smooth Scrolling
// ============================================
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
                window.scrollTo({ top: offsetTop, behavior: 'smooth' });
            }
            const navCollapse = document.getElementById('navbarNav');
            if (navCollapse && navCollapse.classList.contains('show')) {
                const bsCollapse = bootstrap.Collapse.getInstance(navCollapse);
                if (bsCollapse) bsCollapse.hide();
            }
        });
    });
}

// ============================================
// 5. Scroll Animations
// ============================================
function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -80px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('aos-animate');
            }
        });
    }, observerOptions);

    const animateElements = document.querySelectorAll('[data-aos]');
    animateElements.forEach(el => observer.observe(el));
}

// ============================================
// 6. Header Scroll Effect
// ============================================
function initHeaderScroll() {
    const header = document.getElementById('header');
    if (!header) return;
    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;
        if (currentScroll > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });
}

// ============================================
// 7. Nav Highlight on Scroll
// ============================================
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

// ============================================
// 8. Number Count Up Animation
// ============================================
function initNumberCountUp() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !entry.target.dataset.counted) {
                entry.target.dataset.counted = 'true';
                const target = parseInt(entry.target.dataset.count);
                const el = entry.target.querySelector('.stat-number, .key-num');
                if (el && target) {
                    animateNumber(el, 0, target, 2000);
                }
            }
        });
    }, { threshold: 0.5 });

    document.querySelectorAll('.stat-item[data-count], .key-num-item[data-count]').forEach(el => {
        observer.observe(el);
    });
}

function animateNumber(el, start, end, duration) {
    const startTime = performance.now();
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 4);
        const current = Math.round(start + (end - start) * eased);
        el.textContent = current;
        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }
    requestAnimationFrame(update);
}

// ============================================
// 9. Magnetic Button Effect
// ============================================
function initMagneticButtons() {
    const buttons = document.querySelectorAll('.magnetic-btn');
    buttons.forEach(btn => {
        btn.addEventListener('mousemove', (e) => {
            const rect = btn.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;
            btn.style.transform = `translate(${x * 0.15}px, ${y * 0.15}px)`;
        });
        btn.addEventListener('mouseleave', () => {
            btn.style.transform = '';
        });
    });
}

// ============================================
// 10. Timeline Animation
// ============================================
function initTimelineAnimation() {
    const timelineProgress = document.querySelector('.timeline-progress');
    if (!timelineProgress) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                timelineProgress.classList.add('animate');
            }
        });
    }, { threshold: 0.5 });

    const timelineWrapper = document.querySelector('.timeline-wrapper');
    if (timelineWrapper) {
        observer.observe(timelineWrapper);
    }
}

// ============================================
// 11. Glitch Effect on Hero Title
// ============================================
function initGlitchEffect() {
    const glitchText = document.querySelector('.glitch-text');
    if (!glitchText) return;

    function triggerGlitch() {
        glitchText.style.animation = 'none';
        glitchText.offsetHeight;
        glitchText.style.animation = '';
    }

    function scheduleGlitch() {
        const delay = 4000 + Math.random() * 4000;
        setTimeout(() => {
            triggerGlitch();
            scheduleGlitch();
        }, delay);
    }

    scheduleGlitch();
}

// ============================================
// 12. Parallax Scroll Effect
// ============================================
function initParallaxEffect() {
    const hero = document.querySelector('.hero');
    if (!hero) return;

    window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;
        if (scrolled < window.innerHeight) {
            const rate = scrolled * 0.15;
            hero.style.backgroundPositionY = rate + 'px';
        }
    });
}

// ============================================
// 13. Terminal Auto-scroll
// ============================================
function initTerminalScroll() {
    const terminalBody = document.getElementById('terminalBody');
    if (terminalBody) {
        setTimeout(() => {
            terminalBody.scrollTop = terminalBody.scrollHeight;
        }, 2500);
    }
}

// ============================================
// 14. Copy Install Command
// ============================================
function copyInstall() {
    const command = 'pip install vulnclaw';

    // Track download click
    trackDownload();

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(command).then(() => {
            showCopyFeedback('installBtnText', '已复制!');
            showCopyFeedback('ctaBtnText', '已复制!');
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

// ============================================
// 15. Copy Workflow Commands
// ============================================
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
                feedback.textContent = '已复制!';
                setTimeout(() => { feedback.textContent = ''; }, 2000);
            }
        });
    } else {
        fallbackCopy(workflow);
    }
}

function showCopyFeedback(elementId, text) {
    const el = document.getElementById(elementId);
    if (el) {
        el.textContent = text;
        el.style.color = '#00ff88';
    }
}

function resetBtnText(elementId, originalText) {
    const el = document.getElementById(elementId);
    if (el) {
        el.textContent = originalText;
        el.style.color = '';
    }
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
        showCopyFeedback('installBtnText', '已复制!');
        showCopyFeedback('ctaBtnText', '已复制!');
        setTimeout(() => {
            resetBtnText('installBtnText', 'pip install vulnclaw');
            resetBtnText('ctaBtnText', 'pip install vulnclaw');
        }, 2000);
    } catch (err) {
        alert('复制命令: ' + text);
    }
    document.body.removeChild(textarea);
}

// ============================================
// 16. Terminal 3D Tilt Effect
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    const terminal = document.querySelector('.terminal-window');
    if (!terminal) return;

    const container = terminal.parentElement;
    container.addEventListener('mousemove', (e) => {
        if (window.innerWidth < 992) return;
        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = (y - centerY) / centerY * -4;
        const rotateY = (x - centerX) / centerX * 4;
        terminal.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    });

    container.addEventListener('mouseleave', () => {
        terminal.style.transform = 'perspective(1000px) rotateX(0) rotateY(0)';
    });
});

// ============================================
// 17. Mouse Trail Effect
// ============================================
function initMouseTrail() {
    if (window.matchMedia('(pointer: coarse)').matches) return;

    const trailCount = 12;
    const trails = [];

    for (let i = 0; i < trailCount; i++) {
        const trail = document.createElement('div');
        trail.className = 'mouse-trail';
        trail.style.opacity = '0';
        document.body.appendChild(trail);
        trails.push({
            el: trail,
            x: 0,
            y: 0
        });
    }

    let mouseX = 0, mouseY = 0;

    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    function animate() {
        trails.forEach((trail, index) => {
            const delay = index * 2;
            trail.x += (mouseX - trail.x) * (0.15 - index * 0.01);
            trail.y += (mouseY - trail.y) * (0.15 - index * 0.01);

            trail.el.style.left = trail.x + 'px';
            trail.el.style.top = trail.y + 'px';
            trail.el.style.opacity = (1 - index / trailCount) * 0.4;
            trail.el.style.transform = `translate(-50%, -50%) scale(${1 - index * 0.05})`;
        });

        requestAnimationFrame(animate);
    }

    animate();
}

// ============================================
// 19. Floating Particles
// ============================================
function initFloatingParticles() {
    const particleCount = 20;

    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'floating-particle';
        particle.style.left = Math.random() * 100 + 'vw';
        particle.style.animationDelay = Math.random() * 15 + 's';
        particle.style.animationDuration = (10 + Math.random() * 10) + 's';
        particle.style.width = (2 + Math.random() * 4) + 'px';
        particle.style.height = particle.style.width;

        const colors = ['#ff2a2a', '#ff6b35', '#00d4ff', '#00ff88'];
        particle.style.background = colors[Math.floor(Math.random() * colors.length)];
        particle.style.boxShadow = `0 0 10px ${particle.style.background}`;

        document.body.appendChild(particle);
    }
}

// ============================================
// 20. Feature Card 3D Tilt
// ============================================
function initFeatureCardTilt() {
    const cards = document.querySelectorAll('.feature-card');

    cards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            if (window.innerWidth < 992) return;
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            const rotateX = (y - centerY) / centerY * -8;
            const rotateY = (x - centerX) / centerX * 8;

            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-12px)`;
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = '';
        });
    });
}

// ============================================
// 21. Statistics - Page Views, Download Clicks, GitHub Stars
// ============================================
function initStats() {
    initGitHubStats();
}

// GitHub Stars & Forks using GitHub API
function initGitHubStats() {
    const starsEl = document.getElementById('githubStars');
    const forksEl = document.getElementById('githubForks');
    if (!starsEl || !forksEl) return;

    const owner = 'Unclecheng-li';
    const repo = 'VulnClaw';

    fetch(`https://api.github.com/repos/${owner}/${repo}`)
        .then(response => {
            if (!response.ok) throw new Error('GitHub API error');
            return response.json();
        })
        .then(data => {
            if (data.stargazers_count !== undefined) {
                animateNumber(starsEl, 0, data.stargazers_count, 2000);
            }
            if (data.forks_count !== undefined) {
                animateNumber(forksEl, 0, data.forks_count, 2000);
            }
        })
        .catch(() => {
            starsEl.textContent = '---';
            forksEl.textContent = '---';
        });
}
