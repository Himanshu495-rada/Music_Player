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
  const footerProgressBar = document.getElementById("footer-progress-bar");
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
  const fsProgressContainer = document.getElementById("fs-progress-container");
  const fsProgressBar = document.getElementById("fs-progress-bar");
  const fsVolumeSlider = document.getElementById("fs-volume-slider");
  const fsVolumeIcon = document.getElementById("fs-volume-icon");
  const fsProgressSlider = document.getElementById("fs-progress-slider");

  // Other Controls
  const shufflePlayBtn = document.getElementById("shuffle-play-btn");

  // State
  let currentSongIndex = 0;
  let isPlaying = false;
  let isLoading = false;
  let songQueue = [...songs];

  // Helper: Format seconds to mm:ss
  function formatTime(seconds) {
    if (isNaN(seconds) || seconds === Infinity) return "--:--";
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs < 10 ? "0" : ""}${secs}`;
  }

  // Helper: Get paginated songs
  function getPaginatedSongs(list, page) {
    const start = (page - 1) * PAGE_SIZE;
    return list.slice(start, start + PAGE_SIZE);
  }

  // Pagination controls
  function updatePaginationControls() {
    const totalPages = Math.ceil(filteredSongs.length / PAGE_SIZE) || 1;
    pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    prevPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled = currentPage === totalPages;
  }

  // Render song list for current page
  function loadSongList(listToDisplay) {
    songListElement.innerHTML = "";
    if (!listToDisplay || listToDisplay.length === 0) {
      songListElement.innerHTML =
        '<li style="padding: 1rem; text-align: center; color: var(--text-medium);">No songs found.</li>';
      return;
    }
    listToDisplay.forEach((song, idx) => {
      const originalIndex = songs.findIndex(
        (s) => s.title === song.title && s.artist === song.artist
      );
      const li = document.createElement("li");
      li.classList.add("song-item");
      li.dataset.index = originalIndex;

      li.innerHTML = `
        <div class="play-icon" id="play-icon-${originalIndex}"><i class="fas fa-play"></i></div>
        <div class="song-title">${song.title || ""}</div>
        <div class="song-artist">${song.artist || "Unknown Artist"}</div>
        <div class="song-album">${song.album || "Unknown Album"}</div>
        <div class="song-duration">${formatTime(song.duration)}</div>
        <div class="song-more"><i class="fas fa-ellipsis-h"></i></div>
      `;

      li.addEventListener("click", () => {
        currentSongIndex = originalIndex;
        songQueue = [...filteredSongs];
        lazyLoadAndPlay(song, originalIndex);
      });
      songListElement.appendChild(li);
    });
    updateListHighlighting();
  }

  // Lazy load audio src and show spinner
  function lazyLoadAndPlay(song, index) {
    isLoading = true;
    // Show spinner only in the song list play icon
    const playIconDiv = document.getElementById(`play-icon-${index}`);
    if (playIconDiv) playIconDiv.innerHTML = `<span class="spinner"></span>`;

    // Show spinner in cover art area (optional, but you said not needed, so skip)
    // footerCoverArt.innerHTML = `<span class="spinner cover-spinner"></span>`;

    // Always set the cover art background image
    footerCoverArt.style.backgroundImage = `url('${song.cover}')`;

    // Play/pause button stays as is
    footerPlayPauseBtn.innerHTML = `<i class="fas fa-pause"></i>`;

    audioPlayer.src = "";
    footerTitle.textContent = song.title;
    footerArtist.textContent = song.artist || "Unknown Artist";
    footerDuration.textContent = formatTime(song.duration);

    fsCoverArt.src = song.cover;
    fsTitle.textContent = song.title;
    fsArtist.textContent = song.artist || "Unknown Artist";

    // Set src and wait for canplay event
    audioPlayer.src = song.src;
    audioPlayer.load();

    audioPlayer.oncanplay = () => {
      isLoading = false;
      // Restore play icon in the list
      if (playIconDiv) playIconDiv.innerHTML = `<i class="fas fa-pause"></i>`;
      // Restore cover art background image (in case it was changed)
      footerCoverArt.style.backgroundImage = `url('${song.cover}')`;
      // Remove any spinner from cover art
      footerCoverArt.innerHTML = "";
      playSong();
      updateListHighlighting();
      audioPlayer.oncanplay = null;
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

  function filterSongs() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    if (!searchTerm) {
      filteredSongs = [...songs];
    } else {
      filteredSongs = songs.filter((song) => {
        const titleMatch = song.title?.toLowerCase().includes(searchTerm);
        const artistMatch = song.artist?.toLowerCase().includes(searchTerm);
        const albumMatch = song.album?.toLowerCase().includes(searchTerm);
        return titleMatch || artistMatch || albumMatch;
      });
    }
    currentPage = 1;
    renderCurrentPage();
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

  function setProgress(e, container) {
    const width = container.clientWidth;
    const clickX = e.offsetX;
    const duration = audioPlayer.duration;
    if (!isNaN(duration) && duration > 0) {
      audioPlayer.currentTime = (clickX / width) * duration;
      const progressPercent = (audioPlayer.currentTime / duration) * 100;
      footerProgressBar.style.width = `${progressPercent}%`;
      fsProgressBar.style.width = `${progressPercent}%`;
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
  }

  function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  function shuffleAndPlay() {
    // Shuffle the full filtered list
    songQueue = shuffleArray([...filteredSongs]);
    currentSongIndex = 0;

    // Find the index of the first song in the filteredSongs array
    const firstSong = songQueue[0];
    const filteredIndex = filteredSongs.findIndex(
      (s) => s.title === firstSong.title && s.artist === firstSong.artist
    );
    // Calculate the page number (1-based)
    currentPage = Math.floor(filteredIndex / PAGE_SIZE) + 1;

    renderCurrentPage();
    lazyLoadAndPlay(
      songQueue[currentSongIndex],
      songs.findIndex(
        (s) => s.title === firstSong.title && s.artist === firstSong.artist
      )
    );
  }

  function openFullScreenPlayer() {
    if (audioPlayer.src) fullScreenPlayer.classList.add("visible");
  }
  function closeFullScreenPlayer() {
    fullScreenPlayer.classList.remove("visible");
  }

  function renderCurrentPage() {
    const paginated = getPaginatedSongs(filteredSongs, currentPage);
    loadSongList(paginated);
    updatePaginationControls();
  }

  // Pagination navigation
  prevPageBtn.addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      renderCurrentPage();
    }
  });
  nextPageBtn.addEventListener("click", () => {
    const totalPages = Math.ceil(filteredSongs.length / PAGE_SIZE) || 1;
    if (currentPage < totalPages) {
      currentPage++;
      renderCurrentPage();
    }
  });

  // Event listeners
  searchInput.addEventListener("input", filterSongs);
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

  // Keyboard shortcuts (must be inside DOMContentLoaded to access variables)
  document.addEventListener("keydown", (e) => {
    // Ignore if typing in an input or textarea
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

  // Initial setup
  renderCurrentPage();
  updateVolume({ target: { value: audioPlayer.volume } });
});

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
