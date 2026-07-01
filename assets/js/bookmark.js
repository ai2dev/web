// assets/js/bookmark.js
// 북마크 데이터를 암호화해서 localStorage에 저장/로드하는 모듈
// 사용 방법: import { saveBookmarksSecure, loadBookmarksSecure } from './bookmark.js';

import { deriveKey, encryptData, decryptData } from './crypto.js';

const BOOKMARK_STORAGE_KEY = 'encryptedBookmarks';
const SALT_STORAGE_KEY = 'bookmarkSalt';

// 비밀번호를 입력받는 모달을 표시하고 Promise로 반환
function promptPassword() {
  return new Promise(resolve => {
    const modal = document.getElementById('pwd-modal');
    const input = document.getElementById('pwd-input');
    const okBtn = document.getElementById('pwd-ok');
    modal.classList.remove('hidden');
    input.value = '';
    input.focus();
    const cleanup = () => {
      modal.classList.add('hidden');
      okBtn.removeEventListener('click', onOk);
    };
    const onOk = () => {
      const pwd = input.value.trim();
      if (pwd.length === 0) {
        alert('비밀번호를 입력해 주세요.');
        return;
      }
      cleanup();
      resolve(pwd);
    };
    okBtn.addEventListener('click', onOk);
  });
}

// 전역에 저장된 비밀번호가 있으면 재사용, 없으면 모달 요청
async function getPassword() {
  if (window._bookmarkPassword) return window._bookmarkPassword;
  const pwd = await promptPassword();
  window._bookmarkPassword = pwd; // 메모리만 보관, 페이지 새로고침 시 다시 입력
  return pwd;
}

// Salt가 없으면 새로 생성하고 localStorage에 저장
function getOrCreateSalt() {
  let salt = localStorage.getItem(SALT_STORAGE_KEY);
  if (!salt) {
    const arr = crypto.getRandomValues(new Uint8Array(16));
    salt = btoa(String.fromCharCode(...arr));
    localStorage.setItem(SALT_STORAGE_KEY, salt);
  }
  return salt;
}

export async function saveBookmarksSecure(bookmarkArray) {
  try {
    const pwd = await getPassword();
    const salt = getOrCreateSalt();
    const key = await deriveKey(pwd, salt);
    const plain = JSON.stringify(bookmarkArray);
    const cipher = await encryptData(plain, key);
    localStorage.setItem(BOOKMARK_STORAGE_KEY, cipher);
    console.log('북마크가 암호화되어 저장되었습니다.');
  } catch (e) {
    console.error('북마크 저장 중 오류:', e);
    throw e;
  }
}

export async function loadBookmarksSecure() {
  const cipher = localStorage.getItem(BOOKMARK_STORAGE_KEY);
  if (!cipher) return [];
  const pwd = await getPassword();
  const salt = getOrCreateSalt();
  const key = await deriveKey(pwd, salt);
  const plain = await decryptData(cipher, key);
  return JSON.parse(plain);
}
