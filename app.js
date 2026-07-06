// 10-Point Grade Scale definition (CBIT B.E. R20/R22 Regulations)
const GRADE_POINTS = {
    'S': 10,
    'A': 9,
    'B': 8,
    'C': 7,
    'D': 6,
    'E': 5,
    'F': 0,
    'Ab': 0
};

// Default State Configuration
const DEFAULT_STATE = {
    semesters: [
        {
            id: 'sem-1',
            name: 'Semester 1',
            courses: [
                { id: 'c-1', name: 'Mathematics I', credits: 4, grade: 'S' },
                { id: 'c-2', name: 'Physics I', credits: 3, grade: 'A' },
                { id: 'c-3', name: 'Programming Lab', credits: 2, grade: 'B' }
            ]
        }
    ],
    isWhatIfActive: false,
    whatIfTarget: null,
    whatIfCredits: null
};

// Application State Object
let state = JSON.parse(localStorage.getItem('cgpa_state')) || JSON.parse(JSON.stringify(DEFAULT_STATE));

// Save state helper
function saveState() {
    localStorage.setItem('cgpa_state', JSON.stringify(state));
}

// Calculate SGPA for a single semester
function calculateSGPA(semester) {
    if (!semester.courses || semester.courses.length === 0) return 0;
    
    let totalPoints = 0;
    let totalCredits = 0;
    
    semester.courses.forEach(course => {
        const credits = parseFloat(course.credits);
        const gradePoint = GRADE_POINTS[course.grade];
        
        if (!isNaN(credits) && credits > 0 && gradePoint !== undefined) {
            totalPoints += gradePoint * credits;
            totalCredits += credits;
        }
    });
    
    return totalCredits > 0 ? (totalPoints / totalCredits) : 0;
}

// Calculate cumulative CGPA and total credits
function calculateCGPA() {
    let totalPoints = 0;
    let totalCredits = 0;
    let semestersCount = 0;
    
    state.semesters.forEach(sem => {
        let semCredits = 0;
        let semPoints = 0;
        
        sem.courses.forEach(course => {
            const credits = parseFloat(course.credits);
            const gradePoint = GRADE_POINTS[course.grade];
            
            if (!isNaN(credits) && credits > 0 && gradePoint !== undefined) {
                semPoints += gradePoint * credits;
                semCredits += credits;
            }
        });
        
        if (semCredits > 0) {
            totalPoints += semPoints;
            totalCredits += semCredits;
            semestersCount++;
        }
    });
    
    const cgpa = totalCredits > 0 ? (totalPoints / totalCredits) : 0;
    return {
        cgpa: parseFloat(cgpa.toFixed(2)),
        totalCredits,
        semestersCount
    };
}

// DOM Rendering logic
const semestersContainer = document.getElementById('semesters-container');
const displayCGPA = document.getElementById('display-cgpa');
const displayCredits = document.getElementById('display-credits');
const displaySemestersCount = document.getElementById('display-semesters-count');
const gaugeProgress = document.getElementById('gauge-progress');
const addSemesterBtn = document.getElementById('add-semester-btn');
const whatIfToggle = document.getElementById('what-if-toggle');
const whatIfControls = document.getElementById('what-if-controls');
const targetCgpaInput = document.getElementById('target-cgpa');
const futureCreditsInput = document.getElementById('future-credits');
const whatIfResults = document.getElementById('what-if-results');

const importBtn = document.getElementById('import-btn');
const exportBtn = document.getElementById('export-btn');
const resetBtn = document.getElementById('reset-btn');

// Initialize SVG Gauge Gradient
const svg = document.querySelector('.gauge-svg');
if (svg) {
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    defs.innerHTML = `
        <linearGradient id="gauge-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#8b5cf6" />
            <stop offset="100%" stop-color="#06b6d4" />
        </linearGradient>
    `;
    svg.appendChild(defs);
}

// Toast Notifications Helper
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = 'fa-info-circle';
    if (type === 'success') icon = 'fa-check-circle';
    if (type === 'error') icon = 'fa-exclamation-triangle';
    
    toast.innerHTML = `
        <i class="fa-solid ${icon}"></i>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1) reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Update the CGPA visual elements
function updateStatsUI() {
    const { cgpa, totalCredits, semestersCount } = calculateCGPA();
    
    // Display textual stats
    displayCGPA.textContent = cgpa.toFixed(2);
    displayCredits.textContent = totalCredits;
    displaySemestersCount.textContent = semestersCount;
    
    // Update SVG progress circle
    const maxOffset = 339.29; // 2 * PI * r (r=54)
    // Scale cgpa (0 to 10) to progress circle offset
    const percentage = cgpa / 10;
    const offset = maxOffset - (percentage * maxOffset);
    gaugeProgress.style.strokeDashoffset = offset;
    
    // Recalculate What-If simulations
    runWhatIfSimulation(cgpa, totalCredits);
}

// What-If Simulation logic
function runWhatIfSimulation(currentCgpa, currentCredits) {
    if (!state.isWhatIfActive) return;
    
    const target = parseFloat(targetCgpaInput.value);
    const futureCredits = parseFloat(futureCreditsInput.value);
    
    if (isNaN(target) || isNaN(futureCredits) || futureCredits <= 0 || target < 0 || target > 10) {
        whatIfResults.classList.add('hidden');
        return;
    }
    
    const currentPoints = currentCgpa * currentCredits;
    const totalNewCredits = currentCredits + futureCredits;
    const targetTotalPoints = target * totalNewCredits;
    const neededPoints = targetTotalPoints - currentPoints;
    const neededGPA = neededPoints / futureCredits;
    
    whatIfResults.classList.remove('hidden');
    
    if (neededGPA > 10.0) {
        whatIfResults.innerHTML = `
            <div class="sim-result-row">
                <span>Required Future GPA:</span>
                <span class="badge-sim-status status-impossible">Impossible</span>
            </div>
            <div class="sim-result-row highlight">
                <span>Target GPA Required:</span>
                <span class="gpa-val font-heading">${neededGPA.toFixed(2)}</span>
            </div>
            <p style="font-size: 0.75rem; color: var(--danger); margin-top: 0.25rem;">
                This target is impossible as it exceeds the maximum grade point limit of 10.0.
            </p>
        `;
    } else if (neededGPA < 0) {
        whatIfResults.innerHTML = `
            <div class="sim-result-row">
                <span>Required Future GPA:</span>
                <span class="badge-sim-status status-achievable">Achievable</span>
            </div>
            <div class="sim-result-row highlight">
                <span>Target GPA Required:</span>
                <span class="gpa-val font-heading">0.00</span>
            </div>
            <p style="font-size: 0.75rem; color: var(--success); margin-top: 0.25rem;">
                You have already secured enough credits and grade points to satisfy this goal!
            </p>
        `;
    } else {
        whatIfResults.innerHTML = `
            <div class="sim-result-row">
                <span>Required Future GPA:</span>
                <span class="badge-sim-status status-achievable">Achievable</span>
            </div>
            <div class="sim-result-row highlight">
                <span>Target GPA Required:</span>
                <span class="gpa-val font-heading">${neededGPA.toFixed(2)}</span>
            </div>
            <p style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.25rem;">
                You need an average GPA of <strong>${neededGPA.toFixed(2)}</strong> over your next <strong>${futureCredits}</strong> credits to achieve your target.
            </p>
        `;
    }
}

// Render dynamic elements
function renderSemesters() {
    semestersContainer.innerHTML = '';
    
    state.semesters.forEach((sem, semIdx) => {
        const semCard = document.createElement('div');
        semCard.className = 'semester-card';
        semCard.dataset.id = sem.id;
        
        const sgpa = calculateSGPA(sem);
        
        semCard.innerHTML = `
            <div class="semester-card-header">
                <div class="sem-title-area">
                    <input type="text" class="sem-title-input" value="${sem.name}" data-sem-id="${sem.id}">
                    <span class="sem-badge completed">Completed</span>
                </div>
                <div class="sem-actions">
                    <div class="sem-gpa-badge">
                        <span>SGPA:</span>
                        <span class="gpa-val">${sgpa.toFixed(2)}</span>
                    </div>
                    <button class="btn btn-secondary btn-icon-only delete-sem-btn" data-sem-id="${sem.id}" title="Delete Semester">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>
            </div>
            
            <div class="courses-table-header">
                <span>Subject Name</span>
                <span>Credits</span>
                <span>Grade</span>
                <span></span>
            </div>
            
            <div class="courses-list-rows" id="courses-${sem.id}">
                <!-- Courses injected here -->
            </div>
            
            <button class="btn btn-secondary add-course-btn" data-sem-id="${sem.id}" style="align-self: flex-start; margin-top: 0.5rem;">
                <i class="fa-solid fa-plus"></i> Add Subject
            </button>
        `;
        
        semestersContainer.appendChild(semCard);
        
        // Render Course list inside this semester
        const coursesList = document.getElementById(`courses-${sem.id}`);
        sem.courses.forEach((course) => {
            const courseRow = document.createElement('div');
            courseRow.className = 'course-row';
            courseRow.dataset.courseId = course.id;
            
            courseRow.innerHTML = `
                <input type="text" class="input-field course-name-input" value="${course.name}" placeholder="e.g. Science" data-sem-id="${sem.id}" data-course-id="${course.id}">
                
                <input type="number" class="input-field course-credits-input" value="${course.credits}" min="1" max="100" step="0.5" placeholder="Credits" data-sem-id="${sem.id}" data-course-id="${course.id}">
                
                <select class="input-field course-grade-select" data-sem-id="${sem.id}" data-course-id="${course.id}">
                    ${Object.keys(GRADE_POINTS).map(g => `<option value="${g}" ${course.grade === g ? 'selected' : ''}>${g} (${GRADE_POINTS[g]})</option>`).join('')}
                </select>
                
                <button class="btn btn-secondary btn-icon-only delete-course-btn" data-sem-id="${sem.id}" data-course-id="${course.id}" title="Remove Subject">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            `;
            
            coursesList.appendChild(courseRow);
        });
    });
    
    updateStatsUI();
}

// Add Semester Event Listener
addSemesterBtn.addEventListener('click', () => {
    const semNumber = state.semesters.length + 1;
    const newSem = {
        id: `sem-${Date.now()}`,
        name: `Semester ${semNumber}`,
        courses: [
            { id: `c-${Date.now()}-1`, name: '', credits: 3, grade: 'A+' }
        ]
    };
    
    state.semesters.push(newSem);
    saveState();
    renderSemesters();
    showToast('New semester added successfully', 'success');
});

// Dynamic Container Event Delegation for performance
semestersContainer.addEventListener('click', (e) => {
    // Delete Semester
    const deleteSemBtn = e.target.closest('.delete-sem-btn');
    if (deleteSemBtn) {
        const semId = deleteSemBtn.dataset.semId;
        state.semesters = state.semesters.filter(sem => sem.id !== semId);
        saveState();
        renderSemesters();
        showToast('Semester removed', 'info');
        return;
    }
    
    // Add Course
    const addCourseBtn = e.target.closest('.add-course-btn');
    if (addCourseBtn) {
        const semId = addCourseBtn.dataset.semId;
        const sem = state.semesters.find(s => s.id === semId);
        if (sem) {
            sem.courses.push({
                id: `c-${Date.now()}`,
                name: '',
                credits: 3,
                grade: 'A'
            });
            saveState();
            renderSemesters();
        }
        return;
    }
    
    // Delete Course
    const deleteCourseBtn = e.target.closest('.delete-course-btn');
    if (deleteCourseBtn) {
        const semId = deleteCourseBtn.dataset.semId;
        const courseId = deleteCourseBtn.dataset.courseId;
        const sem = state.semesters.find(s => s.id === semId);
        if (sem) {
            sem.courses = sem.courses.filter(c => c.id !== courseId);
            saveState();
            renderSemesters();
        }
        return;
    }
});

// Input updates handling
semestersContainer.addEventListener('input', (e) => {
    const target = e.target;
    
    // Edit Semester Title
    if (target.classList.contains('sem-title-input')) {
        const semId = target.dataset.semId;
        const sem = state.semesters.find(s => s.id === semId);
        if (sem) {
            sem.name = target.value;
            saveState();
        }
        return;
    }
    
    // Edit Course Name
    if (target.classList.contains('course-name-input')) {
        const semId = target.dataset.semId;
        const courseId = target.dataset.courseId;
        const sem = state.semesters.find(s => s.id === semId);
        if (sem) {
            const course = sem.courses.find(c => c.id === courseId);
            if (course) {
                course.name = target.value;
                saveState();
            }
        }
        return;
    }
    
    // Edit Course Credits
    if (target.classList.contains('course-credits-input')) {
        const semId = target.dataset.semId;
        const courseId = target.dataset.courseId;
        const value = parseFloat(target.value);
        
        if (isNaN(value) || value < 0) {
            showToast('Credits must be a positive number', 'error');
            return;
        }
        
        const sem = state.semesters.find(s => s.id === semId);
        if (sem) {
            const course = sem.courses.find(c => c.id === courseId);
            if (course) {
                course.credits = value;
                saveState();
                
                // Real-time calculation updating UI immediately
                const sgpaBadgeVal = document.querySelector(`[data-id="${semId}"] .gpa-val`);
                if (sgpaBadgeVal) {
                    sgpaBadgeVal.textContent = calculateSGPA(sem).toFixed(2);
                }
                updateStatsUI();
            }
        }
        return;
    }
});

// Grade Select Change event listener
semestersContainer.addEventListener('change', (e) => {
    const target = e.target;
    if (target.classList.contains('course-grade-select')) {
        const semId = target.dataset.semId;
        const courseId = target.dataset.courseId;
        
        const sem = state.semesters.find(s => s.id === semId);
        if (sem) {
            const course = sem.courses.find(c => c.id === courseId);
            if (course) {
                course.grade = target.value;
                saveState();
                
                // Real-time calculation updating UI immediately
                const sgpaBadgeVal = document.querySelector(`[data-id="${semId}"] .gpa-val`);
                if (sgpaBadgeVal) {
                    sgpaBadgeVal.textContent = calculateSGPA(sem).toFixed(2);
                }
                updateStatsUI();
            }
        }
    }
});

// What-If Toggle switch event listener
whatIfToggle.addEventListener('change', (e) => {
    state.isWhatIfActive = e.target.checked;
    saveState();
    
    if (state.isWhatIfActive) {
        whatIfControls.classList.remove('disabled');
    } else {
        whatIfControls.classList.add('disabled');
        whatIfResults.classList.add('hidden');
    }
    updateStatsUI();
});

// Target CGPA and Future Credits events
targetCgpaInput.addEventListener('input', () => {
    const val = parseFloat(targetCgpaInput.value);
    if (val < 0 || val > 10) {
        showToast('CGPA target must be between 0 and 10', 'error');
        return;
    }
    updateStatsUI();
});
futureCreditsInput.addEventListener('input', () => {
    const val = parseFloat(futureCreditsInput.value);
    if (val < 0) {
        showToast('Future credits cannot be negative', 'error');
        return;
    }
    updateStatsUI();
});

// Import / Export / Reset Action Listeners
exportBtn.addEventListener('click', () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "cgpa_calculator_backup.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('State exported successfully', 'success');
});

importBtn.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    
    input.onchange = e => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.readAsText(file,'UTF-8');
        
        reader.onload = readerEvent => {
            try {
                const content = JSON.parse(readerEvent.target.result);
                if (content && Array.isArray(content.semesters)) {
                    state = content;
                    saveState();
                    renderSemesters();
                    
                    // Sync checkbox UI
                    whatIfToggle.checked = state.isWhatIfActive || false;
                    if (state.isWhatIfActive) {
                        whatIfControls.classList.remove('disabled');
                    } else {
                        whatIfControls.classList.add('disabled');
                    }
                    
                    showToast('Data imported successfully', 'success');
                } else {
                    showToast('Invalid backup file structure', 'error');
                }
            } catch (err) {
                showToast('Failed to parse file', 'error');
            }
        }
    }
    input.click();
});

resetBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear all semesters? This action is irreversible.')) {
        state = JSON.parse(JSON.stringify(DEFAULT_STATE));
        saveState();
        
        // Sync checkbox UI
        whatIfToggle.checked = false;
        whatIfControls.classList.add('disabled');
        whatIfResults.classList.add('hidden');
        targetCgpaInput.value = '';
        futureCreditsInput.value = '';
        
        renderSemesters();
        showToast('All semesters reset', 'info');
    }
});

// Initial Run
renderSemesters();
if (state.isWhatIfActive) {
    whatIfToggle.checked = true;
    whatIfControls.classList.remove('disabled');
}
