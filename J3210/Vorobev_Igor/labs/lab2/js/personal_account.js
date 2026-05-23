import { getJSON, getCurrentUser, clearCurrentUser, API_BASE_URL } from './api.js';

const user = getCurrentUser();
if (!user) {
    window.location.href = 'index.html';
}

let projectsData = [];

document.addEventListener('DOMContentLoaded', async () => {
    document.getElementById('userName').textContent = user.name || user.email;
    await loadProjects();
    setupFilters();
    setupLogout();
    setupProjectActions();
});

async function loadProjects() {
    try {
        projectsData = await getJSON('/projects');
        nameFilter(projectsData);
        applyFilters();
    } catch (err) {
        console.error('Ошибка загрузки:', err);
    }
}

function nameFilter(projects) {
    const assigneeSelect = document.getElementById('filterAssignee');

    const allNames = projects.flatMap(p => 
        p.teamDetails.map(m => m.name).filter(n => n && n.trim())
    );
    
    const uniqueNames = [...new Set(allNames)].sort((a, b) => a.localeCompare(b));

    const currentValue = assigneeSelect.value;

    assigneeSelect.innerHTML = '<option value="">Все</option>';

    uniqueNames.forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        assigneeSelect.appendChild(option);
    });

    if (uniqueNames.includes(currentValue)) {
        assigneeSelect.value = currentValue;
    }
}

function applyFilters() {
    const searchInput = document.getElementById('searchInput');
    const statusFilter = document.getElementById('filterStatus');
    const priorityFilter = document.getElementById('filterPriority');
    const assigneeFilter = document.getElementById('filterAssignee');

    const query = searchInput.value.toLowerCase().trim();
    const status = statusFilter.value;
    const priority = priorityFilter.value;
    const assignee = assigneeFilter.value;

    const filtered = projectsData.filter(p => {
        const matchSearch = p.name.toLowerCase().includes(query);
        const matchStatus = !status || p.status === status;
        const matchPriority = !priority || p.priority === priority;
        
        const matchAssignee = !assignee || (
            p.teamDetails && 
            p.teamDetails.some(member => member.name === assignee)
        );
        
        return matchSearch && matchStatus && matchPriority && matchAssignee;
    });

    renderProjects(filtered);
}

function setupFilters() {
    const searchInput = document.getElementById('searchInput');
    const statusFilter = document.getElementById('filterStatus');
    const priorityFilter = document.getElementById('filterPriority');
    const assigneeFilter = document.getElementById('filterAssignee');

    searchInput.addEventListener('input', applyFilters);
    statusFilter.addEventListener('change', applyFilters);
    priorityFilter.addEventListener('change', applyFilters);
    assigneeFilter.addEventListener('change', applyFilters);
    window.applyFilters = applyFilters;
}

function renderProjects(data) {
    const container = document.getElementById('projects-container');

    if (data.length === 0) {
        container.innerHTML = '<p class="text-muted w-100 text-center mt-5">Проекты не найдены</p>';
        return;
    }

    container.innerHTML = data.map(p => {
        const isJoined = p.userRole !== null && p.userRole !== undefined;
        const badge = isJoined 
            ? `<span class="badge">${p.userRole}</span>`
            : `<span class="badge badge-secondary">Не в команде</span>`;

        const btnClass = 'btn-outline-black';
        const btnText = isJoined ? 'Открыть' : 'Вступить';
        const action = isJoined ? 'open' : 'join';

        return `
        <div class="card" style="width: 18rem; height: 160px; min-height: 160px;">
            <div class="card-body d-flex flex-column p-3">
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <h6 class="fw-bold mb-0">${p.name}</h6>
                    ${badge}
                </div>
                <div class="d-flex gap-2 mb-3">
                    <span class="badge">${p.status}</span>
                    <span class="badge">${p.priority}</span>
                </div>
                <button class="btn ${btnClass} w-100 mt-auto project-action-btn" 
                        data-id="${p.id}" data-action="${action}">
                    ${btnText}
                </button>
            </div>
        </div>`;
    }).join('');
}

function setupProjectActions() {
    const container = document.getElementById('projects-container');

    container.addEventListener('click', (e) => {
        const btn = e.target.closest('.project-action-btn');
        if (!btn) return;

        const id = parseInt(btn.dataset.id);
        const action = btn.dataset.action;

        if (action === 'join') {
            handleJoinProject(id);
        } else {
            window.location.href = `project.html?id=${id}`;
        }
    });
}

async function handleJoinProject(id) {
    const project = projectsData.find(p => p.id == id);
    if (!project) return;

    project.userRole = 'observer';
    
    const isAlreadyMember = project.teamDetails && 
        project.teamDetails.some(m => m.name === user.name);
    
    if (!isAlreadyMember) {
        if (!project.teamDetails) project.teamDetails = [];
        project.teamDetails.push({ name: user.name, role: 'Наблюдатель' });
        
        if (!project.team.includes(user.name)) {
            project.team.push(user.name);
        }
    }

    try {
        await fetch(`${API_BASE_URL}/projects/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(project)
        });
        
        await loadProjects();
    } catch (err) {
        console.error('Ошибка при вступлении:', err);
    }
}

function setupLogout() {
    document.getElementById('btnLogout').addEventListener('click', () => {
        clearCurrentUser();
        window.location.href = 'index.html';
    });
}