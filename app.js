const firebaseConfig = {
    apiKey: "AIzaSyB4GuZE6rpatln-LlOJE3z_h3fn1F6mxZg",
    authDomain: "bikestop.store",
    projectId: "bikestop-72fa7",
    storageBucket: "bikestop-72fa7.firebasestorage.app",
    messagingSenderId: "264513335139",
    appId: "1:264513335139:web:e2af3e5614b459fb28ed56",
    measurementId: "G-TTEC5PLHMC"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// Splash Control
setTimeout(() => {
    document.getElementById('splash').style.display = 'none';
    auth.onAuthStateChanged(user => {
        if (user) showPage('homePage');
        else showPage('loginPage');
    });
}, 1200);

function showPage(id) {
    document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
    document.getElementById(id).style.display = 'block';
}

// (Add your existing render, aiUpload, and loginGoogle functions here)
