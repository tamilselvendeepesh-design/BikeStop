// 1. CONFIGURATION
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

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

let allBikes = [];

// 2. SPLASH & NAVIGATION LOGIC
// Fail-safe: Force hide splash after 1.5 seconds if Firebase is slow
const splashTimer = setTimeout(() => hideSplash(), 1500);

function hideSplash() {
    const splash = document.getElementById('splash');
    if (splash) {
        splash.style.opacity = '0';
        setTimeout(() => splash.style.display = 'none', 600);
    }
}

function showPage(id) {
    document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
    const target = document.getElementById(id);
    if (target) target.style.display = 'block';
}

// Auth State Observer
auth.onAuthStateChanged(user => {
    clearTimeout(splashTimer); // Clear fail-safe if auth responds fast
    hideSplash();
    if (user) {
        showPage('homePage');
    } else {
        showPage('loginPage');
    }
});

// 3. AI DETECTION & UPLOAD
async function aiUpload() {
    const btn = document.getElementById('upBtn');
    const title = document.getElementById('bikeTitle').value;
    const desc = document.getElementById('bikeCondition').value.toLowerCase();
    const price = document.getElementById('bikePrice').value;
    const files = document.getElementById('bikePhotos').files;

    if (!title || !price || files.length === 0) return alert("Fill in all fields and add a photo!");

    btn.disabled = true;
    btn.innerText = "AI Scanning...";

    // AI Logic: Detect Material from Description
    let material = "Other";
    if (/carbon|fiber|fibre|s-works|sl[78]/.test(desc)) material = "Carbon";
    else if (/alloy|alum|alu|6061/.test(desc)) material = "Aluminum";
    else if (/steel|chromoly|reynolds/.test(desc)) material = "Steel";
    else if (/ti|titanium/.test(desc)) material = "Titanium";

    // Photo Upload to ImgBB
    let urls = [];
    for (let f of files) {
        let fd = new FormData();
        fd.append("image", f);
        try {
            let r = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`, { method: "POST", body: fd });
            let d = await r.json();
            urls.push(d.data.url);
        } catch (e) { console.error("Upload Error"); }
    }

    // Save to Firestore
    await db.collection("bikes").add({
        title: title,
        price: Number(price),
        frame: material,
        condition: desc,
        images: urls,
        time: Date.now(),
        userId: auth.currentUser ? auth.currentUser.uid : "guest"
    });

    location.reload();
}

// 4. FUZZY SEARCH & RENDERING
db.collection("bikes").orderBy("time", "desc").onSnapshot(snap => {
    allBikes = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    render();
});

function render() {
    const term = document.getElementById('search').value.toLowerCase();
    const grid = document.getElementById('grid');
    grid.innerHTML = "";

    let results = allBikes;

    if (term.trim() !== "") {
        const fuse = new Fuse(allBikes, {
            keys: ['title', 'frame', 'condition'],
            threshold: 0.3
        });
        results = fuse.search(term).map(r => r.item);
    }

    results.forEach(bike => {
        grid.innerHTML += `
            <div class="col-md-4 col-6 mb-3">
                <div class="card bike-card shadow-sm h-100">
                    <img src="${bike.images[0]}" class="card-img-top" style="height:160px; object-fit:cover;">
                    <div class="card-body p-2">
                        <span class="badge bg-danger mb-1" style="font-size:10px">${bike.frame}</span>
                        <h6 class="fw-bold mb-0 text-truncate">${bike.title}</h6>
                        <p class="text-danger fw-bold mb-0">$${bike.price}</p>
                    </div>
                </div>
            </div>`;
    });
}

// 5. GOOGLE LOGIN
async function loginGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    try {
        await auth.signInWithPopup(provider);
    } catch (e) {
        alert("Login Error: Ensure bikestop.store is an 'Authorized Domain' in Firebase Console.");
    }
}

function toggleUpload() {
    const sec = document.getElementById('uploadSection');
    sec.style.display = (sec.style.display === 'none') ? 'block' : 'none';
}
