const chatLog = document.getElementById('chatLog');
const chatForm = document.getElementById('chatForm');
const promptInput = document.getElementById('promptInput');
const surface = document.getElementById('surface');
const jsonView = document.getElementById('jsonView');

const reservation = {
  name: '',
  guests: '2',
  time: '',
  cuisine: 'Italian'
};

function addChatMessage(role, text) {
  const bubble = document.createElement('div');
  bubble.className = `chat-message chat-message--${role}`;
  bubble.textContent = text;
  chatLog.appendChild(bubble);
  chatLog.scrollTop = chatLog.scrollHeight;
}

function renderSurface(message) {
  surface.innerHTML = '';

  message.ui.forEach((component) => {
    const node = renderComponent(component);
    if (node) {
      surface.appendChild(node);
    }
  });

  jsonView.textContent = JSON.stringify(message, null, 2);
}

function renderComponent(component) {
  switch (component.type) {
    case 'text': {
      const p = document.createElement('p');
      p.textContent = component.value;
      return p;
    }
    case 'card': {
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `<strong>${component.title}</strong><p>${component.body}</p>`;
      return card;
    }
    case 'input': {
      const wrap = document.createElement('div');
      wrap.className = 'field';
      const label = document.createElement('label');
      label.textContent = component.label;
      const input = document.createElement('input');
      input.value = reservation[component.key] || '';
      input.placeholder = component.placeholder || '';
      input.addEventListener('input', (e) => {
        reservation[component.key] = e.target.value;
      });
      wrap.append(label, input);
      return wrap;
    }
    case 'select': {
      const wrap = document.createElement('div');
      wrap.className = 'field';
      const label = document.createElement('label');
      label.textContent = component.label;
      const select = document.createElement('select');
      component.options.forEach((opt) => {
        const option = document.createElement('option');
        option.value = opt;
        option.textContent = opt;
        if (opt === reservation[component.key]) {
          option.selected = true;
        }
        select.appendChild(option);
      });
      select.addEventListener('change', (e) => {
        reservation[component.key] = e.target.value;
      });
      wrap.append(label, select);
      return wrap;
    }
    case 'button': {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = component.label;
      button.addEventListener('click', () => {
        promptInput.value = component.actionPrompt;
        chatForm.requestSubmit();
      });
      return button;
    }
    default:
      return null;
  }
}

function fakeAgentResponse(prompt) {
  const lower = prompt.toLowerCase();

  if (lower.includes('confirm')) {
    return {
      text: `Booked! ${reservation.guests} guests for ${reservation.time || 'tomorrow 7:00 PM'} (${reservation.cuisine}).`,
      ui: [
        { type: 'text', value: '✅ Reservation confirmed.' },
        {
          type: 'card',
          title: 'Booking Summary',
          body: `${reservation.name || 'Guest'} • ${reservation.guests} people • ${reservation.time || 'Tomorrow 7:00 PM'} • ${reservation.cuisine}`
        },
        { type: 'button', label: 'Create Another Reservation', actionPrompt: 'book a table for 2' }
      ]
    };
  }

  if (lower.includes('tomorrow') || lower.includes('pm') || lower.includes('am')) {
    reservation.time = prompt;
    return {
      text: 'Nice. I captured the time. Please confirm to submit.',
      ui: [
        { type: 'text', value: 'Almost done — review details and confirm.' },
        {
          type: 'card',
          title: 'Pending Reservation',
          body: `${reservation.name || 'Guest'} • ${reservation.guests} people • ${reservation.time} • ${reservation.cuisine}`
        },
        { type: 'button', label: 'Confirm Reservation', actionPrompt: 'confirm reservation' }
      ]
    };
  }

  return {
    text: 'I can help book a table. Fill out the form and share a time.',
    ui: [
      { type: 'text', value: 'Tell me your preferences and I will build the reservation.' },
      { type: 'input', key: 'name', label: 'Name', placeholder: 'Alex Kim' },
      { type: 'select', key: 'guests', label: 'Guests', options: ['2', '3', '4', '5', '6'] },
      { type: 'select', key: 'cuisine', label: 'Cuisine', options: ['Italian', 'Japanese', 'Thai', 'Mexican'] },
      { type: 'button', label: 'Use: tomorrow 7:00 PM', actionPrompt: 'tomorrow 7:00 PM' }
    ]
  };
}

chatForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const prompt = promptInput.value.trim();
  if (!prompt) {
    return;
  }

  addChatMessage('user', prompt);
  const message = fakeAgentResponse(prompt);
  addChatMessage('agent', message.text);
  renderSurface(message);

  promptInput.value = '';
  promptInput.focus();
});

addChatMessage('agent', 'Welcome! Ask me to book a restaurant and I will emit A2UI-style structured messages.');
renderSurface(fakeAgentResponse('book a table for 2'));
