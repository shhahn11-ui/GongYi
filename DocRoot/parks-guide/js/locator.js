/* 주변 공원 탐색 및 지도 표시 스크립트 */

const mapContainer = document.getElementById('park-map');
const listContainer = document.getElementById('nearby-list');
const statusEl = document.getElementById('locator-status');
const hintEl = document.getElementById('nearby-hint');
const locateBtn = document.getElementById('locate-btn');
const addressInput = document.getElementById('address-input');
const addressSearchBtn = document.getElementById('address-search-btn');
const parksGrid = document.getElementById('parks-list');
const parksHint = document.getElementById('parks-hint');

let profileCoords = null;

let map;
let markersLayer;
let centerPin;
let centerCircle;
let moveFetchTimer;
let skipNextMoveFetch = false;

const RADIUS_M = 2000;
const MAX_PARKS = 20;

const formatDistance = meters => {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
};

const setStatus = (text, isError = false) => {
  statusEl.textContent = text;
  statusEl.style.color = isError ? '#b91c1c' : '#4b5563';
};

const haversine = (lat1, lon1, lat2, lon2) => {
  const toRad = deg => (deg * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const ensureMap = (lat, lon) => {
  if (!map) {
    map = L.map('park-map').setView([lat, lon], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap 기여자'
    }).addTo(map);
    markersLayer = L.layerGroup().addTo(map);

    map.on('moveend', () => {
      if (skipNextMoveFetch) {
        skipNextMoveFetch = false;
        return;
      }
      clearTimeout(moveFetchTimer);
      moveFetchTimer = setTimeout(() => {
        const c = map.getCenter();
        fetchParks(c.lat, c.lng).catch(err => {
          console.error(err);
          setStatus('주변 공원 데이터를 가져오지 못했습니다. 잠시 후 다시 시도해주세요.', true);
        });
      }, 350);
    });
  } else {
    map.setView([lat, lon], 15);
    markersLayer.clearLayers();
  }
};

const renderParks = (parks, centerLat, centerLon) => {
  listContainer.innerHTML = '';
  markersLayer.clearLayers();

  parks.forEach(park => {
    const marker = L.marker([park.lat, park.lon]).bindPopup(
      `<strong>${park.name || '이름 없음'}</strong><br>${formatDistance(park.distance)}`
    );
    marker.addTo(markersLayer);

    const li = document.createElement('li');
    li.className = 'nearby-item';
    li.innerHTML = `
      <div>
        <p class="nearby-name">${park.name || '이름 없음'}</p>
        <p class="meta">${formatDistance(park.distance)} · ${park.type}</p>
      </div>
      <button class="btn ghost btn-mini" data-lat="${park.lat}" data-lon="${park.lon}">지도에서 보기</button>
    `;
    listContainer.appendChild(li);
  });

  listContainer.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      const lat = Number(btn.dataset.lat);
      const lon = Number(btn.dataset.lon);
      map.setView([lat, lon], 17);
    });
  });
};

const renderTopParks = parks => {
  if (!parksGrid) return;
  parksGrid.innerHTML = '';

  if (!parks || !parks.length) {
    parksHint.textContent = '지도 중앙을 옮겨 주변 공원을 확인하세요.';
    return;
  }

  parksHint.textContent = '반경 2km 거리순 추천 (상위 3곳)';

  parks.slice(0, 3).forEach(park => {
    const article = document.createElement('article');
    article.className = 'card';
    article.innerHTML = `
      <div class="card-top">
        <span class="pill green">${formatDistance(park.distance)}</span>
        <span class="meta">${park.type}</span>
      </div>
      <h3>${park.name || '이름 없는 공원'}</h3>
      <p>내 위치 기준 ${formatDistance(park.distance)} 거리에 있는 공원입니다. 지도에서 위치를 확인하세요.</p>
      <div class="tags">
        <span>실시간 추천</span><span>거리순</span><span>위치 기반</span>
      </div>
    `;
    parksGrid.appendChild(article);
  });
};

const blockAccess = message => {
  setStatus(message, true);
  locateBtn.disabled = true;
  listContainer.innerHTML = '';
  markersLayer?.clearLayers();
  if (parksGrid) {
    parksGrid.innerHTML = '';
    parksHint.textContent = '위치 정보가 필요합니다.';
  }
};

const fetchParks = async (lat, lon) => {
  setStatus('주변 공원을 찾는 중입니다…');
  const overpassUrl = 'https://overpass-api.de/api/interpreter';
  const query = `
    [out:json][timeout:25];
    (
      node["leisure"="park"]["sport"!~".*"](around:${RADIUS_M},${lat},${lon});
      way["leisure"="park"]["sport"!~".*"](around:${RADIUS_M},${lat},${lon});
      relation["leisure"="park"]["sport"!~".*"](around:${RADIUS_M},${lat},${lon});
    );
    out center ${MAX_PARKS};
  `;

  const res = await fetch(overpassUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`
  });

  if (!res.ok) throw new Error('Overpass API 응답 오류');
  const data = await res.json();

  const parks = (data.elements || [])
    .map(el => {
      const { tags = {} } = el;
      if (tags.sport) return null; // 운동 시설(농구장 등) 제외
      const candidateName = tags.name || tags['name:ko'] || tags['name:en'];
      if (!candidateName) return null; // 이름 없는 경우 제외
      if (includesSportWord(candidateName)) return null; // 이름에 스포츠 용어가 있으면 제외
      const latlon = el.type === 'node' ? { lat: el.lat, lon: el.lon } : { lat: el.center?.lat, lon: el.center?.lon };
      if (!latlon.lat || !latlon.lon) return null;
      return {
        name: candidateName,
        type: tags.leisure === 'park' ? '공원' : '녹지',
        lat: latlon.lat,
        lon: latlon.lon,
        distance: haversine(lat, lon, latlon.lat, latlon.lon)
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, MAX_PARKS);

  if (!parks.length) {
    setStatus('근처 공원을 찾지 못했습니다. 지도를 이동해 보세요.', true);
    listContainer.innerHTML = '';
    markersLayer.clearLayers();
    renderTopParks([]);
    return;
  }

  setStatus(`총 ${parks.length}개 공원 표시 (2km 반경, 거리순)`);
  renderParks(parks, lat, lon);
  renderTopParks(parks);
};

// 기존 외부 산책로 fetch는 제거: 사용자 업로드 기반으로 동작

const handleLocate = () => {
  if (!profileCoords) {
    setStatus('프로필 위치가 없습니다. 회원가입 시 입력한 위치를 사용합니다.', true);
    return;
  }
  const { lat, lon } = profileCoords;
  setStatus('프로필 위치로 공원을 불러옵니다…');
  skipNextMoveFetch = true;
  ensureMap(lat, lon);
  fetchParks(lat, lon).catch(err => {
    console.error(err);
    setStatus('주변 공원 데이터를 가져오지 못했습니다. 잠시 후 다시 시도해주세요.', true);
  });
};

const geocodeAddress = async text => {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(text)}`;
  const res = await fetch(url, { headers: { 'Accept-Language': 'ko' } });
  if (!res.ok) throw new Error('주소 검색 실패');
  const data = await res.json();
  if (!data.length) throw new Error('검색 결과가 없습니다');
  return { lat: Number(data[0].lat), lon: Number(data[0].lon) };
};

const handleAddressSearch = async () => {
  if (!addressInput) return;
  const text = addressInput.value.trim();
  if (!text) {
    setStatus('검색할 주소나 장소명을 입력해주세요.', true);
    return;
  }
  setStatus('주소를 검색하고 있습니다…');
  try {
    const coords = await geocodeAddress(text);
    skipNextMoveFetch = true;
    ensureMap(coords.lat, coords.lon);
    fetchParks(coords.lat, coords.lon).catch(err => {
      console.error(err);
      setStatus('주변 공원 데이터를 가져오지 못했습니다. 잠시 후 다시 시도해주세요.', true);
    });
    setStatus('검색한 위치 기준 반경 2km를 표시합니다.');
  } catch (err) {
    console.error(err);
    setStatus('주소를 찾지 못했습니다. 다른 이름으로 시도해주세요.', true);
  }
};

const verifyContext = () => true; // 위치 권한을 사용하지 않으므로 보안 컨텍스트 강제 없음

const includesSportWord = name => {
  if (!name) return false;
  const lower = name.toLowerCase();
  return /농구|basketball|축구|soccer|풋살|futsal|야구|baseball|테니스|tennis|배드민턴|badminton|볼링|bowling/.test(lower);
};

// 초기 지도 뷰를 서울 시청 근처로 설정 (기본값)
ensureMap(37.5665, 126.9780);
setStatus('회원가입 시 입력한 위치로 공원을 표시합니다.');
hintEl.textContent = '지도 중앙을 움직이면 반경 2km 공원을 표시합니다.';
if (locateBtn) locateBtn.addEventListener('click', handleLocate);
if (addressSearchBtn) addressSearchBtn.addEventListener('click', handleAddressSearch);

// 외부에서 프로필 좌표를 설정하고 불러올 수 있도록 공개 함수 제공
window.loadParksAtLocation = (lat, lon) => {
  profileCoords = { lat, lon };
  setStatus('프로필 위치로 공원을 불러옵니다…');
  skipNextMoveFetch = true;
  ensureMap(lat, lon);
  fetchParks(lat, lon).catch(err => {
    console.error(err);
    setStatus('주변 공원 데이터를 가져오지 못했습니다. 잠시 후 다시 시도해주세요.', true);
  });
};
