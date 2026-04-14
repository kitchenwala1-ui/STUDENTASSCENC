// Mock Data (High-Quality Images)
const PRODUCTS = [
    { id: 1, name: 'Comfort Bed with Mattress', price: 400, category: 'Furniture', img: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=500&h=400&fit=crop', details: 'Full memory foam mattress with sturdy wooden base.' },
    { id: 2, name: 'Study Table (Wooden)', price: 150, category: 'Study', img: 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=500&h=400&fit=crop', details: 'High-quality oak finished study desk.' },
    { id: 3, name: 'Ergonomic Study Chair', price: 200, category: 'Study', img: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=500&h=400&fit=crop', details: 'Lumbar support for long study hours.' },
    { id: 4, name: 'Porta-Cooler (50L)', price: 500, category: 'Appliances', img: 'https://images.unsplash.com/photo-1585336139118-89c1531238fc?w=500&h=400&fit=crop', details: 'Powerful desert cooling for students.' },
    { id: 5, name: 'Compact 2-Door Wardrobe', price: 250, category: 'Storage', img: 'https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=500&h=400&fit=crop', details: 'Spacious 2-door organizer.' }
];

const ROOMS = [
    { id: 101, name: 'Luxury Single P.G.', price: 4500, img: 'https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?w=500&h=400&fit=crop', details: 'Wi-Fi, Food & AC included.' },
    { id: 102, name: 'Double Sharing Studio', price: 3000, img: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=500&h=400&fit=crop', details: 'Twin sharing for campus students.' }
];

const PLANS = [
    { id: 1, title: 'Fresher Basic Bundle', price: '₹750', items: ['Single Bed', 'Fan', 'Study Table'], popular: true },
    { id: 2, title: 'Premium Luxury Bundle', price: '₹1400', items: ['Double Bed', 'Cooler', 'Ergo Chair'], popular: false }
];

// Secure Storage Fallback
const storage = {
    getItem: (key) => { try { return localStorage.getItem(key); } catch(e) { return window['temp_store_'+key] || null; } },
    setItem: (key, val) => { try { localStorage.setItem(key, val); } catch(e) { window['temp_store_'+key] = val; } }
};

let cart = [];
let activeCategory = 'All';
let searchQuery = '';
let mainContent = null;
let navItems = null;

const DEFAULT_AVATAR = 'https://i.pravatar.cc/150?img=11';

// EMERGENCY FALLBACK
setTimeout(() => {
    const s = document.getElementById('splash-screen');
    if (s && s.style.display !== 'none') { 
        console.log("StudentNest: Emergency Cleanup Triggered");
        s.style.display = 'none'; s.style.opacity = '0'; s.style.pointerEvents = 'none';
    }
}, 3000);

/* --- Authentication --- */
window.handleLogin = () => {
    console.log("StudentNest: Login Attempt Started...");
    const emailEl = document.getElementById('email');
    const passEl = document.getElementById('password');
    if(!emailEl || !passEl) { alert("Core Login Elements Missing!"); return; }
    
    const email = emailEl.value.trim();
    const pass = passEl.value;
    const sE = storage.getItem('user_email'), sP = storage.getItem('user_pass');
    
    console.log("StudentNest: Comparing credentials...");
    if ((email === sE && pass === sP) || (email === 'student@test.com' && pass === '1234')) { 
        console.log("StudentNest: Credentials Match!");
        loginSuccess(); 
    } else { 
        console.warn("StudentNest: Invalid Login Attempt");
        alert("Invalid! Try the One-Tap Demo button below!");
        showToast('Account not found!', 'error'); 
    }
};

window.demoLogin = () => {
    document.getElementById('email').value = 'student@test.com';
    document.getElementById('password').value = '1234';
    window.handleLogin();
};

window.handleSignup = () => {
    const n = document.getElementById('reg-name').value.trim();
    const e = document.getElementById('reg-email').value.trim();
    const p = document.getElementById('reg-password').value;
    if (!n || !e || !p) return showToast('Enter all details!', 'warning');
    storage.setItem('user_name', n);
    storage.setItem('user_email', e);
    storage.setItem('user_pass', p);
    storage.setItem('user_pic', DEFAULT_AVATAR);
    showToast(`Welcome ${n}!`, 'success');
    setTimeout(() => { 
        document.querySelectorAll('.login-overlay').forEach(o => o.style.display = 'none');
        loginSuccess(); 
    }, 800);
};

function loginSuccess() {
    storage.setItem('is_logged_in', 'true');
    document.querySelectorAll('.login-overlay').forEach(overlay => {
        overlay.style.opacity = '0';
        setTimeout(() => { overlay.style.display = 'none'; }, 400); 
    });
    setTimeout(initializeApp, 100); 
}

window.handleLogout = () => {
    performLogout();
};

function performLogout() {
    storage.setItem('is_logged_in', 'false');
    const login = document.getElementById('login-screen');
    if (login) { login.style.display = 'flex'; login.style.opacity = '1'; }
    window.closeProfile();
    showToast('Signed out!', 'info');
}

function updateProfileUI() {
    try {
        const n = storage.getItem('user_name') || 'Student';
        const p = storage.getItem('user_pic') || DEFAULT_AVATAR;
        const greeting = document.querySelector('.user-greeting h1');
        if (greeting) greeting.innerHTML = `Hi, ${n} 👋`;
        document.querySelectorAll('#user-display-name').forEach(el => { if(el) el.textContent = n; });
        document.querySelectorAll('#modal-profile-img').forEach(m => { if(m) m.src = p; });
        document.querySelectorAll('#header-profile-img').forEach(h => { if(h) h.src = p; });
        
        const firstName = n.split(' ')[0];
        const randomGreetings = ["Hello", "Hi", "Hey"];
        const randG = randomGreetings[Math.floor(Math.random() * randomGreetings.length)];
        const headerGreeting = document.getElementById('header-greeting');
        if (headerGreeting) headerGreeting.textContent = `${randG} ${firstName}`;
    } catch(e) { console.warn("UI fails", e); }
}

async function requestAndroidPermissions() {
    try {
        navigator.geolocation.getCurrentPosition(() => {}, (e) => {});
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            await navigator.mediaDevices.getUserMedia({ audio: true, video: true })
                .then(stream => { stream.getTracks().forEach(track => track.stop()); })
                .catch(e => {});
        }
    } catch (err) {}
}

/* --- Initialization --- */
function initializeApp() {
    console.log("StudentNest: Start Init...");
    const isL = storage.getItem('is_logged_in');
    
    const loginScreen = document.getElementById('login-screen');
    const splashScreen = document.getElementById('splash-screen');
    const appContainer = document.querySelector('.app-container');

    if (appContainer) { appContainer.style.display = 'flex'; appContainer.style.opacity = '1'; }

    if (isL === 'true') {
        console.log("StudentNest: Entering Main App...");
        if (loginScreen) { loginScreen.style.display = 'none'; loginScreen.style.zIndex = '-1'; }
        if (splashScreen) { splashScreen.style.display = 'none'; }
    } else {
        console.log("StudentNest: Showing Login...");
        if (loginScreen) { loginScreen.style.display = 'flex'; loginScreen.style.zIndex = '99999'; }
        if (splashScreen) { splashScreen.style.display = 'none'; }
    }

    try {
        console.log("StudentNest: Finding Elements...");
        mainContent = document.getElementById('main-content');
        navItems = document.querySelectorAll('.nav-item');
        
        console.log("StudentNest: Updating UI/Rendering...");
        updateProfileUI();
        renderHome();
        setupSearch();
        setupNav();
        
        console.log("StudentNest: Done.");
    } catch (e) {
        console.error("StudentNest: CRITICAL ERROR", e);
    }
}

if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', initializeApp); } else { initializeApp(); }

function setupSearch() {
    document.getElementById('product-search')?.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        if (searchQuery !== '') window.switchTab('home');
        renderHome();
    });
}

function setupNav() {
    if (navItems) {
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                navItems.forEach(n => n.classList.remove('active'));
                const clicked = e.currentTarget; clicked.classList.add('active');
                const t = clicked.getAttribute('data-tab');
                if(t === 'home') renderHome();
                else if(t === 'rooms') renderRooms();
                else if(t === 'plans') renderPlans();
                else if(t === 'cart') renderCart();
                else if(t === 'profile-tab') window.openProfile();
            });
        });
    }
}

function renderHome() {
    if (!mainContent) { console.warn("No main content element!"); return; }
    const f = PRODUCTS.filter(p => (activeCategory === 'All' || p.category === activeCategory) && p.name.toLowerCase().includes(searchQuery));
    mainContent.innerHTML = `
        <div class="section">
            <div class="hero-banner"><h2>Stay Fresh, Buy Best!</h2><button class="btn-primary" onclick="window.switchTab('plans')">Explore Bundles</button></div>
            <div class="categories">
                ${['All', 'Furniture', 'Appliances', 'Storage', 'Study'].map(c => `<div class="category-pill ${activeCategory===c?'active':''}" onclick="window.setCategory('${c}')">${c}</div>`).join('')}
            </div>
            <div class="products-grid">
                ${f.map(p => `
                    <div class="product-card" onclick="window.showDetails(${p.id}, 'product')">
                        <img src="${p.img}" class="product-image">
                        <div class="product-info"><h3>${p.name}</h3><span>₹${p.price}</span></div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function renderRooms() {
    mainContent.innerHTML = `<div class="section"><div class="section-title">Verified Student Rooms</div><div class="products-grid">${ROOMS.map(r => `
        <div class="product-card" onclick="window.showDetails(${r.id}, 'room')">
            <img src="${r.img}" class="product-image">
            <div class="product-info"><h3>${r.name}</h3><span>₹${r.price}</span></div>
        </div>
    `).join('')}</div></div>`;
}

function renderPlans() {
    mainContent.innerHTML = `<div class="section"><div class="section-title">Campus Bundles</div>${PLANS.map(p => `<div class="plan-card ${p.popular?'popular':''}"><div class="plan-title">${p.title}</div><div class="plan-price">${p.price}</div><button class="btn-full btn-gradient" onclick="window.addPlanToCart('${p.title}')">Buy Bundle</button></div>`).join('')}</div>`;
}

function renderCart() {
    if (cart.length === 0) { mainContent.innerHTML = `<div class="section" style="text-align:center;padding:80px 20px;"><h3>Bag is empty!</h3><button class="btn-full btn-gradient" onclick="window.switchTab('home')" style="margin-top:20px">Shop Now</button></div>`; return; }
    const total = cart.reduce((acc, i) => acc + (i.price || 0), 0);
    mainContent.innerHTML = `<div class="section"><div class="section-title">My Bag (${cart.length})</div>${cart.map((i, idx) => `<div style="background:white;padding:18px;margin-bottom:12px;border-radius:18px;display:flex;justify-content:space-between;align-items:center;"><div><b>${i.name}</b><br><small>₹${i.price}</small></div><i class="fa-solid fa-circle-xmark" style="color:#ef4444;font-size:20px;cursor:pointer" onclick="window.removeFromCart(${idx})"></i></div>`).join('')}<b>Total: ₹${total}</b><button class="btn-full btn-gradient" style="margin-top:18px" onclick="window.checkout()">Checkout</button></div>`;
}

/* --- Global Helpers --- */
window.setCategory=(c)=>{activeCategory=c;renderHome();};
window.showDetails=(id, type)=>{
    const a = type === 'room' ? ROOMS : PRODUCTS; const p = a.find(prod => prod.id === id);
    if(typeof Swal !== 'undefined') {
        Swal.fire({ title: p.name, text: p.details, imageUrl: p.img, imageWidth: 350, showCancelButton: true, confirmButtonText: 'Add to Bag' }).then(res => { if(res.isConfirmed) window.addToCart(id, type); });
    }
};
window.addToCart=(id, type)=>{ const a = type === 'room' ? ROOMS : PRODUCTS; cart.push(a.find(p => p.id === id)); showToast('Added! 🛒', 'success'); renderHome(); };
window.addPlanToCart=(t)=>{ cart.push({name: t, price: t.includes('Premium')?1400:750}); window.switchTab('cart'); };
window.removeFromCart=(i)=>{ cart.splice(i, 1); renderCart(); };
window.checkout=()=>{ Swal.fire('Ordered! 🎉', 'Our team will contact you.', 'success'); cart = []; window.switchTab('home'); };
window.switchTab=(t)=>{ const el = document.querySelector(`.nav-item[data-tab="${t}"]`); if(el) el.click(); };
window.openProfile=()=>{ if (window.showScreen) window.showScreen('profile'); };
window.closeProfile=()=>{ const m = document.getElementById('profile-modal'); if (m) m.style.display = 'none'; };
// removed buggy window.showScreen override

function showToast(t, i) { if (typeof Swal !== 'undefined') { Swal.fire({ toast: true, position: 'top', icon: i, title: t, showConfirmButton: false, timer: 1500 }); } }
window.openSubScreen = (type) => { document.getElementById('sub-modal').style.display = 'flex'; };
window.closeSubScreen = () => { document.getElementById('sub-modal').style.display = 'none'; };
async function toggleSellerMode(on) {
    document.getElementById('buyer-container').style.display = on ? 'none' : 'block';
    document.getElementById('seller-dashboard').style.display = on ? 'block' : 'none';
    if(on) { window.closeProfile(); }
}
window.toggleSellerMode = toggleSellerMode;
