import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { 
    getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut,
    signInWithEmailAndPassword, createUserWithEmailAndPassword, 
    sendPasswordResetEmail, sendEmailVerification 
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

// --- IMAGE COMPRESSION HELPER (Prevents Crashing) ---
async function compressImage(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 1200; 
                let width = img.width;
                let height = img.height;

                if (width > MAX_WIDTH) {
                    height *= MAX_WIDTH / width;
                    width = MAX_WIDTH;
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                // Convert to Blob at 70% quality
                canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.7);
            };
        };
    });
}

// --- CORE UPLOAD LOGIC ---
document.getElementById('upBtn').onclick = async () => {
    const btn = document.getElementById('upBtn');
    const title = document.getElementById('bikeTitle').value;
    const desc = document.getElementById('bikeCondition').value.toLowerCase();
    const price = document.getElementById('bikePrice').value;
    const files = document.getElementById('bikePhotos').files;

    if (!title || !price || files.length === 0) return alert("Fill all fields!");
    
    btn.innerText = "⚡ AI Compressing...";
    btn.disabled = true;

    try {
        // AI Logic: Detect Frame Material
        let mat = "Standard";
        if (/carbon|s-works|fiber|sl7|sl8/.test(desc)) mat = "Carbon";
        else if (/alloy|alum|metal/.test(desc)) mat = "Alloy";

        let urls = [];
        for (let i = 0; i < files.length; i++) {
            btn.innerText = `Uploading ${i+1}/${files.length}...`;
            
            // 1. Compress
            const compressedBlob = await compressImage(files[i]);
            
            // 2. Upload to ImgBB
            let fd = new FormData();
            fd.append("image", compressedBlob);
            
            const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`, { 
                method: "POST", 
                body: fd 
            });
            const result = await response.json();
            if (result.success) urls.push(result.data.url);
        }

        if (urls.length === 0) throw new Error("Image upload failed.");

        btn.innerText = "Finalizing...";
        await addDoc(collection(db, "bikes"), { 
            title, price: Number(price), condition: desc, frame: mat, 
            images: urls, time: Date.now(), sellerUid: auth.currentUser.uid 
        });

        alert("Bike Posted!");
        location.reload();

    } catch (e) {
        console.error(e);
        alert("Crash caught: " + e.message);
        btn.innerText = "Post Listing";
        btn.disabled = false;
    }
};

// --- REMAINDER OF APP (Observer, Render, etc.) ---
onAuthStateChanged(auth, (user) => {
    setTimeout(() => {
        document.getElementById('splash').style.display = 'none';
        if (user) {
            window.showPage('homePage');
            if (!user.emailVerified) document.getElementById('verifyBanner').classList.remove('d-none');
        } else {
            window.showPage('loginPage');
        }
    }, 1200);
});

onSnapshot(query(collection(db, "bikes"), orderBy("time", "desc")), (snap) => {
    allBikes = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    window.render();
});

window.render = () => {
    const grid = document.getElementById('grid');
    grid.innerHTML = allBikes.map(bike => `
        <div class="col-md-4 col-6 mb-3">
            <div class="card bike-card shadow-sm h-100">
                <span class="badge-ai">${bike.frame}</span>
                <img src="${bike.images[0]}" class="card-img-top" style="height:160px; object-fit:cover;">
                <div class="card-body p-3">
                    <h6 class="fw-bold mb-1">${bike.title}</h6>
                    <p class="price-text mb-0">$${bike.price}</p>
                </div>
            </div>
        </div>
    `).join('');
};

window.showPage = (id) => {
    document.querySelectorAll('.page-view').forEach(p => p.style.display = 'none');
    document.getElementById(id).style.display = 'block';
};
