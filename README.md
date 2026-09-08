# LUMEN — Next-Gen Glassmorphic E-Commerce Web Application

A premium, modern e-commerce web platform built with frosted **Glassmorphism** visual aesthetics, **Google Firebase Authentication**, responsive **mobile drawer navigation**, and a reactive **Light / Dark theme toggle**.

---

## ✨ Features

- **Pristine Glassmorphism UI**: Multi-layered frosted glass panels with `backdrop-filter: blur(20px)`, subtle iridescent borders, glowing shadows, and floating animated ambient mesh background orbs.
- **Light & Dark Theme Switcher**: 1-click Sun/Moon toggle with automatic system preference detection (`prefers-color-scheme`) and persistent `localStorage` memory.
- **Responsive Mobile Navigation**: On screens `< 768px`, all navigation links and user actions collapse inside an intuitive hamburger menu icon, sliding open a full-height frosted glass drawer.
- **Google Firebase Authentication**:
  - Google 1-Click Popup Sign-In (`signInWithPopup`).
  - Email & Password Login / Registration modal.
  - Active user profile indicator with avatar, dropdown menu, and Sign Out.
  - **Zero-crash Demo Fallback**: Works right out of the box with an interactive demo mode if Firebase credentials haven't been entered yet.
- **Product Catalog & Instant Search**: Category filters (Audio, Wearables, Accessories, Electronics) and real-time search input.
- **Interactive Shopping Cart**: Slide-out glass cart drawer with quantity steppers, item removal, free shipping tracker, and checkout simulator.
- **Prompt Engineering Guide**: Includes `PROMPT.md` with master system prompts and few-shot patterns for extending the store.

---

## 🚀 Quick Start (Running Locally)

Since LUMEN is built with modern ES Modules and zero external build tool dependencies, you can serve it with any local static HTTP server.

### Option 1: Using Python (Built-in)
```bash
# Navigate to the project folder
cd C:\Users\sanja\.gemini\antigravity\scratch\glassmorphism-ecommerce

# Start local server
python -m http.server 8080
```
Then open your browser at: **`http://localhost:8080`**

### Option 2: Using Node.js `npx`
```bash
npx -y serve -p 8080 .
```

---

## 🔑 Connecting Your Google Firebase Project

By default, the application runs in **Interactive Demo Mode** allowing you to test all auth popups and cart flows immediately. To connect your live Firebase project:

1. Go to the [Firebase Console](https://console.firebase.google.com/) and create a new project.
2. Click **Add App** -> **Web (</>)** to register your web application.
3. In the Firebase Console left menu, go to **Build** > **Authentication** > **Sign-in method**:
   - Enable **Google** (set your support email).
   - Enable **Email/Password**.
4. In **Settings** > **Authorized domains**, ensure `localhost` is present.
5. Open [`js/firebase-config.js`](file:///C:/Users/sanja/.gemini/antigravity/scratch/glassmorphism-ecommerce/js/firebase-config.js) and replace the placeholder values with your Firebase keys:

```javascript
export const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef..."
};
```
6. Save the file. The app will immediately recognize the keys and switch to live Firebase Auth!

---

## 👤 Per-User Accounts & Carts (Firestore)

Auth alone only proves *who* someone is — to give each user their own saved
name, profile, and cart across devices you also need **Firestore**, Firebase's
database. This project is wired up for it already; you just need to turn it
on.

### 1. Enable Firestore
In the Firebase Console: **Build → Firestore Database → Create database**.
Start in **production mode** (the rules below lock it down properly).

### 2. Data model
```
users/{uid}                 → { displayName, email, photoURL, createdAt }
users/{uid}/cart/current    → { items: [...], updatedAt }
```
Each signed-in user gets one `users/{uid}` document (their profile) and one
`cart/current` sub-document (their live cart). `{uid}` is the unique ID
Firebase Auth assigns that person — this is what keeps every user's data
separate.

### 3. Lock it down with Security Rules
Go to **Firestore Database → Rules** and paste this in. It ensures a user can
only ever read or write their *own* document — never anyone else's:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;

      match /cart/{document=**} {
        allow read, write: if request.auth != null && request.auth.uid == uid;
      }
    }
  }
}
```

### 4. What happens in the code
- **`js/firebase-config.js`** now also initializes Firestore (`db`) and
  exports the `doc` / `setDoc` / `getDoc` helpers used elsewhere.
- **`js/auth.js`** creates a `users/{uid}` profile document the first time
  someone registers or signs in with Google (`ensureUserProfile`), and sets
  their `displayName` on registration.
- **`js/cart.js`** now keeps the cart in memory as before, but:
  - Signed-out visitors get a **guest cart** in `localStorage`, same as
    before.
  - Signed-in users get their cart loaded from and saved to
    `users/{uid}/cart/current` in Firestore, so it follows them anywhere.
  - The moment someone logs in, any items already sitting in their guest
    cart are **merged** into their cloud cart (quantities added together for
    matching products), then the guest cart is cleared.
  - On logout, the app falls back to an empty guest cart (their real cart is
    safe in Firestore and reloads next time they log in).

### 5. Try it
1. Add your Firebase credentials to `js/firebase-config.js` (Step above).
2. Open the site, add a couple of items to the cart **without** logging in.
3. Register or sign in — watch those items merge into your account's cart.
4. Open Firestore Database in the console: you'll see `users/<your-uid>` with
   your profile, and `users/<your-uid>/cart/current` with your cart items.
5. Log in as a second user (or an incognito window) — their cart is
   completely separate.

---

## 📁 Project Structure

```
glassmorphism-ecommerce/
├── index.html              # Semantic HTML5 single-page structure
├── css/
│   └── styles.css          # Glassmorphism tokens, light/dark themes & responsive styles
├── js/
│   ├── app.js              # Application bootstrap & UI coordinators
│   ├── auth.js             # Firebase Google & Email auth controller + demo mode
│   ├── firebase-config.js  # Firebase v10 Modular SDK initialization
│   ├── products.js         # Curated tech catalog dataset
│   └── cart.js             # Shopping cart state manager & calculations
├── PROMPT.md               # Prompt engineering specifications & design templates
└── README.md               # Documentation & setup guide
```
