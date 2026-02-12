const monthLabel = document.getElementById('month-label');
const grid = document.getElementById('calendar-grid');
const prevBtn = document.getElementById('prev-month');
const nextBtn = document.getElementById('next-month');

const weekdayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
let current = new Date();
current.setDate(1);

const bookings = [
  { from: '2026-02-14', to: '2026-02-20', status: 'booked' },
  { from: '2026-03-01', to: '2026-03-02', status: 'partial' },
  { from: '2026-03-12', to: '2026-03-18', status: 'booked' },
  { from: '2026-04-06', to: '2026-04-09', status: 'partial' },
  { from: '2026-04-10', to: '2026-04-17', status: 'booked' },
  { from: '2026-05-08', to: '2026-05-15', status: 'booked' }
];

function toDate(value) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function getDayStatus(date) {
  for (const item of bookings) {
    const from = toDate(item.from);
    const to = toDate(item.to);
    if (date >= from && date <= to) {
      return item.status;
    }
  }
  return 'free';
}

function mondayIndex(jsDay) {
  return jsDay === 0 ? 6 : jsDay - 1;
}

function renderCalendar() {
  grid.innerHTML = '';
  const year = current.getFullYear();
  const month = current.getMonth();

  monthLabel.textContent = current.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  });

  for (const name of weekdayNames) {
    const head = document.createElement('div');
    head.className = 'cal-name';
    head.textContent = name;
    grid.appendChild(head);
  }

  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prefix = mondayIndex(firstDay.getDay());

  for (let i = 0; i < prefix; i += 1) {
    const empty = document.createElement('div');
    empty.className = 'cal-day';
    empty.style.visibility = 'hidden';
    grid.appendChild(empty);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month, day);
    const status = getDayStatus(date);

    const cell = document.createElement('div');
    cell.className = `cal-day ${status}`;

    const number = document.createElement('div');
    number.textContent = String(day);

    const label = document.createElement('small');
    label.textContent = status.toUpperCase();

    cell.appendChild(number);
    cell.appendChild(label);
    grid.appendChild(cell);
  }
}

prevBtn.addEventListener('click', () => {
  current = new Date(current.getFullYear(), current.getMonth() - 1, 1);
  renderCalendar();
});

nextBtn.addEventListener('click', () => {
  current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
  renderCalendar();
});

renderCalendar();
