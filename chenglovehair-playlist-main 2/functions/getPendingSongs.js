const { createClient } = require('@supabase/supabase-js');

// Khởi tạo Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

exports.handler = async function(event, context) {
  try {
    // Lấy các bài hát đang chờ duyệt
    const { data, error } = await supabase
      .from('songs')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true });
    
    if (error) {
      throw error;
    }
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        songs: data
      })
    };
  } catch (error) {
    console.error('Lỗi khi lấy danh sách bài hát chờ duyệt:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: error.message || 'Đã xảy ra lỗi khi lấy dữ liệu' })
    };
  }
};