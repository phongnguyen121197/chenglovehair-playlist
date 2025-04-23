const { Configuration, OpenAIApi } = require('openai');
const ytdl = require('ytdl-core');
const { createClient } = require('@supabase/supabase-js');

// Khởi tạo Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Khởi tạo OpenAI API client
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY
});
const openai = new OpenAIApi(configuration);

exports.handler = async function(event, context) {
  try {
    // Kiểm tra method
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        body: JSON.stringify({ success: false, error: 'Method Not Allowed' })
      };
    }
    
    // Parse body
    const { songInput, suggesterName } = JSON.parse(event.body);
    
    if (!songInput) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, error: 'Vui lòng nhập tên bài hát hoặc URL YouTube' })
      };
    }
    
    let songInfo = {};
    
    // Kiểm tra xem input có phải URL YouTube không
    if (songInput.includes('youtube.com/') || songInput.includes('youtu.be/')) {
      // Xử lý URL YouTube
      try {
        const info = await ytdl.getInfo(songInput);
        songInfo = {
          title: info.videoDetails.title,
          url: `https://www.youtube.com/watch?v=${info.videoDetails.videoId}`,
          suggester: suggesterName || 'Ẩn danh'
        };
      } catch (error) {
        console.error('Lỗi khi lấy thông tin YouTube:', error);
        return {
          statusCode: 400,
          body: JSON.stringify({ success: false, error: 'Không thể xử lý URL YouTube, vui lòng kiểm tra lại' })
        };
      }
    } else {
      // Sử dụng OpenAI API để tìm bài hát
      try {
        // Chỉ sử dụng OpenAI khi cần thiết để tiết kiệm token
        const completion = await openai.createChatCompletion({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system", 
              content: "Hãy tìm URL YouTube chính thức cho bài hát được yêu cầu. Trả về kết quả theo định dạng JSON với title và youtubeUrl."
            },
            {
              role: "user",
              content: `Tìm bài hát: ${songInput}`
            }
          ],
          temperature: 0.7,
        });
        
        const result = JSON.parse(completion.data.choices[0].message.content);
        
        songInfo = {
          title: result.title,
          url: result.youtubeUrl,
          suggester: suggesterName || 'Ẩn danh'
        };
      } catch (error) {
        console.error('Lỗi khi sử dụng OpenAI API:', error);
        return {
          statusCode: 500,
          body: JSON.stringify({ success: false, error: 'Không thể tìm bài hát, vui lòng thử lại sau' })
        };
      }
    }
    
    // Lưu vào Supabase
    const { data, error } = await supabase
      .from('songs')
      .insert([
        {
          title: songInfo.title,
          url: songInfo.url,
          suggester: songInfo.suggester,
          status: 'pending' // Chờ phê duyệt
        }
      ]);
    
    if (error) {
      throw error;
    }
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        song: songInfo
      })
    };
    
  } catch (error) {
    console.error('Lỗi khi xử lý đề xuất:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: error.message || 'Đã xảy ra lỗi khi xử lý yêu cầu' })
    };
  }
};