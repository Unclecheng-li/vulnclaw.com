// VulnClaw Landing Page - Custom JavaScript

document.addEventListener('DOMContentLoaded', function() {
    initSmoothScrolling();
    initScrollAnimations();
    initTerminalScroll();
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
