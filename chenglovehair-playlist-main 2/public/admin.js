document.addEventListener('DOMContentLoaded', function() {
    // Kiểm tra xác thực đơn giản
    if (!checkAuth()) {
      // Hiển thị form đăng nhập nếu chưa xác thực
      showLoginForm();
      return;
    }
    
    // Nếu đã xác thực, tải dữ liệu
    loadPendingSongs();
    loadApprovedSongs();
    
    // Thêm event listener cho nút làm mới
    const refreshBtn = document.getElementById('refreshAdminButton');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', function() {
        loadPendingSongs();
        loadApprovedSongs();
      });
    }
  });
  
  // Kiểm tra xác thực
  function checkAuth() {
    const isAdmin = localStorage.getItem('isAdmin');
    return isAdmin === 'true';
  }
  
  // Hiển thị form đăng nhập
  function showLoginForm() {
    const container = document.querySelector('.admin-container');
    if (container) {
      container.innerHTML = `
        <div class="login-form">
          <h2>Đăng nhập quản trị</h2>
          <div class="form-group">
            <label for="password">Mật khẩu:</label>
            <input type="password" id="password" placeholder="Nhập mật khẩu">
          </div>
          <button id="loginBtn" class="btn">Đăng nhập</button>
          <p id="login-error" class="error-message"></p>
          <p><a href="/" class="back-link">Quay lại trang chính</a></p>
        </div>
      `;
      
      // Xử lý sự kiện đăng nhập
      const loginBtn = document.getElementById('loginBtn');
      const passwordInput = document.getElementById('password');
      const errorMessage = document.getElementById('login-error');
      
      if (loginBtn && passwordInput) {
        loginBtn.addEventListener('click', function() {
          // Mật khẩu hardcode (NÊN THAY ĐỔI TRONG TRIỂN KHAI THỰC TẾ)
          if (passwordInput.value === 'admin123') {
            localStorage.setItem('isAdmin', 'true');
            window.location.reload();
          } else {
            if (errorMessage) {
              errorMessage.textContent = 'Mật khẩu không đúng';
              errorMessage.style.display = 'block';
            }
          }
        });
        
        // Cho phép nhấn Enter để đăng nhập
        passwordInput.addEventListener('keyup', function(e) {
          if (e.key === 'Enter') {
            loginBtn.click();
          }
        });
      }
    }
  }
  
  // Tải danh sách bài hát chờ duyệt
  async function loadPendingSongs() {
    try {
      const pendingContainer = document.getElementById('pendingSongs');
      if (!pendingContainer) return;
      
      pendingContainer.innerHTML = '<div class="loading">Đang tải bài hát chờ duyệt...</div>';
      
      const response = await fetch('/api/getPendingSongs');
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Không thể tải danh sách bài hát chờ duyệt');
      }
      
      if (data.songs.length === 0) {
        pendingContainer.innerHTML = '<div class="no-data">Không có bài hát nào đang chờ duyệt</div>';
        return;
      }
      
      pendingContainer.innerHTML = '';
      
      data.songs.forEach(song => {
        const songElement = document.createElement('div');
        songElement.className = 'song-item';
        songElement.innerHTML = `
          <h3>${song.title}</h3>
          <p>Đề xuất bởi: ${song.suggester || 'Ẩn danh'}</p>
          <p>URL: <a href="${song.url}" target="_blank" class="preview-link">Nghe thử</a></p>
          <div class="actions">
            <button class="btn btn-approve" data-id="${song.id}">Phê duyệt</button>
            <button class="btn btn-reject" data-id="${song.id}">Từ chối</button>
          </div>
        `;
        pendingContainer.appendChild(songElement);
      });
      
      // Thêm sự kiện cho các nút
      document.querySelectorAll('.btn-approve').forEach(btn => {
        btn.addEventListener('click', function() {
          const songId = this.getAttribute('data-id');
          approveSong(songId);
        });
      });
      
      document.querySelectorAll('.btn-reject').forEach(btn => {
        btn.addEventListener('click', function() {
          const songId = this.getAttribute('data-id');
          rejectSong(songId);
        });
      });
      
    } catch (error) {
      console.error('Lỗi khi tải bài hát chờ duyệt:', error);
      const pendingContainer = document.getElementById('pendingSongs');
      if (pendingContainer) {
        pendingContainer.innerHTML = `<div class="error">Lỗi: ${error.message}</div>`;
      }
    }
  }
  
  // Tải danh sách bài hát đã duyệt
  async function loadApprovedSongs() {
    try {
      const approvedContainer = document.getElementById('approvedSongs');
      if (!approvedContainer) return;
      
      approvedContainer.innerHTML = '<div class="loading">Đang tải bài hát đã duyệt...</div>';
      
      const response = await fetch('/api/getApprovedSongs');
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Không thể tải danh sách bài hát đã duyệt');
      }
      
      if (data.songs.length === 0) {
        approvedContainer.innerHTML = '<div class="no-data">Không có bài hát nào đã được duyệt</div>';
        return;
      }
      
      approvedContainer.innerHTML = '';
      
      data.songs.forEach(song => {
        const songElement = document.createElement('div');
        songElement.className = 'song-item';
        songElement.innerHTML = `
          <h3>${song.title}</h3>
          <p>Đề xuất bởi: ${song.suggester || 'Ẩn danh'}</p>
          <p>URL: <a href="${song.url}" target="_blank" class="preview-link">Nghe thử</a></p>
        `;
        approvedContainer.appendChild(songElement);
      });
      
    } catch (error) {
      console.error('Lỗi khi tải bài hát đã duyệt:', error);
      const approvedContainer = document.getElementById('approvedSongs');
      if (approvedContainer) {
        approvedContainer.innerHTML = `<div class="error">Lỗi: ${error.message}</div>`;
      }
    }
  }
  
  // Phê duyệt bài hát
  async function approveSong(songId) {
    try {
      const response = await fetch('/api/updateSongStatus', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: songId,
          status: 'approved'
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Làm mới danh sách
        loadPendingSongs();
        loadApprovedSongs();
      } else {
        alert(`Lỗi: ${data.error || 'Không thể phê duyệt bài hát'}`);
      }
    } catch (error) {
      console.error('Lỗi khi phê duyệt bài hát:', error);
      alert(`Lỗi: ${error.message}`);
    }
  }
  
  // Từ chối bài hát
  async function rejectSong(songId) {
    try {
      const response = await fetch('/api/updateSongStatus', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: songId,
          status: 'rejected'
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Làm mới danh sách
        loadPendingSongs();
      } else {
        alert(`Lỗi: ${data.error || 'Không thể từ chối bài hát'}`);
      }
    } catch (error) {
      console.error('Lỗi khi từ chối bài hát:', error);
      alert(`Lỗi: ${error.message}`);
    }
  }