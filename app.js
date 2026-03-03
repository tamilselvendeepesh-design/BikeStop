import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyB4GuZE6rpatln-LlOJE3z_h3fn1F6mxZg",
    authDomain: "bikestop-72fa7.firebaseapp.com",
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

// --- AUTHENTICATION ---
document.getElementById('googleBtn').onclick = async () => {
    const provider = new GoogleAuthProvider();
    try {
        await signInWithPopup(auth, provider);
    } catch (e) {
        alert("Login failed! Ensure bikestop.store is authorized in Firebase Console.");
    }
};

onAuthStateChanged(auth, (user) => {
    setTimeout(() => {
        document.getElementById('splash').style.display = 'none';
        user ? showPage('homePage') : showPage('loginPage');
    }, 1200);
});

// --- DATA LOGIC ---
const q = query(collection(db, "bikes"), orderBy("time", "desc"));
onSnapshot(q, (snap) => {
    allBikes = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    window.render();
});

window.render = () => {
    const term = document.getElementById('search').value.toLowerCase();
    const grid = document.getElementById('grid');
    grid.innerHTML = "";
    
    let results = allBikes;
    if (term.trim() !== "") {
        const fuse = new Fuse(allBikes, { keys: ['title', 'condition'], threshold: 0.3 });
        results = fuse.search(term).map(r => r.item);
    }

    results.forEach(bike => {
        grid.innerHTML += `
            <div class="col-md-4 col-6 mb-3">
                <div class="card bike-card h-100">
                    <img src="${bike.images[0]}" class="card-img-top" style="height:160px; object-fit:cover;">
                    <div class="card-body p-3">
                        <h6 class="fw-bold mb-1 text-truncate">${bike.title}</h6>
                        <p class="price-text mb-0">$${bike.price}</p>
                    </div>
                </div>
            </div>`;
    });
};

// --- AI UPLOAD ---
document.getElementById('upBtn').onclick = async () => {
    const title = document.getElementById('bikeTitle').value;
    const desc = document.getElementById('bikeCondition').value;
    const price = document.getElementById('bikePrice').value;
    const files = document.getElementById('bikePhotos').files;

    if (!title || !price || files.length === 0) return alert("Missing info!");

    document.getElementById('upBtn').innerText = "AI Scanning...";
    
    let urls = [];
    for (let f of files) {
        let fd = new FormData();
        fd.append("image", f);
        const r = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`, { method: "POST", body: fd });
        const d = await r.json();
        urls.push(d.data.url);
    }

    await addDoc(collection(db, "bikes"), {
        title, price: Number(price), condition: desc, images: urls, time: Date.now()
    });

    location.reload();
};
