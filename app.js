import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { 
    getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut,
    signInWithEmailAndPassword, createUserWithEmailAndPassword, 
    sendSignInLinkToEmail, sendPasswordResetEmail, sendEmailVerification 
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyB4GuZE6rpatln-LlOJE3z_h3fn1F6mxZg",
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
const verifyBanner = document.getElementById('verifyBanner');

// --- NAVIGATION & UI ---
window.showPage = (id) => {
    document.querySelectorAll('.page-view').forEach(p => p.style.display = 'none');
    const target = document.getElementById(id);
    if(target) target.style.display = 'block';
};

function showStatus(msg, isError = false) {
    if(!statusBox) return;
    statusBox.innerText = msg;
    statusBox.className = `alert small py-2 ${isError ? 'alert-danger' : 'alert-success'}`;
    statusBox.classList.remove('d-none');
    setTimeout(() => statusBox.classList.add('d-none'), 6000);
}

function checkVerification(user) {
    if (user && !user.emailVerified) {
        verifyBanner?.classList.remove('d-none');
        return false;
    }
    verifyBanner?.classList.add('d-none');
    return true;
}

// --- AUTHENTICATION ---
document.getElementById('logoutBtn').onclick = () => signOut(auth).then(() => location.reload());

document.getElementById('googleBtn').onclick = async () => {
    try { await signInWithPopup(auth, new GoogleAuthProvider()); } 
    catch (e) { alert("Login Error: " + e.message); }
};

document.getElementById('forgotPassBtn').onclick = async () => {
    const email = document.getElementById('emailInput').value;
    if (!email) return alert("Enter email first.");
    try {
        await sendPasswordResetEmail(auth, email);
        showStatus("Password reset email sent!");
    } catch (e) { showStatus(e.message, true); }
};

document.getElementById('emailPassBtn').onclick = async () => {
    const email = document.getElementById('emailInput').value;
    const pass = document.getElementById('passInput').value;
    try {
        await signInWithEmailAndPassword(auth, email, pass);
    } catch (e) {
        if (e.code === 'auth/user-not-found' || e.code === 'auth/invalid-credential' || e.code === 'auth/invalid-login-credentials') {
            try {
                const cred = await createUserWithEmailAndPassword(auth, email, pass);
                await sendEmailVerification(cred.user);
                showStatus("Account created! Check email to verify.");
            } catch (err) { showStatus(err.message, true); }
        } else { showStatus(e.message, true); }
    }
};

document.getElementById('resendVerifyBtn').onclick = async () => {
    try {
        await sendEmailVerification(auth.currentUser);
        alert("Verification link resent!");
    } catch (e) { alert(e.message); }
};

// --- AUTH OBSERVER ---
onAuthStateChanged(auth, (user) => {
    console.log("Auth State Changed. User:", user ? user.email : "Guest");
    setTimeout(() => {
        const splash = document.getElementById('splash');
        if(splash) splash.style.display = 'none';
        if (user) {
            showPage('homePage');
            checkVerification(user);
        } else {
            showPage('loginPage');
        }
    }, 1200);
});

// --- DATA LISTENING ---
onSnapshot(query(collection(db, "bikes"), orderBy("time", "desc")), (snap) => {
    allBikes = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    window.render();
}, (err) => {
    console.error("Firestore Error:", err);
});

window.render = () => {
    const term = document.getElementById('search')?.value.toLowerCase() || "";
    const grid = document.getElementById('grid');
    if(!grid) return;
    
    grid.innerHTML = "";
    let results = allBikes;
    
    if (term.trim() !== "") {
        results = new Fuse(allBikes, { keys: ['title', 'condition', 'frame'], threshold: 0.3 }).search(term).map(r => r.item);
    }

    results.forEach(bike => {
        grid.innerHTML += `
            <div class="col-md-4 col-6 mb-3">
                <div class="card bike-card shadow-sm h-100">
                    <span class="badge-ai">${bike.frame || 'Standard'}</span>
                    <img src="${bike.images[0]}" class="card-img-top" style="height:160px; object-fit:cover;" onerror="this.src='https://via.placeholder.com/300x160?text=No+Image'">
                    <div class="card-body p-3">
                        <h6 class="fw-bold mb-1 text-truncate">${bike.title}</h6>
                        <p class="price-text mb-0">$${bike.price}</p>
                    </div>
                </div>
            </div>`;
    });
};

// --- UPLOAD LOGIC ---
window.toggleUpload = () => {
    if (!auth.currentUser) return alert("Please login first!");
    if (!checkVerification(auth.currentUser)) {
        alert("Verification required! Please check your email inbox.");
        return;
    }
    const el = document.getElementById('uploadSection');
    el.style.display = el.style.display === 'none' ? 'block' : 'none';
};

document.getElementById('upBtn').onclick = async () => {
    const btn = document.getElementById('upBtn');
    const title = document.getElementById('bikeTitle').value;
    const desc = document.getElementById('bikeCondition').value.toLowerCase();
    const price = document.getElementById('bikePrice').value;
    const files = document.getElementById('bikePhotos').files;

    if (!title || !price || files.length === 0) return alert("Please fill in all fields and add photos!");
    
    btn.innerText = "Uploading Images...";
    btn.disabled = true;

    try {
        let mat = "Standard";
        if (/carbon|s-works|fiber|sl7|sl8/.test(desc)) mat = "Carbon";
        else if (/alloy|alum|metal/.test(desc)) mat = "Alloy";

        let urls = [];
        console.log("Starting ImgBB Upload...");
        
        for (let f of files) {
            let fd = new FormData();
            fd.append("image", f);
            const r = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`, { method: "POST", body: fd });
            const d = await r.json();
            if(d.success) urls.push(d.data.url);
        }

        if(urls.length === 0) throw new Error("Image upload failed. Check API key.");

        btn.innerText = "Saving to BIKESTOP...";
        console.log("Saving to Firestore...");

        await addDoc(collection(db, "bikes"), { 
            title, 
            price: Number(price), 
            condition: desc, 
            frame: mat, 
            images: urls, 
            time: Date.now(), 
            sellerUid: auth.currentUser.uid 
        });

        alert("Bike Posted Successfully!");
        location.reload(); 

    } catch (e) {
        console.error("Critical Upload Error:", e);
        alert("Upload Failed: " + e.message);
        btn.innerText = "Post Listing";
        btn.disabled = false;
    }
};
