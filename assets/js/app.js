// assets/js/app.js
// 메인 애플리케이션 스크립트 (ES 모듈)
import { deriveKey, encryptData, decryptData } from './crypto.js';
import { saveBookmarksSecure, loadBookmarksSecure } from './bookmark.js';

// ---------- 지도 초기화 (카카오) ----------
let map;
export function initMap() {
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
function normalizePlace(item) {
  return {
    id: item.id ?? item.place_id ?? `${item.x}_${item.y}`,
    name: item.name ?? item.place_name ?? '알 수 없음',
    lat: item.lat ?? item.y,
    lng: item.lng ?? item.x
  };
}

function renderList(list) {
  const normalized = list.map(normalizePlace);
  const listEl = document.getElementById('list');
  listEl.innerHTML = '';
  normalized.forEach(r => {
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
  if (window._markers) window._markers.forEach(m => m.setMap(null));
  window._markers = [];
  const normalized = list.map(normalizePlace);
  normalized.forEach(r => {
    const position = new kakao.maps.LatLng(r.lat, r.lng);
    const marker = new kakao.maps.Marker({ position, map });
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
  // 카카오 지도 SDK가 준비될 때까지 안전하게 대기
  const waitForKakao = (cb) => {
    if (window.kakao && window.kakao.maps && typeof window.kakao.maps.load === 'function') {
      cb();
    } else {
      setTimeout(() => waitForKakao(cb), 100);
    }
  };

  waitForKakao(() => {
    kakao.maps.load(async () => {
      // SDK 로드 후 지도와 데이터 초기화
      initMap();
      await loadRestaurants();

    // ---------- 검색 버튼 이벤트 ----------
    const searchBtn = document.getElementById('search-btn');
    const keywordInput = document.getElementById('location-input');

    searchBtn.addEventListener('click', async () => {
      const keyword = keywordInput.value.trim();
      if (!keyword) {
        alert('검색어를 입력하세요.');
        return;
      }
      const ps = new kakao.maps.services.Places();
      const center = map.getCenter();
      console.log('🔎 현재 지도 중심 좌표:', center);
      const options = { location: center, radius: 5000 };

      ps.keywordSearch(keyword, (result, status) => {
        console.log('🔎 검색 콜백 결과', result, 'status', status);
        if (status === kakao.maps.services.Status.OK) {
          renderList(result);
          addMarkers(result);
        } else {
          alert('검색 결과가 없습니다. (status: ' + status + ')');
        }
      }, options);
    });

    // ---------- 북마크 UI 복구 ----------
    try {
      const saved = await loadBookmarksSecure();
      saved.forEach(b => {
        const btn = document.querySelector(`.bookmark-btn[data-id="${b.id}"]`);
        if (btn) btn.textContent = '★';
      });
    } catch (_) {
      // 비밀번호를 못 받으면 무시
    }
  });
});
});
