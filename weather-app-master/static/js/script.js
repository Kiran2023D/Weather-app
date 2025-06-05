// Global variables
let currentUnit = "metric"
let currentTheme = "dark"
let currentWeatherData = null
let currentLocation = null
let forecastData = null
const weatherMap = null
const fullWeatherMap = null
const savedCities = JSON.parse(localStorage.getItem("savedCities")) || []

// Import Leaflet library
const L = window.L

// API Configuration - Using a demo API key for testing
const API_CONFIG = {
  key: localStorage.getItem("weatherApiKey") || "c10514c2e81055d38b1d13f4a12492f5", // Demo key
  baseUrl: "https://api.openweathermap.org/data/2.5",
  mapUrl: "https://tile.openweathermap.org/map",
}

// Initialize app when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  initializeApp()
})

function initializeApp() {
  console.log("Initializing SkyView Weather App...")

  // Initialize all components
  initializeTheme()
  initializeUnits()
  initializeSidebar()
  initializeSearch()
  initializeLocation()
  initializeRefresh()
  initializeModals()
  initializeSettings()

  // Update date and time
  updateDateTime()
  setInterval(updateDateTime, 60000)

  // Load saved cities
  loadSavedCities()

  // Auto-load weather data on first visit
  initializeDefaultWeather()

  // Show welcome message
  showToast("Welcome to SkyView Weather", "Loading default weather data...", "success")
}

// Add new function to initialize default weather
function initializeDefaultWeather() {
  // Check if user has a saved location preference
  const savedLocation = localStorage.getItem("defaultLocation")

  if (savedLocation) {
    const location = JSON.parse(savedLocation)
    fetchWeatherData(location.name, location.lat, location.lon)
  } else {
    // Try to get user's current location first
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude
          const lon = position.coords.longitude
          try {
            await fetchWeatherByCoords(lat, lon)
            // Save as default location
            localStorage.setItem(
              "defaultLocation",
              JSON.stringify({
                name: currentLocation.name,
                lat: lat,
                lon: lon,
              }),
            )
          } catch (error) {
            // Fallback to default city
            loadDefaultCity()
          }
        },
        (error) => {
          // Geolocation failed, load default city
          loadDefaultCity()
        },
        { timeout: 5000 },
      )
    } else {
      // Geolocation not supported, load default city
      loadDefaultCity()
    }
  }
}

// Add function to load default city
function loadDefaultCity() {
  // Load London as default city
  searchCity("London")
}

// Theme Management
function initializeTheme() {
  const themeToggleBtn = document.getElementById("theme-toggle-btn")
  const body = document.body

  // Check for saved theme preference
  const savedTheme = localStorage.getItem("theme")
  if (savedTheme === "light") {
    body.classList.add("light-mode")
    themeToggleBtn.innerHTML = '<i class="fas fa-sun"></i>'
    currentTheme = "light"
  } else {
    themeToggleBtn.innerHTML = '<i class="fas fa-moon"></i>'
    currentTheme = "dark"
  }

  themeToggleBtn.addEventListener("click", toggleTheme)

  // Settings theme buttons
  const themeButtons = document.querySelectorAll(".theme-btn")
  themeButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const theme = btn.dataset.theme
      setTheme(theme)
    })
  })

  updateThemeButtons()
}

function toggleTheme() {
  const body = document.body
  const themeToggleBtn = document.getElementById("theme-toggle-btn")

  body.classList.toggle("light-mode")

  if (body.classList.contains("light-mode")) {
    themeToggleBtn.innerHTML = '<i class="fas fa-sun"></i>'
    localStorage.setItem("theme", "light")
    currentTheme = "light"
  } else {
    themeToggleBtn.innerHTML = '<i class="fas fa-moon"></i>'
    localStorage.setItem("theme", "dark")
    currentTheme = "dark"
  }

  updateThemeButtons()
  showToast("Theme Updated", "Theme changed successfully", "success")
}

function setTheme(theme) {
  const body = document.body
  const themeToggleBtn = document.getElementById("theme-toggle-btn")

  if (theme === "light") {
    body.classList.add("light-mode")
    themeToggleBtn.innerHTML = '<i class="fas fa-sun"></i>'
  } else {
    body.classList.remove("light-mode")
    themeToggleBtn.innerHTML = '<i class="fas fa-moon"></i>'
  }

  localStorage.setItem("theme", theme)
  currentTheme = theme
  updateThemeButtons()
  showToast("Theme Updated", "Theme changed successfully", "success")
}

function updateThemeButtons() {
  const themeButtons = document.querySelectorAll(".theme-btn")
  themeButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.theme === currentTheme)
  })
}

// Units Management - Enhanced for instant conversion
function initializeUnits() {
  const unitButtons = document.querySelectorAll(".unit-btn")

  // Check for saved unit preference
  const savedUnit = localStorage.getItem("unit")
  if (savedUnit) {
    currentUnit = savedUnit
  }

  updateUnitButtons()

  unitButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const unit = btn.dataset.unit
      setUnit(unit)
    })
  })
}

function setUnit(unit) {
  const oldUnit = currentUnit
  currentUnit = unit
  localStorage.setItem("unit", unit)
  updateUnitButtons()

  // Convert existing temperatures instantly without API call
  if (currentWeatherData && oldUnit !== unit) {
    convertDisplayedTemperatures(oldUnit, unit)
  }

  // Update saved cities temperatures
  updateSavedCitiesUnits(unit)

  showToast("Units Updated", `Temperature unit changed to ${unit === "metric" ? "Celsius" : "Fahrenheit"}`, "success")
}

function convertDisplayedTemperatures(fromUnit, toUnit) {
  // Convert main temperature
  const mainTempElement = document.getElementById("main-temp")
  if (mainTempElement && currentWeatherData) {
    const currentTemp = currentWeatherData.main.temp
    const convertedTemp = convertTemperature(currentTemp, "metric", toUnit)
    mainTempElement.innerHTML = `${Math.round(convertedTemp)}<span class="temp-unit">${toUnit === "metric" ? "°C" : "°F"}</span>`
  }

  // Convert feels like temperature
  const feelsLikeElement = document.getElementById("feels-like")
  if (feelsLikeElement && currentWeatherData) {
    const feelsLike = currentWeatherData.main.feels_like
    const convertedFeelsLike = convertTemperature(feelsLike, "metric", toUnit)
    feelsLikeElement.textContent = Math.round(convertedFeelsLike)
  }

  // Convert hourly forecast temperatures
  const hourlyItems = document.querySelectorAll(".hourly-temp")
  hourlyItems.forEach((item, index) => {
    if (forecastData && forecastData.list[index]) {
      const temp = forecastData.list[index].main.temp
      const convertedTemp = convertTemperature(temp, "metric", toUnit)
      item.textContent = `${Math.round(convertedTemp)}°`
    }
  })

  // Convert daily forecast temperatures
  const dailyMaxTemps = document.querySelectorAll(".daily-temp-max")
  const dailyMinTemps = document.querySelectorAll(".daily-temp-min")

  if (forecastData) {
    const dailyData = groupByDay(forecastData.list)
    const days = Object.keys(dailyData).slice(1, 6)

    days.forEach((day, index) => {
      const dayData = dailyData[day]
      let minTemp = Number.POSITIVE_INFINITY
      let maxTemp = Number.NEGATIVE_INFINITY

      dayData.forEach((item) => {
        if (item.main.temp_min < minTemp) minTemp = item.main.temp_min
        if (item.main.temp_max > maxTemp) maxTemp = item.main.temp_max
      })

      if (dailyMaxTemps[index]) {
        const convertedMax = convertTemperature(maxTemp, "metric", toUnit)
        dailyMaxTemps[index].textContent = `${Math.round(convertedMax)}°`
      }

      if (dailyMinTemps[index]) {
        const convertedMin = convertTemperature(minTemp, "metric", toUnit)
        dailyMinTemps[index].textContent = `${Math.round(convertedMin)}°`
      }
    })
  }

  // Update temperature unit labels
  updateTemperatureDisplay()

  // Update all temperature unit displays
  const tempUnits = document.querySelectorAll(".temp-unit")
  tempUnits.forEach((unit) => {
    unit.textContent = toUnit === "metric" ? "°C" : "°F"
  })

  // Update feels like unit
  const feelsLikeUnitElements = document.querySelectorAll(".feels-like .temp-unit")
  feelsLikeUnitElements.forEach((unit) => {
    unit.textContent = toUnit === "metric" ? "°C" : "°F"
  })
}

function convertTemperature(temp, fromUnit, toUnit) {
  if (fromUnit === toUnit) return temp

  if (fromUnit === "metric" && toUnit === "imperial") {
    return (temp * 9) / 5 + 32
  } else if (fromUnit === "imperial" && toUnit === "metric") {
    return ((temp - 32) * 5) / 9
  }

  return temp
}

function updateSavedCitiesUnits(unit) {
  // Update saved cities display if currently viewing cities
  const citiesView = document.getElementById("cities-view")
  if (citiesView && citiesView.style.display !== "none") {
    loadSavedCities()
  }
}

function updateUnitButtons() {
  const unitButtons = document.querySelectorAll(".unit-btn")
  unitButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.unit === currentUnit)
  })
}

function updateTemperatureDisplay() {
  const tempElements = document.querySelectorAll(".temp-unit")
  tempElements.forEach((el) => {
    el.textContent = currentUnit === "metric" ? "°C" : "°F"
  })
}

// Sidebar Management
function initializeSidebar() {
  const menuToggle = document.getElementById("menu-toggle")
  const sidebar = document.getElementById("sidebar")
  const navLinks = document.querySelectorAll(".nav-menu a")

  menuToggle.addEventListener("click", () => {
    sidebar.classList.toggle("open")
  })

  // Close sidebar when clicking outside on mobile
  document.addEventListener("click", (e) => {
    if (window.innerWidth <= 768 && !sidebar.contains(e.target) && !menuToggle.contains(e.target)) {
      sidebar.classList.remove("open")
    }
  })

  // Navigation
  navLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault()
      const view = link.getAttribute("data-view")
      handleNavigation(view)

      // Update active state
      document.querySelectorAll(".nav-menu li").forEach((li) => li.classList.remove("active"))
      link.parentElement.classList.add("active")

      // Close sidebar on mobile
      if (window.innerWidth <= 768) {
        sidebar.classList.remove("open")
      }
    })
  })
}

function handleNavigation(view) {
  const views = document.querySelectorAll(".view-container, .dashboard")
  views.forEach((v) => (v.style.display = "none"))

  switch (view) {
    case "map":
      document.getElementById("map-view").style.display = "block"
      // Delay map initialization to ensure container is visible
      setTimeout(() => {
        initializeFullWeatherMap()
      }, 100)
      break
    case "cities":
      document.getElementById("cities-view").style.display = "block"
      loadSavedCities()
      break
    case "alerts":
      document.getElementById("alerts-view").style.display = "block"
      loadWeatherAlerts()
      break
    case "settings":
      document.getElementById("settings-view").style.display = "block"
      loadSettings()
      break
    default:
      document.getElementById("dashboard-view").style.display = "block"
      break
  }
}

// Search Management
function initializeSearch() {
  const searchBtn = document.getElementById("search-btn")
  const cityInput = document.getElementById("city-input")
  const searchSuggestions = document.getElementById("search-suggestions")

  searchBtn.addEventListener("click", () => {
    const city = cityInput.value.trim()
    if (city) {
      searchCity(city)
    }
  })

  cityInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      const city = cityInput.value.trim()
      if (city) {
        searchCity(city)
      }
    }
  })

  let searchTimeout
  cityInput.addEventListener("input", (e) => {
    clearTimeout(searchTimeout)
    const query = e.target.value.trim()

    if (query.length > 2) {
      searchTimeout = setTimeout(() => {
        fetchCitySuggestions(query)
      }, 300)
    } else {
      searchSuggestions.style.display = "none"
    }
  })

  document.addEventListener("click", (e) => {
    if (!searchSuggestions.contains(e.target) && !cityInput.contains(e.target)) {
      searchSuggestions.style.display = "none"
    }
  })
}

async function fetchCitySuggestions(query) {
  try {
    const response = await fetch(
      `${API_CONFIG.baseUrl}/find?q=${encodeURIComponent(query)}&limit=5&appid=${API_CONFIG.key}`,
    )

    if (response.ok) {
      const data = await response.json()
      displayCitySuggestions(data.list || [])
    }
  } catch (error) {
    console.error("Error fetching city suggestions:", error)
  }
}

function displayCitySuggestions(cities) {
  const searchSuggestions = document.getElementById("search-suggestions")

  if (cities.length === 0) {
    searchSuggestions.style.display = "none"
    return
  }

  searchSuggestions.innerHTML = ""

  cities.forEach((city) => {
    const suggestionItem = document.createElement("div")
    suggestionItem.className = "suggestion-item"
    suggestionItem.textContent = `${city.name}, ${city.sys.country}`

    suggestionItem.addEventListener("click", () => {
      document.getElementById("city-input").value = city.name
      searchSuggestions.style.display = "none"
      fetchWeatherData(city.name, city.coord.lat, city.coord.lon)
    })

    searchSuggestions.appendChild(suggestionItem)
  })

  searchSuggestions.style.display = "block"
}

async function searchCity(cityName) {
  showLoadingOverlay("Searching for city...")

  try {
    const response = await fetch(
      `${API_CONFIG.baseUrl}/weather?q=${encodeURIComponent(cityName)}&units=metric&appid=${API_CONFIG.key}`,
    )

    if (!response.ok) {
      throw new Error("City not found")
    }

    const data = await response.json()
    currentLocation = {
      name: data.name,
      country: data.sys.country,
      lat: data.coord.lat,
      lon: data.coord.lon,
    }

    await fetchWeatherData(data.name, data.coord.lat, data.coord.lon)
    document.getElementById("search-suggestions").style.display = "none"
  } catch (error) {
    hideLoadingOverlay()
    showToast("Search Error", "City not found. Please try again.", "error")
  }
}

// Location Management
function initializeLocation() {
  const currentLocationBtn = document.getElementById("current-location-btn")

  if (currentLocationBtn) {
    currentLocationBtn.addEventListener("click", () => {
      if (navigator.geolocation) {
        showLoadingOverlay("Getting your location...")
        currentLocationBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'

        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const lat = position.coords.latitude
            const lon = position.coords.longitude

            try {
              await fetchWeatherByCoords(lat, lon)
            } catch (error) {
              showToast("Location Error", "Unable to get weather for your location", "error")
            } finally {
              currentLocationBtn.innerHTML = '<i class="fas fa-map-marker-alt"></i>'
              hideLoadingOverlay()
            }
          },
          (error) => {
            hideLoadingOverlay()
            currentLocationBtn.innerHTML = '<i class="fas fa-map-marker-alt"></i>'
            showToast("Location Error", "Unable to get your location: " + error.message, "error")
          },
        )
      } else {
        showToast("Location Error", "Geolocation is not supported by this browser", "error")
      }
    })
  }
}

async function fetchWeatherByCoords(lat, lon) {
  try {
    const response = await fetch(
      `${API_CONFIG.baseUrl}/weather?lat=${lat}&lon=${lon}&units=metric&appid=${API_CONFIG.key}`,
    )

    if (!response.ok) {
      throw new Error("Unable to fetch weather data")
    }

    const data = await response.json()
    currentLocation = {
      name: data.name,
      country: data.sys.country,
      lat: data.coord.lat,
      lon: data.coord.lon,
    }

    await fetchWeatherData(data.name, lat, lon)
  } catch (error) {
    console.error("Error fetching weather by coordinates:", error)
    throw error
  }
}

// Weather Data Fetching
async function fetchWeatherData(cityName, lat, lon) {
  showLoadingOverlay("Loading weather data...")

  try {
    // Always fetch in metric and convert display as needed
    const currentWeatherResponse = await fetch(
      `${API_CONFIG.baseUrl}/weather?lat=${lat}&lon=${lon}&units=metric&appid=${API_CONFIG.key}`,
    )

    if (!currentWeatherResponse.ok) {
      throw new Error("Unable to fetch weather data")
    }

    const currentWeather = await currentWeatherResponse.json()
    currentWeatherData = currentWeather

    // Display current weather
    displayCurrentWeather(currentWeather)

    // Fetch additional data
    await Promise.all([fetchForecastData(lat, lon), fetchAirQualityData(lat, lon)])

    // Always show weather content (remove welcome screen check)
    document.getElementById("welcome-screen").style.display = "none"
    document.getElementById("weather-content").style.display = "grid"

    // Initialize weather map
    initializeMiniWeatherMap(lat, lon)

    hideLoadingOverlay()
    showToast("Weather Updated", `Weather data loaded for ${cityName}`, "success")
  } catch (error) {
    hideLoadingOverlay()
    console.error("Error fetching weather data:", error)
    showToast("Weather Error", "Unable to fetch weather data. Please try again.", "error")
  }
}

function displayCurrentWeather(data) {
  // Update basic info
  document.getElementById("city-name").textContent = `${data.name}, ${data.sys.country}`
  document.getElementById("weather-tag").textContent = data.weather[0].main
  document.getElementById("weather-description").textContent = data.weather[0].description

  // Convert and display temperature based on current unit
  const displayTemp =
    currentUnit === "metric" ? data.main.temp : convertTemperature(data.main.temp, "metric", "imperial")
  const displayFeelsLike =
    currentUnit === "metric" ? data.main.feels_like : convertTemperature(data.main.feels_like, "metric", "imperial")

  document.getElementById("main-temp").innerHTML = `${Math.round(displayTemp)}<span class="temp-unit">${
    currentUnit === "metric" ? "°C" : "°F"
  }</span>`
  document.getElementById("feels-like").textContent = Math.round(displayFeelsLike)

  // Update weather icon
  const weatherIcon = document.getElementById("weather-icon")
  weatherIcon.src = `https://openweathermap.org/img/wn/${data.weather[0].icon}@4x.png`
  weatherIcon.alt = data.weather[0].description

  // Update highlights
  document.getElementById("wind-speed").innerHTML = `${data.wind.speed} <span class="unit">${
    currentUnit === "metric" ? "m/s" : "mph"
  }</span>`
  document.getElementById("humidity").innerHTML = `${data.main.humidity}<span class="unit">%</span>`
  document.getElementById("visibility").innerHTML =
    `${(data.visibility / 1000).toFixed(1)} <span class="unit">km</span>`
  document.getElementById("pressure").innerHTML = `${data.main.pressure} <span class="unit">hPa</span>`

  // Update wind direction
  const windDirection = document.getElementById("wind-direction")
  if (data.wind.deg !== undefined) {
    windDirection.style.transform = `rotate(${data.wind.deg}deg)`
  }

  // Update humidity progress
  const humidityProgress = document.getElementById("humidity-progress")
  humidityProgress.style.width = `${data.main.humidity}%`

  // Update sunrise/sunset
  updateSunTimes(data.sys.sunrise, data.sys.sunset, data.timezone)

  // Update temperature units
  updateTemperatureDisplay()
}

function updateSunTimes(sunrise, sunset, timezone) {
  const sunriseTime = new Date(sunrise * 1000)
  const sunsetTime = new Date(sunset * 1000)

  document.getElementById("sunrise-time").textContent = sunriseTime.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })

  document.getElementById("sunset-time").textContent = sunsetTime.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })

  // Update sun position
  updateSunPosition(sunrise, sunset)
}

function updateSunPosition(sunrise, sunset) {
  const now = Date.now() / 1000
  const sunIndicator = document.getElementById("sun-indicator")
  let position = 0

  if (now >= sunrise && now <= sunset) {
    const dayLength = sunset - sunrise
    const timeSinceSunrise = now - sunrise
    position = (timeSinceSunrise / dayLength) * 100
  } else if (now < sunrise) {
    position = 0
  } else {
    position = 100
  }

  sunIndicator.style.left = `${Math.min(Math.max(position, 0), 100)}%`
}

// Forecast Data
async function fetchForecastData(lat, lon) {
  try {
    // Always fetch in metric for consistency
    const response = await fetch(
      `${API_CONFIG.baseUrl}/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${API_CONFIG.key}`,
    )

    if (!response.ok) {
      throw new Error("Unable to fetch forecast data")
    }

    const data = await response.json()
    forecastData = data // Store for unit conversion
    displayHourlyForecast(data)
    displayDailyForecast(data)
  } catch (error) {
    console.error("Error fetching forecast data:", error)
    document.getElementById("hourly-forecast").innerHTML = "<p>Unable to load hourly forecast</p>"
    document.getElementById("daily-forecast").innerHTML = "<p>Unable to load daily forecast</p>"
  }
}

function displayHourlyForecast(data) {
  const hourlyForecastElement = document.getElementById("hourly-forecast")
  hourlyForecastElement.innerHTML = ""

  const hourlyData = data.list.slice(0, 8)

  hourlyData.forEach((item) => {
    const date = new Date(item.dt * 1000)
    const hour = date.getHours()
    const formattedHour = hour % 12 === 0 ? "12" : hour % 12
    const ampm = hour >= 12 ? "PM" : "AM"

    // Convert temperature based on current unit
    const displayTemp =
      currentUnit === "metric" ? item.main.temp : convertTemperature(item.main.temp, "metric", "imperial")

    const hourlyItem = document.createElement("div")
    hourlyItem.className = "hourly-item"

    hourlyItem.innerHTML = `
            <div class="hourly-time">${formattedHour} ${ampm}</div>
            <div class="hourly-icon">
                <img src="https://openweathermap.org/img/wn/${item.weather[0].icon}.png" alt="${item.weather[0].description}">
            </div>
            <div class="hourly-temp">${Math.round(displayTemp)}°</div>
            <div class="hourly-details">
                <span><i class="fas fa-tint"></i> ${item.main.humidity}%</span>
                <span><i class="fas fa-wind"></i> ${item.wind.speed}${currentUnit === "metric" ? "m/s" : "mph"}</span>
            </div>
        `

    hourlyForecastElement.appendChild(hourlyItem)
  })
}

// Enhanced Daily Forecast with clickable details
function displayDailyForecast(data) {
  const dailyForecastElement = document.getElementById("daily-forecast")
  dailyForecastElement.innerHTML = ""

  const dailyData = groupByDay(data.list)
  const days = Object.keys(dailyData).slice(1, 6)

  days.forEach((day, index) => {
    const dayData = dailyData[day]
    const date = new Date(dayData[0].dt * 1000)
    const dayName = date.toLocaleDateString(undefined, { weekday: "long" })
    const dayShort = date.toLocaleDateString(undefined, { weekday: "short" })

    let minTemp = Number.POSITIVE_INFINITY
    let maxTemp = Number.NEGATIVE_INFINITY
    const mostFrequentIcon = getMostFrequentIcon(dayData)
    let avgHumidity = 0
    let avgWind = 0
    let maxPop = 0

    dayData.forEach((item) => {
      if (item.main.temp_min < minTemp) minTemp = item.main.temp_min
      if (item.main.temp_max > maxTemp) maxTemp = item.main.temp_max
      avgHumidity += item.main.humidity
      avgWind += item.wind.speed
      if (item.pop > maxPop) maxPop = item.pop
    })

    avgHumidity = Math.round(avgHumidity / dayData.length)
    avgWind = Math.round(avgWind / dayData.length)
    maxPop = Math.round(maxPop * 100)

    // Convert temperatures based on current unit
    const displayMaxTemp = currentUnit === "metric" ? maxTemp : convertTemperature(maxTemp, "metric", "imperial")
    const displayMinTemp = currentUnit === "metric" ? minTemp : convertTemperature(minTemp, "metric", "imperial")

    const dailyItem = document.createElement("div")
    dailyItem.className = "daily-item"
    dailyItem.style.cursor = "pointer"
    dailyItem.setAttribute("data-day-index", index)

    dailyItem.innerHTML = `
            <div class="daily-day">${window.innerWidth <= 768 ? dayShort : dayName}</div>
            <div class="daily-icon">
                <img src="https://openweathermap.org/img/wn/${mostFrequentIcon}.png" alt="Weather icon">
            </div>
            <div class="daily-details">
                <div class="daily-temp">
                    <span class="daily-temp-max">${Math.round(displayMaxTemp)}°</span>
                    <span class="daily-temp-min">${Math.round(displayMinTemp)}°</span>
                </div>
                <div class="daily-info">
                    <div class="daily-info-item">
                        <i class="fas fa-tint"></i>
                        <span>${avgHumidity}%</span>
                    </div>
                    <div class="daily-info-item">
                        <i class="fas fa-wind"></i>
                        <span>${avgWind}${currentUnit === "metric" ? "m/s" : "mph"}</span>
                    </div>
                    <div class="daily-info-item">
                        <i class="fas fa-cloud-rain"></i>
                        <span>${maxPop}%</span>
                    </div>
                </div>
            </div>
            <div class="daily-expand-icon">
                <i class="fas fa-chevron-right"></i>
            </div>
        `

    // Add click event for detailed view
    dailyItem.addEventListener("click", () => {
      showDailyForecastDetails(dayData, dayName, date)
    })

    dailyForecastElement.appendChild(dailyItem)
  })
}

// New function to show detailed daily forecast
function showDailyForecastDetails(dayData, dayName, date) {
  const modal = document.createElement("div")
  modal.className = "modal daily-detail-modal active"

  const formattedDate = date.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  modal.innerHTML = `
    <div class="modal-content daily-detail-content">
      <div class="modal-header">
        <h3><i class="fas fa-calendar-day"></i> ${dayName}</h3>
        <button class="close-modal" onclick="closeDailyDetailModal()">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="modal-body">
        <div class="daily-detail-date">${formattedDate}</div>
        <div class="hourly-breakdown">
          <h4><i class="fas fa-clock"></i> Complete Hourly Breakdown</h4>
          <div class="hourly-detail-scroll">
            <div class="hourly-detail-grid">
              ${dayData
                .map((item) => {
                  const time = new Date(item.dt * 1000)
                  const hour = time.getHours()
                  const formattedHour = hour % 12 === 0 ? "12" : hour % 12
                  const ampm = hour >= 12 ? "PM" : "AM"
                  const displayTemp =
                    currentUnit === "metric" ? item.main.temp : convertTemperature(item.main.temp, "metric", "imperial")
                  const displayFeelsLike =
                    currentUnit === "metric"
                      ? item.main.feels_like
                      : convertTemperature(item.main.feels_like, "metric", "imperial")

                  return `
                <div class="hourly-detail-item">
                  <div class="hourly-detail-time">${formattedHour} ${ampm}</div>
                  <div class="hourly-detail-icon">
                    <img src="https://openweathermap.org/img/wn/${item.weather[0].icon}.png" alt="${item.weather[0].description}">
                  </div>
                  <div class="hourly-detail-temp">${Math.round(displayTemp)}°${currentUnit === "metric" ? "C" : "F"}</div>
                  <div class="hourly-detail-feels">Feels like ${Math.round(displayFeelsLike)}°</div>
                  <div class="hourly-detail-desc">${item.weather[0].description}</div>
                  <div class="hourly-detail-stats">
                    <span><i class="fas fa-tint"></i> ${item.main.humidity}%</span>
                    <span><i class="fas fa-wind"></i> ${item.wind.speed}${currentUnit === "metric" ? "m/s" : "mph"}</span>
                    <span><i class="fas fa-cloud-rain"></i> ${Math.round(item.pop * 100)}%</span>
                    <span><i class="fas fa-compress-alt"></i> ${item.main.pressure}hPa</span>
                  </div>
                </div>
              `
                })
                .join("")}
            </div>
          </div>
        </div>
      </div>
    </div>
  `

  document.body.appendChild(modal)
}

// Global function to close daily detail modal
window.closeDailyDetailModal = () => {
  const modal = document.querySelector(".daily-detail-modal")
  if (modal) {
    modal.classList.remove("active")
    setTimeout(() => {
      document.body.removeChild(modal)
    }, 300)
  }
}

// Helper functions for forecast
function groupByDay(forecastList) {
  const grouped = {}

  forecastList.forEach((item) => {
    const date = new Date(item.dt * 1000)
    const day = date.toISOString().split("T")[0]

    if (!grouped[day]) {
      grouped[day] = []
    }

    grouped[day].push(item)
  })

  return grouped
}

function getMostFrequentIcon(dayData) {
  const iconCounts = {}
  let maxCount = 0
  let mostFrequentIcon = dayData[0].weather[0].icon

  dayData.forEach((item) => {
    const icon = item.weather[0].icon
    iconCounts[icon] = (iconCounts[icon] || 0) + 1

    if (iconCounts[icon] > maxCount) {
      maxCount = iconCounts[icon]
      mostFrequentIcon = icon
    }
  })

  return mostFrequentIcon
}

// Air Quality Data
async function fetchAirQualityData(lat, lon) {
  try {
    const response = await fetch(`${API_CONFIG.baseUrl}/air_pollution?lat=${lat}&lon=${lon}&appid=${API_CONFIG.key}`)

    if (!response.ok) {
      throw new Error("Unable to fetch air quality data")
    }

    const data = await response.json()
    displayAirQualityData(data)
  } catch (error) {
    console.error("Error fetching air quality data:", error)
    // Display fallback data
    displayAirQualityData({
      list: [
        {
          main: { aqi: 2 },
          components: { pm2_5: 15, pm10: 25, o3: 80, no2: 30 },
        },
      ],
    })
  }
}

function displayAirQualityData(data) {
  const airQualityData = data.list[0]
  const aqi = airQualityData.main.aqi
  const components = airQualityData.components

  // Update AQI value and status
  document.getElementById("aqi-value").textContent = aqi

  const aqiStatus = getAirQualityStatus(aqi)
  document.getElementById("aqi-status").textContent = aqiStatus.status
  document.getElementById("aqi-status").style.color = aqiStatus.color
  document.getElementById("aqi-description").textContent = aqiStatus.description

  // Update pollutant values
  document.getElementById("pm25").textContent = Math.round(components.pm2_5 || 0)
  document.getElementById("pm10").textContent = Math.round(components.pm10 || 0)
  document.getElementById("o3").textContent = Math.round(components.o3 || 0)
  document.getElementById("no2").textContent = Math.round(components.no2 || 0)
}

function getAirQualityStatus(aqi) {
  const statuses = {
    1: { status: "Good", color: "#4caf50", description: "Air quality is satisfactory" },
    2: { status: "Fair", color: "#8bc34a", description: "Air quality is acceptable" },
    3: { status: "Moderate", color: "#ffeb3b", description: "Air quality is moderate" },
    4: { status: "Poor", color: "#ff9800", description: "Air quality is poor" },
    5: { status: "Very Poor", color: "#f44336", description: "Air quality is very poor" },
  }

  return statuses[aqi] || statuses[2]
}

// Refresh functionality
function initializeRefresh() {
  const refreshBtn = document.getElementById("refresh-data")

  refreshBtn.addEventListener("click", () => {
    if (currentLocation) {
      refreshBtn.classList.add("refreshing")
      fetchWeatherData(currentLocation.name, currentLocation.lat, currentLocation.lon).finally(() => {
        refreshBtn.classList.remove("refreshing")
      })
    } else {
      showToast("No Data", "No weather data to refresh. Search for a city first.", "warning")
    }
  })
}

// Enhanced Modal Management
function initializeModals() {
  const addCityBtn = document.getElementById("add-city-btn")
  const addFirstCityBtn = document.getElementById("add-first-city-btn")
  const modal = document.getElementById("add-city-modal")
  const closeModal = document.getElementById("close-city-modal")
  const modalCityInput = document.getElementById("modal-city-input")

  if (addCityBtn) {
    addCityBtn.addEventListener("click", openAddCityModal)
  }

  if (addFirstCityBtn) {
    addFirstCityBtn.addEventListener("click", openAddCityModal)
  }

  if (closeModal) {
    closeModal.addEventListener("click", closeAddCityModal)
  }

  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        closeAddCityModal()
      }
    })
  }

  if (modalCityInput) {
    modalCityInput.addEventListener("input", handleModalCitySearch)
  }
}

function openAddCityModal() {
  const modal = document.getElementById("add-city-modal")
  modal.classList.add("active")
  document.getElementById("modal-city-input").focus()
}

function closeAddCityModal() {
  const modal = document.getElementById("add-city-modal")
  modal.classList.remove("active")
  document.getElementById("modal-city-input").value = ""
  document.getElementById("city-search-results").innerHTML = ""
}

// Enhanced city search with real API integration
async function handleModalCitySearch(e) {
  const query = e.target.value.trim()
  const resultsContainer = document.getElementById("city-search-results")

  if (query.length < 2) {
    resultsContainer.innerHTML = ""
    return
  }

  try {
    const response = await fetch(
      `${API_CONFIG.baseUrl}/find?q=${encodeURIComponent(query)}&limit=5&appid=${API_CONFIG.key}`,
    )

    if (response.ok) {
      const data = await response.json()
      displayModalCityResults(data.list || [])
    }
  } catch (error) {
    console.error("Error fetching city search results:", error)
    // Fallback to mock results
    displayMockCityResults(query)
  }
}

function displayModalCityResults(cities) {
  const resultsContainer = document.getElementById("city-search-results")
  resultsContainer.innerHTML = ""

  if (cities.length === 0) {
    resultsContainer.innerHTML = '<div class="no-results">No cities found</div>'
    return
  }

  cities.forEach((city) => {
    const resultItem = document.createElement("div")
    resultItem.className = "search-result-item"

    // Get current weather for preview
    fetchCityWeatherPreview(city).then((weatherData) => {
      const displayTemp =
        currentUnit === "metric" ? weatherData.temp : convertTemperature(weatherData.temp, "metric", "imperial")

      resultItem.innerHTML = `
        <div class="result-info">
          <div class="result-header">
            <div class="result-name">${city.name}</div>
            <div class="result-temp">${Math.round(displayTemp)}°${currentUnit === "metric" ? "C" : "F"}</div>
          </div>
          <div class="result-details">
            <span class="result-country">${city.name}, ${city.sys.country}</span>
            <span class="result-weather">${weatherData.description}</span>
          </div>
        </div>
        <div class="result-actions">
          <div class="result-weather-icon">
            <img src="https://openweathermap.org/img/wn/${weatherData.icon}.png" alt="${weatherData.description}">
          </div>
          <button class="result-add" onclick="addCityToSaved('${city.name}', '${city.sys.country}', ${city.coord.lat}, ${city.coord.lon})">
            <i class="fas fa-plus"></i>
          </button>
        </div>
      `
    })

    resultsContainer.appendChild(resultItem)
  })
}

async function fetchCityWeatherPreview(city) {
  try {
    const response = await fetch(
      `${API_CONFIG.baseUrl}/weather?lat=${city.coord.lat}&lon=${city.coord.lon}&units=metric&appid=${API_CONFIG.key}`,
    )

    if (response.ok) {
      const data = await response.json()
      return {
        temp: data.main.temp,
        description: data.weather[0].description,
        icon: data.weather[0].icon,
      }
    }
  } catch (error) {
    console.error("Error fetching city weather preview:", error)
  }

  // Fallback data
  return {
    temp: Math.round(Math.random() * 30 + 5),
    description: "Clear sky",
    icon: "01d",
  }
}

function displayMockCityResults(query) {
  const resultsContainer = document.getElementById("city-search-results")
  const mockResults = [
    { name: query, country: "Country", lat: 0, lon: 0 },
    { name: query + " City", country: "Another Country", lat: 0, lon: 0 },
    { name: "New " + query, country: "Third Country", lat: 0, lon: 0 },
  ]

  resultsContainer.innerHTML = ""

  mockResults.forEach((result) => {
    const resultItem = document.createElement("div")
    resultItem.className = "search-result-item"
    const mockTemp = Math.round(Math.random() * 30 + 5)
    const displayTemp = currentUnit === "metric" ? mockTemp : convertTemperature(mockTemp, "metric", "imperial")

    resultItem.innerHTML = `
      <div class="result-info">
        <div class="result-header">
          <div class="result-name">${result.name}</div>
          <div class="result-temp">${Math.round(displayTemp)}°${currentUnit === "metric" ? "C" : "F"}</div>
        </div>
        <div class="result-details">
          <span class="result-country">${result.country}</span>
          <span class="result-weather">Clear sky</span>
        </div>
      </div>
      <div class="result-actions">
        <div class="result-weather-icon">
          <img src="https://openweathermap.org/img/wn/01d.png" alt="Clear sky">
        </div>
        <button class="result-add" onclick="addCityToSaved('${result.name}', '${result.country}', ${result.lat}, ${result.lon})">
          <i class="fas fa-plus"></i>
        </button>
      </div>
    `
    resultsContainer.appendChild(resultItem)
  })
}

// Enhanced function for adding cities with proper temperature units
window.addCityToSaved = (name, country, lat, lon) => {
  // Check if city already exists
  if (savedCities.some((city) => city.name === name)) {
    showToast("City Exists", "This city is already in your list", "warning")
    return
  }

  // Generate weather data for the city - always store base metric temperature
  const baseTemp = Math.round(Math.random() * 30 + 5)

  const mockCity = {
    name: name,
    country: country,
    lat: lat || 0,
    lon: lon || 0,
    baseTemp: baseTemp, // Always store metric temperature
    description: ["Clear sky", "Few clouds", "Scattered clouds", "Broken clouds", "Light rain"][
      Math.floor(Math.random() * 5)
    ],
    icon: ["01d", "02d", "03d", "04d", "10d"][Math.floor(Math.random() * 5)],
    humidity: Math.round(Math.random() * 50 + 30),
    wind: Math.round(Math.random() * 10 + 2),
    visibility: Math.round(Math.random() * 10 + 5),
    pressure: Math.round(Math.random() * 50 + 1000),
  }

  savedCities.push(mockCity)
  localStorage.setItem("savedCities", JSON.stringify(savedCities))

  closeAddCityModal()
  loadSavedCities()
  showToast("City Added", `${name} has been added to your cities`, "success")
}

// Settings Management
function initializeSettings() {
  const saveApiBtn = document.getElementById("save-api-btn")

  if (saveApiBtn) {
    saveApiBtn.addEventListener("click", saveApiKey)
  }

  // Load current API key
  const apiKeyInput = document.getElementById("api-key-input")
  if (apiKeyInput) {
    apiKeyInput.value = localStorage.getItem("weatherApiKey") || ""
  }
}

function saveApiKey() {
  const apiKeyInput = document.getElementById("api-key-input")
  const apiKey = apiKeyInput.value.trim()

  if (apiKey) {
    API_CONFIG.key = apiKey
    localStorage.setItem("weatherApiKey", apiKey)
    showToast("API Key Saved", "Your API key has been saved successfully", "success")
  } else {
    showToast("Invalid API Key", "Please enter a valid API key", "error")
  }
}

function loadSettings() {
  // Load current settings
  const apiKeyInput = document.getElementById("api-key-input")
  if (apiKeyInput) {
    apiKeyInput.value = localStorage.getItem("weatherApiKey") || ""
  }
}

// Enhanced Saved Cities Management with proper unit handling
function loadSavedCities() {
  const citiesGrid = document.getElementById("saved-cities")
  if (!citiesGrid) return

  if (savedCities.length === 0) {
    citiesGrid.innerHTML = `
            <div class="empty-cities">
                <i class="fas fa-city"></i>
                <p>You haven't added any cities yet</p>
                <button class="add-first-city-btn" id="add-first-city-btn">
                    <i class="fas fa-plus"></i> Add Your First City
                </button>
            </div>
        `

    // Re-attach event listener
    const addFirstCityBtn = document.getElementById("add-first-city-btn")
    if (addFirstCityBtn) {
      addFirstCityBtn.addEventListener("click", openAddCityModal)
    }
  } else {
    citiesGrid.innerHTML = ""

    savedCities.forEach((city, index) => {
      // Convert temperature to current unit
      const displayTemp =
        currentUnit === "metric" ? city.baseTemp : convertTemperature(city.baseTemp, "metric", "imperial")

      const cityCard = createCityCard({ ...city, temp: Math.round(displayTemp) }, index)
      citiesGrid.appendChild(cityCard)
    })
  }
}

function createCityCard(city, index) {
  const card = document.createElement("div")
  card.className = "city-card"

  // Convert temperature to current unit
  const displayTemp = currentUnit === "metric" ? city.baseTemp : convertTemperature(city.baseTemp, "metric", "imperial")

  card.innerHTML = `
        <div class="city-header">
            <div>
                <div class="city-name">${city.name}</div>
                <div class="city-time">${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
            </div>
            <div class="city-temp">${Math.round(displayTemp)}°${currentUnit === "metric" ? "C" : "F"}</div>
        </div>
        <div class="city-content">
            <div class="city-icon">
                <img src="https://openweathermap.org/img/wn/${city.icon}.png" alt="${city.description}">
            </div>
            <div class="city-details">
                <div class="city-description">${city.description}</div>
                <div class="city-info">
                    <div class="city-info-item">
                        <i class="fas fa-tint"></i>
                        <span>${city.humidity}%</span>
                    </div>
                    <div class="city-info-item">
                        <i class="fas fa-wind"></i>
                        <span>${city.wind}m/s</span>
                    </div>
                    <div class="city-info-item">
                        <i class="fas fa-eye"></i>
                        <span>${city.visibility}km</span>
                    </div>
                    <div class="city-info-item">
                        <i class="fas fa-compress-alt"></i>
                        <span>${city.pressure}hPa</span>
                    </div>
                </div>
            </div>
        </div>
        <div class="city-actions">
            <button class="city-btn view-btn" onclick="viewCityWeather('${city.name}')">
                <i class="fas fa-eye"></i> View
            </button>
            <button class="city-btn remove" onclick="removeSavedCity(${index})">
                <i class="fas fa-trash"></i> Remove
            </button>
        </div>
    `

  return card
}

// Global functions for city management
window.viewCityWeather = (cityName) => {
  document.getElementById("city-input").value = cityName
  searchCity(cityName)

  // Switch to dashboard view
  handleNavigation("dashboard")
  document.querySelectorAll(".nav-menu li").forEach((li) => li.classList.remove("active"))
  document.querySelector(".nav-menu li:first-child").classList.add("active")
}

window.removeSavedCity = (index) => {
  if (confirm("Are you sure you want to remove this city?")) {
    savedCities.splice(index, 1)
    localStorage.setItem("savedCities", JSON.stringify(savedCities))
    loadSavedCities()
    showToast("City Removed", "City has been removed from your list", "success")
  }
}

// Enhanced Weather Map Management with darker layers
let miniMap = null
let fullMap = null
let currentWeatherLayer = null

function initializeMiniWeatherMap(lat, lon) {
  const mapContainer = document.getElementById("mini-weather-map")

  // Clear existing content
  mapContainer.innerHTML = '<div id="mini-leaflet-map" style="height: 100%; width: 100%;"></div>'

  // Initialize Leaflet map
  if (miniMap) {
    miniMap.remove()
  }

  miniMap = L.map("mini-leaflet-map", {
    zoomControl: false,
    attributionControl: false,
  }).setView([lat, lon], 8)

  // Add base tile layer
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(miniMap)

  // Add location marker
  L.marker([lat, lon]).addTo(miniMap).bindPopup(`${currentLocation.name}`).openPopup()

  // Add default weather layer (temperature) with enhanced visibility
  addWeatherLayer(miniMap, "temp")

  // Map controls
  const mapControls = document.querySelectorAll(".map-card .map-control-btn")
  mapControls.forEach((btn) => {
    btn.addEventListener("click", () => {
      mapControls.forEach((b) => b.classList.remove("active"))
      btn.classList.add("active")

      const layer = btn.dataset.layer
      addWeatherLayer(miniMap, layer)
      showToast("Map Layer", `Switched to ${layer} layer`, "success")
    })
  })
}

function initializeFullWeatherMap() {
  const mapContainer = document.getElementById("full-weather-map")

  // Clear existing content
  mapContainer.innerHTML = '<div id="full-leaflet-map" style="height: 100%; width: 100%;"></div>'

  // Use current location or default
  const lat = currentLocation ? currentLocation.lat : 51.5074
  const lon = currentLocation ? currentLocation.lon : -0.1278

  // Initialize Leaflet map
  if (fullMap) {
    fullMap.remove()
  }

  fullMap = L.map("full-leaflet-map").setView([lat, lon], 6)

  // Add base tile layer
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors",
  }).addTo(fullMap)

  // Add location marker if available
  if (currentLocation) {
    L.marker([lat, lon]).addTo(fullMap).bindPopup(`${currentLocation.name}`).openPopup()
  }

  // Add default weather layer (temperature) with enhanced visibility
  addWeatherLayer(fullMap, "temp")

  // Map controls
  const mapControls = document.querySelectorAll(".full-controls .map-control-btn")
  mapControls.forEach((btn) => {
    btn.addEventListener("click", () => {
      mapControls.forEach((b) => b.classList.remove("active"))
      btn.classList.add("active")

      const layer = btn.dataset.layer
      addWeatherLayer(fullMap, layer)
      showToast("Map Layer", `Switched to ${layer} layer`, "success")
    })
  })
}

// Enhanced weather layer function with better visibility
function addWeatherLayer(map, layerType) {
  // Remove existing weather layer
  if (currentWeatherLayer) {
    map.removeLayer(currentWeatherLayer)
  }

  // Weather layer configurations with enhanced opacity for better visibility
  const layerConfigs = {
    temp: {
      url: `https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid=${API_CONFIG.key}`,
      name: "Temperature",
      opacity: 0.8, // Increased opacity
    },
    precipitation: {
      url: `https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=${API_CONFIG.key}`,
      name: "Precipitation",
      opacity: 0.9, // High opacity for precipitation
    },
    wind: {
      url: `https://tile.openweathermap.org/map/wind_new/{z}/{x}/{y}.png?appid=${API_CONFIG.key}`,
      name: "Wind Speed",
      opacity: 0.8,
    },
    clouds: {
      url: `https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=${API_CONFIG.key}`,
      name: "Cloud Cover",
      opacity: 0.9, // High opacity for clouds
    },
    pressure: {
      url: `https://tile.openweathermap.org/map/pressure_new/{z}/{x}/{y}.png?appid=${API_CONFIG.key}`,
      name: "Pressure",
      opacity: 0.8,
    },
  }

  const config = layerConfigs[layerType]
  if (config) {
    currentWeatherLayer = L.tileLayer(config.url, {
      attribution: "Weather data © OpenWeatherMap",
      opacity: config.opacity,
      // Add CSS filter for better contrast
      className: `weather-layer-${layerType}`,
    }).addTo(map)
  }
}

// Weather Alerts
function loadWeatherAlerts() {
  const alertsContainer = document.getElementById("weather-alerts")
  if (!alertsContainer) return

  // Simulate loading alerts
  setTimeout(() => {
    const mockAlerts = [] // No alerts for demo

    if (mockAlerts.length === 0) {
      alertsContainer.innerHTML = `
                <div class="no-alerts">
                    <i class="fas fa-check-circle"></i>
                    <p>No active weather alerts for your tracked locations</p>
                </div>
            `
    } else {
      alertsContainer.innerHTML = ""
      mockAlerts.forEach((alert, index) => {
        const alertItem = createAlertItem(alert, index)
        alertsContainer.appendChild(alertItem)
      })
    }
  }, 1000)
}

function createAlertItem(alert, index) {
  const alertItem = document.createElement("div")
  alertItem.className = "alert-item"

  alertItem.innerHTML = `
        <div class="alert-header">
            <div class="alert-title">${alert.title}</div>
            <div class="alert-time">${new Date(alert.start * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
        </div>
        <div class="alert-content">
            <div class="alert-description">${alert.description}</div>
            <div class="alert-severity">
                <span class="alert-severity-label">Severity:</span>
                <span class="alert-severity-value">${alert.severity}</span>
            </div>
        </div>
    `

  return alertItem
}

// Date and Time
function updateDateTime() {
  const dateTimeElement = document.getElementById("current-date")
  const currentDateTimeElement = document.getElementById("current-date-time")

  const now = new Date()
  const options = {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }

  const dateTimeString = now.toLocaleDateString(undefined, options)

  if (dateTimeElement) {
    dateTimeElement.textContent = dateTimeString
  }

  if (currentDateTimeElement) {
    const fullOptions = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
    currentDateTimeElement.textContent = now.toLocaleDateString(undefined, fullOptions)
  }
}

// Utility Functions
function showToast(title, message, type = "success") {
  const toastContainer = document.getElementById("toast-container")
  if (!toastContainer) return

  const toast = document.createElement("div")
  toast.className = `toast ${type}`

  const iconMap = {
    success: "fas fa-check-circle",
    warning: "fas fa-exclamation-triangle",
    error: "fas fa-times-circle",
    info: "fas fa-info-circle",
  }

  toast.innerHTML = `
        <div class="toast-icon">
            <i class="${iconMap[type] || iconMap.info}"></i>
        </div>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close">
            <i class="fas fa-times"></i>
        </button>
    `

  toastContainer.appendChild(toast)

  // Show toast
  setTimeout(() => {
    toast.classList.add("show")
  }, 100)

  // Auto remove after 5 seconds
  const autoRemove = setTimeout(() => {
    removeToast(toast)
  }, 5000)

  // Manual close
  toast.querySelector(".toast-close").addEventListener("click", () => {
    clearTimeout(autoRemove)
    removeToast(toast)
  })
}

function removeToast(toast) {
  toast.classList.remove("show")
  setTimeout(() => {
    if (toast.parentNode) {
      toast.parentNode.removeChild(toast)
    }
  }, 300)
}

function showLoadingOverlay(message = "Loading...") {
  const overlay = document.getElementById("loading-overlay")
  const loadingText = document.getElementById("loading-text")

  if (overlay) {
    if (loadingText) {
      loadingText.textContent = message
    }
    overlay.classList.add("active")
  }
}

function hideLoadingOverlay() {
  const overlay = document.getElementById("loading-overlay")
  if (overlay) {
    overlay.classList.remove("active")
  }
}

// Error Handling
window.addEventListener("error", (e) => {
  console.error("Application error:", e.error)
  showToast("Application Error", "An unexpected error occurred", "error")
})

// Keyboard Shortcuts
document.addEventListener("keydown", (e) => {
  // Ctrl/Cmd + K to focus search
  if ((e.ctrlKey || e.metaKey) && e.key === "k") {
    e.preventDefault()
    document.getElementById("city-input").focus()
  }

  // Escape to close modals
  if (e.key === "Escape") {
    const activeModal = document.querySelector(".modal.active")
    if (activeModal) {
      if (activeModal.classList.contains("daily-detail-modal")) {
        closeDailyDetailModal()
      } else {
        closeAddCityModal()
      }
    }
  }
})

// Resize Handler
window.addEventListener("resize", () => {
  // Update responsive elements
  if (window.innerWidth <= 768) {
    document.getElementById("sidebar").classList.remove("open")
  }
})

// Online/Offline Status
window.addEventListener("online", () => {
  showToast("Connection Restored", "You are back online", "success")
})

window.addEventListener("offline", () => {
  showToast("Connection Lost", "You are currently offline", "warning")
})

