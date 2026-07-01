// assets/js/app.js
// 메인 애플리케이션 스크립트 (ES 모듈)
import { deriveKey, encryptData, decryptData } from './crypto.js';
import { saveBookmarksSecure, loadBookmarksSecure } from './bookmark.js';

// ---------- 지도 초기화 (카카오) ----------
let map;
export function initMap() {
  // 오산시 중심 좌표 (위도, 경도)
  const center = new kakao.maps.LatLng(37.267, 127.020);
  map = new kakao.maps.Map(document.getElementById('map'), {
    center,
    level: 4 // 확대 레벨 (숫자가 작을수록 확대)
  });
}

// ---------- 데이터 로드 ----------
let restaurants = [];
export async function loadRestaurants() {
  try {
    const res = await fetch('data/restaurants.json');
    restaurants = await res.json();
    renderList(restaurants);
    addMarkers(restaurants);
  } catch (e) {
    console.error('맛집 데이터를 불러오는데 실패했습니다.', e);
  }
}

// ---------- 리스트 및 마커 ----------
function renderList(list) {
  const listEl = document.getElementById('list');
  listEl.innerHTML = '';
  list.forEach(r => {
    const div = document.createElement('div');
    div.className = 'restaurant-item';
    div.innerHTML = `
      <span>${r.name}</span>
      <button class="detail-btn" data-id="${r.id}">상세 보기</button>
      <button class="bookmark-btn" data-id="${r.id}" data-name="${r.name}">★</button>
    `;
    listEl.appendChild(div);
  });
  attachListEvents();
}

function addMarkers(list) {
  // 기존 마커 제거
  if (window._markers) window._markers.forEach(m => m.setMap(null));
  window._markers = [];
  const ps = new kakao.maps.services.Places(); // 필요 시 장소 검색 서비스 사용 가능
  list.forEach(r => {
    const position = new kakao.maps.LatLng(r.lat, r.lng);
    const marker = new kakao.maps.Marker({
      position,
      map
    });
    const infowindow = new kakao.maps.InfoWindow({
      content: `<div style="padding:5px;">${r.name}</div>`
    });
    kakao.maps.event.addListener(marker, 'click', () => {
      infowindow.open(map, marker);
    });
    window._markers.push(marker);
  });
}

// ---------- 이벤트 바인딩 ----------
function attachListEvents() {
  // 상세 보기 (현재는 placeholder)
  document.querySelectorAll('.detail-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      const id = e.target.dataset.id;
      alert('상세 보기 기능은 아직 구현되지 않았습니다. ID: ' + id);
    });
  });

  // 북마크 토글
  document.querySelectorAll('.bookmark-btn').forEach(btn => {
    btn.addEventListener('click', async e => {
      const id = e.target.dataset.id;
      const name = e.target.dataset.name;
      try {
        const current = await loadBookmarksSecure();
        const exists = current.find(b => b.id === id);
        let updated;
        if (exists) {
          // 삭제
          updated = current.filter(b => b.id !== id);
          e.target.textContent = '☆';
        } else {
          // 추가
          updated = [...current, { id, name, addedAt: new Date().toISOString() }];
          e.target.textContent = '★';
        }
        await saveBookmarksSecure(updated);
        console.log('북마크가 업데이트되었습니다.');
      } catch (err) {
        console.error('북마크 저장 중 오류', err);
        alert('북마크 저장에 실패했습니다. 콘솔을 확인하세요.');
      }
    });
  });
}

// ---------- 초기화 ----------
window.addEventListener('load', async () => {
  if (window.kakao && window.kakao.maps) {
    initMap();
    await loadRestaurants();

    // 검색 버튼 이벤트 바인딩
    const searchBtn = document.getElementById('search-btn');
    const keywordInput = document.getElementById('location-input');
    searchBtn.addEventListener('click', () => {
      const keyword = keywordInput.value.trim();
      if (!keyword) return alert('검색어를 입력하세요.');
      const ps = new kakao.maps.services.Places();
      ps.keywordSearch(keyword, (result, status) => {
        if (status === kakao.maps.services.Status.OK) {
          renderList(result);
          addMarkers(result);
        } else {
          alert('검색 결과가 없습니다.');
        }
      });
    });

    // 저장된 북마크를 UI에 반영
    try {
      const saved = await loadBookmarksSecure();
      saved.forEach(b => {
        const btn = document.querySelector(`.bookmark-btn[data-id="${b.id}"]`);
        if (btn) btn.textContent = '★';
      });
    } catch (_) { /* 비밀번호를 못 받으면 무시 */ }
  } else {
    console.error('카카오 지도 API가 로드되지 않았습니다.');
  }
});
