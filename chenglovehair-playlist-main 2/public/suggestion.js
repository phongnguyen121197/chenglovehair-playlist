document.addEventListener('DOMContentLoaded', function() {
    const suggestionForm = document.getElementById('songSuggestionForm');
    const songInput = document.getElementById('songInput');
    const suggesterName = document.getElementById('suggesterName');
    const statusMessage = document.getElementById('suggestion-status');
    
    if (suggestionForm) {
      suggestionForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Kiểm tra đầu vào
        if (!songInput.value.trim()) {
          showStatus('Vui lòng nhập tên bài hát hoặc URL YouTube', 'error');
          return;
        }
        
        // Hiển thị thông báo đang xử lý
        showStatus('Đang xử lý đề xuất của bạn...', 'info');
        
        try {
          // Gửi yêu cầu đề xuất
          const response = await fetch('/api/processSuggestion', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              songInput: songInput.value.trim(),
              suggesterName: suggesterName.value.trim()
            })
          });
          
          const data = await response.json();
          
          if (data.success) {
            // Hiển thị thông báo thành công
            showStatus(`Đề xuất bài hát "${data.song.title}" thành công! Đang chờ phê duyệt.`, 'success');
            
            // Reset form
            songInput.value = '';
          } else {
            // Hiển thị lỗi
            showStatus(`Lỗi: ${data.error || 'Không thể xử lý đề xuất'}`, 'error');
          }
        } catch (error) {
          console.error('Lỗi khi gửi đề xuất:', error);
          showStatus(`Lỗi: ${error.message || 'Đã xảy ra lỗi khi xử lý yêu cầu'}`, 'error');
        }
      });
    }
    
    // Hiển thị thông báo trạng thái
    function showStatus(message, type) {
      if (!statusMessage) return;
      
      statusMessage.textContent = message;
      statusMessage.className = 'status-message';
      
      if (type) {
        statusMessage.classList.add(type);
      }
      
      // Ẩn thông báo thành công sau 5 giây
      if (type === 'success') {
        setTimeout(() => {
          statusMessage.style.display = 'none';
        }, 5000);
      }
    }
  });