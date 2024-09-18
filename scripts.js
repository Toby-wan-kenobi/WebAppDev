// IndexedDB functions
function openDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('guidesDB', 1);

        // Create the schema if it doesn't exist
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            db.createObjectStore('guides', { keyPath: 'id', autoIncrement: true });
        };

        request.onsuccess = (event) => {
            resolve(event.target.result);
        };

        request.onerror = (event) => {
            reject('Failed to open IndexedDB:', event.target.error);
        };
    });
}

// Add a guide to the IndexedDB
function addGuideToDatabase(guide) {
    return openDatabase().then((db) => {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['guides'], 'readwrite');
            const store = transaction.objectStore('guides');
            const request = store.add(guide);

            request.onsuccess = () => {
                resolve();
            };
            request.onerror = () => {
                reject('Failed to add guide:', request.error);
            };
        });
    });
}

// Update a guide in IndexedDB
function updateGuideInDatabase(guide) {
    return openDatabase().then((db) => {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['guides'], 'readwrite');
            const store = transaction.objectStore('guides');
            const request = store.put(guide);

            request.onsuccess = () => {
                resolve();
            };
            request.onerror = () => {
                reject('Failed to update guide:', request.error);
            };
        });
    });
}

// Delete a guide from IndexedDB
function deleteGuide(id) {
    if (!confirm('Are you sure you want to delete this guide?')) return;

    openDatabase().then((db) => {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['guides'], 'readwrite');
            const store = transaction.objectStore('guides');
            const request = store.delete(id);

            request.onsuccess = () => {
                resolve();
                displayGuides(); // Refresh the list of guides
            };
            request.onerror = () => {
                reject('Failed to delete guide:', request.error);
            };
        });
    }).catch((error) => {
        console.error(error);
    });
}

// Fetch all guides from the IndexedDB
function fetchGuidesFromDatabase() {
    return openDatabase().then((db) => {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['guides'], 'readonly');
            const store = transaction.objectStore('guides');
            const request = store.getAll();

            request.onsuccess = () => {
                resolve(request.result);
            };
            request.onerror = () => {
                reject('Failed to fetch guides:', request.error);
            };
        });
    });
}

// Elements
const createGuideButton = document.getElementById('create-guide');
const findGuidesButton = document.getElementById('find-guides');
const guideCreator = document.getElementById('guide-creator');
const guideList = document.getElementById('guide-list');
const guideDetails = document.getElementById('guide-details');
const guidesContainer = document.getElementById('guides-container');
const guideContent = document.getElementById('guide-content');
const backToListButton = document.getElementById('back-to-list');
const stepsContainer = document.getElementById('steps-container');
const addStepButton = document.getElementById('add-step');
const saveGuideButton = document.getElementById('save-guide');
const guideTitleInput = document.getElementById('guide-title');
const guideDescriptionInput = document.getElementById('guide-description');

let currentGuideId = null; // To keep track of the guide being edited

// Show the guide creation section
createGuideButton.addEventListener('click', () => {
    guideCreator.style.display = 'block';
    guideList.style.display = 'none';
    guideDetails.style.display = 'none';
    resetGuideCreator();
});

// Show the guides list section
findGuidesButton.addEventListener('click', () => {
    guideList.style.display = 'block';
    guideCreator.style.display = 'none';
    guideDetails.style.display = 'none';
    displayGuides();
});

// Display guides with Edit and Delete buttons
function displayGuides() {
    fetchGuidesFromDatabase().then((guides) => {
        guidesContainer.innerHTML = ''; // Clear previous guides

        // Check if guides are available
        if (guides.length === 0) {
            guidesContainer.innerHTML = '<p>No guides available.</p>';
            return;
        }

        // Create and append guide elements
        guides.forEach((guide) => {
            const guideItem = document.createElement('div');
            guideItem.classList.add('guide-item');
            guideItem.innerHTML = `
                <h3>${guide.title}</h3>
                <p>${guide.description}</p>
                <div>
                    <button class="edit-guide-button">Edit</button>
                    <button class="delete-guide-button">Delete</button>
                </div>
            `;

            // Event listener for "Edit" button
            guideItem.querySelector('.edit-guide-button').addEventListener('click', () => editGuide(guide));

            // Event listener for "Delete" button
            guideItem.querySelector('.delete-guide-button').addEventListener('click', () => deleteGuide(guide.id));

            guideItem.addEventListener('click', () => openGuide(guide));
            guidesContainer.appendChild(guideItem);
        });
    });
}

// Open a specific guide
function openGuide(guide) {
    guideContent.innerHTML = `<h3>${guide.title}</h3><p>${guide.content}</p>`;
    guideDetails.style.display = 'block';
    guideList.style.display = 'none';
}

// Edit a specific guide
function editGuide(guide) {
    // Load the guide data into the form
    guideTitleInput.value = guide.title;
    guideDescriptionInput.value = guide.description;
    stepsContainer.innerHTML = ''; // Clear previous steps

    // Load the guide steps into the form
    const steps = guide.content.split('<br><br>');
    steps.forEach(step => {
        const stepElement = document.createElement('div');
        stepElement.classList.add('step');
        stepElement.innerHTML = `
            <textarea>${step}</textarea>
        `;
        stepsContainer.appendChild(stepElement);
    });

    // Set the currentGuideId to know which guide is being edited
    currentGuideId = guide.id;

    // Show the guide creation section with data loaded for editing
    guideCreator.style.display = 'block';
    guideList.style.display = 'none';
    guideDetails.style.display = 'none';
}

// Add a new step to the guide
addStepButton.addEventListener('click', () => {
    const step = document.createElement('div');
    step.classList.add('step');
    step.innerHTML = `
        <textarea placeholder="Describe this step..."></textarea>
    `;
    stepsContainer.appendChild(step);
});

// Save the new guide or update an existing one
saveGuideButton.addEventListener('click', () => {
    const title = guideTitleInput.value.trim();
    const description = guideDescriptionInput.value.trim();

    if (title === '' || description === '') {
        alert('Please provide both a title and a description for the guide.');
        return;
    }

    // Gather steps content
    const steps = Array.from(stepsContainer.querySelectorAll('textarea')).map(textarea => textarea.value.trim()).filter(text => text !== '');
    const content = steps.length > 0 ? steps.join('<br><br>') : 'No steps provided.';

    // Create or update the guide
    const guide = { title: title, description: description, content: content };
    if (currentGuideId) {
        guide.id = currentGuideId; // Use the existing ID to update
        updateGuideInDatabase(guide).then(() => {
            resetGuideCreator();
            guideList.style.display = 'block';
            guideCreator.style.display = 'none';
            displayGuides();
        });
    } else {
        // Save the new guide
        addGuideToDatabase(guide).then(() => {
            resetGuideCreator();
            guideList.style.display = 'block';
            guideCreator.style.display = 'none';
            displayGuides();
        });
    }
});

// Reset the guide creation form
function resetGuideCreator() {
    guideTitleInput.value = '';
    guideDescriptionInput.value = '';
    stepsContainer.innerHTML = '';
    currentGuideId = null; // Reset the current guide ID
}

// Go back to the guide list
backToListButton.addEventListener('click', () => {
    guideDetails.style.display = 'none';
    guideList.style.display = 'block';
});
