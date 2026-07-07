const GRADE_POINTS = {
    'A+': 10,
    'A': 9,
    'B': 8,
    'C': 7,
    'D': 6,
    'E': 5,
    'F': 0,
    'Ab': 0
};

const DEFAULT_STATE = {
    year: '1',
    semesters: [
        {
            id: 'sem-1',
            name: 'Semester 1',
            courses: [
                { id: 'c-1', name: 'Mathematics I', credits: 4, grade: 'A+' },
                { id: 'c-2', name: 'Physics I', credits: 3, grade: 'A' },
                { id: 'c-3', name: 'Programming Lab', credits: 2, grade: 'B' }
            ]
        },
        {
            id: 'sem-2',
            name: 'Semester 2',
            courses: [
                { id: 'c-4', name: 'Chemistry I', credits: 3, grade: 'A' }
            ]
        }
    ]
};

let state = JSON.parse(localStorage.getItem('cgpa_state')) || JSON.parse(JSON.stringify(DEFAULT_STATE));

// Migrate old 'S' grades to 'A+'
state.semesters.forEach(sem => {
    sem.courses.forEach(course => {
        if (course.grade === 'S') course.grade = 'A+';
    });
});

let simulatedSemesters = [];

function saveState() {
    localStorage.setItem('cgpa_state', JSON.stringify(state));
}

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

function calculateCGPA() {
    let totalPoints = 0;
    let totalCredits = 0;
    let semestersCount = 0;

    state.semesters.forEach(sem => {
        let semCredits = 0, semPoints = 0;
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

    const actualCgpa = totalCredits > 0 ? (totalPoints / totalCredits) : 0;
    const actualCredits = totalCredits;
    const actualSemestersCount = semestersCount;

    // Include simulated semesters
    let simCredits = 0, simPoints = 0, simSemCount = 0;
    simulatedSemesters.forEach(sem => {
        let sc = 0, sp = 0;
        sem.courses.forEach(course => {
            const credits = parseFloat(course.credits);
            const gradePoint = GRADE_POINTS[course.grade];
            if (!isNaN(credits) && credits > 0 && gradePoint !== undefined) {
                sp += gradePoint * credits;
                sc += credits;
            }
        });
        if (sc > 0) {
            simPoints += sp;
            simCredits += sc;
            simSemCount++;
        }
    });

    const projectedCgpa = (totalCredits + simCredits) > 0 ? ((totalPoints + simPoints) / (totalCredits + simCredits)) : 0;

    return {
        cgpa: parseFloat(actualCgpa.toFixed(2)),
        totalCredits: actualCredits,
        semestersCount: actualSemestersCount,
        actualCgpa: parseFloat(actualCgpa.toFixed(2)),
        actualCredits,
        projectedCgpa: parseFloat(projectedCgpa.toFixed(2)),
        projectedCredits: actualCredits + simCredits,
        projectedSemesters: actualSemestersCount + simSemCount,
        simCredits,
        simSemCount
    };
}

// DOM Elements
const semestersContainer = document.getElementById('semesters-container');
const simulatedContainer = document.getElementById('simulated-semesters-container');
const displayCGPA = document.getElementById('display-cgpa');
const displayCredits = document.getElementById('display-credits');
const displaySemestersCount = document.getElementById('display-semesters-count');
const gaugeProgress = document.getElementById('gauge-progress');
const addSemesterBtn = document.getElementById('add-semester-btn');
const addSimulatedSemBtn = document.getElementById('add-simulated-sem-btn');
const targetCgpaInput = document.getElementById('target-cgpa');
const futureCreditsInput = document.getElementById('future-credits');
const whatIfResults = document.getElementById('what-if-results');
const resetBtn = document.getElementById('reset-btn');
const projectedCgpaEl = document.getElementById('projected-cgpa');
const projectedSubEl = document.getElementById('projected-sub');
const compCurrentEl = document.getElementById('comp-current-cgpa');
const compProjectedEl = document.getElementById('comp-projected-cgpa');
const compChangeEl = document.getElementById('comp-change');
const compSimCreditsEl = document.getElementById('comp-sim-credits');
const yearSelect = document.getElementById('year-select');

// Gauge gradient
const svg = document.querySelector('.gauge-svg');
if (svg) {
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    defs.innerHTML = `
        <linearGradient id="gauge-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#f5c518" />
            <stop offset="100%" stop-color="#f59e0b" />
        </linearGradient>
    `;
    svg.appendChild(defs);
}

// Tab navigation
document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-page').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(`page-${tab.dataset.tab}`).classList.add('active');
        if (tab.dataset.tab === 'whatif') {
            renderSimulatedSemesters();
            updateWhatIfUI();
        }
    });
});

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    let icon = 'fa-info-circle';
    if (type === 'success') icon = 'fa-check-circle';
    if (type === 'error') icon = 'fa-exclamation-triangle';
    toast.innerHTML = `<i class="fa-solid ${icon}"></i><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function updateStatsUI() {
    const data = calculateCGPA();
    displayCGPA.textContent = data.cgpa.toFixed(2);
    displayCredits.textContent = data.totalCredits;
    displaySemestersCount.textContent = data.semestersCount;

    const maxOffset = 339.29;
    const percentage = data.cgpa / 10;
    gaugeProgress.style.strokeDashoffset = maxOffset - (percentage * maxOffset);

    updateWhatIfUI();
}

function updateWhatIfUI() {
    const data = calculateCGPA();

    // Update projected display
    if (simulatedSemesters.length > 0 && data.simCredits > 0) {
        projectedCgpaEl.textContent = data.projectedCgpa.toFixed(2);
        projectedSubEl.textContent = `Based on ${data.simSemCount} simulated semester${data.simSemCount > 1 ? 's' : ''} (${data.simCredits} credits)`;
        compProjectedEl.textContent = data.projectedCgpa.toFixed(2);

        const change = data.projectedCgpa - data.actualCgpa;
        compChangeEl.textContent = (change >= 0 ? '+' : '') + change.toFixed(2);
        compChangeEl.className = 'value ' + (change > 0 ? 'positive' : change < 0 ? 'negative' : 'neutral');
        compProjectedEl.className = 'value ' + (change > 0 ? 'positive' : change < 0 ? 'negative' : 'neutral');
    } else {
        projectedCgpaEl.textContent = '—';
        projectedSubEl.textContent = 'Add simulated semesters to see projection';
        compProjectedEl.textContent = '—';
        compProjectedEl.className = 'value neutral';
        compChangeEl.textContent = '—';
        compChangeEl.className = 'value neutral';
    }

    compCurrentEl.textContent = data.actualCgpa.toFixed(2);
    compSimCreditsEl.textContent = data.simCredits;

    // Target goal calculator
    runWhatIfTargetGoal(data.actualCgpa, data.actualCredits);
}

function runWhatIfTargetGoal(currentCgpa, currentCredits) {
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
                <span>Needed GPA:</span>
                <span class="gpa-val">${neededGPA.toFixed(2)}</span>
            </div>
            <p style="font-size: 0.75rem; color: var(--danger); margin-top: 0.25rem;">
                This target is unachievable — it exceeds the maximum grade point of 10.0.
            </p>
        `;
    } else if (neededGPA < 0) {
        whatIfResults.innerHTML = `
            <div class="sim-result-row">
                <span>Status:</span>
                <span class="badge-sim-status status-achievable">Already Met</span>
            </div>
            <div class="sim-result-row highlight">
                <span>Needed GPA:</span>
                <span class="gpa-val">0.00</span>
            </div>
            <p style="font-size: 0.75rem; color: var(--success); margin-top: 0.25rem;">
                You've already exceeded this target with your current grades!
            </p>
        `;
    } else {
        whatIfResults.innerHTML = `
            <div class="sim-result-row">
                <span>Status:</span>
                <span class="badge-sim-status status-achievable">Achievable</span>
            </div>
            <div class="sim-result-row highlight">
                <span>Needed GPA:</span>
                <span class="gpa-val">${neededGPA.toFixed(2)}</span>
            </div>
            <p style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.25rem;">
                Maintain an avg GPA of <strong>${neededGPA.toFixed(2)}</strong> over your next <strong>${futureCredits}</strong> credits to hit your target.
            </p>
        `;
    }
}

function buildGradeOptions(selectedGrade) {
    return Object.keys(GRADE_POINTS).map(g =>
        `<option value="${g}" ${selectedGrade === g ? 'selected' : ''}>${g} (${GRADE_POINTS[g]})</option>`
    ).join('');
}

function renderSemesterCard(sem, isSimulated, container) {
    const semCard = document.createElement('div');
    semCard.className = `semester-card ${isSimulated ? 'what-if-sem' : ''}`;
    semCard.dataset.id = sem.id;
    semCard.dataset.simulated = isSimulated;

    const sgpa = calculateSGPA(sem);
    const badgeText = isSimulated ? 'Simulated' : 'Completed';
    const badgeClass = isSimulated ? 'simulated' : 'completed';

    semCard.innerHTML = `
        <div class="semester-card-header">
            <div class="sem-title-area">
                <input type="text" class="sem-title-input" value="${sem.name}" data-sem-id="${sem.id}" data-simulated="${isSimulated}">
                <span class="sem-badge ${badgeClass}">${badgeText}</span>
            </div>
            <div class="sem-actions">
                <div class="sem-gpa-badge">
                    <span>SGPA:</span>
                    <span class="gpa-val">${sgpa.toFixed(2)}</span>
                </div>
                <button class="btn btn-secondary btn-icon-only delete-sem-btn" data-sem-id="${sem.id}" data-simulated="${isSimulated}" title="Delete Semester">
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
        <div class="courses-list-rows" id="courses-${sem.id}"></div>
        <button class="btn btn-secondary add-course-btn" data-sem-id="${sem.id}" data-simulated="${isSimulated}" style="align-self: flex-start; margin-top: 0.5rem;">
            <i class="fa-solid fa-plus"></i> Add Subject
        </button>
    `;

    container.appendChild(semCard);

    const coursesList = document.getElementById(`courses-${sem.id}`);
    sem.courses.forEach(course => {
        const courseRow = document.createElement('div');
        courseRow.className = 'course-row';
        courseRow.dataset.courseId = course.id;
        courseRow.innerHTML = `
            <input type="text" class="input-field course-name-input" value="${course.name}" placeholder="e.g. Science" data-sem-id="${sem.id}" data-course-id="${course.id}" data-simulated="${isSimulated}">
            <input type="number" class="input-field course-credits-input" value="${course.credits}" min="1" max="100" step="0.5" placeholder="Credits" data-sem-id="${sem.id}" data-course-id="${course.id}" data-simulated="${isSimulated}">
            <select class="input-field course-grade-select" data-sem-id="${sem.id}" data-course-id="${course.id}" data-simulated="${isSimulated}">
                ${buildGradeOptions(course.grade)}
            </select>
            <button class="btn btn-secondary btn-icon-only delete-course-btn" data-sem-id="${sem.id}" data-course-id="${course.id}" data-simulated="${isSimulated}" title="Remove Subject">
                <i class="fa-solid fa-xmark"></i>
            </button>
        `;
        coursesList.appendChild(courseRow);
    });
}

function renderSemesters() {
    semestersContainer.innerHTML = '';
    if (state.semesters.length === 0) {
        semestersContainer.innerHTML = `<div class="empty-state"><i class="fa-solid fa-book-open"></i><p>No semesters yet. Click "Add Semester" to get started.</p></div>`;
    } else {
        state.semesters.forEach(sem => renderSemesterCard(sem, false, semestersContainer));
    }
    updateStatsUI();
}

function renderSimulatedSemesters() {
    simulatedContainer.innerHTML = '';
    if (simulatedSemesters.length === 0) {
        simulatedContainer.innerHTML = `<div class="empty-state"><i class="fa-solid fa-flask-vial"></i><p>No simulated semesters. Add one to project your future CGPA.</p></div>`;
    } else {
        simulatedSemesters.forEach(sem => renderSemesterCard(sem, true, simulatedContainer));
    }
    updateWhatIfUI();
}

// Event delegation helper
function setupContainerEvents(container, getList) {
    container.addEventListener('click', (e) => {
        const deleteSemBtn = e.target.closest('.delete-sem-btn');
        if (deleteSemBtn) {
            const semId = deleteSemBtn.dataset.semId;
            const isSim = deleteSemBtn.dataset.simulated === 'true';
            if (isSim) {
                simulatedSemesters = simulatedSemesters.filter(s => s.id !== semId);
                renderSimulatedSemesters();
            } else {
                state.semesters = state.semesters.filter(s => s.id !== semId);
                saveState();
                renderSemesters();
            }
            showToast('Semester removed', 'info');
            return;
        }
        const addCourseBtn = e.target.closest('.add-course-btn');
        if (addCourseBtn) {
            const semId = addCourseBtn.dataset.semId;
            const isSim = addCourseBtn.dataset.simulated === 'true';
            const list = isSim ? simulatedSemesters : state.semesters;
            const sem = list.find(s => s.id === semId);
            if (sem) {
                sem.courses.push({ id: `c-${Date.now()}`, name: '', credits: 3, grade: 'A' });
                if (!isSim) saveState();
                if (isSim) renderSimulatedSemesters(); else renderSemesters();
            }
            return;
        }
        const deleteCourseBtn = e.target.closest('.delete-course-btn');
        if (deleteCourseBtn) {
            const semId = deleteCourseBtn.dataset.semId;
            const courseId = deleteCourseBtn.dataset.courseId;
            const isSim = deleteCourseBtn.dataset.simulated === 'true';
            const list = isSim ? simulatedSemesters : state.semesters;
            const sem = list.find(s => s.id === semId);
            if (sem) {
                sem.courses = sem.courses.filter(c => c.id !== courseId);
                if (!isSim) saveState();
                if (isSim) renderSimulatedSemesters(); else renderSemesters();
            }
            return;
        }
    });

    container.addEventListener('input', (e) => {
        const target = e.target;
        const isSim = target.dataset.simulated === 'true';
        const list = isSim ? simulatedSemesters : state.semesters;

        if (target.classList.contains('sem-title-input')) {
            const sem = list.find(s => s.id === target.dataset.semId);
            if (sem) { sem.name = target.value; if (!isSim) saveState(); }
            return;
        }
        if (target.classList.contains('course-name-input')) {
            const sem = list.find(s => s.id === target.dataset.semId);
            if (sem) {
                const course = sem.courses.find(c => c.id === target.dataset.courseId);
                if (course) { course.name = target.value; if (!isSim) saveState(); }
            }
            return;
        }
        if (target.classList.contains('course-credits-input')) {
            const value = parseFloat(target.value);
            if (isNaN(value) || value < 0) { showToast('Credits must be positive', 'error'); return; }
            const sem = list.find(s => s.id === target.dataset.semId);
            if (sem) {
                const course = sem.courses.find(c => c.id === target.dataset.courseId);
                if (course) {
                    course.credits = value;
                    if (!isSim) saveState();
                    const badge = document.querySelector(`[data-id="${target.dataset.semId}"] .gpa-val`);
                    if (badge) badge.textContent = calculateSGPA(sem).toFixed(2);
                    updateStatsUI();
                }
            }
            return;
        }
    });

    container.addEventListener('change', (e) => {
        if (e.target.classList.contains('course-grade-select')) {
            const isSim = e.target.dataset.simulated === 'true';
            const list = isSim ? simulatedSemesters : state.semesters;
            const sem = list.find(s => s.id === e.target.dataset.semId);
            if (sem) {
                const course = sem.courses.find(c => c.id === e.target.dataset.courseId);
                if (course) {
                    course.grade = e.target.value;
                    if (!isSim) saveState();
                    const badge = document.querySelector(`[data-id="${e.target.dataset.semId}"] .gpa-val`);
                    if (badge) badge.textContent = calculateSGPA(sem).toFixed(2);
                    updateStatsUI();
                }
            }
        }
    });
}

setupContainerEvents(semestersContainer, () => state.semesters);
setupContainerEvents(simulatedContainer, () => simulatedSemesters);

addSemesterBtn.addEventListener('click', () => {
    if (state.semesters.length >= 12) {
        showToast('Maximum 12 semesters allowed', 'error');
        return;
    }
    const semNumber = state.semesters.length + 1;
    state.semesters.push({
        id: `sem-${Date.now()}`,
        name: `Semester ${semNumber}`,
        courses: [{ id: `c-${Date.now()}-1`, name: '', credits: 3, grade: 'A' }]
    });
    saveState();
    renderSemesters();
    showToast('Semester added', 'success');
});

addSimulatedSemBtn.addEventListener('click', () => {
    if (simulatedSemesters.length >= 8) {
        showToast('Maximum 8 simulated semesters', 'error');
        return;
    }
    const simNum = simulatedSemesters.length + 1;
    simulatedSemesters.push({
        id: `sim-${Date.now()}`,
        name: `Simulated ${simNum}`,
        courses: [{ id: `c-${Date.now()}-1`, name: '', credits: 3, grade: 'A' }]
    });
    renderSimulatedSemesters();
    showToast('Simulated semester added', 'success');
});

targetCgpaInput.addEventListener('input', () => {
    const v = parseFloat(targetCgpaInput.value);
    if (v < 0 || v > 10) { showToast('Target must be 0–10', 'error'); return; }
    updateWhatIfUI();
});
futureCreditsInput.addEventListener('input', () => {
    const v = parseFloat(futureCreditsInput.value);
    if (v < 0) { showToast('Credits cannot be negative', 'error'); return; }
    updateWhatIfUI();
});

resetBtn.addEventListener('click', () => {
    if (confirm('Reset all semesters? This cannot be undone.')) {
        state = JSON.parse(JSON.stringify(DEFAULT_STATE));
        saveState();
        simulatedSemesters = [];
        targetCgpaInput.value = '';
        futureCreditsInput.value = '';
        if (yearSelect) yearSelect.value = state.year;
        renderSemesters();
        renderSimulatedSemesters();
        showToast('All data reset', 'info');
    }
});

if (yearSelect) {
    yearSelect.value = state.year || '1';
    yearSelect.addEventListener('change', (e) => {
        const newYear = parseInt(e.target.value);
        state.year = newYear.toString();
        const targetSemesters = newYear * 2;
        
        if (state.semesters.length < targetSemesters) {
            const currentCount = state.semesters.length;
            for (let i = currentCount; i < targetSemesters; i++) {
                state.semesters.push({
                    id: `sem-${Date.now()}-${i}`,
                    name: `Semester ${i + 1}`,
                    courses: [{ id: `c-${Date.now()}-1`, name: '', credits: 3, grade: 'A' }]
                });
            }
            showToast(`Added semesters up to Semester ${targetSemesters}`, 'success');
        } else if (state.semesters.length > targetSemesters) {
            if (confirm(`Changing to Year ${newYear} will remove data from Semester ${targetSemesters + 1} onwards. Continue?`)) {
                state.semesters = state.semesters.slice(0, targetSemesters);
                showToast(`Removed extra semesters`, 'info');
            } else {
                yearSelect.value = Math.ceil(state.semesters.length / 2).toString();
                state.year = yearSelect.value;
                return;
            }
        }
        
        saveState();
        renderSemesters();
        updateStatsUI();
    });
}

// Initial render
renderSemesters();
renderSimulatedSemesters();
