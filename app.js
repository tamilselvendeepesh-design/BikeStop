import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { 
    getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut,
    signInWithEmailAndPassword, createUserWithEmailAndPassword, 
    sendPasswordResetEmail, sendEmailVerification 
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// --- FIREBASE CONFIGURATION ---
const firebaseConfig = {
    apiKey: "AIzaSyB4GuZE6rpatln-LlOJE3z_h3fn1F6mxZg",
    // CRITICAL: Set this to your custom domain for professional branding
    authDomain: "bikestop.store", 
    projectId: "bikestop-72fa7",
    storageBucket: "bikestop-72fa7.firebasestorage.app",
    messagingSenderId: "264513335139",
    appId: "1:264513335139:web:e2af3e5614b459fb28ed56",
    measurementId: "G-TTEC5PLHMC"
};

const IMGBB_KEY = "20d270d9ff63b6b39d5c3ca92b4c6f02";
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let allBikes = [];
const statusBox = document.getElementById('authStatus');

// --- 1. AUTHENTICATION LOGIC ---

// Google Login
document.getElementById('googleBtn').onclick = async () => {
    const provider = new GoogleAuthProvider();
    try {
        await signInWithPopup(auth, provider);
    } catch (e) {
        console.error("Google Auth Error:", e);
        alert("Login Failed. Make sure bikestop.store is an Authorized Domain in Firebase.");
    }
};

// Email & Password
document.getElementById('emailPassBtn').onclick = async () => {
    const email = document.getElementById('emailInput').value;
    const pass = document.getElementById('passInput').value;
    if (!email || !pass) return alert("Enter email and password.");
    
    try {
        await signInWithEmailAndPassword(auth, email, pass);
    } catch (e) {
        if (e.code === 'auth/user-not-found' || e.code === 'auth/invalid-credential') {
            try {
                const cred = await createUserWithEmailAndPassword(auth, email, pass);
                await sendEmailVerification(cred.user);
                showStatus("Account created! Verify your email.");
            } catch (err) { showStatus(err.message, true); }
        } else { showStatus(e.message, true); }
    }
};

// Password Reset
document.getElementById('forgotPassBtn').onclick = async () => {
    const email = document.getElementById('emailInput').value;
    if (!email) return alert("Enter your email first.");
    try {
        await sendPasswordResetEmail(auth, email);
        showStatus("Reset link sent to your inbox!");
    } catch (e) { showStatus(e.message, true); }
};

// Logout
document.getElementById('logoutBtn').onclick = () => signOut(auth).then(() => location.reload());

// --- 2. AUTH STATE OBSERVER ---
onAuthStateChanged(auth, (user) => {
    const splash = document.getElementById('splash');
    if (splash) setTimeout(() => splash.style.display = 'none', 1000);

    if (user) {
        window.showPage('homePage');
        const banner = document.getElementById('verifyBanner');
        if (banner) user.emailVerified ? banner.classList.add('d-none') : banner.classList.remove('d-none');
    } else {
        window.showPage('loginPage');
    }
});

// --- 3. IMAGE COMPRESSION & UPLOAD ---
async function compressImage(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (e) => {
            const img = new Image();
            img.src = e.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 1000;
                let width = img.width, height = img.height;
                if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
                canvas.width = width; canvas.height = height;
                canvas.getContext('2d').drawImage(img, 0, 0, width, height);
                canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.7);
            };
        };
    });
}

document.getElementById('upBtn').onclick = async () => {
    const btn = document.getElementById('upBtn');
    const title = document.getElementById('bikeTitle').value;
    const price = document.getElementById('bikePrice').value;
    const desc = document.getElementById('bikeCondition').value;
    const files = document.getElementById('bikePhotos').files;

    if (!title || !price || files.length === 0) return alert("Fill all fields.");
    if (!auth.currentUser.emailVerified) return alert("Please verify your email first!");

    btn.innerText = "Processing AI..."; btn.disabled = true;

    try {
        let urls = [];
        for (let file of files) {
            const blob = await compressImage(file);
            let fd = new FormData();
            fd.append("image", blob);
            const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`, { method: "POST", body: fd });
            const data = await res.json();
            if (data.success) urls.push(data.data.url);
        }

        let mat = /carbon|fiber|s-works/.test(desc.toLowerCase()) ? "Carbon" : "Alloy";

        await addDoc(collection(db, "bikes"), {
            title, price: Number(price), condition: desc, frame: mat,
            images: urls, time: Date.now(), sellerUid: auth.currentUser.uid
        });

        alert("Bike Posted!"); location.reload();
    } catch (e) {
        alert("Upload Failed: " + e.message);
        btn.innerText = "Post Listing"; btn.disabled = false;
    }
};

// --- 4. REAL-TIME RENDER ---
onSnapshot(query(collection(db, "bikes"), orderBy("time", "desc")), (snap) => {
    allBikes = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    window.render();
});

window.render = () => {
    const grid = document.getElementById('grid');
    if (!grid) return;
    grid.innerHTML = allBikes.map(bike => `
        <div class="col-md-4 col-6 mb-3">
            <div class="card bike-card shadow-sm h-100 border-0">
                <span class="badge-ai">${bike.frame}</span>
                <img src="${bike.images[0]}" class="card-img-top" style="height:160px; object-fit:cover;" onerror="this.src='https://via.placeholder.com/300x160?text=No+Image'">
                <div class="card-body p-3">
                    <h6 class="fw-bold mb-1 text-truncate">${bike.title}</h6>
                    <p class="price-text mb-0">$${bike.price}</p>
                </div>
            </div>
        </div>
    `).join('');
};

// --- HELPER UI ---
window.showPage = (id) => {
    document.querySelectorAll('.page-view').forEach(p => p.style.display = 'none');
    document.getElementById(id).style.display = 'block';
};

window.toggleUpload = () => {
    const el = document.getElementById('uploadSection');
    el.style.display = el.style.display === 'none' ? 'block' : 'none';
};

function showStatus(msg, isError = false) {
    if (!statusBox) return;
    statusBox.innerText = msg;
    statusBox.className = `alert small py-2 ${isError ? 'alert-danger' : 'alert-success'}`;
    statusBox.classList.remove('d-none');
}
