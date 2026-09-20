/* =========================================
   TASHLAND — MAIN JS
   Supabase + Meetups + Stable Leaflet Map
========================================= */

/* =========================================
   SUPABASE
========================================= */

const SUPABASE_URL =
    'https://bjvacypsdjhldftpvvpn.supabase.co';

const SUPABASE_KEY =
    'sb_publishable_uUeRGcD-EZVArkR-N-NEmg_DwRxMHQV';

const supabaseClient =
    window.supabase?.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
    );

if (!supabaseClient) {
    console.error(
        'TashLand: Supabase не подключён.'
    );
}

/* =========================================
   HELPERS
========================================= */

function escapeHTML(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function getToday() {
    const now = new Date();

    return [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, '0'),
        String(now.getDate()).padStart(2, '0')
    ].join('-');
}

function formatDate(dateString) {
    if (!dateString) {
        return 'Дата не указана';
    }

    const date =
        new Date(`${dateString}T00:00:00`);

    if (Number.isNaN(date.getTime())) {
        return 'Дата не указана';
    }

    return date.toLocaleDateString(
        'ru-RU',
        {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        }
    );
}

function formatTime(time) {
    if (!time) {
        return '--:--';
    }

    return String(time).slice(0, 5);
}

function isValidMeetupDate(date, time) {
    if (!date || !time) {
        return false;
    }

    const meetupDate =
        new Date(`${date}T${time}`);

    return (
        Number.isFinite(meetupDate.getTime()) &&
        meetupDate.getTime() > Date.now()
    );
}

function setBodyLock(locked) {
    document.body.style.overflow =
        locked ? 'hidden' : '';
}

/* =========================================
   SCROLL REVEAL
========================================= */

const sections =
    document.querySelectorAll(
        '.about, .contacts, .meetups'
    );

if ('IntersectionObserver' in window) {
    const revealObserver =
        new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) {
                        return;
                    }

                    entry.target.classList.add('show');

                    revealObserver.unobserve(
                        entry.target
                    );
                });
            },
            {
                threshold: 0.15
            }
        );

    sections.forEach((section) => {
        section.classList.add('reveal');
        revealObserver.observe(section);
    });
} else {
    sections.forEach((section) => {
        section.classList.add('show');
    });
}

/* =========================================
   MOUSE GLOW
========================================= */

const glow =
    document.createElement('div');

glow.className = 'mouse-glow';

document.body.appendChild(glow);

if (
    window.matchMedia('(pointer: fine)').matches
) {
    let glowFrame = null;

    document.addEventListener(
        'mousemove',
        (event) => {
            if (glowFrame) {
                cancelAnimationFrame(glowFrame);
            }

            glowFrame =
                requestAnimationFrame(() => {
                    glow.style.left =
                        `${event.clientX}px`;

                    glow.style.top =
                        `${event.clientY}px`;
                });
        },
        {
            passive: true
        }
    );
}

/* =========================================
   HERO PARALLAX
========================================= */

const heroContent =
    document.querySelector('.hero-content');

if (
    heroContent &&
    window.matchMedia('(pointer: fine)').matches
) {
    let parallaxFrame = null;

    document.addEventListener(
        'mousemove',
        (event) => {
            if (parallaxFrame) {
                cancelAnimationFrame(
                    parallaxFrame
                );
            }

            parallaxFrame =
                requestAnimationFrame(() => {
                    const x =
                        (
                            window.innerWidth / 2 -
                            event.clientX
                        ) / 80;

                    const y =
                        (
                            window.innerHeight / 2 -
                            event.clientY
                        ) / 80;

                    heroContent.style.transform =
                        `translate3d(${x}px, ${y}px, 0)`;
                });
        },
        {
            passive: true
        }
    );
}

/* =========================================
   ELEMENTS
========================================= */

const modal =
    document.getElementById('meetupModal');

const openModal =
    document.getElementById(
        'openMeetupModal'
    );

const closeModal =
    document.getElementById(
        'closeMeetupModal'
    );

const closeButton =
    document.getElementById(
        'modalCloseButton'
    );

const form =
    document.getElementById(
        'meetupForm'
    );

const meetupList =
    document.getElementById(
        'meetupsList'
    );

/* =========================================
   MAP ELEMENTS
========================================= */

const mapModal =
    document.getElementById('mapModal');

const mapOverlay =
    document.getElementById('mapOverlay');

const mapClose =
    document.getElementById('mapClose');

const mapTitle =
    document.getElementById(
        'mapMeetupTitle'
    );

const mapDate =
    document.getElementById(
        'mapMeetupDate'
    );

const mapTime =
    document.getElementById(
        'mapMeetupTime'
    );

const mapPlace =
    document.getElementById(
        'mapMeetupPlace'
    );

const mapElement =
    document.getElementById('meetupMap');

/* =========================================
   MAP STATE
========================================= */

let meetupMap = null;
let meetupMarker = null;

let geocodeController = null;

const geocodeCache = new Map();

let mapRequestId = 0;
let realtimeTimer = null;

/* =========================================
   CREATE MEETUP SYSTEM
========================================= */

if (
    modal &&
    openModal &&
    closeModal &&
    closeButton &&
    form &&
    meetupList &&
    supabaseClient
) {

    /* =====================================
       OPEN MODAL
    ===================================== */

    function openMeetupModal(event) {
        if (event) {
            event.preventDefault();
        }

        modal.classList.add('active');

        modal.setAttribute(
            'aria-hidden',
            'false'
        );

        setBodyLock(true);

        const titleInput =
            document.getElementById(
                'meetupTitle'
            );

        if (titleInput) {
            setTimeout(() => {
                titleInput.focus();
            }, 250);
        }
    }

    /* =====================================
       CLOSE MODAL
    ===================================== */

    function closeMeetupModal(event) {
        if (event) {
            event.preventDefault();
        }

        modal.classList.remove('active');

        modal.setAttribute(
            'aria-hidden',
            'true'
        );

        setBodyLock(false);
    }

    openModal.addEventListener(
        'click',
        openMeetupModal
    );

    closeButton.addEventListener(
        'click',
        closeMeetupModal
    );

    closeModal.addEventListener(
        'click',
        closeMeetupModal
    );

    /* =====================================
       DATE INPUT
    ===================================== */

    const dateInput =
        document.getElementById(
            'meetupDate'
        );

    if (dateInput) {
        dateInput.min = getToday();
    }

    /* =====================================
       LOAD MEETUPS
    ===================================== */

    async function loadMeetups() {
        const {
            data,
            error
        } =
            await supabaseClient
                .from('meetups')
                .select(
                    `
                    id,
                    title,
                    date,
                    time,
                    place,
                    description,
                    status,
                    created_at
                    `
                )
                .eq(
                    'status',
                    'active'
                )
                .order(
                    'date',
                    {
                        ascending: true
                    }
                )
                .order(
                    'time',
                    {
                        ascending: true
                    }
                );

        if (error) {
            console.error(
                'Supabase LOAD error:',
                error
            );

            meetupList.innerHTML = `
                <div class="empty-meetups">
                    ⚠️ Не удалось загрузить сходки.
                    <br><br>
                    <small>
                        ${escapeHTML(error.message)}
                    </small>
                </div>
            `;

            return [];
        }

        return data || [];
    }

    /* =====================================
       DELETE MEETUP
    ===================================== */

    async function deleteMeetup(id) {
        if (!id) {
            return;
        }

        const confirmed =
            window.confirm(
                'Удалить эту сходку?'
            );

        if (!confirmed) {
            return;
        }

        const {
            error
        } =
            await supabaseClient
                .from('meetups')
                .delete()
                .eq(
                    'id',
                    id
                );

        if (error) {
            console.error(
                'Supabase DELETE error:',
                error
            );

            alert(
                'Не удалось удалить сходку:\n\n' +
                error.message
            );

            return;
        }

        await renderMeetups();
    }

    /* =====================================
       RENDER MEETUPS
    ===================================== */

    async function renderMeetups() {
        meetupList.innerHTML = `
            <div class="empty-meetups">
                Загружаем сходки...
            </div>
        `;

        const meetups =
            await loadMeetups();

        if (
            !meetups ||
            meetups.length === 0
        ) {
            meetupList.innerHTML = `
                <div class="empty-meetups">
                    Пока сходок нет.
                    <br>
                    Стань первым и
                    запланируй встречу 🚀
                </div>
            `;

            return;
        }

        meetupList.innerHTML = '';

        meetups.forEach((meetup) => {
            const card =
                document.createElement(
                    'article'
                );

            card.className =
                'meetup-card';

            card.innerHTML = `
                <div class="meetup-date">
                    📅
                    ${escapeHTML(
                        formatDate(meetup.date)
                    )}
                </div>

                <h3>
                    ${escapeHTML(
                        meetup.title
                    )}
                </h3>

                <div class="meetup-info">

                    <span>
                        🕐
                        ${escapeHTML(
                            formatTime(meetup.time)
                        )}
                    </span>

                    <span>
                        📍
                        ${escapeHTML(
                            meetup.place
                        )}
                    </span>

                </div>

                ${
                    meetup.description
                        ? `
                            <p class="meetup-description">
                                ${escapeHTML(
                                    meetup.description
                                )}
                            </p>
                        `
                        : ''
                }

                <div class="meetup-actions">

                    <button
                        class="map-meetup-btn"
                        type="button"
                    >
                        📍 Показать на карте
                    </button>

                    <button
                        class="delete-meetup-btn"
                        type="button"
                    >
                        Удалить
                    </button>

                </div>
            `;

            meetupList.appendChild(card);

            const mapButton =
                card.querySelector(
                    '.map-meetup-btn'
                );

            if (mapButton) {
                mapButton.addEventListener(
                    'click',
                    () => {
                        openMeetupMap(meetup);
                    }
                );
            }

            const deleteButton =
                card.querySelector(
                    '.delete-meetup-btn'
                );

            if (deleteButton) {
                deleteButton.addEventListener(
                    'click',
                    () => {
                        deleteMeetup(
                            meetup.id
                        );
                    }
                );
            }
        });
    }

    /* =====================================
       CREATE MEETUP
    ===================================== */

    form.addEventListener(
        'submit',
        async (event) => {
            event.preventDefault();

            const title =
                document
                    .getElementById(
                        'meetupTitle'
                    )
                    ?.value
                    .trim();

            const date =
                document
                    .getElementById(
                        'meetupDate'
                    )
                    ?.value;

            const time =
                document
                    .getElementById(
                        'meetupTime'
                    )
                    ?.value;

            const place =
                document
                    .getElementById(
                        'meetupPlace'
                    )
                    ?.value
                    .trim();

            const description =
                document
                    .getElementById(
                        'meetupDescription'
                    )
                    ?.value
                    .trim();

            if (
                !title ||
                !date ||
                !time ||
                !place
            ) {
                alert(
                    'Заполни название, дату, время и место.'
                );

                return;
            }

            if (
                !isValidMeetupDate(
                    date,
                    time
                )
            ) {
                alert(
                    'Выбери дату и время в будущем.'
                );

                return;
            }

            const submitButton =
                form.querySelector(
                    'button[type="submit"]'
                );

            if (submitButton) {
                submitButton.disabled = true;
                submitButton.textContent =
                    'Создаём...';
            }

            try {
                const {
                    error
                } =
                    await supabaseClient
                        .from('meetups')
                        .insert([
                            {
                                title,
                                date,
                                time,
                                place,
                                description:
                                    description ||
                                    null,
                                status: 'active'
                            }
                        ]);

                if (error) {
                    throw error;
                }

                form.reset();

                if (dateInput) {
                    dateInput.min =
                        getToday();
                }

                closeMeetupModal();

                await renderMeetups();

            } catch (error) {
                console.error(
                    'Supabase INSERT error:',
                    error
                );

                alert(
                    'Не удалось создать сходку:\n\n' +
                    error.message
                );

            } finally {
                if (submitButton) {
                    submitButton.disabled =
                        false;

                    submitButton.textContent =
                        'Создать сходку →';
                }
            }
        }
    );

    /* =====================================
       MAP MODAL
    ===================================== */

    function openMapModal() {
        if (!mapModal) {
            return;
        }

        mapModal.classList.add('active');

        mapModal.setAttribute(
            'aria-hidden',
            'false'
        );

        setBodyLock(true);
    }

    function closeMapModal() {
        mapRequestId++;

        if (geocodeController) {
            geocodeController.abort();
            geocodeController = null;
        }

        if (!mapModal) {
            return;
        }

        mapModal.classList.remove('active');

        mapModal.setAttribute(
            'aria-hidden',
            'true'
        );

        setBodyLock(false);
    }

    if (mapClose) {
        mapClose.addEventListener(
            'click',
            closeMapModal
        );
    }

    if (mapOverlay) {
        mapOverlay.addEventListener(
            'click',
            closeMapModal
        );
    }

    /* =====================================
       CREATE LEAFLET MAP
    ===================================== */

    function createMap() {
        if (!mapElement) {
            return null;
        }

        if (typeof L === 'undefined') {
            console.error(
                'TashLand: Leaflet не найден.'
            );

            return null;
        }

        if (meetupMap) {
            return meetupMap;
        }

        meetupMap =
            L.map(
                mapElement,
                {
                    zoomControl: true,
                    zoomAnimation: false,
                    fadeAnimation: false,
                    markerZoomAnimation: false,
                    preferCanvas: true
                }
            );

        L.tileLayer(
            'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            {
                minZoom: 3,
                maxZoom: 19,
                updateWhenIdle: true,
                keepBuffer: 2,
                attribution:
                    '&copy; OpenStreetMap contributors'
            }
        ).addTo(meetupMap);

        meetupMap.setView(
            [
                41.3111,
                69.2797
            ],
            12,
            {
                animate: false
            }
        );

        return meetupMap;
    }

    /* =====================================
       REFRESH MAP SIZE
    ===================================== */

    function refreshMapSize() {
        if (!meetupMap) {
            return;
        }

        const invalidate = () => {
            if (!meetupMap) {
                return;
            }

            meetupMap.invalidateSize({
                animate: false,
                pan: false
            });
        };

        requestAnimationFrame(invalidate);

        setTimeout(invalidate, 250);

        setTimeout(invalidate, 600);
    }

    /* =====================================
       MAP ERROR
    ===================================== */

    function showMapError(
        title,
        text
    ) {
        if (!mapElement) {
            return;
        }

        let errorBox =
            mapElement.querySelector(
                '.map-runtime-error'
            );

        if (!errorBox) {
            errorBox =
                document.createElement(
                    'div'
                );

            errorBox.className =
                'map-runtime-error';

            mapElement.appendChild(
                errorBox
            );
        }

        errorBox.innerHTML = `
            <div class="map-not-found">

                <div class="map-not-found-icon">
                    📍
                </div>

                <h4>
                    ${escapeHTML(title)}
                </h4>

                <p>
                    ${escapeHTML(text)}
                </p>

            </div>
        `;
    }

    function hideMapError() {
        if (!mapElement) {
            return;
        }

        const errorBox =
            mapElement.querySelector(
                '.map-runtime-error'
            );

        if (errorBox) {
            errorBox.remove();
        }
    }

    /* =====================================
       GEOCODING
    ===================================== */

    async function findLocation(place) {
        const cleanPlace =
            String(place || '')
                .trim()
                .toLowerCase();

        if (!cleanPlace) {
            throw new Error(
                'Место не указано'
            );
        }

        if (
            geocodeCache.has(
                cleanPlace
            )
        ) {
            return geocodeCache.get(
                cleanPlace
            );
        }

        if (geocodeController) {
            geocodeController.abort();
        }

        geocodeController =
            new AbortController();

        const query =
            `${place}, Tashkent, Uzbekistan`;

        const params =
            new URLSearchParams({
                format: 'json',
                limit: '1',
                addressdetails: '1',
                'accept-language': 'ru',
                q: query
            });

        const url =
            `https://nominatim.openstreetmap.org/search?${params.toString()}`;

        const response =
            await fetch(
                url,
                {
                    signal:
                        geocodeController.signal,

                    headers: {
                        Accept:
                            'application/json'
                    }
                }
            );

        if (!response.ok) {
            throw new Error(
                `Nominatim HTTP ${response.status}`
            );
        }

        const results =
            await response.json();

        if (
            !Array.isArray(results) ||
            results.length === 0
        ) {
            throw new Error(
                'Место не найдено'
            );
        }

        const result =
            results[0];

        geocodeCache.set(
            cleanPlace,
            result
        );

        return result;
    }

    /* =====================================
       OPEN MEETUP MAP
    ===================================== */

    async function openMeetupMap(meetup) {
        if (
            !mapModal ||
            !mapElement
        ) {
            return;
        }

        const requestId =
            ++mapRequestId;

        /* INFO */

        if (mapTitle) {
            mapTitle.textContent =
                meetup.title ||
                'Сходка';
        }

        if (mapDate) {
            mapDate.textContent =
                `📅 ${formatDate(
                    meetup.date
                )}`;
        }

        if (mapTime) {
            mapTime.textContent =
                `🕐 ${formatTime(
                    meetup.time
                )}`;
        }

        if (mapPlace) {
            mapPlace.textContent =
                `📍 ${meetup.place || ''}`;
        }

        /* OPEN */

        openMapModal();

        await new Promise(
            (resolve) => {
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        resolve();
                    });
                });
            }
        );

        if (
            requestId !==
            mapRequestId
        ) {
            return;
        }

        /* CREATE MAP */

        const map =
            createMap();

        if (!map) {
            showMapError(
                'Карта не загрузилась',
                'Leaflet не подключён. Проверь подключение Leaflet в HTML.'
            );

            return;
        }

        hideMapError();

        refreshMapSize();

        /* GEOCODE */

        try {
            const result =
                await findLocation(
                    meetup.place
                );

            if (
                requestId !==
                mapRequestId
            ) {
                return;
            }

            const lat =
                Number(result.lat);

            const lon =
                Number(result.lon);

            if (
                !Number.isFinite(lat) ||
                !Number.isFinite(lon)
            ) {
                throw new Error(
                    'Некорректные координаты'
                );
            }

            /* REMOVE OLD MARKER */

            if (meetupMarker) {
                meetupMap.removeLayer(
                    meetupMarker
                );

                meetupMarker = null;
            }

            /* MOVE MAP */

            map.setView(
                [
                    lat,
                    lon
                ],
                16,
                {
                    animate: false
                }
            );

            /* MARKER */

            meetupMarker =
                L.marker(
                    [
                        lat,
                        lon
                    ]
                )
                .addTo(map);

            meetupMarker.bindPopup(`
                <div style="min-width:180px">

                    <strong>
                        ${escapeHTML(
                            meetup.title ||
                            'Сходка'
                        )}
                    </strong>

                    <br>

                    <span>
                        ${escapeHTML(
                            meetup.place ||
                            ''
                        )}
                    </span>

                </div>
            `);

            meetupMarker.openPopup();

            refreshMapSize();

        } catch (error) {
            if (
                error?.name ===
                'AbortError'
            ) {
                return;
            }

            if (
                requestId !==
                mapRequestId
            ) {
                return;
            }

            console.error(
                'Ошибка карты:',
                error
            );

            showMapError(
                'Место не найдено',
                'Попробуй указать более точный адрес или название места.'
            );
        }
    }

    /* =====================================
       ESC
    ===================================== */

    document.addEventListener(
        'keydown',
        (event) => {
            if (
                event.key !==
                'Escape'
            ) {
                return;
            }

            if (
                modal &&
                modal.classList.contains(
                    'active'
                )
            ) {
                closeMeetupModal();
            }

            if (
                mapModal &&
                mapModal.classList.contains(
                    'active'
                )
            ) {
                closeMapModal();
            }
        }
    );

    /* =====================================
       REALTIME
    ===================================== */

    supabaseClient
        .channel(
            'meetups-realtime'
        )
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'meetups'
            },
            () => {
                clearTimeout(
                    realtimeTimer
                );

                realtimeTimer =
                    setTimeout(
                        () => {
                            renderMeetups();
                        },
                        300
                    );
            }
        )
        .subscribe(
            (status) => {
                console.log(
                    'Supabase Realtime:',
                    status
                );
            }
        );

    /* =====================================
       START
    ===================================== */

    renderMeetups();

} else {
    console.error(
        'TashLand: элементы системы сходок не найдены.'
    );
}

/* =========================================
   READY
========================================= */

console.log(
    '%c🔥 TashLand script.js запущен!',
    'color:#7c3cff;font-size:18px;font-weight:bold;'
);