// Navigation helpers: error display and URL sync reactions.

function displayError(message) {
    const container = document.querySelector('.timeline-container');
    container.innerHTML = `<div class="error">${message}</div>`;
}

function handlePopState() {
    if (events.length === 0) return;

    Object.keys(hiddenCategories).forEach(category => {
        hiddenCategories[category] = false;
    });

    const { eventIndex } = readURLParams();

    const buttons = categoriesMenu.querySelectorAll('.category-btn');
    buttons.forEach(button => {
        const category = button.getAttribute('data-category');
        if (hiddenCategories[category]) {
            button.classList.add('hidden');
        } else {
            button.classList.remove('hidden');
        }
    });

    renderEvents();

    if (typeof eventIndex === 'number' && eventIndex >= 0 && eventIndex < events.length) {
        showEventModal(events[eventIndex], { skipHistoryUpdate: true });
    } else {
        const eventModal = document.getElementById('eventModal');
        if (eventModal && eventModal.classList.contains('active')) {
            closeEventModal(true);
        }
    }
}

