// Shopping Cart Controller
// Cart is per-user: signed-in users get their cart stored in Firestore under
// users/{uid}/cart/current, so it follows them to any device. Guests (and
// Demo Mode) fall back to a localStorage cart. On login, any items sitting
// in the guest cart are merged into the user's cloud cart.
import { products } from './products.js';
import { authController } from './auth.js';
import { db, isConfigured, doc, setDoc, getDoc } from './firebase-config.js';

class CartController {
  constructor() {
    this.items = [];
    this.storageKey = 'glass_ecommerce_cart';
    this.freeShippingThreshold = 250;
    this.currentUser = null;
    this.init();
  }

  init() {
    // Load whatever's in the guest cart first so the UI has something
    // to show immediately, then swap to the user's cloud cart once
    // auth state resolves.
    this.loadGuestCart();
    this.updateUI();

    authController.subscribe(async (user) => {
      const wasGuest = !this.currentUser;
      const previousUser = this.currentUser;
      this.currentUser = user;

      if (user && isConfigured && db) {
        // User just signed in: merge any guest-cart items into their
        // cloud cart, then load the merged result.
        if (wasGuest) {
          await this.mergeGuestCartIntoCloud(user.uid);
        }
        await this.loadCloudCart(user.uid);
      } else if (!user && previousUser) {
        // User signed out: fall back to an empty guest cart.
        this.items = [];
        this.loadGuestCart();
      }
      this.updateUI();
    });
  }

  loadGuestCart() {
    const saved = localStorage.getItem(this.storageKey);
    if (saved) {
      try {
        this.items = JSON.parse(saved);
      } catch (e) {
        this.items = [];
      }
    }
  }

  async loadCloudCart(uid) {
    try {
      const ref = doc(db, 'users', uid, 'cart', 'current');
      const snap = await getDoc(ref);
      this.items = snap.exists() ? (snap.data().items || []) : [];
    } catch (err) {
      console.error('[Firestore] Failed to load cart, falling back to guest cart:', err);
      this.loadGuestCart();
    }
  }

  async mergeGuestCartIntoCloud(uid) {
    const guestItems = [...this.items]; // whatever was loaded as guest
    if (guestItems.length === 0) return;
    try {
      const ref = doc(db, 'users', uid, 'cart', 'current');
      const snap = await getDoc(ref);
      const cloudItems = snap.exists() ? (snap.data().items || []) : [];

      guestItems.forEach(guestItem => {
        const match = cloudItems.find(i => i.id === guestItem.id);
        if (match) {
          match.quantity += guestItem.quantity;
        } else {
          cloudItems.push(guestItem);
        }
      });

      await setDoc(ref, { items: cloudItems, updatedAt: new Date().toISOString() });
      // Guest cart has been folded into the cloud cart — clear it locally.
      localStorage.removeItem(this.storageKey);
    } catch (err) {
      console.error('[Firestore] Failed to merge guest cart:', err);
    }
  }

  save() {
    if (this.currentUser && isConfigured && db) {
      this.saveToCloud();
    } else {
      localStorage.setItem(this.storageKey, JSON.stringify(this.items));
    }
    this.updateUI();
  }

  async saveToCloud() {
    try {
      const ref = doc(db, 'users', this.currentUser.uid, 'cart', 'current');
      await setDoc(ref, { items: this.items, updatedAt: new Date().toISOString() });
    } catch (err) {
      console.error('[Firestore] Failed to save cart:', err);
    }
  }

  addItem(productId, quantity = 1) {
    const product = products.find(p => p.id === productId);
    if (!product) return false;

    const existing = this.items.find(item => item.id === productId);
    if (existing) {
      existing.quantity += quantity;
    } else {
      this.items.push({
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        category: product.category,
        quantity: quantity
      });
    }
    this.save();
    return true;
  }

  updateQuantity(productId, delta) {
    const item = this.items.find(i => i.id === productId);
    if (!item) return;

    item.quantity += delta;
    if (item.quantity <= 0) {
      this.removeItem(productId);
      return;
    }
    this.save();
  }

  removeItem(productId) {
    this.items = this.items.filter(i => i.id !== productId);
    this.save();
  }

  clearCart() {
    this.items = [];
    this.save();
  }

  getTotalCount() {
    return this.items.reduce((sum, item) => sum + item.quantity, 0);
  }

  getSubtotal() {
    return this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }

  updateUI() {
    const totalCount = this.getTotalCount();
    const subtotal = this.getSubtotal();

    // Update badges
    document.querySelectorAll('.cart-badge').forEach(badge => {
      badge.textContent = totalCount;
      if (totalCount > 0) {
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }
    });

    // Update Cart Drawer Items
    const cartItemsContainer = document.getElementById('cart-items-list');
    const emptyState = document.getElementById('cart-empty-state');
    const cartFooter = document.getElementById('cart-footer');
    const subtotalEl = document.getElementById('cart-subtotal');
    const totalEl = document.getElementById('cart-total');
    const shippingProgressEl = document.getElementById('shipping-progress-bar');
    const shippingTextEl = document.getElementById('shipping-status-text');

    if (!cartItemsContainer) return;

    if (this.items.length === 0) {
      if (emptyState) emptyState.classList.remove('hidden');
      if (cartFooter) cartFooter.classList.add('hidden');
      cartItemsContainer.innerHTML = '';
      return;
    }

    if (emptyState) emptyState.classList.add('hidden');
    if (cartFooter) cartFooter.classList.remove('hidden');

    cartItemsContainer.innerHTML = this.items.map(item => `
      <div class="cart-item glass-card-nested" data-id="${item.id}">
        <img src="${item.image}" alt="${item.name}" class="cart-item-img" loading="lazy" />
        <div class="cart-item-info">
          <span class="cart-item-category">${item.category}</span>
          <h4 class="cart-item-title">${item.name}</h4>
          <div class="cart-item-price">$${item.price.toFixed(2)}</div>
          <div class="cart-item-actions">
            <div class="quantity-stepper">
              <button class="btn-step" data-action="decrement" data-id="${item.id}" aria-label="Decrease quantity">−</button>
              <span class="quantity-value">${item.quantity}</span>
              <button class="btn-step" data-action="increment" data-id="${item.id}" aria-label="Increase quantity">+</button>
            </div>
            <button class="btn-remove" data-action="remove" data-id="${item.id}" title="Remove item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        </div>
      </div>
    `).join('');

    // Update monetary totals
    if (subtotalEl) subtotalEl.textContent = `$${subtotal.toFixed(2)}`;
    if (totalEl) totalEl.textContent = `$${subtotal.toFixed(2)}`;

    // Free shipping calculation
    if (shippingProgressEl && shippingTextEl) {
      const remaining = Math.max(0, this.freeShippingThreshold - subtotal);
      const percentage = Math.min(100, Math.round((subtotal / this.freeShippingThreshold) * 100));
      shippingProgressEl.style.width = `${percentage}%`;
      
      if (remaining === 0) {
        shippingTextEl.innerHTML = `🎉 You unlocked <strong>FREE Express Shipping</strong>!`;
      } else {
        shippingTextEl.innerHTML = `Add <strong>$${remaining.toFixed(2)}</strong> more for <strong>FREE Shipping</strong>`;
      }
    }
  }
}

export const cartController = new CartController();
