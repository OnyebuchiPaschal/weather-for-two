/**
     * ============================================================================
     * AETHER WEATHER DASHBOARD — MODULAR VANILLA ES6+ ARCHITECTURE
     * ============================================================================
     * Modules:
     *  1. Config & Presets
     *  2. WMO Weather Code & Custom Inline SVG Icon Library
     *  3. Unit Conversion & Formatting Utilities
     *  4. API Service Layer (Open-Meteo Geocoding + Forecast with AbortController)
     *  5. Application State & LocalStorage Persistence
     *  6. DOM Renderer & Event Controllers
     */

    (() => {
      'use strict';

      /* --------------------------------------------------------------------------
         1. CONFIG & PRESETS
         -------------------------------------------------------------------------- */
      const STORAGE_KEYS = {
        PINNED: 'aether_pinned_cities_v1',
        UNIT: 'aether_unit_v1',
        LAST_CITY: 'aether_last_city_v1'
      };

      const PRESET_CITIES = [
        { id: 'lagos-ng', name: 'Lagos', admin1: 'Lagos', country: 'Nigeria', latitude: 6.5244, longitude: 3.3792, timezone: 'Africa/Lagos', isPreset: true },
        { id: 'london-gb', name: 'London', admin1: 'England', country: 'United Kingdom', latitude: 51.5085, longitude: -0.1257, timezone: 'Europe/London', isPreset: true },
        { id: 'new-york-us', name: 'New York', admin1: 'New York', country: 'United States', latitude: 40.7143, longitude: -74.006, timezone: 'America/New_York', isPreset: true },
        { id: 'tokyo-jp', name: 'Tokyo', admin1: 'Tokyo', country: 'Japan', latitude: 35.6895, longitude: 139.6917, timezone: 'Asia/Tokyo', isPreset: true },
        { id: 'sydney-au', name: 'Sydney', admin1: 'New South Wales', country: 'Australia', latitude: -33.8678, longitude: 151.2073, timezone: 'Australia/Sydney', isPreset: true },
        { id: 'paris-fr', name: 'Paris', admin1: 'Île-de-France', country: 'France', latitude: 48.8534, longitude: 2.3488, timezone: 'Europe/Paris', isPreset: true }
      ];

      /* --------------------------------------------------------------------------
         2. WMO WEATHER CODE MAPPER & INLINE SVG ICON ENGINE
         -------------------------------------------------------------------------- */
      const WeatherMapper = {
        /**
         * Maps WMO weather interpretation code + day/night flag to label, icon key, and theme class.
         */
        describe(code, isDay = 1) {
          const day = Boolean(isDay);
          if (code === 0) {
            return {
              label: day ? 'Clear Sky' : 'Clear Night',
              icon: day ? 'sun' : 'moon',
              theme: day ? 'theme-clear-day' : 'theme-clear-night'
            };
          }
          if (code === 1 || code === 2) {
            return {
              label: code === 1 ? 'Mainly Clear' : 'Partly Cloudy',
              icon: day ? 'partly-cloudy-day' : 'partly-cloudy-night',
              theme: day ? 'theme-clear-day' : 'theme-clear-night'
            };
          }
          if (code === 3) {
            return { label: 'Overcast', icon: 'cloudy', theme: 'theme-cloudy' };
          }
          if (code === 45 || code === 48) {
            return { label: 'Foggy', icon: 'fog', theme: 'theme-cloudy' };
          }
          if ([51, 53, 55, 56, 57].includes(code)) {
            return { label: 'Drizzle', icon: 'rain', theme: 'theme-rain' };
          }
          if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
            const heavy = [65, 82].includes(code);
            return { label: heavy ? 'Heavy Rain' : 'Rain Showers', icon: 'rain', theme: 'theme-rain' };
          }
          if ([71, 73, 75, 77, 85, 86].includes(code)) {
            return { label: 'Snowfall', icon: 'snow', theme: 'theme-snow' };
          }
          if ([95, 96, 99].includes(code)) {
            return { label: 'Thunderstorm', icon: 'storm', theme: 'theme-storm' };
          }
          return { label: 'Variable', icon: day ? 'partly-cloudy-day' : 'partly-cloudy-night', theme: 'theme-cloudy' };
        },

        /**
         * Returns crisp custom inline SVG markup for weather conditions.
         */
        getIconSVG(type, size = 32) {
          const s = `width="${size}" height="${size}" viewBox="0 0 64 64" fill="none"`;
          const icons = {
            sun: `
              <svg ${s}>
                <defs>
                  <radialGradient id="sunGrad" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stop-color="#FDE047"/>
                    <stop offset="100%" stop-color="#F59E0B"/>
                  </radialGradient>
                </defs>
                <circle cx="32" cy="32" r="14" fill="url(#sunGrad)"/>
                <g stroke="#FBBF24" stroke-width="3.2" stroke-linecap="round">
                  <line x1="32" y1="6" x2="32" y2="12"/><line x1="32" y1="52" x2="32" y2="58"/>
                  <line x1="6" y1="32" x2="12" y2="32"/><line x1="52" y1="32" x2="58" y2="32"/>
                  <line x1="13.6" y1="13.6" x2="17.8" y2="17.8"/><line x1="46.2" y1="46.2" x2="50.4" y2="50.4"/>
                  <line x1="13.6" y1="50.4" x2="17.8" y2="46.2"/><line x1="46.2" y1="17.8" x2="50.4" y2="13.6"/>
                </g>
              </svg>`,
            moon: `
              <svg ${s}>
                <defs>
                  <linearGradient id="moonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#E0E7FF"/>
                    <stop offset="100%" stop-color="#818CF8"/>
                  </linearGradient>
                </defs>
                <path d="M44 38.5A16 16 0 0 1 25.5 20a16 16 0 1 0 18.5 18.5Z" fill="url(#moonGrad)"/>
                <circle cx="45" cy="17" r="1.8" fill="#C7D2FE"/>
                <circle cx="51" cy="25" r="1.2" fill="#C7D2FE"/>
              </svg>`,
            'partly-cloudy-day': `
              <svg ${s}>
                <circle cx="24" cy="24" r="10" fill="#FBBF24"/>
                <g stroke="#FBBF24" stroke-width="2.6" stroke-linecap="round">
                  <line x1="24" y1="8" x2="24" y2="11"/><line x1="11" y1="24" x2="8" y2="24"/>
                  <line x1="14.5" y1="14.5" x2="12.5" y2="12.5"/><line x1="33.5" y1="14.5" x2="35.5" y2="12.5"/>
                </g>
                <path d="M22 46h23a10 10 0 0 0 1.4-19.9A13 13 0 0 0 21.5 29 8.5 8.5 0 0 0 22 46Z" fill="#E2E8F0"/>
              </svg>`,
            'partly-cloudy-night': `
              <svg ${s}>
                <path d="M31 24.5A10 10 0 0 1 19.5 13a10 10 0 1 0 11.5 11.5Z" fill="#A5B4FC"/>
                <path d="M22 47h23a10 10 0 0 0 1.4-19.9A13 13 0 0 0 21.5 30 8.5 8.5 0 0 0 22 47Z" fill="#CBD5E1"/>
              </svg>`,
            cloudy: `
              <svg ${s}>
                <path d="M18 46h28a11 11 0 0 0 1.5-21.9A14.5 14.5 0 0 0 19.8 27 9.5 9.5 0 0 0 18 46Z" fill="#CBD5E1"/>
                <path d="M14 48h24a8 8 0 0 0 1.1-15.9A10.5 10.5 0 0 0 19 34a7 7 0 0 0-5 14Z" fill="#94A3B8" opacity="0.75"/>
              </svg>`,
            rain: `
              <svg ${s}>
                <path d="M18 39h28a10.5 10.5 0 0 0 1.4-20.9A14 14 0 0 0 20 21 9 9 0 0 0 18 39Z" fill="#CBD5E1"/>
                <g stroke="#38BDF8" stroke-width="3" stroke-linecap="round">
                  <line x1="23" y1="45" x2="20" y2="53"/>
                  <line x1="32" y1="45" x2="29" y2="53"/>
                  <line x1="41" y1="45" x2="38" y2="53"/>
                </g>
              </svg>`,
            storm: `
              <svg ${s}>
                <path d="M18 38h28a10.5 10.5 0 0 0 1.4-20.9A14 14 0 0 0 20 20 9 9 0 0 0 18 38Z" fill="#94A3B8"/>
                <polygon points="33,36 25,48 32,48 29,58 41,44 34,44" fill="#FBBF24"/>
              </svg>`,
            snow: `
              <svg ${s}>
                <path d="M18 39h28a10.5 10.5 0 0 0 1.4-20.9A14 14 0 0 0 20 21 9 9 0 0 0 18 39Z" fill="#E2E8F0"/>
                <g fill="#BAE6FD">
                  <circle cx="23" cy="47" r="2.4"/><circle cx="32" cy="51" r="2.4"/><circle cx="41" cy="47" r="2.4"/>
                  <circle cx="27" cy="55" r="2"/><circle cx="37" cy="55" r="2"/>
                </g>
              </svg>`,
            fog: `
              <svg ${s}>
                <path d="M19 35h26a9.5 9.5 0 0 0 1.2-18.9A12.5 12.5 0 0 0 21 19a8 8 0 0 0-2 16Z" fill="#CBD5E1"/>
                <g stroke="#94A3B8" stroke-width="3" stroke-linecap="round">
                  <line x1="14" y1="42" x2="50" y2="42"/>
                  <line x1="18" y1="49" x2="46" y2="49"/>
                </g>
              </svg>`
          };
          return icons[type] || icons.cloudy;
        }
      };

      /* --------------------------------------------------------------------------
         3. UNIT CONVERSION & FORMATTING UTILITIES
         -------------------------------------------------------------------------- */
      const Formatters = {
        temp(celsius, unit) {
          if (celsius == null || Number.isNaN(celsius)) return '--';
          const val = unit === 'imperial' ? (celsius * 9) / 5 + 32 : celsius;
          return Math.round(val);
        },

        speed(kmh, unit) {
          if (kmh == null || Number.isNaN(kmh)) return '--';
          if (unit === 'imperial') {
            return `${Math.round(kmh * 0.621371)} mph`;
          }
          return `${Math.round(kmh)} km/h`;
        },

        precip(mm, unit) {
          if (mm == null || Number.isNaN(mm)) return '--';
          if (unit === 'imperial') {
            return `${(mm * 0.0393701).toFixed(2)} in`;
          }
          return `${mm.toFixed(1)} mm`;
        },

        cardinalDirection(deg) {
          if (deg == null) return '--';
          const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
          return dirs[Math.round(deg / 22.5) % 16];
        },

        uvMeta(uv) {
          if (uv == null) return { label: '--', cls: 'uv-low', advice: 'No data' };
          if (uv < 3) return { label: 'Low', cls: 'uv-low', advice: 'Minimal sun protection needed' };
          if (uv < 6) return { label: 'Moderate', cls: 'uv-mod', advice: 'Wear sunglasses & SPF 30+' };
          if (uv < 8) return { label: 'High', cls: 'uv-high', advice: 'Seek shade during midday' };
          return { label: 'Very High', cls: 'uv-vhigh', advice: 'Extra sun protection required' };
        },

        localDateTime(timezone) {
          try {
            return new Intl.DateTimeFormat('en-US', {
              timeZone: timezone || 'UTC',
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit'
            }).format(new Date());
          } catch {
            return new Date().toLocaleString();
          }
        },

        hourLabel(isoString) {
          // Open-Meteo returns local ISO strings like "2026-11-17T23:00"
          const hourPart = parseInt(isoString.split('T')[1].split(':')[0], 10);
          const suffix = hourPart >= 12 ? 'PM' : 'AM';
          const h12 = hourPart % 12 === 0 ? 12 : hourPart % 12;
          return `${h12} ${suffix}`;
        },

        dayName(dateStr, idx) {
          if (idx === 0) return 'Today';
          const [y, m, d] = dateStr.split('-').map(Number);
          const date = new Date(Date.UTC(y, m - 1, d));
          return new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'UTC' }).format(date);
        },

        coords(lat, lon) {
          const latDir = lat >= 0 ? 'N' : 'S';
          const lonDir = lon >= 0 ? 'E' : 'W';
          return `${Math.abs(lat).toFixed(2)}°${latDir}, ${Math.abs(lon).toFixed(2)}°${lonDir}`;
        }
      };

      /* --------------------------------------------------------------------------
         4. API SERVICE LAYER (WITH ABORT CONTROLLERS)
         -------------------------------------------------------------------------- */
      const WeatherAPI = {
        searchController: null,
        forecastController: null,

        /**
         * Searches cities via Open-Meteo Geocoding API, cancelling any in-flight request.
         */
        async searchCities(query) {
          if (this.searchController) {
            this.searchController.abort();
          }
          this.searchController = new AbortController();

          const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
          url.searchParams.set('name', query);
          url.searchParams.set('count', '7');
          url.searchParams.set('language', 'en');
          url.searchParams.set('format', 'json');

          const res = await fetch(url.toString(), { signal: this.searchController.signal });
          if (!res.ok) throw new Error(`Geocoding failed (${res.status})`);
          const data = await res.json();
          return (data.results || []).map((item) => ({
            id: `${item.id || `${item.latitude.toFixed(3)}_${item.longitude.toFixed(3)}`}`,
            name: item.name,
            admin1: item.admin1 || '',
            country: item.country || '',
            latitude: item.latitude,
            longitude: item.longitude,
            timezone: item.timezone || 'auto'
          }));
        },

        /**
         * Fetches comprehensive current, hourly, and 7-day forecast in Celsius & km/h.
         * All unit conversions are handled client-side so unit toggles need zero network calls.
         */
        async fetchForecast(lat, lon) {
          if (this.forecastController) {
            this.forecastController.abort();
          }
          this.forecastController = new AbortController();

          const url = new URL('https://api.open-meteo.com/v1/forecast');
          url.searchParams.set('latitude', lat);
          url.searchParams.set('longitude', lon);
          url.searchParams.set('timezone', 'auto');
          url.searchParams.set('forecast_days', '7');
          url.searchParams.set(
            'current',
            'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,cloud_cover,surface_pressure,wind_speed_10m,wind_direction_10m,dew_point_2m'
          );
          url.searchParams.set(
            'hourly',
            'temperature_2m,precipitation_probability,weather_code,is_day,uv_index'
          );
          url.searchParams.set(
            'daily',
            'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max'
          );

          const res = await fetch(url.toString(), { signal: this.forecastController.signal });
          if (!res.ok) throw new Error(`Weather service error (${res.status})`);
          return res.json();
        },

        /**
         * Reverse-coordinate lookup fallback using BigDataCloud free client reverse geocoder
         * (no API key required) with graceful coordinate fallback.
         */
        async reverseLookup(lat, lon) {
          try {
            const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`;
            const res = await fetch(url);
            if (!res.ok) throw new Error('Reverse geocode unavailable');
            const data = await res.json();
            const city = data.city || data.locality || data.principalSubdivision || 'Current Location';
            return {
              id: `geo-${lat.toFixed(3)}-${lon.toFixed(3)}`,
              name: city,
              admin1: data.principalSubdivision || '',
              country: data.countryName || '',
              latitude: lat,
              longitude: lon,
              timezone: 'auto'
            };
          } catch {
            return {
              id: `geo-${lat.toFixed(3)}-${lon.toFixed(3)}`,
              name: 'My Location',
              admin1: Formatters.coords(lat, lon),
              country: '',
              latitude: lat,
              longitude: lon,
              timezone: 'auto'
            };
          }
        }
      };

      /* --------------------------------------------------------------------------
         5. STATE MANAGEMENT & LOCALSTORAGE PERSISTENCE
         -------------------------------------------------------------------------- */
      const Store = {
        state: {
          unit: 'metric', // 'metric' (°C, km/h) | 'imperial' (°F, mph)
          currentCity: PRESET_CITIES[0],
          pinnedCities: [],
          weatherData: null,
          isLoading: false,
          error: null,
          searchResults: [],
          activeDropdownIndex: -1
        },

        init() {
          try {
            const savedUnit = localStorage.getItem(STORAGE_KEYS.UNIT);
            if (savedUnit === 'metric' || savedUnit === 'imperial') {
              this.state.unit = savedUnit;
            }
            const savedPinned = JSON.parse(localStorage.getItem(STORAGE_KEYS.PINNED) || '[]');
            if (Array.isArray(savedPinned)) {
              this.state.pinnedCities = savedPinned;
            }
            const savedLast = JSON.parse(localStorage.getItem(STORAGE_KEYS.LAST_CITY) || 'null');
            if (savedLast && typeof savedLast.latitude === 'number') {
              this.state.currentCity = savedLast;
            }
          } catch {
            // Ignore storage errors in restricted environments
          }
        },

        savePinned() {
          try {
            localStorage.setItem(STORAGE_KEYS.PINNED, JSON.stringify(this.state.pinnedCities));
          } catch { /* noop */ }
        },

        saveUnit() {
          try {
            localStorage.setItem(STORAGE_KEYS.UNIT, this.state.unit);
          } catch { /* noop */ }
        },

        saveLastCity() {
          try {
            localStorage.setItem(STORAGE_KEYS.LAST_CITY, JSON.stringify(this.state.currentCity));
          } catch { /* noop */ }
        },

        isCityPinned(city) {
          return this.state.pinnedCities.some(
            (c) => Math.abs(c.latitude - city.latitude) < 0.02 && Math.abs(c.longitude - city.longitude) < 0.02
          );
        },

        togglePinCity(city) {
          if (this.isCityPinned(city)) {
            this.state.pinnedCities = this.state.pinnedCities.filter(
              (c) => !(Math.abs(c.latitude - city.latitude) < 0.02 && Math.abs(c.longitude - city.longitude) < 0.02)
            );
          } else {
            this.state.pinnedCities.unshift({ ...city, isPreset: false });
          }
          this.savePinned();
        }
      };

      /* --------------------------------------------------------------------------
         6. DOM RENDERER & CONTROLLERS
         -------------------------------------------------------------------------- */
      const UI = {
        els: {
          searchWrapper: document.getElementById('searchWrapper'),
          searchInput: document.getElementById('citySearchInput'),
          clearSearchBtn: document.getElementById('clearSearchBtn'),
          searchDropdown: document.getElementById('searchDropdown'),
          geoBtn: document.getElementById('geoBtn'),
          unitMetricBtn: document.getElementById('unitMetricBtn'),
          unitImperialBtn: document.getElementById('unitImperialBtn'),
          locationsBar: document.getElementById('locationsBar'),
          errorBanner: document.getElementById('errorBanner'),
          errorMessage: document.getElementById('errorMessage'),
          retryBtn: document.getElementById('retryBtn'),
          currentCard: document.getElementById('currentCard'),
          cityName: document.getElementById('cityName'),
          cityRegion: document.getElementById('cityRegion'),
          localDateTime: document.getElementById('localDateTime'),
          pinCityBtn: document.getElementById('pinCityBtn'),
          pinCityLabel: document.getElementById('pinCityLabel'),
          currentTemp: document.getElementById('currentTemp'),
          currentUnitLabel: document.getElementById('currentUnitLabel'),
          heroWeatherIcon: document.getElementById('heroWeatherIcon'),
          conditionLabel: document.getElementById('conditionLabel'),
          feelsLikeLabel: document.getElementById('feelsLikeLabel'),
          todayHigh: document.getElementById('todayHigh'),
          todayLow: document.getElementById('todayLow'),
          coordsDisplay: document.getElementById('coordsDisplay'),
          hourlyStrip: document.getElementById('hourlyStrip'),
          metricsGrid: document.getElementById('metricsGrid'),
          metricHumidity: document.getElementById('metricHumidity'),
          metricDewPoint: document.getElementById('metricDewPoint'),
          metricWind: document.getElementById('metricWind'),
          windArrow: document.getElementById('windArrow'),
          metricWindDir: document.getElementById('metricWindDir'),
          metricUv: document.getElementById('metricUv'),
          metricUvBadge: document.getElementById('metricUvBadge'),
          metricUvAdvice: document.getElementById('metricUvAdvice'),
          metricPressure: document.getElementById('metricPressure'),
          metricPressureDesc: document.getElementById('metricPressureDesc'),
          metricClouds: document.getElementById('metricClouds'),
          metricCloudDesc: document.getElementById('metricCloudDesc'),
          metricPrecipProb: document.getElementById('metricPrecipProb'),
          metricPrecipAmount: document.getElementById('metricPrecipAmount'),
          dailyList: document.getElementById('dailyList')
        },

        setLoading(loading) {
          Store.state.isLoading = loading;
          const targets = [
            this.els.currentCard,
            this.els.hourlyStrip,
            this.els.dailyList,
            ...this.els.metricsGrid.querySelectorAll('.metric-card')
          ];
          targets.forEach((el) => el.classList.toggle('skeleton', loading));
        },

        showError(msg) {
          this.els.errorMessage.textContent = msg;
          this.els.errorBanner.classList.add('visible');
        },

        hideError() {
          this.els.errorBanner.classList.remove('visible');
        },

        renderUnitButtons() {
          const isMetric = Store.state.unit === 'metric';
          this.els.unitMetricBtn.classList.toggle('active', isMetric);
          this.els.unitMetricBtn.setAttribute('aria-pressed', String(isMetric));
          this.els.unitImperialBtn.classList.toggle('active', !isMetric);
          this.els.unitImperialBtn.setAttribute('aria-pressed', String(!isMetric));
        },

        renderLocationsBar() {
          const { currentCity, pinnedCities } = Store.state;
          // Combine pinned cities (deduplicated against presets) + presets
          const combined = [...pinnedCities];
          PRESET_CITIES.forEach((preset) => {
            const exists = combined.some(
              (c) => Math.abs(c.latitude - preset.latitude) < 0.02 && Math.abs(c.longitude - preset.longitude) < 0.02
            );
            if (!exists) combined.push(preset);
          });

          this.els.locationsBar.innerHTML = '';
          combined.forEach((city) => {
            const isActive =
              Math.abs(city.latitude - currentCity.latitude) < 0.02 &&
              Math.abs(city.longitude - currentCity.longitude) < 0.02;
            const isPinned = Store.isCityPinned(city);

            const pill = document.createElement('button');
            pill.type = 'button';
            pill.className = `location-pill${isActive ? ' active' : ''}`;
            pill.innerHTML = `
              ${isPinned ? '<span style="color:#fbbf24" aria-hidden="true">★</span>' : ''}
              <span>${this.escapeHTML(city.name)}</span>
            `;

            if (isPinned) {
              const removeBtn = document.createElement('span');
              removeBtn.className = 'pill-remove';
              removeBtn.title = `Unpin ${city.name}`;
              removeBtn.setAttribute('role', 'button');
              removeBtn.setAttribute('aria-label', `Remove ${city.name} from pinned`);
              removeBtn.textContent = '×';
              removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                Store.togglePinCity(city);
                this.renderLocationsBar();
                this.updatePinButtonState();
              });
              pill.appendChild(removeBtn);
            }

            pill.addEventListener('click', () => App.selectCity(city));
            this.els.locationsBar.appendChild(pill);
          });
        },

        updatePinButtonState() {
          const pinned = Store.isCityPinned(Store.state.currentCity);
          this.els.pinCityBtn.classList.toggle('pinned', pinned);
          this.els.pinCityLabel.textContent = pinned ? 'Pinned' : 'Pin';
        },

        renderWeather() {
          const { weatherData, currentCity, unit } = Store.state;
          if (!weatherData) return;

          const { current, hourly, daily, timezone } = weatherData;
          const desc = WeatherMapper.describe(current.weather_code, current.is_day);

          // Update Ambient Theme on Body
          document.body.className = desc.theme;

          // Header & Current Conditions
          this.els.cityName.textContent = currentCity.name;
          const subParts = [currentCity.admin1, currentCity.country].filter(Boolean);
          this.els.cityRegion.textContent = subParts.join(', ') || Formatters.coords(currentCity.latitude, currentCity.longitude);
          this.els.localDateTime.textContent = Formatters.localDateTime(timezone);
          this.updatePinButtonState();

          const unitSym = unit === 'metric' ? '°C' : '°F';
          this.els.currentTemp.textContent = Formatters.temp(current.temperature_2m, unit);
          this.els.currentUnitLabel.textContent = unitSym;
          this.els.heroWeatherIcon.innerHTML = WeatherMapper.getIconSVG(desc.icon, 82);
          this.els.conditionLabel.textContent = desc.label;
          this.els.feelsLikeLabel.textContent = `Feels like ${Formatters.temp(current.apparent_temperature, unit)}${unitSym}`;

          this.els.todayHigh.textContent = `${Formatters.temp(daily.temperature_2m_max[0], unit)}°`;
          this.els.todayLow.textContent = `${Formatters.temp(daily.temperature_2m_min[0], unit)}°`;
          this.els.coordsDisplay.textContent = Formatters.coords(currentCity.latitude, currentCity.longitude);

          // Find current hour index in hourly array
          const currentHourPrefix = current.time.slice(0, 13); // "YYYY-MM-DDTHH"
          let startIdx = hourly.time.findIndex((t) => t.startsWith(currentHourPrefix));
          if (startIdx < 0) startIdx = 0;

          // Atmospheric Metrics Grid
          this.els.metricHumidity.textContent = `${Math.round(current.relative_humidity_2m)}%`;
          this.els.metricDewPoint.textContent = `Dew point ${Formatters.temp(current.dew_point_2m, unit)}${unitSym}`;

          this.els.metricWind.textContent = Formatters.speed(current.wind_speed_10m, unit);
          this.els.windArrow.style.transform = `rotate(${current.wind_direction_10m}deg)`;
          this.els.metricWindDir.textContent = `${Formatters.cardinalDirection(current.wind_direction_10m)} (${Math.round(current.wind_direction_10m)}°)`;

          const currentUv = hourly.uv_index ? hourly.uv_index[startIdx] : daily.uv_index_max[0];
          const uvInfo = Formatters.uvMeta(currentUv);
          this.els.metricUv.textContent = currentUv != null ? currentUv.toFixed(1) : '--';
          this.els.metricUvBadge.textContent = uvInfo.label;
          this.els.metricUvBadge.className = `uv-badge ${uvInfo.cls}`;
          this.els.metricUvAdvice.textContent = uvInfo.advice;

          this.els.metricPressure.textContent = `${Math.round(current.surface_pressure)} hPa`;
          this.els.metricPressureDesc.textContent = current.surface_pressure >= 1013 ? 'High / Stable' : 'Low / Unsettled';

          this.els.metricClouds.textContent = `${Math.round(current.cloud_cover)}%`;
          this.els.metricCloudDesc.textContent =
            current.cloud_cover < 20 ? 'Mostly clear sky' : current.cloud_cover < 65 ? 'Scattered clouds' : 'Dense cloud deck';

          const precipProbNow = hourly.precipitation_probability ? hourly.precipitation_probability[startIdx] : 0;
          this.els.metricPrecipProb.textContent = `${precipProbNow ?? 0}%`;
          this.els.metricPrecipAmount.textContent = `Current: ${Formatters.precip(current.precipitation, unit)}`;

          // Render 24-Hour Strip
          this.renderHourly(hourly, startIdx, unit);

          // Render 7-Day Forecast
          this.renderDaily(daily, unit);
        },

        renderHourly(hourly, startIdx, unit) {
          const sliceEnd = Math.min(startIdx + 24, hourly.time.length);
          let html = '';

          for (let i = startIdx; i < sliceEnd; i++) {
            const isNow = i === startIdx;
            const timeText = isNow ? 'Now' : Formatters.hourLabel(hourly.time[i]);
            const info = WeatherMapper.describe(hourly.weather_code[i], hourly.is_day[i]);
            const tempVal = Formatters.temp(hourly.temperature_2m[i], unit);
            const rainChance = hourly.precipitation_probability[i] || 0;

            html += `
              <div class="hour-item${isNow ? ' now' : ''}">
                <span class="hour-time">${timeText}</span>
                <div class="hour-icon" aria-hidden="true">${WeatherMapper.getIconSVG(info.icon, 32)}</div>
                <span class="hour-temp">${tempVal}°</span>
                <span class="hour-rain">${rainChance >= 15 ? `${rainChance}%` : ''}</span>
              </div>
            `;
          }

          this.els.hourlyStrip.innerHTML = html;
        },

        renderDaily(daily, unit) {
          const weekMin = Math.min(...daily.temperature_2m_min);
          const weekMax = Math.max(...daily.temperature_2m_max);
          const totalSpan = Math.max(weekMax - weekMin, 1);

          let html = '';
          for (let i = 0; i < daily.time.length; i++) {
            const dayLabel = Formatters.dayName(daily.time[i], i);
            const info = WeatherMapper.describe(daily.weather_code[i], 1);
            const precip = daily.precipitation_probability_max[i] || 0;
            const rawMin = daily.temperature_2m_min[i];
            const rawMax = daily.temperature_2m_max[i];

            const leftPct = ((rawMin - weekMin) / totalSpan) * 100;
            const widthPct = Math.max(((rawMax - rawMin) / totalSpan) * 100, 6);

            html += `
              <div class="daily-row">
                <span class="daily-day${i === 0 ? ' today' : ''}">${dayLabel}</span>
                <div class="daily-icon" title="${info.label}">${WeatherMapper.getIconSVG(info.icon, 28)}</div>
                <span class="daily-precip">${precip >= 15 ? `${precip}%` : ''}</span>
                <div class="temp-range-wrap">
                  <span class="range-min">${Formatters.temp(rawMin, unit)}°</span>
                  <div class="range-track" aria-hidden="true">
                    <div class="range-fill" style="left:${leftPct.toFixed(1)}%;width:${widthPct.toFixed(1)}%"></div>
                  </div>
                  <span class="range-max">${Formatters.temp(rawMax, unit)}°</span>
                </div>
              </div>
            `;
          }

          this.els.dailyList.innerHTML = html;
        },

        renderDropdown(results, message = '') {
          const dropdown = this.els.searchDropdown;
          Store.state.searchResults = results;
          Store.state.activeDropdownIndex = -1;

          if (message) {
            dropdown.innerHTML = `<div class="dropdown-status">${this.escapeHTML(message)}</div>`;
            dropdown.classList.add('open');
            this.els.searchInput.setAttribute('aria-expanded', 'true');
            return;
          }

          if (!results.length) {
            dropdown.classList.remove('open');
            this.els.searchInput.setAttribute('aria-expanded', 'false');
            return;
          }

          dropdown.innerHTML = results
            .map((city, idx) => {
              const region = [city.admin1, city.country].filter(Boolean).join(', ');
              return `
                <button type="button" class="dropdown-item" role="option" data-index="${idx}">
                  <div>
                    <div class="dropdown-city">${this.escapeHTML(city.name)}</div>
                    <div class="dropdown-meta">${this.escapeHTML(region)}</div>
                  </div>
                  <span class="dropdown-coords">${Formatters.coords(city.latitude, city.longitude)}</span>
                </button>
              `;
            })
            .join('');

          dropdown.querySelectorAll('.dropdown-item').forEach((btn) => {
            btn.addEventListener('click', () => {
              const idx = Number(btn.dataset.index);
              if (Store.state.searchResults[idx]) {
                App.selectCity(Store.state.searchResults[idx]);
                this.closeDropdown();
              }
            });
          });

          dropdown.classList.add('open');
          this.els.searchInput.setAttribute('aria-expanded', 'true');
        },

        highlightDropdownItem(index) {
          const items = this.els.searchDropdown.querySelectorAll('.dropdown-item');
          if (!items.length) return;
          const clamped = ((index % items.length) + items.length) % items.length;
          Store.state.activeDropdownIndex = clamped;
          items.forEach((el, i) => el.classList.toggle('active', i === clamped));
        },

        closeDropdown() {
          this.els.searchDropdown.classList.remove('open');
          this.els.searchInput.setAttribute('aria-expanded', 'false');
          Store.state.activeDropdownIndex = -1;
        },

        escapeHTML(str) {
          return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
        }
      };

      /* --------------------------------------------------------------------------
         7. MAIN APPLICATION CONTROLLER
         -------------------------------------------------------------------------- */
      const App = {
        debounceTimer: null,

        init() {
          Store.init();
          UI.renderUnitButtons();
          UI.renderLocationsBar();
          this.bindEvents();
          this.selectCity(Store.state.currentCity);
        },

        async selectCity(city) {
          Store.state.currentCity = city;
          Store.saveLastCity();
          UI.renderLocationsBar();
          UI.hideError();
          UI.setLoading(true);

          try {
            const data = await WeatherAPI.fetchForecast(city.latitude, city.longitude);
            Store.state.weatherData = data;
            UI.setLoading(false);
            UI.renderWeather();
          } catch (err) {
            if (err.name === 'AbortError') return;
            UI.setLoading(false);
            UI.showError(`Could not load weather for ${city.name}. ${err.message || ''}`);
          }
        },

        handleGeolocation() {
          if (!('geolocation' in navigator)) {
            UI.showError('Geolocation is not supported by your browser.');
            return;
          }

          const btn = UI.els.geoBtn;
          btn.disabled = true;
          const labelSpan = btn.querySelector('span');
          const origText = labelSpan.textContent;
          labelSpan.textContent = 'Locating...';

          navigator.geolocation.getCurrentPosition(
            async (pos) => {
              const { latitude, longitude } = pos.coords;
              const resolvedCity = await WeatherAPI.reverseLookup(latitude, longitude);
              btn.disabled = false;
              labelSpan.textContent = origText;
              this.selectCity(resolvedCity);
            },
            (err) => {
              btn.disabled = false;
              labelSpan.textContent = origText;
              const msg =
                err.code === 1
                  ? 'Location permission denied. Please search for a city manually.'
                  : 'Unable to determine your current location.';
              UI.showError(msg);
            },
            { timeout: 10000, maximumAge: 300000 }
          );
        },

        bindEvents() {
          // Debounced Autocomplete Input
          UI.els.searchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            UI.els.clearSearchBtn.classList.toggle('visible', query.length > 0);
            clearTimeout(this.debounceTimer);

            if (query.length < 2) {
              UI.closeDropdown();
              return;
            }

            this.debounceTimer = setTimeout(async () => {
              UI.renderDropdown([], 'Searching cities...');
              try {
                const results = await WeatherAPI.searchCities(query);
                if (!results.length) {
                  UI.renderDropdown([], `No locations found for "${query}"`);
                } else {
                  UI.renderDropdown(results);
                }
              } catch (err) {
                if (err.name !== 'AbortError') {
                  UI.renderDropdown([], 'Search unavailable. Try again.');
                }
              }
            }, 280);
          });

          // Keyboard Navigation in Search Dropdown
          UI.els.searchInput.addEventListener('keydown', (e) => {
            const { searchResults, activeDropdownIndex } = Store.state;
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              UI.highlightDropdownItem(activeDropdownIndex + 1);
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              UI.highlightDropdownItem(activeDropdownIndex - 1);
            } else if (e.key === 'Enter') {
              if (activeDropdownIndex >= 0 && searchResults[activeDropdownIndex]) {
                e.preventDefault();
                this.selectCity(searchResults[activeDropdownIndex]);
                UI.closeDropdown();
              } else if (searchResults.length > 0) {
                e.preventDefault();
                this.selectCity(searchResults[0]);
                UI.closeDropdown();
              }
            } else if (e.key === 'Escape') {
              UI.closeDropdown();
            }
          });

          // Clear Search Button
          UI.els.clearSearchBtn.addEventListener('click', () => {
            UI.els.searchInput.value = '';
            UI.els.clearSearchBtn.classList.remove('visible');
            UI.closeDropdown();
            UI.els.searchInput.focus();
          });

          // Close Dropdown on Outside Click
          document.addEventListener('click', (e) => {
            if (!UI.els.searchWrapper.contains(e.target)) {
              UI.closeDropdown();
            }
          });

          // Geolocation Button
          UI.els.geoBtn.addEventListener('click', () => this.handleGeolocation());

          // Unit Toggle Buttons (Zero redundant API calls)
          UI.els.unitMetricBtn.addEventListener('click', () => {
            if (Store.state.unit === 'metric') return;
            Store.state.unit = 'metric';
            Store.saveUnit();
            UI.renderUnitButtons();
            UI.renderWeather();
          });

          UI.els.unitImperialBtn.addEventListener('click', () => {
            if (Store.state.unit === 'imperial') return;
            Store.state.unit = 'imperial';
            Store.saveUnit();
            UI.renderUnitButtons();
            UI.renderWeather();
          });

          // Pin / Unpin Current City
          UI.els.pinCityBtn.addEventListener('click', () => {
            Store.togglePinCity(Store.state.currentCity);
            UI.updatePinButtonState();
            UI.renderLocationsBar();
          });

          // Retry Button on Error Banner
          UI.els.retryBtn.addEventListener('click', () => {
            this.selectCity(Store.state.currentCity);
          });
        }
      };

      // Boot application on DOM ready
      window.addEventListener('DOMContentLoaded', () => App.init());
    })();