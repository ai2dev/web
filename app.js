// app.js
// 방 예약 시스템 로직
// 저장소: localStorage('roomReservations')에 JSON 배열 형태로 저장
// 각 예약 객체 구조: {id, date, startTime, endTime, name, purpose, room, status}
// status: 'pending' (신청), 'approved', 'rejected'

// 초기 데이터 로드 및 현재 달 표시
const STORAGE_KEY = window.location.origin + '_roomReservations'; // 도메인 기반 키, GitHub Pages 등 동일 도메인에서 공유
const ADMIN_PASSWORD = 'adm1960';
let isAdmin = false;

// UUID 생성 (간단 버전)
function generateId() {
  return '_' + Math.random().toString(36).substr(2, 9);
}

function loadReservations() {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

function saveReservations(reservations) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reservations));
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('ko-KR');
}

function renderTable() {
  const reservations = loadReservations();
  const tbody = document.getElementById('reservationBody');
  tbody.innerHTML = '';
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  reservations
    .filter(r => {
       const d = new Date(r.date);
       const today = new Date();
       today.setHours(0,0,0,0);
       return d >= today;
   })
     .sort((a, b) => new Date(a.date) - new Date(b.date)).forEach(r => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${formatDate(r.date)}</td>
        <td>${r.startTime}</td>
        <td>${r.endTime}</td>
        <td>${r.name}</td>
        <td>${r.purpose}</td>
        <td>${r.room ?? ''}</td>
        <td class="status-${r.status}">${r.status}</td>
        <td class="admin-col ${isAdmin ? '' : 'hidden'}">
          <button class="approve-btn" data-id="${r.id}">승인</button>
          <button class="reject-btn" data-id="${r.id}">거절</button>
          <button class="delete-btn" data-id="${r.id}">삭제</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  // 관리자 열 보이기/숨기기
  document.querySelectorAll('.admin-col').forEach(col => {
    col.style.display = isAdmin ? '' : 'none';
  });
}

function updateMonthTitle() {
  const now = new Date();
  const options = { year: 'numeric', month: 'long' };
  document.getElementById('monthTitle').textContent = now.toLocaleDateString('ko-KR', options);
}

function openModal() {
  document.getElementById('reservationModal').classList.remove('hidden');
}
function closeModal() {
  document.getElementById('reservationModal').classList.add('hidden');
  document.getElementById('reservationForm').reset();
}

function addReservation(event) {
  event.preventDefault();
  const date = document.getElementById('dateInput').value;
  const startTime = document.getElementById('startTimeInput').value;
  const endTime = document.getElementById('endTimeInput').value;
  const name = document.getElementById('nameInput').value;
  const purpose = document.getElementById('purposeInput').value;
  const room = document.getElementById('roomSelect').value;
  const newRes = {
    id: generateId(),
    date,
    startTime,
    endTime,
    name,
    purpose,
    room,
    status: 'pending'
  };
  const reservations = loadReservations();
  reservations.push(newRes);
  saveReservations(reservations);
  renderTable();
  closeModal();
}

function toggleAdminMode() {
  if (isAdmin) {
    // 관리자 모드 종료 → 사용자 모드
    isAdmin = false;
    document.getElementById('adminToggleBtn').textContent = '관리자 모드';
    renderTable();
  } else {
    const pwd = prompt('관리자 비밀번호를 입력하세요');
    if (pwd === ADMIN_PASSWORD) {
      isAdmin = true;
      document.getElementById('adminToggleBtn').textContent = '사용자 모드';
      alert('관리자 모드가 활성화되었습니다.');
      renderTable();
    } else {
      alert('비밀번호가 틀렸습니다.');
    }
  }
}

function handleApprove(event) {
  const id = event.target.dataset.id;
  const reservations = loadReservations();
  const res = reservations.find(r => r.id === id);
  if (res) { res.status = 'approved'; }
  saveReservations(reservations);
  renderTable();
}
function handleDelete(event) {
  const id = event.target.dataset.id;
  let reservations = loadReservations();
  reservations = reservations.filter(r => r.id !== id);
  saveReservations(reservations);
  renderTable();
}

// 이벤트 바인딩
document.addEventListener('DOMContentLoaded', () => {
  updateMonthTitle();
  renderTable();
  document.getElementById('addReservationBtn').addEventListener('click', openModal);
  document.getElementById('closeModal').addEventListener('click', closeModal);
  document.getElementById('reservationForm').addEventListener('submit', addReservation);
  document.getElementById('adminToggleBtn').addEventListener('click', toggleAdminMode);
  // 클릭 시 모달 외부 영역을 클릭해도 닫히게 (선택사항)
  document.getElementById('reservationModal').addEventListener('click', (e) => {
    if (e.target.id === 'reservationModal') closeModal();
  });
  // 위임된 버튼 이벤트는 동적 생성 후 위임
  document.getElementById('reservationBody').addEventListener('click', e => {
    if (e.target.classList.contains('approve-btn')) handleApprove(e);
    else if (e.target.classList.contains('reject-btn')) handleReject(e);
    else if (e.target.classList.contains('delete-btn')) handleDelete(e);
  });
});
