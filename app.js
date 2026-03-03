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
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

let allBikes = [];

// Splash & Page Logic
setTimeout(() => {
    document.getElementById('splash').style.opacity = '0';
    setTimeout(() => { document.getElementById('splash').style.display = 'none'; showPage('loginPage'); }, 800);
}, 1000);

function showPage(id) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

// 1. AI KNOWLEDGE BASE (A-L)
const aiKnowledge = {
    "sl8": "Specialized S-Works SL8", "sl7": "Specialized S-Works SL7",
    "caad": "Cannondale CAAD13", "dogma": "Pinarello Dogma F12",
    "tcr": "Giant TCR Advanced", "propel": "Giant Propel",
    "emonda": "Trek Emonda", "madone": "Trek Madone",
    "infinito": "Bianchi Infinito", "oltre": "Bianchi Oltre XR4",
    "aeroad": "Canyon Aeroad", "ultimate": "Canyon Ultimate"
};

// 2. DATA FETCHING
db.collection("bikes").orderBy("time", "desc").onSnapshot(snap => {
    allBikes = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    render();
});

// 3. DEEP SEARCH ENGINE (Finds any word in name or description)
function render() {
    const term = document.getElementById('search').value.toLowerCase();
    const grid = document.getElementById('grid');
    grid.innerHTML = "";

    let results = allBikes;

    if (term.trim() !== "") {
        const fuse = new Fuse(allBikes, {
            keys: ['title', 'condition', 'frame'],
            threshold: 0.3, // Lower = stricter. 0.3 ensures "one word match" works perfectly.
            findAllMatches: true,
            useExtendedSearch: true // Allows searching specific words
        });
        results = fuse.search(term).map(r => r.item);
    }

    results.forEach(bike => {
        grid.innerHTML += `
            <div class="col-md-4 col-6 mb-4">
                <div class="card bike-card h-100 shadow-sm border-0">
                    <img src="${bike.images[0]}" class="card-img-top" style="height:180px; object-fit:cover; border-radius:15px 15px 0 0;">
                    <div class="card-body">
                        <span class="badge bg-dark mb-2">${bike.frame}</span>
                        <h6 class="fw-bold mb-1 text-truncate">${bike.title}</h6>
                        <p class="text-danger fw-bold m-0">$${bike.price}</p>
                        <p class="small text-muted text-truncate mt-1">${bike.condition}</p>
                    </div>
                </div>
            </div>`;
    });
}

// 4. AI UPLOAD LOGIC (Auto-Scans Description for Material)
async function aiUpload() {
    const btn = document.getElementById('upBtn');
    const titleInput = document.getElementById('bikeTitle').value;
    const descInput = document.getElementById('bikeCondition').value.toLowerCase();
    
    if(!titleInput || !descInput) return alert("Please fill in Title and Description!");

    btn.disabled = true; btn.innerText = "AI Scanning Details...";

    let finalTitle = titleInput;
    let detectedMaterial = "N/A";

    // AI Step 1: Fix Title
    for (let key in aiKnowledge) {
        if (titleInput.toLowerCase().includes(key)) finalTitle = aiKnowledge[key];
    }

    // AI Step 2: Scan Description for Material
    if (descInput.includes("carbon") || descInput.includes("s-works") || descInput.includes("fibre")) {
        detectedMaterial = "Carbon";
    } else if (descInput.includes("alloy") || descInput.includes("aluminum") || descInput.includes("alu")) {
        detectedMaterial = "Aluminum";
    } else if (descInput.includes("steel") || descInput.includes("chromoly")) {
        detectedMaterial = "Steel";
    } else if (descInput.includes("ti ") || descInput.includes("titanium")) {
        detectedMaterial = "Titanium";
    }

    const files = document.getElementById('bikePhotos').files;
    let urls = [];
    for (let f of files) {
        let fd = new FormData(); fd.append("image", f);
        try {
            let r = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`, {method:"POST", body:fd});
            let d = await r.json();
            urls.push(d.data.url);
        } catch(e) { console.error("Upload failed"); }
    }

    await db.collection("bikes").add({
        title: finalTitle,
        price: parseFloat(document.getElementById('bikePrice').value),
        frame: detectedMaterial,
        condition: document.getElementById('bikeCondition').value,
        images: urls,
        time: Date.now(),
        reports: 0
    });
    
    location.reload();
}
