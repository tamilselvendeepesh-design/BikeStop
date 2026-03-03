import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { 
    getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut,
    signInWithEmailAndPassword, createUserWithEmailAndPassword, sendSignInLinkToEmail,
    isSignInWithEmailLink, signInWithEmailLink, RecaptchaVerifier, signInWithPhoneNumber
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

// --- NAVIGATION ---
window.showPage = (id) => {
    document.querySelectorAll('.page-view').forEach(p => p.style.display = 'none');
    document.getElementById(id).style.display = 'block';
};

window.toggleUpload = () => {
    const el = document.getElementById('uploadSection');
    el.style.display = el.style.display === 'none' ? 'block' : 'none';
};

// --- AUTH LOGIC ---
document.getElementById('logoutBtn').onclick = () => signOut(auth).then(() => location.reload());

document.getElementById('googleBtn').onclick = async () => {
    try { await signInWithPopup(auth, new GoogleAuthProvider()); } catch (e) { alert(e.message); }
};

document.getElementById('emailPassBtn').onclick = async () => {
    const email = document.getElementById('emailInput').value;
    const pass = document.getElementById('passInput').value;
    try {
        await signInWithEmailAndPassword(auth, email, pass);
    } catch (e) {
        if (e.code === 'auth/user-not-found') await createUserWithEmailAndPassword(auth, email, pass);
        else alert(e.message);
    }
};

document.getElementById('emailLinkBtn').onclick = async () => {
    const email = document.getElementById('emailInput').value;
    try {
        await sendSignInLinkToEmail(auth, email, { url: window.location.href, handleCodeInApp: true });
        window.localStorage.setItem('emailForSignIn', email);
        alert("Link Sent!");
    } catch (e) { alert(e.message); }
};

if (isSignInWithEmailLink(auth, window.location.href)) {
    let email = window.localStorage.getItem('emailForSignIn') || window.prompt('Email for confirmation?');
    signInWithEmailLink(auth, email, window.location.href).then(() => window.localStorage.removeItem('emailForSignIn'));
}

window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', { 'size': 'invisible' });
document.getElementById('phoneBtn').onclick = async () => {
    try {
        window.confirmationResult = await signInWithPhoneNumber(auth, document.getElementById('phoneInput').value, window.recaptchaVerifier);
        document.getElementById('otpSection').style.display = 'block';
    } catch (e) { alert(e.message); }
};
document.getElementById('verifyOtpBtn').onclick = async () => {
    try { await window.confirmationResult.confirm(document.getElementById('otpInput').value); } catch (e) { alert("Wrong OTP"); }
};

onAuthStateChanged(auth, (user) => {
    setTimeout(() => {
        document.getElementById('splash').style.display = 'none';
        user ? showPage('homePage') : showPage('loginPage');
    }, 1200);
});

// --- DATA LOGIC ---
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
            <div class="col-md-4 col-6 mb-3 position-relative">
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

    await addDoc(collection(db, "bikes"), { title, price: Number(price), condition: desc, frame: mat, images: urls, time: Date.now() });
    location.reload();
};
