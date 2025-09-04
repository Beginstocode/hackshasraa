// Main function to run on page load
document.addEventListener('DOMContentLoaded', () => {
    // Check which page is loaded and run the corresponding function
    const pathname = window.location.pathname;
    if (pathname.includes('driver.html')) {
        setupDriverPage();
    } else if (pathname.includes('passenger.html')) {
        setupPassengerPage();
    }
});

// --- Driver Page Logic ---
function setupDriverPage() {
    const startBtn = document.getElementById('start-sharing-btn');
    const stopBtn = document.getElementById('stop-sharing-btn');
    const statusEl = document.getElementById('sharing-status');
    const coordsEl = document.getElementById('current-coords');
    const driverMapEl = document.getElementById('driver-map');
    
    // A specific bus number is hardcoded for the driver portal
    const BUS_NUMBER = '101'; 

    let watchId;
    let map;
    let marker;

    // Initialize map for the driver
    function initDriverMap(lat, lng) {
        if (!map) {
            map = L.map(driverMapEl).setView([lat, lng], 15);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(map);

            const busIcon = L.icon({
                iconUrl: 'https://cdn-icons-png.flaticon.com/512/3233/3233816.png',
                iconSize: [45, 45],
                iconAnchor: [22, 45]
            });

            marker = L.marker([lat, lng], { icon: busIcon }).addTo(map);
        }
    }

    // Function to handle location sharing
    function startSharing() {
        if (!navigator.geolocation) {
            alert("Geolocation is not supported by your browser. Cannot share location.");
            return;
        }

        // Get initial location
        navigator.geolocation.getCurrentPosition((pos) => {
            const { latitude, longitude } = pos.coords;
            initDriverMap(latitude, longitude);
            coordsEl.textContent = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
            localStorage.setItem(BUS_LOCATION_PREFIX + BUS_NUMBER, JSON.stringify({ lat: latitude, lng: longitude }));
        }, (err) => {
            console.error(err);
            alert("Error getting location. Please enable location services.");
        });

        // Watch for location changes every 5 seconds
        watchId = navigator.geolocation.watchPosition((pos) => {
            const { latitude, longitude } = pos.coords;
            const newLocation = { lat: latitude, lng: longitude };
            localStorage.setItem(BUS_LOCATION_PREFIX + BUS_NUMBER, JSON.stringify(newLocation));
            coordsEl.textContent = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
            if (marker) {
                marker.setLatLng(newLocation);
                map.panTo(newLocation);
            }
        }, (err) => {
            console.error(err);
        }, {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
        });

        // Update UI
        statusEl.textContent = "Sharing is ON";
        startBtn.classList.add('hidden');
        stopBtn.classList.remove('hidden');
        localStorage.setItem(SHARING_STATUS_KEY, 'on');
    }

    // Function to stop location sharing
    function stopSharing() {
        if (watchId) {
            navigator.geolocation.clearWatch(watchId);
        }
        statusEl.textContent = "Sharing is OFF";
        startBtn.classList.remove('hidden');
        stopBtn.classList.add('hidden');
        localStorage.setItem(SHARING_STATUS_KEY, 'off');
        localStorage.removeItem(BUS_LOCATION_PREFIX + BUS_NUMBER);
    }

    startBtn.addEventListener('click', startSharing);
    stopBtn.addEventListener('click', stopSharing);

    if (localStorage.getItem(SHARING_STATUS_KEY) === 'on') {
        startSharing();
    }
}


// --- Passenger Page Logic ---
function setupPassengerPage() {
    const searchBtn = document.getElementById('search-btn');
    const searchInput = document.getElementById('bus-search-input');
    const busNumberEl = document.getElementById('bus-number');
    const busStatusEl = document.getElementById('bus-status');
    const availableSeatsEl = document.getElementById('available-seats');
    const nextStopEl = document.getElementById('next-stop');
    const etaEl = document.getElementById('eta');

    let map;
    let busMarker;
    let currentBusNumber = null;
    let updateInterval;

    // Initialize the map once, without a marker
    function initPassengerMap() {
        const defaultLat = 28.9863;
        const defaultLng = 77.0195;

        map = L.map('map').setView([defaultLat, defaultLng], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        const busIcon = L.icon({
            iconUrl: 'https://cdn-icons-png.flaticon.com/512/3233/3233816.png',
            iconSize: [45, 45],
            iconAnchor: [22, 45]
        });

        busMarker = L.marker([0, 0], { icon: busIcon }).addTo(map)
            .bindPopup("<b>Live Bus Location</b>");
        
        busMarker.remove(); // Initially hide the marker
    }

    // Function to update bus location and information
    function updateBusLocation() {
        if (!currentBusNumber) return;

        const storedLocation = JSON.parse(localStorage.getItem(BUS_LOCATION_PREFIX + currentBusNumber));

        if (storedLocation && storedLocation.lat && storedLocation.lng) {
            busMarker.setLatLng(storedLocation);
            map.panTo(storedLocation);
            busStatusEl.textContent = 'Live';
            
            // Add marker back if it was removed
            if (!map.hasLayer(busMarker)) {
                busMarker.addTo(map);
            }

            // Update dummy info based on the mock data
            const mockData = MOCK_BUS_DATA[currentBusNumber];
            if (mockData) {
                availableSeatsEl.textContent = mockData.seats;
                nextStopEl.textContent = mockData.nextStop;
                etaEl.textContent = `${Math.floor(Math.random() * 10) + 1} mins`;
            }
        } else {
            // No location found for this bus
            busStatusEl.textContent = 'Location not available';
            availableSeatsEl.textContent = '--';
            nextStopEl.textContent = '--';
            etaEl.textContent = '--';
            if (map.hasLayer(busMarker)) {
                busMarker.remove(); // Hide the marker
            }
        }
    }

    // Handle search button click
    function handleSearch() {
        const busNumber = searchInput.value.trim();
        if (busNumber) {
            currentBusNumber = busNumber;
            busNumberEl.textContent = busNumber;
            
            // Clear previous interval if it exists
            if (updateInterval) clearInterval(updateInterval);

            // Start new update interval for the selected bus
            updateBusLocation();
            updateInterval = setInterval(updateBusLocation, 3000);
        } else {
            alert('Please enter a bus number.');
        }
    }

    // Event listeners
    searchBtn.addEventListener('click', handleSearch);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    });

    // Initialize the map on page load
    initPassengerMap();
}
// A simple fake authentication system with hardcoded credentials
const validUsername = "user";
const validPassword = "password";

// Get DOM elements for the login form
const loginForm = document.getElementById("login-form");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const loginError = document.getElementById("login-error");

// Main function to run on page load
document.addEventListener('DOMContentLoaded', () => {
    // Check which page is loaded and run the corresponding function
    const pathname = window.location.pathname;

    // Login page logic
    if (pathname.includes('index.html') || pathname === '/') {
        if (loginForm) {
            loginForm.addEventListener("submit", function(event) {
                event.preventDefault(); // Prevent the default form submission
                const validUsername = "24bcb10002";
                const validPassword = "Hackshastra@123";
  

                const username = usernameInput.value;
                const password = passwordInput.value;

                if (username === validUsername && password === validPassword) {
                    // Successful login: Redirect to the roles page
                    window.location.href = "roles.html";
                } else {
                    // Failed login
                    loginError.textContent = "Invalid username or password.";
                }
            });
        }
    } else if (pathname.includes('driver.html')) {
        setupDriverPage();
    } else if (pathname.includes('passenger.html')) {
        setupPassengerPage();
    }
});

// --- Driver Page Logic ---
// ... (The code for setupDriverPage() and all related constants is the same as the previous response)
const BUS_LOCATION_PREFIX = 'bus_location_';
const SHARING_STATUS_KEY = 'sharing_status';
const MOCK_BUS_DATA =
 {
    '101': {
        lat: 28.9863, // chandigarh
        lng: 77.0195,
        nextStop: 'Mordern velly ,kharar',
        seats: 25
    },
    '102': {
        lat: 28.9800,
        lng: 77.0150,
        nextStop: ' chandigarh University Gate',
        seats: 30
    },
    '201': {
        lat: 28.9950,
        lng: 77.0300,
        nextStop: 'Sector 22,chandigarh',
        seats: 15 }
    };

function setupDriverPage() {
    const startBtn = document.getElementById('start-sharing-btn');
    const stopBtn = document.getElementById('stop-sharing-btn');
    const statusEl = document.getElementById('sharing-status');
    const coordsEl = document.getElementById('current-coords');
    const driverMapEl = document.getElementById('driver-map');
    const BUS_NUMBER = '101'; 
    let watchId;
    let map;
    let marker;
    function initDriverMap(lat, lng) { /* ... */ }
    function startSharing() { /* ... */ }
    function stopSharing() { /* ... */ }
    startBtn.addEventListener('click', startSharing);
    stopBtn.addEventListener('click', stopSharing);
    if (localStorage.getItem(SHARING_STATUS_KEY) === 'on') {
        startSharing();
    }
}


// --- Passenger Page Logic ---
// ... (The code for setupPassengerPage() and all related constants is the same as the previous response)
function setupPassengerPage() {
    const searchBtn = document.getElementById('search-btn');
    const searchInput = document.getElementById('bus-search-input');
    const busNumberEl = document.getElementById('bus-number');
    const busStatusEl = document.getElementById('bus-status');
    const availableSeatsEl = document.getElementById('available-seats');
    const nextStopEl = document.getElementById('next-stop');
    const etaEl = document.getElementById('eta');
    let map;
    let busMarker;
    let currentBusNumber = null;
    let updateInterval;
    function initPassengerMap() { /* ... */ }
    function updateBusLocation() { /* ... */ }
    function handleSearch() { /* ... */ }
    searchBtn.addEventListener('click', handleSearch);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    });
    initPassengerMap();
}