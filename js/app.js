// SK E-Commerce Master Application Controller
import { products } from './products.js';
import { cartController } from './cart.js';
import { authController } from './auth.js';
import { isConfigured } from './firebase-config.js';

/* ==========================================================================
   Toast Notification Helper
   ========================================================================== */
export function showToast(message, type = 'info', duration = 3500) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const iconSvg = type === 'success' 
    ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>`
    : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;

  toast.innerHTML = `
    ${iconSvg}
    <span>${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(40px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/* ==========================================================================
   Theme Management (Light / Dark Mode with Persistence)
   ========================================================================== */
class ThemeManager {
  constructor() {
    this.storageKey = 'lumen_theme_preference';
    this.htmlEl = document.documentElement;
    this.init();
  }

  init() {
    // Determine initial theme: saved preference or system preference
    const savedTheme = localStorage.getItem(this.storageKey);
    if (savedTheme) {
      this.setTheme(savedTheme);
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.setTheme(prefersDark ? 'dark' : 'light');
    }

    // Bind event listeners
    const desktopToggle = document.getElementById('theme-toggle');
    if (desktopToggle) {
      desktopToggle.addEventListener('click', () => this.toggleTheme());
    }

    const mobileToggle = document.getElementById('mobile-theme-toggle');
    if (mobileToggle) {
      mobileToggle.addEventListener('click', () => this.toggleTheme());
    }

    // Listen to OS system theme changes if user hasn't explicitly set a preference
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!localStorage.getItem(this.storageKey)) {
        this.setTheme(e.matches ? 'dark' : 'light');
      }
    });
  }

  setTheme(theme) {
    this.htmlEl.setAttribute('data-theme', theme);
    localStorage.setItem(this.storageKey, theme);
  }

  toggleTheme() {
    const current = this.htmlEl.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    this.setTheme(next);
    showToast(`Switched to ${next.toUpperCase()} mode`, 'info', 2000);
  }
}

/* ==========================================================================
   Mobile Navigation Drawer (Collapses Navigation into Hamburger Menu)
   ========================================================================== */
class MobileNavigation {
  constructor() {
    this.menuBtn = document.getElementById('mobile-menu-btn');
    this.drawer = document.getElementById('mobile-drawer');
    this.backdrop = document.getElementById('mobile-drawer-backdrop');
    this.closeBtn = document.getElementById('mobile-drawer-close');
    this.navLinks = document.querySelectorAll('.mobile-nav-link');
    this.init();
  }

  init() {
    if (!this.menuBtn || !this.drawer || !this.backdrop) return;

    this.menuBtn.addEventListener('click', () => this.toggle());
    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', () => this.close());
    }
    this.backdrop.addEventListener('click', () => this.close());

    // Close when clicking any nav link
    this.navLinks.forEach(link => {
      link.addEventListener('click', () => this.close());
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen()) {
        this.close();
      }
    });
  }

  isOpen() {
    return this.drawer.classList.contains('active');
  }

  toggle() {
    if (this.isOpen()) {
      this.close();
    } else {
      this.open();
    }
  }

  open() {
    this.drawer.classList.add('active');
    this.backdrop.classList.add('active');
    this.menuBtn.classList.add('active');
    this.menuBtn.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }

  close() {
    this.drawer.classList.remove('active');
    this.backdrop.classList.remove('active');
    this.menuBtn.classList.remove('active');
    this.menuBtn.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }
}

/* ==========================================================================
   Shopping Cart UI Interactions
   ========================================================================== */
class CartUI {
  constructor() {
    this.cartBtn = document.getElementById('cart-toggle-btn');
    this.drawer = document.getElementById('cart-drawer');
    this.backdrop = document.getElementById('cart-drawer-backdrop');
    this.closeBtn = document.getElementById('cart-drawer-close');
    this.itemsList = document.getElementById('cart-items-list');
    this.checkoutBtn = document.getElementById('btn-checkout');
    this.init();
  }

  init() {
    if (!this.cartBtn || !this.drawer) return;

    this.cartBtn.addEventListener('click', () => this.open());

    // Mobile drawer's "Cart" entry opens the same cart panel and closes
    // the mobile nav drawer first so they don't overlap.
    const mobileCartBtn = document.getElementById('mobile-cart-btn');
    if (mobileCartBtn) {
      mobileCartBtn.addEventListener('click', () => {
        document.getElementById('mobile-drawer')?.classList.remove('active');
        document.getElementById('mobile-drawer-backdrop')?.classList.remove('active');
        document.getElementById('mobile-menu-btn')?.classList.remove('active');
        document.body.style.overflow = '';
        this.open();
      });
    }
    if (this.closeBtn) this.closeBtn.addEventListener('click', () => this.close());
    if (this.backdrop) this.backdrop.addEventListener('click', () => this.close());

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen()) {
        this.close();
      }
    });

    // Quantity buttons and delete item delegation
    if (this.itemsList) {
      this.itemsList.addEventListener('click', (e) => {
        const target = e.target.closest('button');
        if (!target) return;

        const action = target.getAttribute('data-action');
        const id = target.getAttribute('data-id');

        if (action === 'increment') {
          cartController.updateQuantity(id, 1);
        } else if (action === 'decrement') {
          cartController.updateQuantity(id, -1);
        } else if (action === 'remove') {
          cartController.removeItem(id);
          showToast('Item removed from cart', 'info', 2000);
        }
      });
    }

    // Checkout button handler
    if (this.checkoutBtn) {
      this.checkoutBtn.addEventListener('click', () => {
        if (cartController.items.length === 0) return;
        
        const count = cartController.getTotalCount();
        const total = cartController.getSubtotal().toFixed(2);
        
        this.checkoutBtn.disabled = true;
        this.checkoutBtn.textContent = 'Processing Order...';

        setTimeout(() => {
          this.checkoutBtn.disabled = false;
          this.checkoutBtn.textContent = 'Proceed to Checkout';
          this.close();
          cartController.clearCart();
          showToast(`Order Confirmed! Paid $${total} for ${count} items.`, 'success', 5000);
        }, 1200);
      });
    }
  }

  isOpen() {
    return this.drawer.classList.contains('active');
  }

  open() {
    this.drawer.classList.add('active');
    this.backdrop.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  close() {
    this.drawer.classList.remove('active');
    this.backdrop.classList.remove('active');
    document.body.style.overflow = '';
  }
}

/* ==========================================================================
   Authentication Modal & Profile UI
   ========================================================================== */
class AuthUI {
  constructor() {
    this.modal = document.getElementById('auth-modal');
    this.closeBtn = document.getElementById('btn-close-auth-modal');
    this.tabLogin = document.getElementById('tab-login');
    this.tabSignup = document.getElementById('tab-signup');
    this.nameGroup = document.getElementById('form-group-name');
    this.submitBtn = document.getElementById('btn-submit-auth');
    this.authForm = document.getElementById('auth-form');
    this.errorBanner = document.getElementById('auth-error-msg');
    this.googleBtn = document.getElementById('btn-google-auth');
    
    this.desktopAuthContainer = document.getElementById('desktop-auth-container');
    this.userMenuDropdown = document.getElementById('user-menu-dropdown');
    this.logoutDesktopBtn = document.getElementById('btn-logout-desktop');
    this.mobileAuthSection = document.getElementById('mobile-auth-section');

    this.currentMode = 'login'; // 'login' or 'signup'
    this.init();
  }

  init() {
    // Open triggers
    const desktopOpenBtn = document.getElementById('btn-open-auth-desktop');
    if (desktopOpenBtn) desktopOpenBtn.addEventListener('click', () => this.open());

    const mobileOpenBtn = document.getElementById('btn-open-auth-mobile');
    if (mobileOpenBtn) mobileOpenBtn.addEventListener('click', () => this.open());

    // Close controls
    if (this.closeBtn) this.closeBtn.addEventListener('click', () => this.close());
    if (this.modal) {
      this.modal.addEventListener('click', (e) => {
        if (e.target === this.modal) this.close();
      });
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen()) this.close();
    });

    // Tab switching
    if (this.tabLogin && this.tabSignup) {
      this.tabLogin.addEventListener('click', () => this.switchTab('login'));
      this.tabSignup.addEventListener('click', () => this.switchTab('signup'));
    }

    // Google Sign-In
    if (this.googleBtn) {
      this.googleBtn.addEventListener('click', async () => {
        this.clearError();
        this.googleBtn.style.opacity = '0.7';
        const res = await authController.signInWithGoogle();
        this.googleBtn.style.opacity = '1';

        if (res.success) {
          this.close();
          const name = res.user.displayName || 'Google User';
          showToast(`Welcome back, ${name}! Logged in with Google.`, 'success');
        } else {
          this.showError(res.error || 'Failed to authenticate with Google');
        }
      });
    }

    // Email / Password Form Submit
    if (this.authForm) {
      this.authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        this.clearError();

        const email = document.getElementById('auth-email').value.trim();
        const password = document.getElementById('auth-password').value;
        const name = document.getElementById('auth-name').value.trim();

        this.submitBtn.disabled = true;
        this.submitBtn.textContent = 'Authenticating...';

        let res;
        if (this.currentMode === 'login') {
          res = await authController.signInWithEmail(email, password);
        } else {
          res = await authController.registerWithEmail(email, password, name);
        }

        this.submitBtn.disabled = false;
        this.submitBtn.textContent = this.currentMode === 'login' ? 'Sign In' : 'Create Account';

        if (res.success) {
          this.close();
          this.authForm.reset();
          showToast(`Success! Signed in as ${res.user.email}`, 'success');
        } else {
          this.showError(res.error || 'Authentication failed. Check credentials.');
        }
      });
    }

    // Desktop Logout
    if (this.logoutDesktopBtn) {
      this.logoutDesktopBtn.addEventListener('click', async () => {
        await authController.logout();
        if (this.userMenuDropdown) this.userMenuDropdown.classList.remove('active');
        showToast('Signed out successfully', 'info');
      });
    }

    // Subscribe to Auth state changes to update Nav UI
    authController.subscribe((user) => this.renderAuthState(user));
  }

  renderAuthState(user) {
    // 1. Desktop Nav Auth UI
    if (this.desktopAuthContainer) {
      if (user) {
        this.desktopAuthContainer.innerHTML = `
          <button id="user-profile-trigger" class="user-profile-btn" aria-haspopup="true" aria-expanded="false">
            <img src="${user.photoURL}" alt="${user.displayName}" class="user-avatar" />
            <span class="user-name-text">${user.displayName}</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>
          </button>
        `;

        const trigger = document.getElementById('user-profile-trigger');
        const dropdown = this.userMenuDropdown;
        const nameEl = document.getElementById('dropdown-user-name');
        const emailEl = document.getElementById('dropdown-user-email');

        if (nameEl) nameEl.textContent = user.displayName;
        if (emailEl) emailEl.textContent = user.email;

        if (trigger && dropdown) {
          trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('active');
          });

          document.addEventListener('click', (e) => {
            if (!dropdown.contains(e.target) && !trigger.contains(e.target)) {
              dropdown.classList.remove('active');
            }
          });
        }
      } else {
        this.desktopAuthContainer.innerHTML = `
          <button id="btn-open-auth-desktop" class="btn-primary">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            <span>Sign In</span>
          </button>
        `;
        const btn = document.getElementById('btn-open-auth-desktop');
        if (btn) btn.addEventListener('click', () => this.open());
      }
    }

    // 2. Mobile Drawer Auth UI
    if (this.mobileAuthSection) {
      if (user) {
        this.mobileAuthSection.innerHTML = `
          <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.75rem;">
            <img src="${user.photoURL}" alt="${user.displayName}" class="user-avatar" style="width: 44px; height: 44px;" />
            <div style="overflow: hidden;">
              <div style="font-weight: 700; font-size: 0.95rem;">${user.displayName}</div>
              <div style="font-size: 0.8rem; color: var(--text-secondary); text-overflow: ellipsis; overflow: hidden;">${user.email}</div>
            </div>
          </div>
          <button id="btn-logout-mobile" class="btn-secondary" style="width: 100%; justify-content: center; font-size: 0.9rem; color: #ef4444;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            Sign Out
          </button>
        `;
        const mobileLogout = document.getElementById('btn-logout-mobile');
        if (mobileLogout) {
          mobileLogout.addEventListener('click', async () => {
            await authController.logout();
            showToast('Signed out successfully', 'info');
          });
        }
      } else {
        this.mobileAuthSection.innerHTML = `
          <button id="btn-open-auth-mobile" class="btn-primary" style="width: 100%; justify-content: center;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            Sign In / Register
          </button>
        `;
        const mobileBtn = document.getElementById('btn-open-auth-mobile');
        if (mobileBtn) mobileBtn.addEventListener('click', () => this.open());
      }
    }
  }

  switchTab(mode) {
    this.currentMode = mode;
    this.clearError();
    if (mode === 'login') {
      this.tabLogin.classList.add('active');
      this.tabSignup.classList.remove('active');
      this.nameGroup.classList.add('hidden');
      this.submitBtn.textContent = 'Sign In';
    } else {
      this.tabSignup.classList.add('active');
      this.tabLogin.classList.remove('active');
      this.nameGroup.classList.remove('hidden');
      this.submitBtn.textContent = 'Create Account';
    }
  }

  showError(msg) {
    if (this.errorBanner) {
      this.errorBanner.textContent = msg;
      this.errorBanner.classList.add('active');
    }
  }

  clearError() {
    if (this.errorBanner) {
      this.errorBanner.textContent = '';
      this.errorBanner.classList.remove('active');
    }
  }

  isOpen() {
    return this.modal.classList.contains('active');
  }

  open() {
    this.clearError();
    this.modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  close() {
    this.modal.classList.remove('active');
    document.body.style.overflow = '';
  }
}

/* ==========================================================================
   Product Catalog Renderer & Filters
   ========================================================================== */
class CatalogUI {
  constructor() {
    this.grid = document.getElementById('products-grid');
    this.categoryBtns = document.querySelectorAll('.category-btn');
    this.searchInput = document.getElementById('product-search-input');
    this.activeCategory = 'All';
    this.searchQuery = '';
    this.init();
  }

  init() {
    if (!this.grid) return;

    this.render();

    // Category button filters
    this.categoryBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.categoryBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeCategory = btn.getAttribute('data-category');
        this.render();
      });
    });

    // Real-time search filter
    if (this.searchInput) {
      this.searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.toLowerCase().trim();
        this.render();
      });
    }

    // Add to Cart event delegation
    this.grid.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-add-cart');
      if (!btn) return;

      const id = btn.getAttribute('data-id');
      const product = products.find(p => p.id === id);

      if (product) {
        cartController.addItem(id, 1);
        showToast(`Added <strong>${product.name}</strong> to cart!`, 'success');
        
        // Button pulse feedback
        btn.style.transform = 'scale(0.95)';
        setTimeout(() => {
          btn.style.transform = '';
        }, 150);
      }
    });
  }

  getFilteredProducts() {
    return products.filter(item => {
      const matchesCat = this.activeCategory === 'All' || item.category === this.activeCategory;
      const matchesSearch = !this.searchQuery || 
        item.name.toLowerCase().includes(this.searchQuery) || 
        item.description.toLowerCase().includes(this.searchQuery) ||
        item.category.toLowerCase().includes(this.searchQuery);
      return matchesCat && matchesSearch;
    });
  }

  render() {
    const items = this.getFilteredProducts();

    if (items.length === 0) {
      this.grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 1rem;" class="glass-card">
          <p style="font-size: 1.25rem; font-weight: 700; margin-bottom: 0.5rem;">No products found</p>
          <p style="color: var(--text-secondary); font-size: 0.95rem;">Try adjusting your category filter or search terms.</p>
        </div>
      `;
      return;
    }

    this.grid.innerHTML = items.map(item => `
      <article class="product-card glass-card" data-category="${item.category}">
        ${item.badge ? `<span class="product-card-badge">${item.badge}</span>` : ''}
        <div class="product-img-wrapper">
          <img src="${item.image}" alt="${item.name}" class="product-img" loading="lazy">
        </div>
        <span class="product-category-tag">${item.category}</span>
        <h3 class="product-title">${item.name}</h3>
        <p style="font-size: 0.86rem; color: var(--text-secondary); margin-bottom: 0.75rem; line-height: 1.45;">
          ${item.description}
        </p>
        <div class="product-rating">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
          <span style="font-weight: 700;">${item.rating}</span>
          <span class="rating-count">(${item.reviewsCount})</span>
        </div>
        <div class="product-card-footer">
          <div class="price-group">
            <span class="current-price">$${item.price.toFixed(2)}</span>
            ${item.originalPrice ? `<span class="original-price">$${item.originalPrice.toFixed(2)}</span>` : ''}
          </div>
          <button class="btn-add-cart" data-id="${item.id}" aria-label="Add ${item.name} to cart">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            <span>Add</span>
          </button>
        </div>
      </article>
    `).join('');
  }
}

/* ==========================================================================
   Application Bootstrap
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
  new ThemeManager();
  new MobileNavigation();
  new CartUI();
  new AuthUI();
  new CatalogUI();

  console.log("%cSK Store Initialized", "font-weight:bold;font-size:14px;color:#6366f1;");
});
