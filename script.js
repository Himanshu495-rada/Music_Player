document.addEventListener("DOMContentLoaded", async () => {
  let songs = [];
  try {
    const response = await fetch("assets/info.json");
    songs = await response.json();
  } catch (error) {
    console.error("Failed to load song data: ", error);
  }

  const PAGE_SIZE = 20;
  let currentPage = 1;
  let filteredSongs = [...songs];

  // DOM Elements
  const audioPlayer = document.getElementById("audio-player");
  const songListElement = document.getElementById("song-list");
  const footerCoverArt = document.getElementById("footer-cover-art");
  const footerPlayPauseBtn = document.getElementById("footer-play-pause-btn");
  const footerPlayerInfo = document.getElementById("player-info");
  const footerTitle = document.getElementById("footer-title");
  const footerArtist = document.getElementById("footer-artist");
  const footerDuration = document.getElementById("footer-duration");
  const footerCurrentTime = document.getElementById("footer-current-time");
  const searchInput = document.getElementById("search-input");
  const prevPageBtn = document.getElementById("prev-page-btn");
  const nextPageBtn = document.getElementById("next-page-btn");
  const pageInfo = document.getElementById("page-info");

  // Footer Player Elements
  const footerPlayer = document.getElementById("footer-player");
  const footerPrevBtn = document.getElementById("footer-prev-btn");
  const footerNextBtn = document.getElementById("footer-next-btn");
  const footerProgressContainer = document.getElementById(
    "footer-progress-container"
  );
  const footerVolumeSlider = document.getElementById("footer-volume-slider");
  const playerInfo = document.getElementById("player-info");
  const progressVolumeContainer = document.getElementById(
    "progress-volume-container"
  );
  const volumeIcon = document.getElementById("volume-icon");
  const footerProgressSlider = document.getElementById(
    "footer-progress-slider"
  );

  // Full Screen Player Elements
  const fullScreenPlayer = document.getElementById("full-screen-player");
  const closeFullScreenBtn = document.getElementById("close-fullscreen-btn");
  const fsCoverArt = document.getElementById("fs-cover-art");
  const fsTitle = document.getElementById("fs-title");
  const fsArtist = document.getElementById("fs-artist");
  const fsPrevBtn = document.getElementById("fs-prev-btn");
  const fsPlayPauseBtn = document.getElementById("fs-play-pause-btn");
  const fsNextBtn = document.getElementById("fs-next-btn");
  const fsCurrentTime = document.getElementById("fs-current-time");
  const fsDuration = document.getElementById("fs-duration");
  const fsProgressSlider = document.getElementById("fs-progress-slider");
  const fsVolumeSlider = document.getElementById("fs-volume-slider");
  const fsVolumeIcon = document.getElementById("fs-volume-icon");

  // Homepage Section Elements
  const recentlyPlayedContainer = document.getElementById(
    "recently-played-container"
  );
  const freshlyAddedContainer = document.getElementById(
    "freshly-added-container"
  );
  const randomPicksContainer = document.getElementById(
    "random-picks-container"
  );
  const topArtistsContainer = document.getElementById("top-artists-container");
  const recentlyPlayedSection = document.getElementById(
    "recently-played-section"
  );

  // Other Controls
  const shufflePlayBtn = document.getElementById("shuffle-play-btn");

  // State
  let currentSongIndex = 0;
  let isPlaying = false;
  let isLoading = false;
  let songQueue = [...songs];

  // --- Recently Played LocalStorage ---
  const RECENTLY_PLAYED_KEY = "recentlyPlayedSongs";
  const RECENTLY_PLAYED_TIMESTAMP_KEY = "recentlyPlayedTimestamp";
  const RECENTLY_PLAYED_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours
  const MAX_RECENTLY_PLAYED = 20;

  // Store recently played as array of unique song names (title + artist)
  function getRecentlyPlayed() {
    const stored = localStorage.getItem(RECENTLY_PLAYED_KEY);
    const timestamp = localStorage.getItem(RECENTLY_PLAYED_TIMESTAMP_KEY);
    if (!stored || !timestamp) return [];
    const now = Date.now();
    if (now - Number(timestamp) > RECENTLY_PLAYED_EXPIRY_MS) {
      localStorage.removeItem(RECENTLY_PLAYED_KEY);
      localStorage.removeItem(RECENTLY_PLAYED_TIMESTAMP_KEY);
      return [];
    }
    return JSON.parse(stored);
  }

  function saveToRecentlyPlayed(song) {
    if (!song || !song.title || !song.artist) return;
    const songKey = `${song.title}|||${song.artist}`;
    let recent = getRecentlyPlayed();
    recent = recent.filter((key) => key !== songKey);
    recent.unshift(songKey);
    if (recent.length > MAX_RECENTLY_PLAYED) {
      recent = recent.slice(0, MAX_RECENTLY_PLAYED);
    }
    localStorage.setItem(RECENTLY_PLAYED_KEY, JSON.stringify(recent));
    localStorage.setItem(RECENTLY_PLAYED_TIMESTAMP_KEY, Date.now().toString());
  }

  // --- Card Creation Helpers ---
  function createSongCard(song, index) {
    const card = document.createElement("div");
    card.classList.add("song-card");
    card.dataset.index = index;
    card.innerHTML = `
      <div class="card-thumbnail" style="background-image: url('${
        song.cover || "assets/image/default-cover.png"
      }')"></div>
      <div class="card-info">
        <div class="card-title">${song.title || "Unknown Title"}</div>
        <div class="card-subtitle">${song.artist || "Unknown Artist"}</div>
      </div>
    `;
    card.addEventListener("click", () => {
      const originalIndex = songs.findIndex(
        (s) => s.title === song.title && s.artist === song.artist
      );
      if (originalIndex !== -1) {
        currentSongIndex = originalIndex;
        songQueue = [...songs];
        lazyLoadAndPlay(songs[originalIndex], originalIndex);
      }
    });
    return card;
  }

  function createArtistCard(artistName, artistSongs) {
    const card = document.createElement("div");
    card.classList.add("artist-card");
    const cover = artistSongs[0]?.cover || "assets/image/default-artist.png";
    card.innerHTML = `
      <div class="card-thumbnail" style="background-image: url('${cover}')"></div>
      <div class="card-info">
        <div class="card-title">${artistName}</div>
      </div>
    `;
    card.addEventListener("click", () => {
      const firstSong = artistSongs[0];
      const originalIndex = songs.findIndex(
        (s) => s.title === firstSong.title && s.artist === firstSong.artist
      );
      if (originalIndex !== -1) {
        currentSongIndex = originalIndex;
        songQueue = [...artistSongs];
        lazyLoadAndPlay(songs[originalIndex], originalIndex);
      }
    });
    return card;
  }

  // --- Homepage Rendering Functions ---
  function renderRecentlyPlayed() {
    recentlyPlayedContainer.innerHTML = "";
    const placeholderText =
      recentlyPlayedContainer.querySelector(".placeholder-text");
    if (placeholderText) placeholderText.remove();

    const recentKeys = getRecentlyPlayed();
    if (recentKeys.length === 0) {
      recentlyPlayedSection.style.display = "none";
      return;
    }
    recentlyPlayedSection.style.display = "block";
    recentKeys.forEach((key) => {
      const [title, artist] = key.split("|||");
      const song = songs.find((s) => s.title === title && s.artist === artist);
      if (song) {
        const originalIndex = songs.findIndex(
          (s) => s.title === song.title && s.artist === song.artist
        );
        const card = createSongCard(song, originalIndex);
        recentlyPlayedContainer.appendChild(card);
      }
    });
  }

  function renderFreshlyAdded(count = 10) {
    freshlyAddedContainer.innerHTML = "";
    const freshSongs = songs.slice(0, count);
    freshSongs.forEach((song, index) => {
      const originalIndex = songs.findIndex(
        (s) => s.title === song.title && s.artist === song.artist
      );
      if (originalIndex !== -1) {
        const card = createSongCard(song, originalIndex);
        freshlyAddedContainer.appendChild(card);
      }
    });
  }

  function renderTopArtists(count = 10) {
    topArtistsContainer.innerHTML = "";
    const artistCounts = {};
    songs.forEach((song) => {
      const artist = song.artist || "Unknown Artist";
      if (!artistCounts[artist]) {
        artistCounts[artist] = { count: 0, songs: [] };
      }
      artistCounts[artist].count++;
      artistCounts[artist].songs.push(song);
    });

    const sortedArtists = Object.entries(artistCounts)
      .sort(([, aData], [, bData]) => bData.count - aData.count)
      .slice(0, count);

    sortedArtists.forEach(([artistName, artistData]) => {
      const card = createArtistCard(artistName, artistData.songs);
      topArtistsContainer.appendChild(card);
    });
  }

  function renderRandomPicks(count = 10) {
    randomPicksContainer.innerHTML = "";
    const shuffled = shuffleArray([...songs]);
    const randomSongs = shuffled.slice(0, count);
    randomSongs.forEach((song) => {
      const originalIndex = songs.findIndex(
        (s) => s.title === song.title && s.artist === song.artist
      );
      if (originalIndex !== -1) {
        const card = createSongCard(song, originalIndex);
        randomPicksContainer.appendChild(card);
      }
    });
  }

  function renderHomePage() {
    renderRecentlyPlayed();
    renderFreshlyAdded();
    renderTopArtists();
    renderRandomPicks();
  }

  // Helper: Format seconds to mm:ss
  function formatTime(seconds) {
    if (isNaN(seconds) || seconds === Infinity) return "--:--";
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs < 10 ? "0" : ""}${secs}`;
  }

  // Helper: Shuffle array
  function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  // --- Modified lazyLoadAndPlay ---
  function lazyLoadAndPlay(song, index) {
    isLoading = true;
    const playIconDiv = document.getElementById(`play-icon-${index}`);
    if (playIconDiv) playIconDiv.innerHTML = `<span class="spinner"></span>`;

    footerCoverArt.style.backgroundImage = `url('${
      song.cover || "assets/image/default-cover.png"
    }')`;
    footerPlayPauseBtn.innerHTML = `<i class="fas fa-pause"></i>`;

    audioPlayer.src = "";
    footerTitle.textContent = song.title;
    footerArtist.textContent = song.artist || "Unknown Artist";
    footerDuration.textContent = formatTime(song.duration);

    fsCoverArt.src = song.cover;
    fsTitle.textContent = song.title;
    fsArtist.textContent = song.artist || "Unknown Artist";

    // Save to recently played (by song name/artist)
    saveToRecentlyPlayed(song);

    audioPlayer.src = song.src;
    audioPlayer.load();

    audioPlayer.oncanplay = () => {
      isLoading = false;
      if (playIconDiv) playIconDiv.innerHTML = `<i class="fas fa-pause"></i>`;
      footerCoverArt.innerHTML = "";
      playSong();
      updateListHighlighting();
      renderRecentlyPlayed();
      audioPlayer.oncanplay = null;
    };

    audioPlayer.onerror = (e) => {
      console.error("Error loading audio:", audioPlayer.error);
      isLoading = false;
      if (playIconDiv) playIconDiv.innerHTML = `<i class="fas fa-play"></i>`;
      footerCoverArt.innerHTML = "";
      alert(`Error loading track: ${song.title}`);
    };
  }

  function playSong() {
    if (!audioPlayer.src) return;
    audioPlayer
      .play()
      .then(() => {
        isPlaying = true;
        footerPlayPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
        fsPlayPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
        footerPlayer.classList.add("active");
        playerInfo.style.opacity = 1;
        progressVolumeContainer.style.opacity = 1;
      })
      .catch(() => {
        isPlaying = false;
        footerPlayPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
        fsPlayPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
      });
  }

  function pauseSong() {
    audioPlayer.pause();
    isPlaying = false;
    footerPlayPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
    fsPlayPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
  }

  function togglePlayPause() {
    if (isLoading) return;
    if (isPlaying) {
      pauseSong();
    } else {
      playSong();
    }
  }

  function prevSong() {
    if (songQueue.length === 0) return;
    currentSongIndex--;
    if (currentSongIndex < 0) currentSongIndex = songQueue.length - 1;
    lazyLoadAndPlay(songQueue[currentSongIndex], currentSongIndex);
  }

  function nextSong() {
    if (songQueue.length === 0) return;
    currentSongIndex++;
    if (currentSongIndex >= songQueue.length) currentSongIndex = 0;
    lazyLoadAndPlay(songQueue[currentSongIndex], currentSongIndex);
  }

  function updateListHighlighting() {
    const songItems = songListElement.querySelectorAll(".song-item");
    songItems.forEach((item) => {
      item.classList.remove("playing");
      const playIcon = item.querySelector(".play-icon i");
      if (playIcon) playIcon.className = "fas fa-play";
      if (parseInt(item.dataset.index) === currentSongIndex) {
        item.classList.add("playing");
        if (isPlaying && playIcon) playIcon.className = "fas fa-pause";
      }
    });
  }

  // Progress bar and time displays
  function updateProgress(e) {
    const { duration, currentTime } = e.srcElement;
    if (!isNaN(duration)) {
      const progressPercent = (currentTime / duration) * 100;
      footerCurrentTime.textContent = formatTime(currentTime);
      fsCurrentTime.textContent = formatTime(currentTime);

      // Sync both sliders
      fsProgressSlider.max = duration;
      fsProgressSlider.value = currentTime;
      footerProgressSlider.max = duration;
      footerProgressSlider.value = currentTime;

      // Update slider backgrounds for progress
      const progressBg = `linear-gradient(to right, var(--primary-neon) 0%, var(--primary-neon) ${progressPercent}%, var(--background-light) ${progressPercent}%, var(--background-light) 100%)`;
      fsProgressSlider.style.background = progressBg;
      footerProgressSlider.style.background = progressBg;
    }
  }

  function updateVolume(e) {
    const volume = e.target.value;
    audioPlayer.volume = volume;
    footerVolumeSlider.value = volume;
    fsVolumeSlider.value = volume;
    const iconClass =
      volume == 0
        ? "fa-volume-mute"
        : volume < 0.5
        ? "fa-volume-down"
        : "fa-volume-up";
    volumeIcon.className = `fas ${iconClass}`;
    fsVolumeIcon.className = `fas ${iconClass}`;

    // Show blue color for volume percentage on slider
    const percent = volume * 100;
    const blue = "#2196f3";
    const bg = `linear-gradient(to right, ${blue} 0%, ${blue} ${percent}%, var(--background-light) ${percent}%, var(--background-light) 100%)`;
    footerVolumeSlider.style.background = bg;
    fsVolumeSlider.style.background = bg;
  }

  function shuffleAndPlay() {
    songQueue = shuffleArray([...songs]);
    currentSongIndex = 0;
    const firstSong = songQueue[0];
    const filteredIndex = songs.findIndex(
      (s) => s.title === firstSong.title && s.artist === firstSong.artist
    );
    lazyLoadAndPlay(songQueue[currentSongIndex], filteredIndex);
  }

  function openFullScreenPlayer() {
    if (audioPlayer.src) fullScreenPlayer.classList.add("visible");
  }
  function closeFullScreenPlayer() {
    fullScreenPlayer.classList.remove("visible");
  }

  // --- Remove/Comment Out Old List View & Pagination ---
  // function renderCurrentPage() { ... }
  // prevPageBtn.addEventListener("click", ...);
  // nextPageBtn.addEventListener("click", ...);
  // searchInput.addEventListener("input", filterSongs);

  // --- Event listeners ---
  footerPlayPauseBtn.addEventListener("click", togglePlayPause);
  fsPlayPauseBtn.addEventListener("click", togglePlayPause);
  footerPrevBtn.addEventListener("click", prevSong);
  fsPrevBtn.addEventListener("click", prevSong);
  footerNextBtn.addEventListener("click", nextSong);
  fsNextBtn.addEventListener("click", nextSong);
  audioPlayer.addEventListener("timeupdate", updateProgress);
  audioPlayer.addEventListener("loadedmetadata", () => {
    const duration = audioPlayer.duration;
    footerDuration.textContent = formatTime(duration);
    fsDuration.textContent = formatTime(duration);
    const durationEl = document.getElementById(`duration-${currentSongIndex}`);
    if (durationEl) durationEl.textContent = formatTime(duration);
  });
  audioPlayer.addEventListener("ended", nextSong);

  footerVolumeSlider.addEventListener("input", updateVolume);
  fsVolumeSlider.addEventListener("input", updateVolume);
  shufflePlayBtn.addEventListener("click", shuffleAndPlay);

  footerPlayerInfo.addEventListener("click", openFullScreenPlayer);
  footerCoverArt.addEventListener("click", openFullScreenPlayer);
  closeFullScreenBtn.addEventListener("click", closeFullScreenPlayer);
  fsProgressSlider.addEventListener("input", (e) => {
    if (!isNaN(audioPlayer.duration)) {
      audioPlayer.currentTime = e.target.value;
    }
  });
  footerProgressSlider.addEventListener("input", (e) => {
    if (!isNaN(audioPlayer.duration)) {
      audioPlayer.currentTime = e.target.value;
    }
  });

  // Keyboard shortcuts
  document.addEventListener("keydown", (e) => {
    if (
      document.activeElement.tagName === "INPUT" ||
      document.activeElement.tagName === "TEXTAREA" ||
      document.activeElement.isContentEditable
    ) {
      return;
    }
    if (e.code === "Space") {
      e.preventDefault();
      togglePlayPause();
    } else if (e.code === "ArrowRight") {
      e.preventDefault();
      if (!isNaN(audioPlayer.currentTime)) {
        audioPlayer.currentTime = Math.min(
          audioPlayer.currentTime + 5,
          audioPlayer.duration || audioPlayer.currentTime + 5
        );
      }
    } else if (e.code === "ArrowLeft") {
      e.preventDefault();
      if (!isNaN(audioPlayer.currentTime)) {
        audioPlayer.currentTime = Math.max(audioPlayer.currentTime - 5, 0);
      }
    }
  });

  // --- Initial homepage setup ---
  renderHomePage();
  updateVolume({ target: { value: audioPlayer.volume } });

  const songListContainer = document.querySelector(".song-list-container");
  const paginationControls = document.querySelector(".pagination-controls");
  const mainContent = document.querySelector(".main-content");

  searchInput.addEventListener("input", (e) => {
    const query = e.target.value.trim().toLowerCase();
    if (query.length === 0) {
      // Hide song list, show home categories
      songListContainer.style.display = "none";
      paginationControls.style.display = "none";
      // Show home categories
      document
        .querySelectorAll(".home-category")
        .forEach((sec) => (sec.style.display = ""));
    } else {
      // Show song list, hide home categories
      songListContainer.style.display = "block"; // <-- Ensure block or flex
      paginationControls.style.display = "flex"; // <-- Use flex for button layout
      document
        .querySelectorAll(".home-category")
        .forEach((sec) => (sec.style.display = "none"));
      // Filter and render songs with pagination
      filteredSongs = songs.filter(
        (song) =>
          (song.title && song.title.toLowerCase().includes(query)) ||
          (song.artist && song.artist.toLowerCase().includes(query)) ||
          (song.album && song.album.toLowerCase().includes(query))
      );
      currentPage = 1;
      renderCurrentPage(); // <-- Use pagination-aware rendering
    }
  });

  // Helper to render filtered songs in the list view
  function renderSongList(filtered) {
    const ul = document.getElementById("song-list");
    ul.innerHTML = "";
    filtered.forEach((song, idx) => {
      const li = document.createElement("li");
      li.className = "song-item";
      li.innerHTML = `
        <div class="play-icon"><i class="fas fa-play"></i></div>
        <div class="song-title">${song.title || ""}</div>
        <div class="song-artist">${song.artist || ""}</div>
        <div class="song-album">${song.album || ""}</div>
        <div class="song-duration">${
          song.duration ? formatTime(song.duration) : ""
        }</div>
        <div class="song-more"><i class="fas fa-ellipsis-h"></i></div>
      `;
      li.addEventListener("click", () => {
        currentSongIndex = songs.findIndex(
          (s) => s.title === song.title && s.artist === song.artist
        );
        songQueue = [...songs];
        lazyLoadAndPlay(song, currentSongIndex);
      });
      ul.appendChild(li);
    });
  }

  // --- Pagination for search ---
  function renderCurrentPage() {
    const start = (currentPage - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    const pageSongs = filteredSongs.slice(start, end);
    renderSongList(pageSongs);

    // Update page info
    const maxPage = Math.max(1, Math.ceil(filteredSongs.length / PAGE_SIZE));
    pageInfo.textContent = `Page ${currentPage} of ${maxPage}`;
    prevPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled =
      currentPage === maxPage || filteredSongs.length === 0;
    // Hide pagination if no results
    document.querySelector(".pagination-controls").style.display =
      filteredSongs.length > 0 ? "flex" : "none";
  }

  prevPageBtn.addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      renderCurrentPage();
    }
  });
  nextPageBtn.addEventListener("click", () => {
    const maxPage = Math.ceil(filteredSongs.length / PAGE_SIZE);
    if (currentPage < maxPage) {
      currentPage++;
      renderCurrentPage();
    }
  });
});

// --- Features Modal (unchanged) ---
const featuresLink = document.getElementById("features-link");
const featuresModal = document.getElementById("features-modal");
const closeFeaturesModal = document.getElementById("close-features-modal");

featuresLink.addEventListener("click", (e) => {
  e.preventDefault();
  featuresModal.style.display = "block";
});
closeFeaturesModal.addEventListener("click", () => {
  featuresModal.style.display = "none";
});
window.addEventListener("click", (e) => {
  if (e.target === featuresModal) {
    featuresModal.style.display = "none";
  }
});

document.querySelectorAll(".scroll-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const targetId = btn.getAttribute("data-target");
    const container = document.getElementById(targetId);
    if (container) {
      const scrollAmount = 300;
      if (btn.classList.contains("left")) {
        container.scrollBy({ left: -scrollAmount, behavior: "smooth" });
      } else {
        container.scrollBy({ left: scrollAmount, behavior: "smooth" });
      }
    }
  });
});
