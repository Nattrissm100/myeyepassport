
// --- Global State & Elements ---
const pages = document.querySelectorAll('.page');
const bottomNav = document.getElementById('bottom-nav');
let activeStream = null;
let isLoggedIn = false;
let lastPage = 'landing';
let passportRecords = [
    { date: '2024-08-15', optometrist: 'VisionFirst Opticians', odSphere: -0.75, osSphere: -0.75, notes: 'First signs of myopia, recommended follow-up in 6 months.' },
    { date: '2025-02-20', optometrist: 'ClearView Eyecare', odSphere: -1.25, osSphere: -1.50, notes: 'Progression noted. Discussed myopia control options.' },
];

// --- Modal Elements ---
const recommendationModal = document.getElementById('recommendation-modal');
const modalContent = document.getElementById('modal-content');
const modalText = document.getElementById('modal-recommendation-text');
const modalFindBtn = document.getElementById('modal-find-optometrist');
const modalCloseBtn = document.getElementById('modal-close-button');

// --- Navigation ---
function goBack() { navigateTo(lastPage); }

window.navigateTo = function(pageId) {
    const currentPage = document.querySelector('.page.active');
    if (currentPage) { lastPage = currentPage.id; }

    pages.forEach(page => page.classList.remove('active'));
    const newPage = document.getElementById(pageId);
    newPage.classList.add('active');

    // Show/hide bottom nav
    if (pageId === 'landing') {
        bottomNav.classList.add('hidden');
    } else {
        bottomNav.classList.remove('hidden');
    }

    const cameraPages = ['close-tool', 'myopia-simulator'];
    if (cameraPages.includes(pageId)) {
        startCamera(pageId);
    } else {
        stopCamera();
    }

    if (pageId === 'passport-records') {
        initializeOutdoorTracker();
    } else {
        if (outdoorTimerInterval) clearInterval(outdoorTimerInterval);
    }

    updateNav(pageId);
}

function updateNav(pageId) {
    document.querySelectorAll('.nav-button').forEach(btn => {
        const isPassportRelated = pageId.startsWith('passport') || pageId === 'add-record';
        const isBtnPassport = btn.dataset.page.startsWith('passport');

        let isBtnActive = (isPassportRelated && isBtnPassport) || btn.dataset.page === pageId;

        if (pageId === 'home' && btn.dataset.page === 'home') {
            isBtnActive = true;
        }
        if (pageId === 'landing') isBtnActive = false;

        btn.classList.toggle('active', isBtnActive);
    });
}

document.querySelectorAll('.nav-button').forEach(button => {
    button.addEventListener('click', () => {
        let pageId = button.dataset.page;
        if (pageId.startsWith('passport')) { pageId = isLoggedIn ? 'passport-records' : 'passport-login'; }
        navigateTo(pageId);
    });
});

// --- Segmented Control Logic ---
document.querySelectorAll('.segmented-control').forEach(control => {
    const buttons = control.querySelectorAll('button');
    const glider = control.querySelector('.glider');
    buttons.forEach((button, i) => {
        button.addEventListener('click', () => {
            buttons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            control.dataset.value = button.dataset.value;
            glider.style.transform = `translateX(${i * 100}%)`;
        });
    });
});

// --- Risk Check & Modal Logic ---
function openModal() {
    recommendationModal.classList.remove('hidden');
    setTimeout(() => {
        recommendationModal.classList.remove('opacity-0');
        modalContent.classList.remove('opacity-0', 'scale-95');
    }, 10);
}

function closeModal() {
    modalContent.classList.add('opacity-0', 'scale-95');
    recommendationModal.classList.add('opacity-0');
    setTimeout(() => {
        recommendationModal.classList.add('hidden');
    }, 300);
}

modalCloseBtn.addEventListener('click', closeModal);
modalFindBtn.addEventListener('click', () => {
    closeModal();
    navigateTo('optometrist-finder');
});
recommendationModal.addEventListener('click', (e) => {
    if (e.target === recommendationModal) {
        closeModal();
    }
});

document.getElementById('submit-answers').addEventListener('click', () => {
    const riskFactors = (document.getElementById('family-history').dataset.value !== 'nil' ? 1 : 0) +
                        (document.getElementById('near-work').dataset.value === 'more' ? 1 : 0) +
                        (document.getElementById('outdoor-time').dataset.value === 'less' ? 1 : 0);
    const eyeTest = document.getElementById('eye-test').dataset.value;

    modalFindBtn.style.display = 'none';

    if (eyeTest === 'no' && Number(riskFactors) >= 2) {
        modalText.innerHTML = `
            <strong class="font-semibold text-amber-700 block text-lg mb-2">Action Recommended</strong>
            Based on your answers, your child has several risk factors for myopia.
            We strongly recommend scheduling a comprehensive eye test.
        `;
        modalFindBtn.style.display = 'block';
    } else if (eyeTest === 'no' && Number(riskFactors) < 2) {
        modalText.innerHTML = `
            <strong class="font-semibold text-purple-700 block text-lg mb-2">Good to Know</strong>
            Your child's risk factors appear low, but regular eye tests are important.
            We recommend booking a routine check-up.
            <br><br>
            <strong class="font-semibold">
              Children are recommended to have their first eye test at around
              <span class="text-purple-700 underline">4 years old</span>.
            </strong>
        `;
        modalFindBtn.style.display = 'block';
    } else if (eyeTest === 'yes' && riskFactors >= 2) {
        modalText.innerHTML = "<strong class='font-semibold text-purple-700 block text-lg mb-2'>Stay Vigilant</strong> It's great you've had a recent eye test. Based on your answers, there are a few risk factors, so continue to encourage plenty of outdoor time.";
    } else {
        modalText.innerHTML = "<strong class='font-semibold text-green-700 block text-lg mb-2'>Looking Good!</strong> You're on the right track with your child's eye health. Keep up the great habits!";
    }
    openModal();
});

// --- Passport & Records Logic ---
document.getElementById('login-button').addEventListener('click', () => { isLoggedIn = true; renderRecords(); navigateTo('passport-records'); });
document.getElementById('logout-button').addEventListener('click', () => { isLoggedIn = false; navigateTo('passport-login'); });

function renderRecords() {
    const list = document.getElementById('records-list');
    list.innerHTML = '';
    if (passportRecords.length === 0) {
        list.innerHTML = `<p class="text-slate-500 text-center">No records yet. Add your first exam result!</p>`; return;
    }
    const sortedRecords = passportRecords.sort((a, b) => new Date(b.date) - new Date(a.date));
    sortedRecords.forEach((rec, index) => {
        const prevRec = sortedRecords[index + 1];
        let progression = 'stable', progressionText = 'Stable';
        if (prevRec) {
            const avgSphere = (rec.odSphere + rec.osSphere) / 2;
            const prevAvgSphere = (prevRec.odSphere + prevRec.osSphere) / 2;
            if (avgSphere < prevAvgSphere) { progression = 'worse'; progressionText = 'Increased'; }
            else if (avgSphere > prevAvgSphere) { progression = 'better'; progressionText = 'Improved'; }
        }
        const colorClasses = { stable: 'bg-green-100 text-green-800', worse: 'bg-red-100 text-red-800', better: 'bg-blue-100 text-blue-800' };
        const div = document.createElement('div');
        div.className = 'p-4 border border-slate-200 rounded-xl shadow-sm bg-white card-hover';
        div.innerHTML = `
            <div class="flex justify-between items-start">
                <div>
                    <p class="font-bold text-slate-800">${new Date(rec.date).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    <p class="text-sm text-slate-500">${rec.optometrist}</p>
                </div>
                <div class="text-right text-sm">
                    <p>OD: <span class="font-mono font-semibold">${rec.odSphere.toFixed(2)}</span></p>
                    <p>OS: <span class="font-mono font-semibold">${rec.osSphere.toFixed(2)}</span></p>
                </div>
            </div>
            <p class="text-sm text-slate-600 mt-3 italic">"${rec.notes}"</p>
            <div class="mt-3 text-right">
                <span class="text-xs font-bold px-2 py-1 rounded-full ${colorClasses[progression]}">Progression: ${progressionText}</span>
            </div>`;
        list.appendChild(div);
    });
}
document.getElementById('save-record-button').addEventListener('click', () => {
    const newRecord = {
        date: document.getElementById('record-date').value,
        optometrist: document.getElementById('record-optometrist').value,
        odSphere: parseFloat(document.getElementById('record-od-sphere').value) || 0,
        osSphere: parseFloat(document.getElementById('record-os-sphere').value) || 0,
        notes: document.getElementById('record-notes').value
    };
    passportRecords.push(newRecord);
    renderRecords();
    navigateTo('passport-records');
});

// --- Outdoor Time Tracker Logic ---
const outdoorTimeDisplay = document.getElementById('outdoor-time-display');
const outdoorProgressBar = document.getElementById('outdoor-progress-bar');
const outdoorTimerButton = document.getElementById('outdoor-timer-button');
const GOAL_MS = 90 * 60 * 1000;
let outdoorTimerInterval;

function getTodaysKey() { return new Date().toISOString().split('T')[0]; }

function getOutdoorData() {
    try {
        return JSON.parse(localStorage.getItem('outdoorTimerData') || '{}');
    } catch (e) {
        return {};
    }
}

function saveOutdoorData(data) {
    localStorage.setItem('outdoorTimerData', JSON.stringify(data));
}

function formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}m ${seconds}s`;
}

function updateOutdoorDisplay() {
    const data = getOutdoorData();
    const todaysTotal = data[getTodaysKey()]?.total || 0;
    let currentSession = 0;
    if (data.isTracking && data.startTime) {
        currentSession = Date.now() - data.startTime;
    }
    const displayTotal = todaysTotal + currentSession;

    outdoorTimeDisplay.textContent = formatTime(displayTotal);
    const progress = Math.min((displayTotal / GOAL_MS) * 100, 100);
    outdoorProgressBar.style.width = `${progress}%`;
}

function toggleOutdoorTimer() {
    const data = getOutdoorData();
    data.isTracking = !data.isTracking;

    if (data.isTracking) {
        data.startTime = Date.now();
        outdoorTimerButton.textContent = 'Stop Timer';
        outdoorTimerButton.classList.remove('bg-purple-600', 'hover:bg-purple-700');
        outdoorTimerButton.classList.add('bg-red-500', 'hover:bg-red-600');
        outdoorTimerInterval = setInterval(updateOutdoorDisplay, 1000);
    } else {
        const elapsed = Date.now() - data.startTime;
        const today = getTodaysKey();
        if (!data[today]) data[today] = { total: 0 };
        data[today].total += elapsed;
        delete data.startTime;

        outdoorTimerButton.textContent = 'Start Timer';
        outdoorTimerButton.classList.add('bg-purple-600', 'hover:bg-purple-700');
        outdoorTimerButton.classList.remove('bg-red-500', 'hover:bg-red-600');
        clearInterval(outdoorTimerInterval);
    }
    saveOutdoorData(data);
    updateOutdoorDisplay();
}

function initializeOutdoorTracker() {
    const data = getOutdoorData();
    if (data.isTracking) {
        outdoorTimerButton.textContent = 'Stop Timer';
        outdoorTimerButton.classList.remove('bg-purple-600', 'hover:bg-purple-700');
        outdoorTimerButton.classList.add('bg-red-500', 'hover:bg-red-600');
        if(outdoorTimerInterval) clearInterval(outdoorTimerInterval);
        outdoorTimerInterval = setInterval(updateOutdoorDisplay, 1000);
    } else {
        outdoorTimerButton.textContent = 'Start Timer';
        outdoorTimerButton.classList.add('bg-purple-600', 'hover:bg-purple-700');
        outdoorTimerButton.classList.remove('bg-red-500', 'hover:bg-red-600');
    }
    updateOutdoorDisplay();
}
outdoorTimerButton.addEventListener('click', toggleOutdoorTimer);

// --- Myopia Simulator Logic ---
const blurSlider = document.getElementById('blur-slider');
const diopterDisplay = document.getElementById('diopter-display');
const simulatorVideo = document.getElementById('simulator-video');

blurSlider.addEventListener('input', () => {
    const diopters = parseFloat(blurSlider.value);
    const blurPx = diopters * 1.5;
    simulatorVideo.style.filter = `blur(${blurPx}px)`;
    diopterDisplay.textContent = `-${diopters.toFixed(2)} D`;
});

// --- Viewing Distance Game Logic ---
const gameImages = [
    { emoji: '🍎', name: 'an apple' },
    { emoji: '⭐', name: 'a star' },
    { emoji: '🐱', name: 'a cat' },
    { emoji: '🚗', name: 'a car' },
    { emoji: '☀️', name: 'a sun' },
    { emoji: '🏠', name: 'a house' }
];
let currentGameImageIndex = 0;

document.getElementById('next-image-btn').addEventListener('click', () => {
    currentGameImageIndex = (currentGameImageIndex + 1) % gameImages.length;
    const imageElement = document.getElementById('game-image');
    if (imageElement) {
        imageElement.style.transform = 'scale(0.8)';
        setTimeout(() => {
            imageElement.textContent = gameImages[currentGameImageIndex].emoji;
            imageElement.style.transform = 'scale(1)';
        }, 150);
    }
});

// --- Camera & Face API Logic ---
async function startCamera(pageId) {
    if (activeStream) stopCamera();

    let videoEl, permissionEl, constraints = { video: {} };

    if (pageId === 'close-tool') {
        videoEl = document.getElementById('video');
        permissionEl = document.getElementById('camera-permission');
        constraints.video = { facingMode: 'user' };
    } else if (pageId === 'myopia-simulator') {
        videoEl = document.getElementById('simulator-video');
        permissionEl = document.getElementById('simulator-camera-permission');
        constraints.video = { facingMode: { ideal: 'environment' } };
    } else {
        return;
    }

    permissionEl.classList.add('hidden');
    try {
        activeStream = await navigator.mediaDevices.getUserMedia(constraints);
        videoEl.srcObject = activeStream;

        videoEl.onloadedmetadata = () => {
            const track = activeStream.getVideoTracks()[0];
            const settings = track.getSettings();
            if (videoEl.id === 'video') {
               videoEl.style.transform = settings.facingMode === 'user' ? 'scaleX(-1)' : 'scaleX(1)';
            }
        };

        if (pageId === 'close-tool') {
            await loadModels();
        }
    } catch (err) {
        console.error("Camera access error:", err);
        permissionEl.classList.remove('hidden');
    }
}

function stopCamera() {
    if (activeStream) {
        activeStream.getTracks().forEach(track => track.stop());
        activeStream = null;
    }
}

async function loadModels() {
    const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model';
    try {
        if (!faceapi.nets.tinyFaceDetector.params) {
            await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        }
        if (!faceapi.nets.faceLandmark68TinyNet.params) {
            await faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL);
        }
        detectDistance();
    } catch (error) {
        console.error("Error loading models:", error);
    }
}

async function detectDistance() {
    if (!document.getElementById('close-tool').classList.contains('active')) return;

    const video = document.getElementById('video');
    if (video.paused || video.ended || !faceapi.nets.tinyFaceDetector.params) {
        return setTimeout(() => detectDistance(), 100);
    }
    const detection = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks(true);
    const feedbackOverlay = document.getElementById('feedback-overlay');
    const distanceFeedback = document.getElementById('distance-feedback');

    if (detection) {
        const landmarks = detection.landmarks;
        const leftEyeCorner = landmarks.positions[36];
        const rightEyeCorner = landmarks.positions[45];
        const dist = Math.sqrt(
            Math.pow(leftEyeCorner.x - rightEyeCorner.x, 2) +
            Math.pow(leftEyeCorner.y - rightEyeCorner.y, 2)
        );

        const distanceConstant = 4410;
        const distance = distanceConstant / dist;
        const currentImage = gameImages[currentGameImageIndex];

        if (isNaN(distance) || !isFinite(distance)) {
            feedbackOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.4)';
            distanceFeedback.innerHTML = `
                <div class="text-2xl font-bold">Calculating...</div>
                <p class="mt-4 text-lg opacity-90 font-normal">Please look at the screen.</p>
            `;
        } else if (distance > 45) {
            feedbackOverlay.style.backgroundColor = 'rgba(34, 197, 94, 0.8)';
            distanceFeedback.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <div class="text-xl font-bold">Perfect Distance!</div>
                <div id="game-image" class="my-4">${currentImage.emoji}</div>
                <p class="text-lg opacity-90 font-normal">Can you see ${currentImage.name}?</p>
                <span class="text-sm mt-2 opacity-80 font-mono">(${Math.round(distance)} cm)</span>
            `;
        } else {
            feedbackOverlay.style.backgroundColor = 'rgba(239, 68, 68, 0.8)';
            distanceFeedback.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                <div class="text-xl font-bold">A Little Too Close!</div>
                <div id="game-image" class="my-4">${currentImage.emoji}</div>
                <p class="text-lg opacity-90 font-normal">Try holding the phone further away.</p>
                <span class="text-sm mt-2 opacity-80 font-mono">(${Math.round(distance)} cm)</span>
            `;
        }

    } else {
        feedbackOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.4)';
        distanceFeedback.innerHTML = `
            <div class="text-2xl font-bold">Too Close...</div>
            <p class="mt-4 text-lg opacity-90 font-normal">Please move your child away from the camera.</p>
        `;
    }
    setTimeout(() => detectDistance(), 500);
}

// --- Optometrist Finder Logic ---
document.getElementById('search-optometrists').addEventListener('click', () => {
    const list = document.getElementById('optometrist-list');
    const postcode = document.getElementById('postcode').value;
    list.innerHTML = '';

    if (!postcode) {
        list.innerHTML = '<p class="text-red-500">Please enter a postcode.</p>';
        return;
    }

    const mockOptometrists = [
        { name: 'Coton & Hamblin', address: '11 Wellington St, Woolwich', services: ['Myopia Control', 'Axial Length'], distance: '0.8 miles', img: 'https://placehold.co/100x100/E9D5FF/6B21A8?text=C%26H' },
        { name: 'David Faulder Opticians', address: 'Kensington, London', services: ['Paediatric Specialist', 'Ortho-K'], distance: '1.2 miles', img: 'https://placehold.co/100x100/E9D5FF/6B21A8?text=DF' },
        { name: 'Auerbach & Steele', address: "King's Road, Chelsea", services: ['Childrens Eyewear', 'Myopia Management'], distance: '2.5 miles', img: 'https://placehold.co/100x100/F3E8FF/6B21A8?text=A%26S' },
        { name: 'Zacks Eye Clinic', address: '12 Warren Mews, Fitzrovia', services: ['Visual Stress Clinic', 'NHS Tests'], distance: '3.1 miles', img: 'https://placehold.co/100x100/F3E8FF/6B21A8?text=Zacks' }
    ];

    list.innerHTML = '<div class="spinner-container flex justify-center py-4"><div class="spinner"></div></div>';

    setTimeout(() => {
        list.innerHTML = '';
        mockOptometrists.forEach((opt, index) => {
            const div = document.createElement('div');
            div.className = 'p-4 border border-slate-200 rounded-xl shadow-sm bg-white card-hover';
            div.innerHTML = `
                <div class="flex gap-4 items-center">
                    <img src="${opt.img}" alt="${opt.name}" class="w-24 h-24 rounded-lg object-cover flex-shrink-0">
                    <div class="flex-1">
                        <div class="flex justify-between items-start">
                            <div class="flex-1">
                                ${index < 2 ? `
                                <div class="inline-flex items-center gap-1.5 bg-amber-100 text-amber-800 text-xs font-bold px-2 py-0.5 rounded-full mb-1">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clip-rule="evenodd" /></svg>
                                    Sponsored
                                </div>` : ''}
                                <h4 class="font-semibold text-lg text-slate-800 leading-tight">${opt.name}</h4>
                                <p class="text-sm text-slate-500">${opt.address}</p>
                                <p class="text-sm font-semibold text-purple-600 mt-1">${opt.distance} away</p>
                            </div>
                            <button class="brand-gradient-bg text-white text-sm font-semibold py-2 px-3 rounded-lg hover:opacity-90 transition transform hover:scale-105 whitespace-nowrap ml-2">Book</button>
                        </div>
                        <div class="mt-2 flex flex-wrap gap-2">
                            ${opt.services.map(s => `<span class="bg-purple-100 text-purple-800 text-xs font-semibold px-2 py-0.5 rounded-full">${s}</span>`).join('')}
                        </div>
                    </div>
                </div>
            `;
            list.appendChild(div);
        });
    }, 1000);
});

// --- On Load Logic ---
document.addEventListener('DOMContentLoaded', () => {
    const splashScreen = document.getElementById('splash-screen');
    setTimeout(() => {
        splashScreen.classList.add('hidden');
        navigateTo('landing');
    }, 1500);
    renderRecords();
});

window.addEventListener('beforeunload', stopCamera);
