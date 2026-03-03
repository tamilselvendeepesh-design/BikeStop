import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { 
    getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut,
    signInWithEmailAndPassword, createUserWithEmailAndPassword, 
    sendSignInLinkToEmail, sendPasswordResetEmail, sendEmailVerification 
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyB4GuZE6rpatln-LlOJE3z_h3fn1F6mxZg",
    authDomain: "bikestop.store", // Custom Domain for branding
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

// --- UTILITIES ---
window.showPage = (id) => {
    document.querySelectorAll('.page-view').forEach(p => p.style.display = 'none');
    document.getElementById(id).style.display = 'block';
};

function showStatus(msg, isError = false) {
    statusBox.innerText = msg;
    statusBox.className = `alert small py-2 ${isError ? 'alert-danger' : 'alert-success'}`;
    statusBox.classList.remove('d-none');
    setTimeout(() => statusBox.classList.add('d-none'), 6000);
}

function checkVerification(user) {
    if (user && !user.emailVerified) {
        verifyBanner.classList.remove('d-none');
        return false;
    }
    verifyBanner.classList.add('d-none');
    return true;
}

// --- AUTH ACTIONS ---
document.getElementById('logoutBtn').onclick = () => signOut(auth).then(() => location.reload());

document.getElementById('googleBtn').onclick = async () => {
    try { await signInWithPopup(auth, new GoogleAuthProvider()); } catch (e) { alert(e.message); }
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
        if (e.code === 'auth/user-not-found' || e.code === 'auth/invalid-credential') {
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

// --- NAVIGATION & OBSERVER ---
window.toggleUpload = () => {
    if (!auth.currentUser) return alert("Please login first!");
    if (!checkVerification(auth.currentUser)) return alert("Verify your email to sell!");
    const el = document.getElementById('uploadSection');
    el.style.display = el.style.display === 'none' ? 'block' : 'none';
};

onAuthStateChanged(auth, (user) => {
    setTimeout(() => {
        document.getElementById('splash').style.display = 'none';
        if (user) {
            showPage('homePage');
            checkVerification(user);
        } else {
            showPage('loginPage');
        }
    }, 1200);
});

// --- DATA & RENDER ---
onSnapshot(query(collection(db, "bikes"), orderBy("time", "desc")), (snap) => {
    allBikes = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    window.render();
});

window.render = () => {
    const term = document.getElementById('search').value.toLowerCase();
    const grid = document.getElementById('grid');
    grid.innerHTML = "";
    let results = allBikes;
    if (term.trim() !== "") {
        results = new Fuse(allBikes, { keys: ['title', 'condition', 'frame'], threshold: 0.3 }).search(term).map(r => r.item);
    }
    results.forEach(bike => {
        grid.innerHTML += `
            <div class="col-md-4 col-6 mb-3">
                <div class="card bike-card">
                    <span class="badge-ai">${bike.frame || 'Bike'}</span>
                    <img src="${bike.images[0]}" class="card-img-top" style="height:160px; object-fit:cover;">
                    <div class="card-body p-3">
                        <h6 class="fw-bold mb-1 text-truncate">${bike.title}</h6>
                        <p class="price-text mb-0">$${bike.price}</p>
                    </div>
                </div>
            </div>`;
    });
};

document.getElementById('upBtn').onclick = async () => {
    const btn = document.getElementById('upBtn');
    const title = document.getElementById('bikeTitle').value;
    const desc = document.getElementById('bikeCondition').value.toLowerCase();
    const price = document.getElementById('bikePrice').value;
    const files = document.getElementById('bikePhotos').files;

    if (!title || !price || files.length === 0) return alert("Missing info!");
    btn.innerText = "AI Processing..."; btn.disabled = true;

    let mat = "Standard";
    if (/carbon|s-works|fiber/.test(desc)) mat = "Carbon";
    else if (/alloy|alum/.test(desc)) mat = "Alloy";

    let urls = [];
    for (let f of files) {
        let fd = new FormData(); fd.append("image", f);
        const r = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`, { method: "POST", body: fd });
        const d = await r.json(); urls.push(d.data.url);
    }

    await addDoc(collection(db, "bikes"), { 
        title, price: Number(price), condition: desc, frame: mat, 
        images: urls, time: Date.now(), sellerUid: auth.currentUser.uid 
    });
    location.reload();
};
