// Biến toàn cục
let songs = [];
let currentIndex = -1;
let refreshInterval = null;
const REFRESH_TIME = 30000; // 30 giây
let player = null;

// DOM Elements
let playlistElement;
let currentTitleElement;
let currentSuggesterElement;
let prevBtn;
let playBtn;
let nextBtn;
let refreshButton;
let mediaContainer;

// Khởi tạo YouTube API
function onYouTubeIframeAPIReady() {
  console.log("YouTube API sẵn sàng");
}

// Khởi tạo tham chiếu đến DOM
function initDOMReferences() {
  try {
    playlistElement = document.getElementById('playlist');
    currentTitleElement = document.getElementById('current-title');
    currentSuggesterElement = document.getElementById('current-suggester');
    prevBtn = document.getElementById('prevBtn');
    playBtn = document.getElementById('playBtn');
    nextBtn = document.getElementById('nextBtn');
    refreshButton = document.getElementById('refreshButton');
    mediaContainer = document.getElementById('media-embed-container');
    
    return true;
  } catch (error) {
    console.error("Lỗi khi khởi tạo tham chiếu DOM:", error);
    return false;
  }
}

// Tải danh sách bài hát
async function loadPlaylist(showLoading = true) {
  if (!playlistElement) {
    console.error("Không thể tải danh sách: phần tử playlist không tồn tại");
    return;
  }
  
  if (showLoading) {
    playlistElement.innerHTML = '<li class="loading">Đang tải danh sách phát...</li>';
  }
  
  try {
    const response = await fetch('/api/getApprovedSongs');
    if (!response.ok) throw new Error('Không thể tải danh sách phát');
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Lỗi khi tải danh sách bài hát');
    }
    
    const oldSongs = JSON.stringify(songs);
    songs = data.songs;
    const newSongs = JSON.stringify(songs);
    
    // Chỉ render lại nếu danh sách có thay đổi
    if (oldSongs !== newSongs) {
      console.log("Danh sách bài hát đã được cập nhật");
      renderPlaylist();
      
      // Kích hoạt các nút nếu có bài hát
      if (songs.length > 0 && playBtn) {
        playBtn.disabled = (currentIndex !== -1);
      }
      
      // Nếu đang phát một bài hát, kiểm tra xem nó có còn trong danh sách không
      if (currentIndex !== -1) {
        let currentSongExists = false;
        const currentSongUrl = songs[currentIndex]?.url;
        
        if (currentSongUrl) {
          // Tìm bài hát trong danh sách mới
          for (let i = 0; i < songs.length; i++) {
            if (songs[i].url === currentSongUrl) {
              currentSongExists = true;
              currentIndex = i; // Cập nhật lại chỉ mục nếu vị trí đã thay đổi
              break;
            }
          }
        }
        
        if (!currentSongExists) {
          // Bài hát hiện tại không còn trong danh sách
          console.log("Bài hát hiện tại không còn trong danh sách");
          currentIndex = -1;
          updateButtonState();
        }
      }
    } else {
      console.log("Không có thay đổi trong danh sách bài hát");
    }
  } catch (error) {
    console.error("Lỗi khi tải danh sách:", error);
    
    if (showLoading && playlistElement) {
      playlistElement.innerHTML = `<li class="error">Lỗi khi tải danh sách: ${error.message}</li>`;
      
      // Thêm nút thử lại
      const retryButton = document.createElement('button');
      retryButton.className = 'btn';
      retryButton.textContent = 'Thử lại';
      retryButton.onclick = function() {
        loadPlaylist(true);
      };
      
      const retryLi = document.createElement('li');
      retryLi.className = 'retry-option';
      retryLi.appendChild(retryButton);
      playlistElement.appendChild(retryLi);
    }
  }
}

// Hiển thị danh sách bài hát
function renderPlaylist() {
  if (!playlistElement) {
    console.error("Không thể render playlist: phần tử playlist không tồn tại");
    return;
  }
  
  if (!Array.isArray(songs) || songs.length === 0) {
    playlistElement.innerHTML = '<li>Không có bài hát nào</li>';
    return;
  }
  
  playlistElement.innerHTML = '';
  
  songs.forEach(function(song, index) {
    if (!song || typeof song !== 'object') {
      console.error("Phát hiện bài hát không hợp lệ tại vị trí", index);
      return; // Bỏ qua bài hát không hợp lệ
    }
    
    const li = document.createElement('li');
    
    // Tạo nội dung với số thứ tự và tên bài hát
    li.innerHTML = `
      <span class="song-number">${index + 1}.</span>
      <span class="song-title">${song.title || 'Không có tiêu đề'}</span>
      <span class="song-suggester">Đề xuất bởi: ${song.suggester || 'Ẩn danh'}</span>
    `;
    
    // Đánh dấu bài đang phát
    if (index === currentIndex) {
      li.className = 'playing';
    }
    
    // Thêm sự kiện click
    li.addEventListener('click', function() {
      playSong(index);
    });
    
    playlistElement.appendChild(li);
  });
}

// Trích xuất YouTube ID từ URL
function extractYoutubeId(url) {
  try {
    let videoId = null;
    
    // Các mẫu URL YouTube phổ biến
    if (url.includes('youtube.com/watch?v=')) {
      videoId = url.split('v=')[1];
      const ampersandPosition = videoId.indexOf('&');
      if (ampersandPosition !== -1) {
        videoId = videoId.substring(0, ampersandPosition);
      }
    } else if (url.includes('youtu.be/')) {
      videoId = url.split('youtu.be/')[1];
      const questionMarkPosition = videoId.indexOf('?');
      if (questionMarkPosition !== -1) {
        videoId = videoId.substring(0, questionMarkPosition);
      }
    } else if (url.includes('youtube.com/embed/')) {
      videoId = url.split('youtube.com/embed/')[1];
      const questionMarkPosition = videoId.indexOf('?');
      if (questionMarkPosition !== -1) {
        videoId = videoId.substring(0, questionMarkPosition);
      }
    } else if (url.includes('youtube.com/shorts/')) {
      videoId = url.split('youtube.com/shorts/')[1];
      const questionMarkPosition = videoId.indexOf('?');
      if (questionMarkPosition !== -1) {
        videoId = videoId.substring(0, questionMarkPosition);
      }
    }
    
    return videoId;
  } catch (error) {
    console.error('Lỗi khi trích xuất YouTube ID:', error);
    return null;
  }
}

// Phát bài hát
function playSong(index) {
  // Kiểm tra index hợp lệ
  if (index < 0 || !songs || index >= songs.length) {
    console.error("Không tìm thấy bài hát");
    return;
  }
  
  // Cập nhật chỉ mục hiện tại và thông tin bài hát
  currentIndex = index;
  const song = songs[currentIndex];
  
  if (!song || !song.url) {
    console.error("Thông tin bài hát không hợp lệ");
    return;
  }
  
  // Cập nhật tiêu đề và người đề xuất
  if (currentTitleElement) currentTitleElement.textContent = song.title || 'Không có tiêu đề';
  if (currentSuggesterElement) {
    currentSuggesterElement.textContent = song.suggester ? `Đề xuất bởi: ${song.suggester}` : '';
  }
  
  // Cập nhật giao diện
  updateButtonState();
  renderPlaylist();
  
  // Nhúng video YouTube
  const videoId = extractYoutubeId(song.url);
  if (!videoId) {
    console.error("Không thể xác định ID video YouTube");
    return;
  }
  
  // Hiển thị thông báo đang tải
  if (mediaContainer) {
    mediaContainer.innerHTML = '<div class="loading">Đang tải video...</div>';
    
    // Tạo hoặc cập nhật player YouTube
    if (player) {
      player.loadVideoById(videoId);
    } else {
      player = new YT.Player(mediaContainer, {
        height: '315',
        width: '560',
        videoId: videoId,
        playerVars: {
          'autoplay': 1,
          'enablejsapi': 1
        },
        events: {
          'onStateChange': onPlayerStateChange
        }
      });
    }
  }
}

// Xử lý sự kiện thay đổi trạng thái của player
function onPlayerStateChange(event) {
  // Khi video kết thúc (state = 0)
  if (event.data === 0) {
    // Tự động chuyển bài tiếp theo
    if (currentIndex < songs.length - 1) {
      playNext();
    }
  }
}

// Cập nhật trạng thái nút
function updateButtonState() {
  // Kiểm tra các phần tử tồn tại trước khi cập nhật
  if (!prevBtn || !nextBtn || !playBtn) {
    console.error("Không thể cập nhật trạng thái nút: thiếu tham chiếu đến các nút");
    return;
  }
  
  // Cập nhật nút điều khiển chuyển bài
  prevBtn.disabled = currentIndex <= 0;
  nextBtn.disabled = currentIndex >= songs.length - 1;
  playBtn.disabled = currentIndex !== -1 || songs.length === 0;
}

// Các hàm điều khiển
function playPrevious() {
  if (currentIndex > 0) {
    playSong(currentIndex - 1);
  }
}

function playNext() {
  if (currentIndex < songs.length - 1) {
    playSong(currentIndex + 1);
  }
}

function playFirst() {
  if (songs.length > 0 && currentIndex === -1) {
    playSong(0);
  }
}

// Bắt đầu tự động làm mới danh sách
function startAutoRefresh() {
  // Dừng interval cũ nếu có
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }
  
  // Thiết lập interval mới - làm mới mỗi 30 giây
  refreshInterval = setInterval(function() {
    console.log("Tự động làm mới danh sách...");
    // Gọi loadPlaylist với showLoading=false để không hiển thị "Đang tải..."
    loadPlaylist(false);
  }, REFRESH_TIME);
  
  console.log(`Đã bật tự động làm mới danh sách mỗi ${REFRESH_TIME/1000} giây`);
}

// Gắn sự kiện
function attachEventListeners() {
  if (prevBtn) prevBtn.addEventListener('click', playPrevious);
  if (playBtn) playBtn.addEventListener('click', playFirst);
  if (nextBtn) nextBtn.addEventListener('click', playNext);
  
  if (refreshButton) {
    refreshButton.addEventListener('click', function() {
      loadPlaylist(true);
    });
  }
}

// Khi DOM được tải
document.addEventListener('DOMContentLoaded', function() {
  try {
    // Khởi tạo tham chiếu DOM
    initDOMReferences();
    
    // Gắn sự kiện
    attachEventListeners();
    
    // Tải danh sách ban đầu
    loadPlaylist();
    
    // Bắt đầu tự động làm mới
    startAutoRefresh();
    
    console.log("Khởi tạo player hoàn tất");
  } catch (error) {
    console.error(`Lỗi khi khởi tạo player: ${error}`);
  }
});

// Dừng tự động làm mới khi người dùng rời trang
window.addEventListener('beforeunload', function() {
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }
});